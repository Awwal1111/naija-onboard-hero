import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.7.0";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";
import { ESCROW_ABI, ESCROW_BYTECODE } from "./escrow-contract.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key',
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
const USDT_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  'payments/payout': 50,
  'payments/credit': 50,
  'notifications/send': 200,
  'notifications/push': 500,
  'notifications/sms': 100,
  'video/create-room': 20,
  'video/join-room': 100,
  'ai/chat': 100,
  'ramp/quote/buy': 200,
  'ramp/quote/sell': 200,
  'ramp/session/buy': 100,
  'ramp/session/sell': 100,
  'ramp/session': 200,
  'contracts/deploy': 20,
  'contracts/call': 100,
  'contracts/read': 500,
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
  'payments/payout': 5,
  'payments/credit': 5,
  'notifications/send': 5, // Email
  'notifications/push': 0.5,
  'notifications/sms': 4,
  'video/create-room': 50,
  'video/join-room': 0,
  'ai/chat': 1,
  'ramp/quote/buy': 0, // Free quote
  'ramp/quote/sell': 0, // Free quote
  'ramp/session/buy': 20, // Hosted onramp session
  'ramp/session/sell': 20, // Hosted offramp session
  'ramp/session': 0, // Status check is free
  'contracts/deploy': 50, // 50 NC base fee + gas (or NC equiv if platform pays)
  'contracts/call': 5,    // 5 NC base fee + gas
  'contracts/read': 0,    // Read-only is free (no gas, no fee)
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

// ============= CONTRACT APIS (Celo) =============

const CELO_GAS_TO_NC_RATE = 5500; // 1 CELO ~ ₦5,500 base; +20% markup applied below
const PLATFORM_GAS_MARKUP = 1.20;

async function getDeveloperSigner(developer: DeveloperProfile, externalUserId: string | undefined) {
  // If externalUserId provided -> use developer's managed wallet for that end-user.
  // Otherwise -> use developer's OWN platform wallet (dev_<userId>).
  const lookupId = externalUserId || `dev_${developer.user_id}`;
  let { data: wallet } = await supabase
    .from('developer_wallets')
    .select('wallet_address, encrypted_private_key')
    .eq('developer_id', developer.user_id)
    .eq('external_user_id', lookupId)
    .maybeSingle();

  // Auto-provision the developer's own signing wallet if missing
  if (!wallet && !externalUserId) {
    const w = ethers.Wallet.createRandom();
    const enc = CryptoJS.AES.encrypt(w.privateKey, WALLET_ENCRYPTION_SECRET).toString();
    const { error } = await supabase.from('developer_wallets').insert({
      developer_id: developer.user_id,
      external_user_id: lookupId,
      wallet_address: w.address.toLowerCase(),
      encrypted_private_key: enc,
    });
    if (error) throw new Error('Could not provision developer signing wallet');
    wallet = { wallet_address: w.address.toLowerCase(), encrypted_private_key: enc };
  }
  if (!wallet) throw new Error('Wallet not found for external_user_id');

  const bytes = CryptoJS.AES.decrypt(wallet.encrypted_private_key, WALLET_ENCRYPTION_SECRET);
  const privateKey = bytes.toString(CryptoJS.enc.Utf8);
  const provider = new ethers.JsonRpcProvider(CELO_RPC);
  return { signer: new ethers.Wallet(privateKey, provider), provider, address: wallet.wallet_address };
}

function getPlatformRelayer() {
  const pk = Deno.env.get('CELO_MASTER_WALLET_PRIVATE_KEY');
  if (!pk) throw new Error('Platform relayer not configured');
  const provider = new ethers.JsonRpcProvider(CELO_RPC);
  return { signer: new ethers.Wallet(pk, provider), provider };
}

async function chargeNcForGas(developer: DeveloperProfile, gasCostCelo: bigint) {
  const celo = Number(ethers.formatEther(gasCostCelo));
  const nc = Math.ceil(celo * CELO_GAS_TO_NC_RATE * PLATFORM_GAS_MARKUP);
  if ((developer.wallet_balance || 0) < nc) {
    throw new Error(`Insufficient NC for platform gas. Required ~${nc} NC`);
  }
  const ok = await deductBalance(developer.user_id, nc);
  if (!ok) throw new Error('Failed to deduct NC for platform gas');
  return { nc, celo };
}

