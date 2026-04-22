import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WALLET_ENCRYPTION_SECRET = Deno.env.get("WALLET_ENCRYPTION_SECRET") || "default_secret";
const VTU_AFRICA_API_KEY = Deno.env.get("VTU_AFRICA_API_KEY");
const VTU_AFRICA_USERNAME = Deno.env.get("VTU_AFRICA_USERNAME");
const CELO_RPC = "https://forno.celo.org";

// Token addresses on Celo Mainnet
const CUSD_ADDRESS = "0x765de816845861e75a25fca122bb6898b8b1282a";
const USDT_ADDRESS = "0x48065fbBe25f71C9282ddf5e1cD6d6A887483D5e";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rate limit configurations per endpoint (requests per hour)
const RATE_LIMITS: Record<string, number> = {
  'wallet/create': 10,
  'wallet/balance': 100,
  'wallet/transfer': 50,
  'vtu/airtime': 100,
  'vtu/data': 100,
  'vtu/electricity': 50,
  'vtu/cable': 50,
  'payments/escrow/create': 50,
  'payments/escrow/release': 50,
  'notifications/send': 200,
  'notifications/push': 500,
  'notifications/sms': 100,
  'video/create-room': 20,
  'video/join-room': 100,
  'ai/chat': 100,
  'default': 1000
};

// Pricing per API call (in NC - Naira Credits, 1 NC = 1 NGN)
const API_PRICING: Record<string, number> = {
  'wallet/create': 0, // Free
  'wallet/balance': 0, // Free
  'wallet/transfer': 5, // 5 NC per transfer
  'vtu/airtime': 2, // 2 NC per transaction
  'vtu/data': 2,
  'vtu/electricity': 3,
  'vtu/cable': 3,
  'payments/escrow/create': 10,
  'payments/escrow/release': 0,
  'notifications/send': 5, // Email
  'notifications/push': 0.5,
  'notifications/sms': 4,
  'video/create-room': 50,
  'video/join-room': 0,
  'ai/chat': 1,
  'default': 0
};

interface DeveloperProfile {
  user_id: string;
  account_type: string;
  api_key: string;
  wallet_balance: number;
}

// Validate API key and get developer profile
// FIXED: API keys are stored in user_secrets table, NOT profiles
async function validateApiKey(apiKey: string): Promise<DeveloperProfile | null> {
  if (!apiKey) {
    console.log('[API] No API key provided');
    return null;
  }
  
  console.log('[API] Validating API key:', apiKey.substring(0, 10) + '...');
  
  // Step 1: Find the API key in user_secrets
  const { data: secretData, error: secretError } = await supabase
    .from('user_secrets')
    .select('user_id, api_key')
    .eq('api_key', apiKey)
    .maybeSingle();
  
  if (secretError) {
    console.log('[API] Database error looking up API key:', secretError.message);
    return null;
  }
  
  if (!secretData) {
    console.log('[API] No matching API key found in user_secrets');
    return null;
  }
  
  // Step 2: Verify the user has a developer account type in profiles
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, account_type, wallet_balance')
    .eq('user_id', secretData.user_id)
    .eq('account_type', 'developer')
    .maybeSingle();
  
  if (profileError) {
    console.log('[API] Database error checking profile:', profileError.message);
    return null;
  }
  
  if (!profileData) {
    console.log('[API] User found but account_type is not developer');
    return null;
  }
  
  console.log('[API] API key validated for user:', profileData.user_id);
  return {
    user_id: profileData.user_id,
    account_type: profileData.account_type,
    api_key: secretData.api_key,
    wallet_balance: profileData.wallet_balance
  } as DeveloperProfile;
}

// Check and update rate limits
async function checkRateLimit(userId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // Count requests in the last hour
  const { count } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', hourAgo);
  
  const used = count || 0;
  const remaining = Math.max(0, limit - used);
  
  return { allowed: used < limit, remaining };
}

