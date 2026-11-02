import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Rate limit configurations per endpoint (requests per hour)
const RATE_LIMITS: Record<string, number> = {
  'payments/escrow/create': 50,
  'payments/escrow': 100,
  'payments/escrow/dispute': 20,
  'payments/escrow/release': 50,
  'payments/escrow/refund': 50,
  'payments/payout': 50,
  'payments/charge/session': 100,
  'webhooks': 100,
  'webhooks/events': 100,
  'default': 1000
};

// Pricing per API call (in NC - Naira Credits, 1 NC = 1 NGN)
const API_PRICING: Record<string, number> = {
  'payments/escrow/create': 10,
  'payments/escrow/release': 0,
  'payments/payout': 5,
  'payments/charge/session': 2,
  'default': 0
};

interface DeveloperProfile {
  user_id: string;
  account_type: string;
  api_key: string;
  wallet_balance: number;
  mode: 'live' | 'sandbox';
}

// Validate API key via the secure SQL function. The edge function NEVER reads
// user_secrets directly anymore — raw keys are no longer stored in the table.
async function validateApiKey(apiKey: string): Promise<DeveloperProfile | null> {
  if (!apiKey) {
    console.log('[API] No API key provided');
    return null;
  }

  const isSandboxKey = apiKey.startsWith('nl_test_');
  console.log(`[API] Validating ${isSandboxKey ? 'SANDBOX' : 'LIVE'} key (last4=${apiKey.slice(-4)})`);

  const { data: rows, error: rpcError } = await supabase
    .rpc('validate_developer_api_key', { p_key: apiKey });

  if (rpcError) {
    console.log('[API] validate_developer_api_key error:', rpcError.message);
    return null;
  }
  const match = Array.isArray(rows) ? rows[0] : null;
  if (!match) {
    console.log('[API] No matching API key');
    return null;
  }
  if (!isSandboxKey && match.enabled === false) {
    console.log('[API] Live API key disabled by the developer');
    return null;
  }

  // Confirm developer account + load wallet balance
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, account_type, wallet_balance')
    .eq('user_id', match.user_id)
    .eq('account_type', 'developer')
    .maybeSingle();

  if (profileError || !profileData) {
    console.log('[API] Not a developer account');
    return null;
  }

  return {
    user_id: profileData.user_id,
    account_type: profileData.account_type,
    api_key: apiKey,
    wallet_balance: profileData.wallet_balance,
    mode: isSandboxKey ? 'sandbox' : 'live',
  } as DeveloperProfile;
}


// Atomic rate-limit check (eliminates TOCTOU: a single SQL statement
// increments + reports the bucket count in one shot).
async function checkRateLimit(userId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number }> {
  const escrowMatch = endpoint.match(/^payments\/escrow\/[^/]+(?:\/(fund|release|refund|dispute))?$/);
  const rateKey = escrowMatch
    ? escrowMatch[1] ? `payments/escrow/${escrowMatch[1]}` : 'payments/escrow'
    : endpoint;
  const limit = RATE_LIMITS[rateKey] || RATE_LIMITS['default'];
  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_limit: limit,
  });
  if (error) {
    console.error('[API] rate limit RPC failed, failing open:', error.message);
    return { allowed: true, remaining: limit };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: !!row?.allowed, remaining: Number(row?.remaining ?? 0) };
}

// Log API usage
async function logApiUsage(
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  cost: number,
  isSandbox: boolean,
) {
  await supabase.from('api_usage').insert({
    user_id: userId,
    endpoint,
    method,
    status_code: statusCode,
    cost_nc: cost,
    is_sandbox: isSandbox,
    created_at: new Date().toISOString(),
  });
}

// ============= SANDBOX RESPONSES =============
// Implementation lives in ./_sandbox.ts so it can be unit-tested in isolation
// (no Supabase client, no env requirements, no module-level side effects).
// The tests in ./sandbox_test.ts statically verify that _sandbox.ts contains
// no DB/network calls.
export { handleSandbox } from "./_sandbox.ts";
import { handleSandbox as _handleSandbox } from "./_sandbox.ts";
// Local alias for the rest of this file (kept for diff minimality).
const handleSandbox = _handleSandbox;

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

// API HANDLERS: Hosted NC escrow and payments only.