async function handleContractDeploy(developer: DeveloperProfile, body: any) {
  const { bytecode, abi, constructor_args = [], external_user_id, gas_payer = 'wallet', value } = body;
  if (!bytecode || !abi) return { error: 'bytecode and abi required', status: 400 };
  if (!Array.isArray(abi)) return { error: 'abi must be an array', status: 400 };

  try {
    let signer: ethers.Wallet;
    let fromAddress: string;
    let provider: ethers.JsonRpcProvider;
    let platformGasNc = 0;

    if (gas_payer === 'platform') {
      const r = getPlatformRelayer();
      signer = r.signer; provider = r.provider; fromAddress = await signer.getAddress();
    } else {
      const w = await getDeveloperSigner(developer, external_user_id);
      signer = w.signer; provider = w.provider; fromAddress = w.address;
    }

    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    const deployTx = await factory.getDeployTransaction(...constructor_args, value ? { value: ethers.parseEther(String(value)) } : {});

    // Gas pre-check
    const gasEstimate = await provider.estimateGas({ ...deployTx, from: fromAddress });
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
    const gasCost = gasEstimate * gasPrice;

    if (gas_payer === 'wallet') {
      const bal = await provider.getBalance(fromAddress);
      if (bal < gasCost) {
        return { error: 'Insufficient CELO for gas', status: 402, data: { required_wei: gasCost.toString(), balance_wei: bal.toString(), from: fromAddress } };
      }
    } else {
      const charged = await chargeNcForGas(developer, gasCost);
      platformGasNc = charged.nc;
    }

    const contract = await factory.deploy(...constructor_args, value ? { value: ethers.parseEther(String(value)) } : {});
    const receipt = await contract.deploymentTransaction()?.wait();
    const address = await contract.getAddress();

    triggerWebhook(developer.user_id, 'contract.deployed', {
      address, tx_hash: receipt?.hash, deployer: fromAddress, gas_payer
    });

    return {
      data: {
        address,
        transaction_hash: receipt?.hash,
        deployer: fromAddress,
        gas_used: receipt?.gasUsed?.toString(),
        gas_payer,
        platform_gas_nc_charged: platformGasNc || undefined,
        explorer_url: `https://celoscan.io/address/${address}`,
        network: 'celo-mainnet'
      }
    };
  } catch (e: any) {
    console.error('[API] contract deploy error', e);
    return { error: e.message || 'Deploy failed', status: 500 };
  }
}

async function handleContractCall(developer: DeveloperProfile, body: any) {
  const { address, abi, method, args = [], external_user_id, gas_payer = 'wallet', value } = body;
  if (!address || !abi || !method) return { error: 'address, abi, method required', status: 400 };

  try {
    let signer: ethers.Wallet;
    let from: string;
    let provider: ethers.JsonRpcProvider;
    let platformGasNc = 0;

    if (gas_payer === 'platform') {
      const r = getPlatformRelayer();
      signer = r.signer; provider = r.provider; from = await signer.getAddress();
    } else {
      const w = await getDeveloperSigner(developer, external_user_id);
      signer = w.signer; provider = w.provider; from = w.address;
    }

    const contract = new ethers.Contract(address, abi, signer);
    if (typeof contract[method] !== 'function') return { error: `Method ${method} not found in ABI`, status: 400 };

    const overrides: any = value ? { value: ethers.parseEther(String(value)) } : {};
    const gasEstimate = await contract[method].estimateGas(...args, overrides);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
    const gasCost = gasEstimate * gasPrice;

    if (gas_payer === 'wallet') {
      const bal = await provider.getBalance(from);
      if (bal < gasCost + (overrides.value || 0n)) {
        return { error: 'Insufficient CELO for gas + value', status: 402, data: { required_wei: (gasCost + (overrides.value || 0n)).toString(), balance_wei: bal.toString(), from } };
      }
    } else {
      const charged = await chargeNcForGas(developer, gasCost);
      platformGasNc = charged.nc;
    }

    const tx = await contract[method](...args, overrides);
    const receipt = await tx.wait();

    return {
      data: {
        transaction_hash: receipt.hash,
        from, to: address, method,
        gas_used: receipt.gasUsed?.toString(),
        gas_payer,
        platform_gas_nc_charged: platformGasNc || undefined,
        status: receipt.status === 1 ? 'success' : 'failed',
        explorer_url: `https://celoscan.io/tx/${receipt.hash}`
      }
    };
  } catch (e: any) {
    console.error('[API] contract call error', e);
    return { error: e.message || 'Call failed', status: 500 };
  }
}