// Log API usage
async function logApiUsage(userId: string, endpoint: string, method: string, statusCode: number, cost: number) {
  await supabase.from('api_usage').insert({
    user_id: userId,
    endpoint,
    method,
    status_code: statusCode,
    cost_nc: cost,
    created_at: new Date().toISOString()
  });
}

// Deduct NC balance for paid endpoints
async function deductBalance(userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  
  const { data, error } = await supabase.rpc('deduct_nc_balance', {
    p_user_id: userId,
    p_amount: amount
  });
  
  return !error && data === true;
}

// Trigger webhooks for developer events
async function triggerWebhook(developerId: string, eventType: string, payload: any) {
  try {
    // Call the developer-webhook function to handle webhook delivery
    await supabase.functions.invoke('developer-webhook', {
      body: {
        action: 'trigger',
        developer_id: developerId,
        event_type: eventType,
        payload
      }
    });
    console.log(`[API] Webhook triggered: ${eventType}`);
  } catch (error) {
    console.error('[API] Webhook trigger failed:', error);
    // Don't fail the main operation if webhook fails
  }
}

// ============= API HANDLERS =============

// WALLET APIS
async function handleWalletCreate(developer: DeveloperProfile, body: any) {
  const { external_user_id } = body;
  
  if (!external_user_id) {
    return { error: 'external_user_id is required', status: 400 };
  }
  
  // Check if wallet already exists for this external user
  const { data: existing } = await supabase
    .from('developer_wallets')
    .select('*')
    .eq('developer_id', developer.user_id)
    .eq('external_user_id', external_user_id)
    .single();
  
  if (existing) {
    return { 
      data: { 
        address: existing.wallet_address,
        external_user_id,
        message: 'Wallet already exists'
      }
    };
  }
  
  // Create new wallet
  const wallet = ethers.Wallet.createRandom();
  const encryptedPrivateKey = CryptoJS.AES.encrypt(
    wallet.privateKey,
    WALLET_ENCRYPTION_SECRET
  ).toString();
  
  // Save developer wallet
  const { error } = await supabase.from('developer_wallets').insert({
    developer_id: developer.user_id,
    external_user_id,
    wallet_address: wallet.address.toLowerCase(),
    encrypted_private_key: encryptedPrivateKey
  });
  
  if (error) {
    console.error('[API] Error saving wallet:', error);
    return { error: 'Failed to create wallet', status: 500 };
  }
  
  // Trigger webhook for wallet creation
  triggerWebhook(developer.user_id, 'wallet.created', {
    address: wallet.address,
    external_user_id,
    network: 'celo-mainnet'
  });
  
  return {
    data: {
      address: wallet.address,
      external_user_id,
      network: 'celo-mainnet',
      supported_tokens: ['CELO', 'cUSD', 'USDT']
    }
  };
}

async function handleWalletBalance(developer: DeveloperProfile, params: URLSearchParams) {
  const address = params.get('address');
  const externalUserId = params.get('external_user_id');
  
  let walletAddress = address;
  
  if (!walletAddress && externalUserId) {
    const { data } = await supabase
      .from('developer_wallets')
      .select('wallet_address')
      .eq('developer_id', developer.user_id)
      .eq('external_user_id', externalUserId)
      .single();
    
    walletAddress = data?.wallet_address;
  }
  
  if (!walletAddress) {
    return { error: 'address or external_user_id required', status: 400 };
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(CELO_RPC);
    
    // Get CELO balance
    const celoBalance = await provider.getBalance(walletAddress);
    
    // Get cUSD balance
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    const cusdContract = new ethers.Contract(CUSD_ADDRESS, erc20Abi, provider);
    const cusdBalance = await cusdContract.balanceOf(walletAddress);
    
    // Get USDT balance
    const usdtContract = new ethers.Contract(USDT_ADDRESS, erc20Abi, provider);
    const usdtBalance = await usdtContract.balanceOf(walletAddress);
    
    return {
      data: {
        address: walletAddress,
        balances: {
          CELO: ethers.formatEther(celoBalance),
          cUSD: ethers.formatUnits(cusdBalance, 18),
          USDT: ethers.formatUnits(usdtBalance, 6)
        },
        network: 'celo-mainnet'
      }
    };
  } catch (error: any) {
    console.error('[API] Balance check error:', error);
    return { error: 'Failed to fetch balance', status: 500 };
  }
}

