// Hosted ramp session handler — called by the end-user from /ramp/:sessionId
// Loads, claims, and completes a developer_ramp_sessions row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function triggerWebhook(developerId: string, eventType: string, payload: any) {
  try {
    await supabase.functions.invoke('developer-webhook', {
      body: { action: 'trigger', developer_id: developerId, event_type: eventType, payload },
    });
  } catch (e) {
    console.error('[ramp-session] webhook error', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'get');
    const sessionId = String(body?.session_id || '').slice(0, 128);
    if (!sessionId) return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: session, error: sErr } = await supabase
      .from('developer_ramp_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (sErr || !session) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (action === 'get') {
      return new Response(JSON.stringify({ session }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await supabase.from('developer_ramp_sessions').update({ status: 'expired' }).eq('session_id', sessionId);
      return new Response(JSON.stringify({ error: 'Session expired' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim') {
      // Lock session to this end-user
      if (session.naijalancers_user_id && session.naijalancers_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Session already claimed by another user' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { error: updErr } = await supabase
        .from('developer_ramp_sessions')
        .update({ naijalancers_user_id: user.id, status: 'in_progress' })
        .eq('session_id', sessionId);
      if (updErr) return new Response(JSON.stringify({ error: 'Failed to claim session' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ ok: true, session: { ...session, naijalancers_user_id: user.id, status: 'in_progress' } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'complete') {
      if (session.naijalancers_user_id && session.naijalancers_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Not the session user' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const reference = body?.reference ? String(body.reference).slice(0, 200) : null;
      const { error: updErr } = await supabase
        .from('developer_ramp_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString(), reference, naijalancers_user_id: user.id })
        .eq('session_id', sessionId);
      if (updErr) return new Response(JSON.stringify({ error: 'Failed to complete session' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      triggerWebhook(session.developer_id, `ramp.${session.type}.session.completed`, {
        session_id: sessionId,
        type: session.type,
        token: session.token,
        fiat_amount: session.fiat_amount,
        token_amount: session.token_amount,
        external_user_id: session.external_user_id,
        naijalancers_user_id: user.id,
        reference,
      });

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'cancel') {
      const { error: updErr } = await supabase
        .from('developer_ramp_sessions')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId)
        .in('status', ['pending', 'in_progress']);
      if (updErr) return new Response(JSON.stringify({ error: 'Failed to cancel' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      triggerWebhook(session.developer_id, `ramp.${session.type}.session.cancelled`, {
        session_id: sessionId,
        external_user_id: session.external_user_id,
      });

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[ramp-session] error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