async function handleContractRead(developer: DeveloperProfile, body: any) {
  const { address, abi, method, args = [] } = body;
  if (!address || !abi || !method) return { error: 'address, abi, method required', status: 400 };
  try {
    const provider = new ethers.JsonRpcProvider(CELO_RPC);
    const contract = new ethers.Contract(address, abi, provider);
    if (typeof contract[method] !== 'function') return { error: `Method ${method} not found in ABI`, status: 400 };
    const raw = await contract[method](...args);
    // Normalize BigInt for JSON
    const normalize = (v: any): any => {
      if (typeof v === 'bigint') return v.toString();
      if (Array.isArray(v)) return v.map(normalize);
      if (v && typeof v === 'object' && v.toArray) return normalize(v.toArray());
      return v;
    };
    return { data: { result: normalize(raw), address, method } };
  } catch (e: any) {
    console.error('[API] contract read error', e);
    return { error: e.message || 'Read failed', status: 500 };
  }
}


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
  const { payer_external_id, payee_external_id, payee_user_id, payee_email, amount, currency = 'NGN', description } = body;

  if (!payer_external_id || !payee_external_id || !amount) {
    return { error: 'payer_external_id, payee_external_id, and amount required', status: 400 };
  }
  if (!payee_user_id && !payee_email) {
    return { error: 'payee_user_id or payee_email required (escrow releases pay a NaijaLancers user)', status: 400 };
  }
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return { error: 'amount must be a positive number', status: 400 };
  }

  // Verify payee exists
  let resolvedPayee: string | null = payee_user_id || null;
  if (!resolvedPayee && payee_email) {
    const { data } = await supabase.from('profiles').select('user_id').eq('email', payee_email).maybeSingle();
    resolvedPayee = (data as any)?.user_id || null;
    if (!resolvedPayee) return { error: 'Payee email not found on NaijaLancers', status: 404 };
  } else if (resolvedPayee) {
    const { data } = await supabase.from('profiles').select('user_id').eq('user_id', resolvedPayee).maybeSingle();
    if (!data) return { error: 'Payee user_id not found', status: 404 };
  }

  const escrowId = `escrow_${developer.user_id.slice(0, 8)}_${Date.now()}`;

  const { error } = await supabase.from('developer_escrows').insert({
    developer_id: developer.user_id,
    escrow_id: escrowId,
    payer_external_id,
    payee_external_id,
    payee_user_id: resolvedPayee,
    payee_email: payee_email || null,
    amount: amt,
    currency,
    description,
    status: 'pending',
  });

  if (error) {
    console.error('[API] Escrow creation error:', error);
    return { error: 'Failed to create escrow', status: 500 };
  }

  triggerWebhook(developer.user_id, 'escrow.created', {
    escrow_id: escrowId, payer_external_id, payee_external_id, payee_user_id: resolvedPayee, amount: amt, currency, status: 'pending',
  });

  return {
    data: {
      escrow_id: escrowId,
      payer_external_id,
      payee_external_id,
      payee_user_id: resolvedPayee,
      amount: amt,
      currency,
      status: 'pending',
      description,
      actions: {
        fund: `/payments/escrow/${escrowId}/fund`,
        release: `/payments/escrow/${escrowId}/release`,
        refund: `/payments/escrow/${escrowId}/refund`,
      },
    },
  };
}

async function handleFundEscrow(developer: DeveloperProfile, escrowId: string) {
  const { data, error } = await supabase.rpc('fund_developer_escrow', {
    p_developer_id: developer.user_id,
    p_escrow_id: escrowId,
  });
  if (error) {
    console.error('[API] fund_developer_escrow error:', error);
    return { error: 'Failed to fund escrow', status: 500 };
  }
  const res = data as any;
  if (!res?.ok) {
    const msg = String(res?.error || 'Failed to fund escrow');
    const status = msg.toLowerCase().includes('insufficient') ? 402
      : msg.toLowerCase().includes('not found') ? 404 : 400;
    return { error: msg, status };
  }
  triggerWebhook(developer.user_id, 'escrow.funded', {
    escrow_id: escrowId, amount: res.amount, funded_at: res.funded_at,
  });
  return { data: { escrow_id: escrowId, status: 'funded', amount: res.amount, funded_at: res.funded_at } };
}

