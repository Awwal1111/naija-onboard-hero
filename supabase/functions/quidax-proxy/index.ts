// Quidax Proxy — Wallet-as-a-Service for third-party developers.
// Developers call our endpoint with their x-api-key. We:
//  1. Validate the key + check it's enabled
//  2. Charge a markup fee (NC) to their wallet
//  3. Forward request to Quidax with OUR secret key
//  4. Log to api_usage so the dashboard can show stats
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const QUIDAX_BASE = 'https://www.quidax.com/api/v1'

// Markup pricing — NC charged to developer per call
const PROXY_PRICING: Record<string, number> = {
  'quotes': 5,           // get a quote
  'instant-orders': 50,  // create an order (real money movement)
  'wallets': 2,          // wallet info
  'users': 2,
  'default': 3,
}

// Allowed Quidax endpoints (whitelist for safety)
const ALLOWED_PATHS = [
  /^quotes(\/|$)/,
  /^instant_orders(\/|$)/,
  /^wallets(\/|$)/,
  /^users(\/|$)/,
  /^merchant(\/|$)/,
  /^markets(\/|$)/,
  /^webhook(\/|$)/,
]

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function getMarkup(path: string): number {
  const seg = path.split('/')[0]
  return PROXY_PRICING[seg] ?? PROXY_PRICING.default
}

function pathAllowed(path: string): boolean {
  return ALLOWED_PATHS.some(re => re.test(path))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const startedAt = Date.now()
  const url = new URL(req.url)
  // Path after /quidax-proxy/ — e.g. "quotes" or "instant_orders/abc"
  const subPath = url.pathname.replace(/^.*\/quidax-proxy\/?/, '').replace(/^\/+/, '')

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key', hint: 'Send your key as x-api-key header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Validate key + check enabled
    const { data: secret } = await supabase
      .from('user_secrets')
      .select('user_id, api_key_enabled')
      .eq('api_key', apiKey)
      .maybeSingle()

    if (!secret) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (secret.api_key_enabled === false) {
      return new Response(JSON.stringify({ error: 'API key disabled by owner' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Verify developer account
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, account_type, wallet_balance, balance_withdrawable, balance_non_withdrawable')
      .eq('user_id', secret.user_id)
      .maybeSingle()

    if (!profile || profile.account_type !== 'developer') {
      return new Response(JSON.stringify({ error: 'Developer account required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Path validation
    if (!subPath || !pathAllowed(subPath)) {
      return new Response(JSON.stringify({
        error: 'Endpoint not allowed', hint: 'Allowed: quotes, instant_orders, wallets, users, markets'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Charge markup
    const markup = getMarkup(subPath)
    if (markup > 0) {
      if ((profile.wallet_balance ?? 0) < markup) {
        return new Response(JSON.stringify({
          error: 'Insufficient NC balance', required: markup, available: profile.wallet_balance
        }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const deductFromW = Math.min(profile.balance_withdrawable ?? 0, markup)
      const deductFromNW = markup - deductFromW
      await supabase.from('profiles').update({
        wallet_balance: profile.wallet_balance - markup,
        balance_withdrawable: (profile.balance_withdrawable ?? 0) - deductFromW,
        balance_non_withdrawable: (profile.balance_non_withdrawable ?? 0) - deductFromNW,
      }).eq('user_id', profile.user_id)

      await supabase.from('wallet_transactions').insert({
        user_id: profile.user_id,
        kind: 'quidax_proxy_fee',
        amount: -markup,
        status: 'completed',
        reference: `Quidax API: ${subPath}`,
      })
    }

    // 5. Forward to Quidax
    const quidaxKey = Deno.env.get('QUIDAX_PRIVATE_KEY')
    if (!quidaxKey) throw new Error('QUIDAX_PRIVATE_KEY not configured')

    const targetUrl = `${QUIDAX_BASE}/${subPath}${url.search || ''}`
    const fwdInit: RequestInit = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${quidaxKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const bodyText = await req.text()
      if (bodyText) fwdInit.body = bodyText
    }

    const quidaxRes = await fetch(targetUrl, fwdInit)
    const quidaxBody = await quidaxRes.text()
    const elapsed = Date.now() - startedAt

    // 6. Log usage
    await supabase.from('api_usage').insert({
      user_id: profile.user_id,
      api_key: apiKey,
      endpoint: `quidax/${subPath}`,
      method: req.method,
      status_code: quidaxRes.status,
      response_time_ms: elapsed,
      cost_nc: markup,
      markup_nc: markup,
      external_service: 'quidax',
    })

    return new Response(quidaxBody, {
      status: quidaxRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[quidax-proxy] error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Proxy error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