async function handleWalletTransfer(developer: DeveloperProfile, body: any) {
  const { from_external_user_id, to_address, amount, token = 'cUSD' } = body;
  
  if (!from_external_user_id || !to_address || !amount) {
    return { error: 'from_external_user_id, to_address, and amount required', status: 400 };
  }
  
  // Get the wallet
  const { data: wallet } = await supabase
    .from('developer_wallets')
    .select('*')
    .eq('developer_id', developer.user_id)
    .eq('external_user_id', from_external_user_id)
    .single();
  
  if (!wallet) {
    return { error: 'Wallet not found', status: 404 };
  }
  
  try {
    // Decrypt private key
    const bytes = CryptoJS.AES.decrypt(wallet.encrypted_private_key, WALLET_ENCRYPTION_SECRET);
    const privateKey = bytes.toString(CryptoJS.enc.Utf8);
    
    const provider = new ethers.JsonRpcProvider(CELO_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    
    let txHash: string;
    
    if (token === 'CELO') {
      const tx = await signer.sendTransaction({
        to: to_address,
        value: ethers.parseEther(amount.toString())
      });
      txHash = tx.hash;
    } else {
      const tokenAddress = token === 'cUSD' ? CUSD_ADDRESS : USDT_ADDRESS;
      const decimals = token === 'USDT' ? 6 : 18;
      
      const erc20Abi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);
      
      const tx = await contract.transfer(to_address, ethers.parseUnits(amount.toString(), decimals));
      txHash = tx.hash;
    }
    
    return {
      data: {
        transaction_hash: txHash,
        from: wallet.wallet_address,
        to: to_address,
        amount,
        token,
        network: 'celo-mainnet',
        explorer_url: `https://celoscan.io/tx/${txHash}`
      }
    };
  } catch (error: any) {
    console.error('[API] Transfer error:', error);
    return { error: error.message || 'Transfer failed', status: 500 };
  }
}

// VTU APIS
async function handleVtuAirtime(developer: DeveloperProfile, body: any) {
  const { network, phone, amount } = body;
  
  if (!network || !phone || !amount) {
    return { error: 'network, phone, and amount required', status: 400 };
  }
  
  const networkCodes: Record<string, string> = {
    'mtn': 'mtn',
    'airtel': 'airtel',
    'glo': 'glo',
    '9mobile': 'etisalat'
  };
  
  const networkCode = networkCodes[network.toLowerCase()];
  if (!networkCode) {
    return { error: 'Invalid network. Use: mtn, airtel, glo, 9mobile', status: 400 };
  }
  
  try {
    const requestId = `DEV_${developer.user_id.slice(0, 8)}_${Date.now()}`;
    
    const response = await fetch('https://vtuafrica.com/api/v1/airtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VTU_AFRICA_API_KEY}`
      },
      body: JSON.stringify({
        username: VTU_AFRICA_USERNAME,
        network: networkCode,
        phone,
        amount,
        request_id: requestId
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success' || result.code === '000') {
      return {
        data: {
          reference: requestId,
          status: 'success',
          network,
          phone,
          amount,
          message: result.message || 'Airtime sent successfully'
        }
      };
    } else {
      return { error: result.message || 'Airtime purchase failed', status: 400 };
    }
  } catch (error: any) {
    console.error('[API] VTU Airtime error:', error);
    return { error: 'Service temporarily unavailable', status: 503 };
  }
}

async function handleVtuData(developer: DeveloperProfile, body: any) {
  const { network, phone, plan_id } = body;
  
  if (!network || !phone || !plan_id) {
    return { error: 'network, phone, and plan_id required', status: 400 };
  }
  
  try {
    const requestId = `DEV_DATA_${developer.user_id.slice(0, 8)}_${Date.now()}`;
    
    const response = await fetch('https://vtuafrica.com/api/v1/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VTU_AFRICA_API_KEY}`
      },
      body: JSON.stringify({
        username: VTU_AFRICA_USERNAME,
        network: network.toLowerCase(),
        phone,
        plan: plan_id,
        request_id: requestId
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success' || result.code === '000') {
      return {
        data: {
          reference: requestId,
          status: 'success',
          network,
          phone,
          plan_id,
          message: result.message || 'Data purchased successfully'
        }
      };
    } else {
      return { error: result.message || 'Data purchase failed', status: 400 };
    }
  } catch (error: any) {
    console.error('[API] VTU Data error:', error);
    return { error: 'Service temporarily unavailable', status: 503 };
  }
}

// NOTIFICATION APIS
async function handleSendEmail(developer: DeveloperProfile, body: any) {
  const { to, subject, message, template } = body;
  
  if (!to || !subject || !message) {
    return { error: 'to, subject, and message required', status: 400 };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        to,
        subject,
        message,
        template: template || 'general',
        developer_id: developer.user_id
      }
    });
    
    if (error) throw error;
    
    return {
      data: {
        status: 'sent',
        to,
        subject,
        message_id: data?.id || `msg_${Date.now()}`
      }
    };
  } catch (error: any) {
    console.error('[API] Email error:', error);
    return { error: 'Failed to send email', status: 500 };
  }
}