async function handleReleaseEscrow(developer: DeveloperProfile, escrowId: string) {
  const { data, error } = await supabase.rpc('release_developer_escrow', {
    p_developer_id: developer.user_id,
    p_escrow_id: escrowId,
  });
  if (error) {
    console.error('[API] release_developer_escrow error:', error);
    return { error: 'Failed to release escrow', status: 500 };
  }
  const res = data as any;
  if (!res?.ok) {
    const msg = String(res?.error || 'Failed to release escrow');
    const status = msg.toLowerCase().includes('not found') ? 404 : 400;
    return { error: msg, status };
  }
  triggerWebhook(developer.user_id, 'escrow.released', {
    escrow_id: escrowId, amount: res.amount, payee_user_id: res.payee_user_id, released_at: res.released_at,
  });
  return { data: { escrow_id: escrowId, status: 'released', amount: res.amount, payee_user_id: res.payee_user_id, released_at: res.released_at } };
}

async function handleRefundEscrow(developer: DeveloperProfile, escrowId: string, body: any) {
  const reason = (body && typeof body.reason === 'string') ? body.reason.slice(0, 500) : null;
  const { data, error } = await supabase.rpc('refund_developer_escrow', {
    p_developer_id: developer.user_id,
    p_escrow_id: escrowId,
    p_reason: reason,
  });
  if (error) {
    console.error('[API] refund_developer_escrow error:', error);
    return { error: 'Failed to refund escrow', status: 500 };
  }
  const res = data as any;
  if (!res?.ok) {
    const msg = String(res?.error || 'Failed to refund escrow');
    const status = msg.toLowerCase().includes('not found') ? 404 : 400;
    return { error: msg, status };
  }
  triggerWebhook(developer.user_id, 'escrow.refunded', {
    escrow_id: escrowId, amount: res.amount, reason, refunded_at: res.refunded_at,
  });
  return { data: { escrow_id: escrowId, status: 'refunded', amount: res.amount, reason, refunded_at: res.refunded_at } };
}

// QUIDAX RAMP QUOTES — read-only NGN<>USDT (CELO) live pricing
const QUIDAX_RAMP_BASE = 'https://ramp-be.quidax.io/api/v1/merchants';

