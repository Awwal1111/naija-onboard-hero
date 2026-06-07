import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "https://esm.sh/crypto-js@4.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Webhook event types
const WEBHOOK_EVENTS = {
  // Wallet events
  WALLET_CREATED: 'wallet.created',
  WALLET_DEPOSIT: 'wallet.deposit',
  WALLET_TRANSFER: 'wallet.transfer',
  
  // Escrow events
  ESCROW_CREATED: 'escrow.created',
  ESCROW_FUNDED: 'escrow.funded',
  ESCROW_RELEASED: 'escrow.released',
  ESCROW_REFUNDED: 'escrow.refunded',
  
  // VTU events
  VTU_AIRTIME_SUCCESS: 'vtu.airtime.success',
  VTU_AIRTIME_FAILED: 'vtu.airtime.failed',
  VTU_DATA_SUCCESS: 'vtu.data.success',
  VTU_DATA_FAILED: 'vtu.data.failed',
  
  // Video events
  VIDEO_ROOM_CREATED: 'video.room.created',
  VIDEO_ROOM_ENDED: 'video.room.ended',
  VIDEO_PARTICIPANT_JOINED: 'video.participant.joined',
  VIDEO_PARTICIPANT_LEFT: 'video.participant.left',
};

// Generate HMAC signature for webhook payload
function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = CryptoJS.HmacSHA256(signedPayload, secret).toString(CryptoJS.enc.Hex);
  return `t=${timestamp},v1=${signature}`;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 1000, 3000]; // 0s, 1s, 3s between attempts

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Send webhook to developer's endpoint, retrying transient failures.
// Considered retryable: network errors, HTTP 408/425/429, any 5xx.
// Non-retryable: 2xx (success) and other 4xx (client error in their endpoint).
async function sendWebhook(
  webhook: { id: string; webhook_url: string; webhook_secret: string },
  eventType: string,
  payload: any
): Promise<{ success: boolean; status?: number; error?: string; duration?: number; attempts?: number }> {
  const webhookPayload = {
    id: crypto.randomUUID(),
    event: eventType,
    created_at: new Date().toISOString(),
    data: payload
  };
  const payloadString = JSON.stringify(webhookPayload);
  const signature = generateSignature(payloadString, webhook.webhook_secret);

  let lastStatus: number | undefined;
  let lastError: string | undefined;
  let lastDuration = 0;
  let success = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1] > 0) await sleep(BACKOFF_MS[attempt - 1]);

    const startTime = Date.now();
    try {
      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NaijaLancers-Signature': signature,
          'X-Webhook-ID': webhookPayload.id,
          'X-Webhook-Attempt': String(attempt),
          'User-Agent': 'NaijaLancers-Webhook/1.0'
        },
        body: payloadString,
        signal: AbortSignal.timeout(10_000),
      });

      lastDuration = Date.now() - startTime;
      lastStatus = response.status;
      const responseBody = await response.text().catch(() => '');
      lastError = response.ok ? undefined : `HTTP ${response.status}`;

      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;

      // Only log to webhook_logs on final outcome (success or last attempt) to avoid noise.
      const isFinal = response.ok || !retryable || attempt === MAX_ATTEMPTS;
      if (isFinal) {
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload: webhookPayload,
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          delivered_at: new Date().toISOString(),
          delivery_duration_ms: lastDuration,
          success: response.ok,
          error_message: response.ok ? null : `HTTP ${response.status} after ${attempt} attempt(s)`,
          retry_count: attempt - 1,
        });
      }

      if (response.ok) {
        success = true;
        await supabase
          .from('developer_webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', webhook.id);
        return { success: true, status: response.status, duration: lastDuration, attempts: attempt };
      }

      if (!retryable) break; // permanent 4xx — stop retrying
    } catch (error: any) {
      lastDuration = Date.now() - startTime;
      lastError = error?.message || 'network error';
      if (attempt === MAX_ATTEMPTS) {
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload: webhookPayload,
          delivered_at: new Date().toISOString(),
          delivery_duration_ms: lastDuration,
          success: false,
          error_message: `${lastError} after ${attempt} attempt(s)`,
          retry_count: attempt - 1,
        });
      }
    }
  }

  if (!success) {
    await supabase.rpc('increment_webhook_failure', { webhook_id: webhook.id });
  }
  return { success, status: lastStatus, error: lastError, duration: lastDuration, attempts: MAX_ATTEMPTS };
}

// Trigger webhooks for a specific developer and event
async function triggerWebhooks(developerId: string, eventType: string, payload: any) {
  console.log(`[Webhook] Triggering ${eventType} for developer ${developerId}`);
  
  // Get all active webhooks for this developer that subscribe to this event
  const { data: webhooks, error } = await supabase
    .from('developer_webhooks')
    .select('*')
    .eq('developer_id', developerId)
    .eq('is_active', true)
    .contains('events', [eventType]);
  
  if (error || !webhooks?.length) {
    console.log('[Webhook] No matching webhooks found');
    return { triggered: 0 };
  }
  
  console.log(`[Webhook] Found ${webhooks.length} webhooks to trigger`);
  
  const results = await Promise.all(
    webhooks.map(webhook => sendWebhook(webhook, eventType, payload))
  );
  
  const successful = results.filter(r => r.success).length;
  console.log(`[Webhook] Delivered ${successful}/${webhooks.length} webhooks`);
  
  return { triggered: webhooks.length, successful };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, developer_id, event_type, payload, webhook_id } = await req.json();
    
    switch (action) {
      case 'trigger': {
        // Trigger webhooks for an event
        if (!developer_id || !event_type || !payload) {
          return new Response(
            JSON.stringify({ error: 'developer_id, event_type, and payload required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const result = await triggerWebhooks(developer_id, event_type, payload);
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'test': {
        // Test a specific webhook
        if (!webhook_id) {
          return new Response(
            JSON.stringify({ error: 'webhook_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data: webhook } = await supabase
          .from('developer_webhooks')
          .select('*')
          .eq('id', webhook_id)
          .single();
        
        if (!webhook) {
          return new Response(
            JSON.stringify({ error: 'Webhook not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const testPayload = {
          test: true,
          message: 'This is a test webhook from NaijaLancers',
          timestamp: new Date().toISOString()
        };
        
        const result = await sendWebhook(webhook, 'test', testPayload);
        return new Response(
          JSON.stringify({ success: result.success, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'list_events': {
        // Return available webhook events
        return new Response(
          JSON.stringify({ events: WEBHOOK_EVENTS }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: trigger, test, list_events' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