async function handleSendSms(developer: DeveloperProfile, body: any) {
  const { phone, message } = body;
  
  if (!phone || !message) {
    return { error: 'phone and message required', status: 400 };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { phone, message, developer_id: developer.user_id }
    });
    
    if (error) throw error;
    
    return {
      data: {
        status: 'sent',
        phone,
        message_id: data?.id || `sms_${Date.now()}`
      }
    };
  } catch (error: any) {
    console.error('[API] SMS error:', error);
    return { error: 'Failed to send SMS', status: 500 };
  }
}

async function handleSendPush(developer: DeveloperProfile, body: any) {
  const { user_id, title, message, data: pushData } = body;
  
  if (!user_id || !title || !message) {
    return { error: 'user_id, title, and message required', status: 400 };
  }
  
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id,
        title,
        body: message,
        data: pushData,
        developer_id: developer.user_id
      }
    });
    
    if (error) throw error;
    
    return {
      data: {
        status: 'sent',
        user_id,
        title
      }
    };
  } catch (error: any) {
    console.error('[API] Push error:', error);
    return { error: 'Failed to send push notification', status: 500 };
  }
}

// VIDEO CONFERENCING APIS
async function handleCreateVideoRoom(developer: DeveloperProfile, body: any) {
  const { room_name, max_participants = 10, features = {} } = body;
  
  if (!room_name) {
    return { error: 'room_name required', status: 400 };
  }
  
  const roomId = `dev_${developer.user_id.slice(0, 8)}_${room_name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
  
  // Create room record
  const { error } = await supabase.from('developer_video_rooms').insert({
    developer_id: developer.user_id,
    room_id: roomId,
    room_name,
    max_participants,
    features,
    status: 'active',
    created_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('[API] Room creation error:', error);
    return { error: 'Failed to create room', status: 500 };
  }
  
  // Generate Jitsi room URL
  const jitsiDomain = 'meet.jit.si';
  const joinUrl = `https://${jitsiDomain}/${roomId}`;
  
  return {
    data: {
      room_id: roomId,
      room_name,
      join_url: joinUrl,
      embed_code: `<iframe src="${joinUrl}" style="height: 100%; width: 100%; border: 0;" allow="camera; microphone; fullscreen; display-capture"></iframe>`,
      max_participants,
      features: {
        screen_sharing: features.screen_sharing !== false,
        chat: features.chat !== false,
        recording: features.recording || false,
        ...features
      },
      integration: {
        type: 'jitsi',
        domain: jitsiDomain,
        config: {
          roomName: roomId,
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#1a1a1a'
          }
        }
      }
    }
  };
}