async function handleRampQuoteBuy(body: any) {
  const fiatAmount = Number(body?.fiat_amount);
  const token = String(body?.token || 'usdt').toLowerCase();
  if (!fiatAmount || fiatAmount <= 0) {
    return { error: 'fiat_amount (NGN) required and must be > 0', status: 400 };
  }
  const QUIDAX_PRIVATE_KEY = Deno.env.get('QUIDAX_PRIVATE_KEY');
  if (!QUIDAX_PRIVATE_KEY) {
    return { error: 'Ramp service not configured', status: 503 };
  }
  try {
    const url = `${QUIDAX_RAMP_BASE}/purchase_quotes/buy?currency=ngn&token=${encodeURIComponent(token)}&fiat_amount=${fiatAmount}&token_network=celo`;
    const resp = await fetch(url, {
      headers: { accept: 'application/json', 'x-private-key': QUIDAX_PRIVATE_KEY },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { error: data?.message || 'Quote unavailable', status: resp.status };
    }
    return { data: { side: 'buy', fiat_currency: 'NGN', fiat_amount: fiatAmount, token, network: 'celo', quote: data?.data || data } };
  } catch (e: any) {
    console.error('[API] ramp buy quote error:', e);
    return { error: 'Failed to fetch quote', status: 502 };
  }
}

async function handleRampQuoteSell(body: any) {
  const tokenAmount = Number(body?.token_amount);
  const token = String(body?.token || 'usdt').toUpperCase();
  if (!tokenAmount || tokenAmount <= 0) {
    return { error: 'token_amount required and must be > 0', status: 400 };
  }
  const QUIDAX_PRIVATE_KEY = Deno.env.get('QUIDAX_PRIVATE_KEY');
  if (!QUIDAX_PRIVATE_KEY) {
    return { error: 'Ramp service not configured', status: 503 };
  }
  try {
    const url = `${QUIDAX_RAMP_BASE}/purchase_quotes/sell?token=${encodeURIComponent(token)}&currency=NGN&token_amount=${tokenAmount}&token_network=CELO`;
    const resp = await fetch(url, {
      headers: { accept: 'application/json', 'x-private-key': QUIDAX_PRIVATE_KEY },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { error: data?.message || 'Quote unavailable', status: resp.status };
    }
    return { data: { side: 'sell', fiat_currency: 'NGN', token_amount: tokenAmount, token, network: 'CELO', quote: data?.data || data } };
  } catch (e: any) {
    console.error('[API] ramp sell quote error:', e);
    return { error: 'Failed to fetch quote', status: 502 };
  }
}

// HOSTED RAMP SESSIONS — developer creates a session, end-user completes on naijalancers.name.ng
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://naijalancers.name.ng';

async function handleCreateRampSession(developer: DeveloperProfile, side: 'buy' | 'sell', body: any) {
  const token = String(body?.token || 'usdt').toLowerCase();
  const fiatAmount = side === 'buy' ? Number(body?.fiat_amount) : null;
  const tokenAmount = side === 'sell' ? Number(body?.token_amount) : null;
  const externalUserId = body?.external_user_id ? String(body.external_user_id).slice(0, 128) : null;
  const externalUserEmail = body?.external_user_email ? String(body.external_user_email).slice(0, 256) : null;
  const metadata = (body?.metadata && typeof body.metadata === 'object') ? body.metadata : {};
  const successUrl = body?.success_url ? String(body.success_url).slice(0, 500) : null;
  const cancelUrl = body?.cancel_url ? String(body.cancel_url).slice(0, 500) : null;

  if (side === 'buy' && (!fiatAmount || fiatAmount < 3000)) {
    return { error: 'fiat_amount required and must be >= 3000 NGN', status: 400 };
  }
  if (side === 'sell' && (!tokenAmount || tokenAmount <= 0)) {
    return { error: 'token_amount required and must be > 0', status: 400 };
  }

  const sessionId = `rs_${side}_${developer.user_id.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const redirectUrl = `${APP_BASE_URL}/ramp/${sessionId}`;

  const { error } = await supabase.from('developer_ramp_sessions').insert({
    developer_id: developer.user_id,
    session_id: sessionId,
    type: side,
    token,
    fiat_amount: fiatAmount,
    token_amount: tokenAmount,
    external_user_id: externalUserId,
    external_user_email: externalUserEmail,
    metadata: { ...metadata, success_url: successUrl, cancel_url: cancelUrl },
    status: 'pending',
    redirect_url: redirectUrl,
  });

  if (error) {
    console.error('[API] Ramp session create error:', error);
    return { error: 'Failed to create ramp session', status: 500 };
  }

  triggerWebhook(developer.user_id, `ramp.${side}.session.created`, {
    session_id: sessionId,
    type: side,
    token,
    fiat_amount: fiatAmount,
    token_amount: tokenAmount,
    external_user_id: externalUserId,
    redirect_url: redirectUrl,
  });

  return {
    data: {
      session_id: sessionId,
      type: side,
      token,
      fiat_amount: fiatAmount,
      token_amount: tokenAmount,
      status: 'pending',
      redirect_url: redirectUrl,
      expires_in_seconds: 7200,
    },
  };
}

async function handleGetRampSession(developer: DeveloperProfile, sessionId: string) {
  if (!sessionId) return { error: 'session_id required', status: 400 };
  const { data, error } = await supabase
    .from('developer_ramp_sessions')
    .select('session_id, type, token, fiat_amount, token_amount, status, reference, redirect_url, external_user_id, external_user_email, naijalancers_user_id, completed_at, expires_at, created_at')
    .eq('developer_id', developer.user_id)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error || !data) return { error: 'Session not found', status: 404 };
  return { data };
}


async function handlePayoutCredit(developer: DeveloperProfile, body: any) {
  const { user_id, email, amount, reference, description } = body || {};

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return { error: 'amount (positive number) required', status: 400 };
  }
  if (!user_id && !email) {
    return { error: 'user_id or email required', status: 400 };
  }

  // Resolve recipient
  let targetId: string | null = user_id || null;
  if (!targetId && email) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    targetId = (data as any)?.user_id || null;
  }
  if (!targetId) return { error: 'Recipient user not found', status: 404 };

  const txRef = reference || `dev_payout_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  const { data, error } = await supabase.rpc('developer_payout_atomic', {
    p_developer_id: developer.user_id,
    p_recipient_user_id: targetId,
    p_amount: amt,
    p_reference: txRef,
    p_description: description || null,
  });

  if (error) {
    console.error('[API] developer_payout_atomic error:', error);
    return { error: 'Payout failed', status: 500 };
  }
  const res = data as any;
  if (!res?.ok) {
    const msg = String(res?.error || 'Payout failed');
    const status = msg.toLowerCase().includes('insufficient') ? 402
      : msg.toLowerCase().includes('not found') ? 404 : 400;
    return { error: msg, status };
  }

  triggerWebhook(developer.user_id, 'wallet.payout', {
    reference: txRef,
    recipient_user_id: res.recipient_user_id,
    amount: res.amount,
    currency: 'NC',
  });

  return {
    data: {
      reference: txRef,
      recipient_user_id: res.recipient_user_id,
      amount: res.amount,
      currency: 'NC',
      status: 'completed',
      developer_balance_after: res.developer_balance_after,
    },
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
  
  // Check balance for paid endpoints (uses developer's NC wallet_balance)
  const cost = API_PRICING[endpoint] || API_PRICING['default'];
  if (cost > 0 && (developer.wallet_balance || 0) < cost) {
    return new Response(
      JSON.stringify({ 
        error: 'Insufficient NC balance',
        required: cost,
        current_balance: developer.wallet_balance || 0,
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

  // ===== Idempotency (mutating endpoints only) =====
  const MUTATING = method === 'POST' || method === 'PUT' || method === 'DELETE';
  const idempotencyKey = (req.headers.get('idempotency-key') || '').slice(0, 200).trim();
  const apiKeyHash = await sha256Hex(apiKey);
  const requestHash = MUTATING && idempotencyKey
    ? await sha256Hex(`${method}:${endpoint}:${JSON.stringify(body || {})}`)
    : '';

  if (MUTATING && idempotencyKey) {
    const { data: cached } = await supabase
      .from('api_idempotency')
      .select('response_body, status_code, request_hash, created_at')
      .eq('api_key_hash', apiKeyHash)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (cached) {
      // 24h TTL
      const ageMs = Date.now() - new Date((cached as any).created_at).getTime();
      if (ageMs < 86_400_000) {
        if ((cached as any).request_hash !== requestHash) {
          return new Response(
            JSON.stringify({ error: 'Idempotency-Key reused with a different request body' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify((cached as any).response_body),
          {
            status: (cached as any).status_code,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Idempotent-Replay': 'true' },
          }
        );
      }
    }
  }

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

      // Contract APIs (Celo)
      case 'contracts/deploy':
        result = await handleContractDeploy(developer, body);
        break;
      case 'contracts/call':
        result = await handleContractCall(developer, body);
        break;
      case 'contracts/read':
        result = await handleContractRead(developer, body);
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
      case 'payments/payout':
      case 'payments/credit':
        result = await handlePayoutCredit(developer, body);
        break;

      // Quidax Ramp Quotes (read-only, NGN<>USDT live pricing)
      case 'ramp/quote/buy':
        result = await handleRampQuoteBuy(body);
        break;
      case 'ramp/quote/sell':
        result = await handleRampQuoteSell(body);
        break;

      // Hosted Ramp Sessions (developer creates, end-user completes on naijalancers.name.ng)
      case 'ramp/session/buy':
        result = await handleCreateRampSession(developer, 'buy', body);
        break;
      case 'ramp/session/sell':
        result = await handleCreateRampSession(developer, 'sell', body);
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
        if (endpoint.startsWith('ramp/session/') && method === 'GET') {
          const sid = pathParts[2];
          result = await handleGetRampSession(developer, sid);
        } else if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/release')) {
          const escrowId = pathParts[2];
          result = await handleReleaseEscrow(developer, escrowId);
        } else if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/fund')) {
          const escrowId = pathParts[2];
          result = await handleFundEscrow(developer, escrowId);
        } else if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/refund')) {
          const escrowId = pathParts[2];
          result = await handleRefundEscrow(developer, escrowId, body);
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
  const responseBody = result.error ? { error: result.error } : (result.data ?? {});

  // Deduct balance and log usage
  if (statusCode < 400 && cost > 0) {
    await deductBalance(developer.user_id, cost);
  }
  await logApiUsage(developer.user_id, endpoint, method, statusCode, statusCode < 400 ? cost : 0);

  // Persist idempotent response (only successful 2xx — failed mutations can be retried freely)
  if (MUTATING && idempotencyKey && statusCode >= 200 && statusCode < 300) {
    await supabase.from('api_idempotency').upsert({
      developer_id: developer.user_id,
      api_key_hash: apiKeyHash,
      idempotency_key: idempotencyKey,
      endpoint,
      request_hash: requestHash,
      response_body: responseBody,
      status_code: statusCode,
    }, { onConflict: 'api_key_hash,idempotency_key' }).then(() => {}, (e) => console.error('[API] idempotency save error', e));
  }

  return new Response(
    JSON.stringify(responseBody),
    {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    }
  );
});