// ESCROW/PAYMENT APIS
async function handleCreateEscrow(developer: DeveloperProfile, body: any) {
  const { payer_external_id, payee_external_id, payee_user_id, payee_email, amount, description } = body;
  const inspectionDays = Number(body?.inspection_period_days ?? 5);

  if (typeof payer_external_id !== 'string' || !payer_external_id.trim() || payer_external_id.length > 128 ||
      typeof payee_external_id !== 'string' || !payee_external_id.trim() || payee_external_id.length > 128) {
    return { error: 'payer_external_id and payee_external_id are required strings up to 128 characters', status: 400 };
  }
  if (!payee_user_id && !payee_email) {
    return { error: 'payee_user_id or payee_email required (escrow releases pay a NaijaLancers user)', status: 400 };
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) {
    return { error: 'amount must be a positive number up to 1,000,000 NC', status: 400 };
  }
  if (!Number.isInteger(inspectionDays) || inspectionDays < 1 || inspectionDays > 30) {
    return { error: 'inspection_period_days must be an integer between 1 and 30', status: 400 };
  }
  if (typeof description === 'string' && description.length > 500) {
    return { error: 'description must be 500 characters or fewer', status: 400 };
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
    currency: 'NC',
    description: typeof description === 'string' ? description : null,
    inspection_period_days: inspectionDays,
    status: 'pending',
  });

  if (error) {
    console.error('[API] Escrow creation error:', error);
    return { error: 'Failed to create escrow', status: 500 };
  }

  triggerWebhook(developer.user_id, 'escrow.created', {
    escrow_id: escrowId, payer_external_id, payee_external_id, payee_user_id: resolvedPayee, amount: amt, currency: 'NC', status: 'pending', inspection_period_days: inspectionDays,
  });

  return {
    data: {
      escrow_id: escrowId,
      payer_external_id,
      payee_external_id,
      payee_user_id: resolvedPayee,
      amount: amt,
      currency: 'NC',
      inspection_period_days: inspectionDays,
      status: 'pending',
      description,
      actions: {
        fund: `/payments/escrow/${escrowId}/fund`,
        release: `/payments/escrow/${escrowId}/release`,
        refund: `/payments/escrow/${escrowId}/refund`,
        dispute: `/payments/escrow/${escrowId}/dispute`,
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
    escrow_id: escrowId, amount: res.amount, funded_at: res.funded_at, auto_release_at: res.auto_release_at,
  });
  return { data: { escrow_id: escrowId, status: 'funded', amount: res.amount, funded_at: res.funded_at, auto_release_at: res.auto_release_at } };
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

async function handleGetEscrow(developer: DeveloperProfile, escrowId: string) {
  if (!escrowId) return { error: 'escrow_id required', status: 400 };
  const { data, error } = await supabase
    .from('developer_escrows')
    .select('escrow_id, payer_external_id, payee_external_id, payee_user_id, amount, currency, description, status, inspection_period_days, created_at, funded_at, auto_release_at, disputed_at, dispute_reason, released_at, refunded_at, refund_reason')
    .eq('developer_id', developer.user_id)
    .eq('escrow_id', escrowId)
    .maybeSingle();
  if (error || !data) return { error: 'Escrow not found', status: 404 };
  return { data };
}

async function handleListEscrows(developer: DeveloperProfile, params: URLSearchParams) {
  const requested = Number(params.get('limit') || 50);
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 100) : 50;
  let query = supabase
    .from('developer_escrows')
    .select('escrow_id, payer_external_id, payee_external_id, payee_user_id, amount, currency, description, status, inspection_period_days, created_at, funded_at, auto_release_at, disputed_at, dispute_reason, released_at, refunded_at, refund_reason')
    .eq('developer_id', developer.user_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  const status = params.get('status');
  if (status && ['pending', 'funded', 'disputed', 'released', 'refunded'].includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return { error: 'Failed to load escrows', status: 500 };
  return { data: { escrows: data || [] } };
}

async function handleDisputeEscrow(developer: DeveloperProfile, escrowId: string, body: any) {
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 3 || reason.length > 500) {
    return { error: 'reason is required and must be 3 to 500 characters', status: 400 };
  }
  const { data, error } = await supabase.rpc('initiate_developer_escrow_dispute', {
    p_developer_id: developer.user_id,
    p_escrow_id: escrowId,
    p_reason: reason,
  });
  if (error) {
    console.error('[API] initiate_developer_escrow_dispute error:', error.message);
    return { error: 'Failed to dispute escrow', status: 500 };
  }
  const res = data as any;
  if (!res?.ok) {
    const message = String(res?.error || 'Failed to dispute escrow');
    return { error: message, status: message.toLowerCase().includes('not found') ? 404 : 400 };
  }
  triggerWebhook(developer.user_id, 'escrow.disputed', {
    escrow_id: escrowId, reason, disputed_at: res.disputed_at, status: 'disputed',
  });
  return { data: res };
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


async function handleCreateChargeSession(developer: DeveloperProfile, body: any) {
  const amount = Number(body?.amount);
  if (!amount || amount <= 0 || amount > 1_000_000) {
    return { error: 'amount required (NC, 0 < x <= 1,000,000)', status: 400 };
  }
  const description = body?.description ? String(body.description).slice(0, 280) : null;
  const externalUserId = body?.external_user_id ? String(body.external_user_id).slice(0, 128) : null;
  const externalUserEmail = body?.external_user_email ? String(body.external_user_email).slice(0, 256) : null;
  const successUrl = body?.success_url ? String(body.success_url).slice(0, 500) : null;
  const cancelUrl = body?.cancel_url ? String(body.cancel_url).slice(0, 500) : null;
  const metadata = (body?.metadata && typeof body.metadata === 'object') ? body.metadata : {};

  const sessionId = `cs_${developer.user_id.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const redirectUrl = `${APP_BASE_URL}/charge/${sessionId}`;

  const { error } = await supabase.from('developer_charge_sessions').insert({
    developer_id: developer.user_id,
    session_id: sessionId,
    amount,
    currency: 'NC',
    description,
    external_user_id: externalUserId,
    external_user_email: externalUserEmail,
    metadata: { ...metadata, success_url: successUrl, cancel_url: cancelUrl },
    status: 'pending',
    redirect_url: redirectUrl,
  });
  if (error) {
    console.error('[API] charge session create error:', error);
    return { error: 'Failed to create charge session', status: 500 };
  }

  triggerWebhook(developer.user_id, 'payments.charge.session.created', {
    session_id: sessionId, amount, currency: 'NC',
    external_user_id: externalUserId, redirect_url: redirectUrl,
  });

  return {
    data: {
      session_id: sessionId, amount, currency: 'NC',
      status: 'pending', redirect_url: redirectUrl,
      expires_in_seconds: 7200,
    },
  };
}

async function handleGetChargeSession(developer: DeveloperProfile, sessionId: string) {
  if (!sessionId) return { error: 'session_id required', status: 400 };
  const { data, error } = await supabase
    .from('developer_charge_sessions')
    .select('session_id, amount, currency, description, status, reference, redirect_url, external_user_id, external_user_email, payer_user_id, completed_at, expires_at, created_at')
    .eq('developer_id', developer.user_id)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error || !data) return { error: 'Session not found', status: 404 };
  return { data };
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
  
  // Check balance for paid endpoints (live mode only — sandbox is always free)
  const cost = API_PRICING[endpoint] || API_PRICING['default'];
  const isSandbox = developer.mode === 'sandbox';
  if (!isSandbox && cost > 0 && (developer.wallet_balance || 0) < cost) {
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

  // Sandbox short-circuit: never touch live tables / external APIs / chain.
  // Webhook CRUD endpoints still run live so devs can manage test endpoints.
  const isWebhookCrud = endpoint === 'webhooks' || endpoint.startsWith('webhooks/');
  if (isSandbox && !isWebhookCrud) {
    const sandboxResult = handleSandbox(endpoint, method, body, params);
    const sStatus = sandboxResult.status || (sandboxResult.error ? 400 : 200);
    const sBody = sandboxResult.error ? { error: sandboxResult.error, mode: 'sandbox' } : (sandboxResult.data ?? {});
    await logApiUsage(developer.user_id, endpoint, method, sStatus, 0, true);
    return new Response(JSON.stringify(sBody), {
      status: sStatus,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-Sandbox': 'true',
      },
    });
  }

  // Route to handlers
  try {
    switch (endpoint) {
      case 'payments/escrow/create':
        result = await handleCreateEscrow(developer, body);
        break;
      case 'payments/payout':
        result = await handlePayoutCredit(developer, body);
        break;
      case 'payments/charge/session':
        if (method === 'POST') {
          result = await handleCreateChargeSession(developer, body);
        } else if (method === 'GET') {
          result = await handleGetChargeSession(developer, String(params.get('session_id') || params.get('id') || ''));
        } else {
          result = { error: 'Method not allowed', status: 405 };
        }
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
        result = {
          data: {
            events: [
              { event: 'escrow.created', description: 'A new escrow payment was created' },
              { event: 'escrow.funded', description: 'Escrow funds were placed on hold' },
              { event: 'escrow.disputed', description: 'A payer opened a dispute during inspection' },
              { event: 'escrow.released', description: 'Escrow funds were released to the payee' },
              { event: 'escrow.refunded', description: 'Escrow funds were returned' },
              { event: 'payments.charge.session.created', description: 'A hosted payment link was created' },
              { event: 'wallet.payout', description: 'A developer payout completed' },
            ]
          }
        };
        break;

      default: {
        const escrowMatch = endpoint.match(/^payments\/escrow\/([^/]+)(?:\/(fund|release|refund|dispute))?$/);
        if (escrowMatch && method === 'GET' && !escrowMatch[2]) {
          result = await handleGetEscrow(developer, escrowMatch[1]);
        } else if (escrowMatch && method === 'POST' && escrowMatch[2] === 'fund') {
          result = await handleFundEscrow(developer, escrowMatch[1]);
        } else if (escrowMatch && method === 'POST' && escrowMatch[2] === 'release') {
          result = await handleReleaseEscrow(developer, escrowMatch[1]);
        } else if (escrowMatch && method === 'POST' && escrowMatch[2] === 'refund') {
          result = await handleRefundEscrow(developer, escrowMatch[1], body);
        } else if (escrowMatch && method === 'POST' && escrowMatch[2] === 'dispute') {
          result = await handleDisputeEscrow(developer, escrowMatch[1], body);
        } else if (endpoint.startsWith('webhooks/') && method === 'DELETE') {
          const webhookId = pathParts[1];
          const { error: delErr } = await supabase
            .from('developer_webhooks')
            .delete()
            .eq('id', webhookId)
            .eq('developer_id', developer.user_id);
          result = delErr ? { error: 'Webhook not found', status: 404 } : { data: { deleted: true } };
        } else if (endpoint.startsWith('webhooks/') && endpoint.endsWith('/test') && method === 'POST') {
          const webhookId = pathParts[1];
          const { data: testResult, error: testErr } = await supabase.functions.invoke('developer-webhook', {
            body: { action: 'test', webhook_id: webhookId }
          });
          result = testErr ? { error: testErr.message, status: 500 } : { data: testResult };
        } else if (endpoint.startsWith('webhooks/') && endpoint.endsWith('/logs') && method === 'GET') {
          const webhookId = pathParts[1];
          const { data: logs } = await supabase
            .from('webhook_logs')
            .select('id, event_type, response_status, response_body, delivered_at, delivery_duration_ms, success, error_message, created_at, retry_count')
            .eq('webhook_id', webhookId)
            .order('created_at', { ascending: false })
            .limit(50);
          result = { data: { logs: logs || [] } };
        } else {
          result = { error: 'Endpoint not found', status: 404 };
        }
      }
    }
  } catch (error: any) {
    console.error(`[API] Handler error for ${endpoint}:`, error);
    result = { error: error.message || 'Internal server error', status: 500 };
  }
  
  const statusCode = result.status || (result.error ? 400 : 200);
  const responseBody = result.error ? { error: result.error } : (result.data ?? {});

  // Deduct balance and log usage (sandbox webhooks land here too — never charged)
  if (statusCode < 400 && cost > 0 && !isSandbox) {
    await deductBalance(developer.user_id, cost);
  }
  await logApiUsage(developer.user_id, endpoint, method, statusCode, statusCode < 400 && !isSandbox ? cost : 0, isSandbox);


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
        'X-Sandbox': 'false',
      },

    }
  );
});