async function handleJoinVideoRoom(developer: DeveloperProfile, body: any) {
  const { room_id, user_name, user_id: externalUserId } = body;
  
  if (!room_id) {
    return { error: 'room_id required', status: 400 };
  }
  
  // Verify room exists and belongs to developer
  const { data: room } = await supabase
    .from('developer_video_rooms')
    .select('*')
    .eq('developer_id', developer.user_id)
    .eq('room_id', room_id)
    .single();
  
  if (!room) {
    return { error: 'Room not found', status: 404 };
  }
  
  if (room.status !== 'active') {
    return { error: 'Room is not active', status: 400 };
  }
  
  const jitsiDomain = 'meet.jit.si';
  const joinUrl = `https://${jitsiDomain}/${room_id}`;
  
  return {
    data: {
      room_id,
      join_url: joinUrl,
      user_name: user_name || 'Guest',
      external_user_id: externalUserId,
      webrtc_config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      },
      signaling_info: {
        type: 'jitsi',
        domain: jitsiDomain,
        room: room_id
      }
    }
  };
}

// AI CHAT API
async function handleAiChat(developer: DeveloperProfile, body: any) {
  const { message, context = [], model = 'default' } = body;
  
  if (!message) {
    return { error: 'message required', status: 400 };
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        history: context,
        developer_id: developer.user_id
      }
    });
    
    if (error) throw error;
    
    return {
      data: {
        response: data?.response || data?.message || 'No response generated',
        model,
        usage: {
          prompt_tokens: data?.usage?.prompt_tokens || 0,
          completion_tokens: data?.usage?.completion_tokens || 0
        }
      }
    };
  } catch (error: any) {
    console.error('[API] AI Chat error:', error);
    return { error: 'AI service temporarily unavailable', status: 503 };
  }
}

// ESCROW/PAYMENT APIS
async function handleCreateEscrow(developer: DeveloperProfile, body: any) {
  const { payer_external_id, payee_external_id, amount, currency = 'NGN', description } = body;
  
  if (!payer_external_id || !payee_external_id || !amount) {
    return { error: 'payer_external_id, payee_external_id, and amount required', status: 400 };
  }
  
  const escrowId = `escrow_${developer.user_id.slice(0, 8)}_${Date.now()}`;
  
  const { error } = await supabase.from('developer_escrows').insert({
    developer_id: developer.user_id,
    escrow_id: escrowId,
    payer_external_id,
    payee_external_id,
    amount,
    currency,
    description,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('[API] Escrow creation error:', error);
    return { error: 'Failed to create escrow', status: 500 };
  }
  
  // Trigger webhook for escrow creation
  triggerWebhook(developer.user_id, 'escrow.created', {
    escrow_id: escrowId,
    payer_external_id,
    payee_external_id,
    amount,
    currency,
    status: 'pending'
  });
  
  return {
    data: {
      escrow_id: escrowId,
      payer_external_id,
      payee_external_id,
      amount,
      currency,
      status: 'pending',
      description,
      actions: {
        fund: `/payments/escrow/${escrowId}/fund`,
        release: `/payments/escrow/${escrowId}/release`,
        refund: `/payments/escrow/${escrowId}/refund`
      }
    }
  };
}

async function handleReleaseEscrow(developer: DeveloperProfile, escrowId: string) {
  const { data: escrow, error: fetchError } = await supabase
    .from('developer_escrows')
    .select('*')
    .eq('developer_id', developer.user_id)
    .eq('escrow_id', escrowId)
    .single();
  
  if (fetchError || !escrow) {
    return { error: 'Escrow not found', status: 404 };
  }
  
  if (escrow.status !== 'funded') {
    return { error: `Cannot release escrow with status: ${escrow.status}`, status: 400 };
  }
  
  const { error } = await supabase
    .from('developer_escrows')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('escrow_id', escrowId);
  
  if (error) {
    return { error: 'Failed to release escrow', status: 500 };
  }
  
  // Trigger webhook for escrow release
  triggerWebhook(developer.user_id, 'escrow.released', {
    escrow_id: escrowId,
    amount: escrow.amount,
    payee_external_id: escrow.payee_external_id,
    released_at: new Date().toISOString()
  });
  
  return {
    data: {
      escrow_id: escrowId,
      status: 'released',
      released_at: new Date().toISOString(),
      amount: escrow.amount,
      payee_external_id: escrow.payee_external_id
    }
  };
}

// ============= MAIN ROUTER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Strip any prefix segments before 'developer-api' (e.g. /functions/v1/developer-api/...)
  const apiIdx = pathParts.indexOf('developer-api');
  if (apiIdx >= 0) {
    pathParts.splice(0, apiIdx + 1);
  }
  
  const endpoint = pathParts.join('/');
  const method = req.method;
  
  console.log(`[API] ${method} /${endpoint}`);
  
  // Get API key from header
  const apiKey = req.headers.get('x-api-key') || 
                 req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'API key required',
        hint: 'Include your API key in the x-api-key header or Authorization: Bearer YOUR_API_KEY'
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Validate API key
  const developer = await validateApiKey(apiKey);
  if (!developer) {
    return new Response(
      JSON.stringify({ error: 'Invalid API key or not a developer account' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Check rate limit
  const rateLimit = await checkRateLimit(developer.user_id, endpoint);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retry_after: 3600,
        limit: RATE_LIMITS[endpoint] || RATE_LIMITS['default']
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString()
        } 
      }
    );
  }
  
  // Check balance for paid endpoints
  const cost = API_PRICING[endpoint] || API_PRICING['default'];
  if (cost > 0 && developer.nc_balance < cost) {
    return new Response(
      JSON.stringify({ 
        error: 'Insufficient NC balance',
        required: cost,
        current_balance: developer.nc_balance,
        topup_url: 'https://naijalancers.name.ng/settings/wallet'
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  let result: { data?: any; error?: string; status?: number };
  let body: any = {};
  
  try {
    if (method === 'POST' || method === 'PUT') {
      body = await req.json().catch(() => ({}));
    }
  } catch {
    body = {};
  }
  
  const params = url.searchParams;
  
  // Route to handlers
  try {
    switch (endpoint) {
      // Wallet APIs
      case 'wallet/create':
        result = await handleWalletCreate(developer, body);
        break;
      case 'wallet/balance':
        result = await handleWalletBalance(developer, params);
        break;
      case 'wallet/transfer':
        result = await handleWalletTransfer(developer, body);
        break;
      
      // VTU APIs
      case 'vtu/airtime':
        result = await handleVtuAirtime(developer, body);
        break;
      case 'vtu/data':
        result = await handleVtuData(developer, body);
        break;
      
      // Notification APIs
      case 'notifications/email':
      case 'notifications/send':
        result = await handleSendEmail(developer, body);
        break;
      case 'notifications/sms':
        result = await handleSendSms(developer, body);
        break;
      case 'notifications/push':
        result = await handleSendPush(developer, body);
        break;
      
      // Video APIs
      case 'video/create-room':
        result = await handleCreateVideoRoom(developer, body);
        break;
      case 'video/join-room':
        result = await handleJoinVideoRoom(developer, body);
        break;
      
      // AI APIs
      case 'ai/chat':
        result = await handleAiChat(developer, body);
        break;
      
      // Payment/Escrow APIs
      case 'payments/escrow/create':
        result = await handleCreateEscrow(developer, body);
        break;
      
      // Webhook Management APIs
      case 'webhooks':
        if (method === 'GET') {
          // List webhooks
          const { data: webhooks } = await supabase
            .from('developer_webhooks')
            .select('id, webhook_url, events, is_active, description, created_at, last_triggered_at, failure_count')
            .eq('developer_id', developer.user_id);
          result = { data: { webhooks: webhooks || [] } };
        } else if (method === 'POST') {
          // Create webhook
          const { url: webhookUrl, events, description: webhookDesc } = body;
          if (!webhookUrl || !events?.length) {
            result = { error: 'url and events array required', status: 400 };
          } else {
            const { data: secretData } = await supabase.rpc('generate_webhook_secret');
            const { data: newWebhook, error: createErr } = await supabase
              .from('developer_webhooks')
              .insert({
                developer_id: developer.user_id,
                webhook_url: webhookUrl,
                webhook_secret: secretData || `whsec_${crypto.randomUUID().replace(/-/g, '')}`,
                events,
                description: webhookDesc
              })
              .select('id, webhook_url, webhook_secret, events, is_active, description')
              .single();
            
            if (createErr) {
              result = { error: createErr.message, status: 400 };
            } else {
              result = { data: newWebhook };
            }
          }
        } else {
          result = { error: 'Method not allowed', status: 405 };
        }
        break;
      
      case 'webhooks/events':
        // List available webhook events
        result = {
          data: {
            events: [
              { event: 'wallet.created', description: 'A new wallet was created' },
              { event: 'wallet.deposit', description: 'Funds deposited into a wallet' },
              { event: 'wallet.transfer', description: 'Transfer completed successfully' },
              { event: 'escrow.created', description: 'New escrow payment created' },
              { event: 'escrow.funded', description: 'Escrow was funded' },
              { event: 'escrow.released', description: 'Escrow funds released' },
              { event: 'escrow.refunded', description: 'Escrow was refunded' },
              { event: 'vtu.airtime.success', description: 'Airtime purchase completed' },
              { event: 'vtu.data.success', description: 'Data purchase completed' },
              { event: 'video.room.created', description: 'Video room created' },
              { event: 'video.room.ended', description: 'Video session ended' }
            ]
          }
        };
        break;
      
      default:
        // Check for dynamic routes
        if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/release')) {
          const escrowId = pathParts[2];
          result = await handleReleaseEscrow(developer, escrowId);
        } else if (endpoint.startsWith('webhooks/') && method === 'DELETE') {
          // Delete webhook
          const webhookId = pathParts[1];
          const { error: delErr } = await supabase
            .from('developer_webhooks')
            .delete()
            .eq('id', webhookId)
            .eq('developer_id', developer.user_id);
          
          if (delErr) {
            result = { error: 'Webhook not found', status: 404 };
          } else {
            result = { data: { deleted: true } };
          }
        } else if (endpoint.startsWith('webhooks/') && endpoint.endsWith('/test') && method === 'POST') {
          // Test webhook
          const webhookId = pathParts[1];
          const { data: testResult, error: testErr } = await supabase.functions.invoke('developer-webhook', {
            body: { action: 'test', webhook_id: webhookId }
          });
          
          if (testErr) {
            result = { error: testErr.message, status: 500 };
          } else {
            result = { data: testResult };
          }
        } else if (endpoint.startsWith('webhooks/') && endpoint.endsWith('/logs') && method === 'GET') {
          // Get webhook logs
          const webhookId = pathParts[1];
          const { data: logs } = await supabase
            .from('webhook_logs')
            .select('*')
            .eq('webhook_id', webhookId)
            .order('created_at', { ascending: false })
            .limit(50);
          
          result = { data: { logs: logs || [] } };
        } else {
          result = { 
            error: 'Endpoint not found', 
            status: 404 
          };
        }
    }
  } catch (error: any) {
    console.error(`[API] Handler error for ${endpoint}:`, error);
    result = { error: error.message || 'Internal server error', status: 500 };
  }
  
  const statusCode = result.status || (result.error ? 400 : 200);
  
  // Deduct balance and log usage
  if (statusCode < 400 && cost > 0) {
    await deductBalance(developer.user_id, cost);
  }
  await logApiUsage(developer.user_id, endpoint, method, statusCode, statusCode < 400 ? cost : 0);
  
  return new Response(
    JSON.stringify(result.error ? { error: result.error } : result.data),
    { 
      status: statusCode, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      } 
    }
  );
});
