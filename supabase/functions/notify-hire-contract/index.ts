import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { contract_id, event } = await req.json();
    if (!contract_id) {
      return new Response(JSON.stringify({ error: 'contract_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: c } = await supabase.from('hire_contracts').select('*').eq('id', contract_id).maybeSingle();
    if (!c) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id,full_name,telegram_user_id')
      .in('user_id', [c.client_id, c.expert_id]);

    const client = profs?.find(p => p.user_id === c.client_id);
    const expert = profs?.find(p => p.user_id === c.expert_id);

    // Emails from auth.users
    const { data: clientUser } = await supabase.auth.admin.getUserById(c.client_id);
    const { data: expertUser } = await supabase.auth.admin.getUserById(c.expert_id);
    const expertEmail = expertUser?.user?.email;

    const subject = event === 'signed'
      ? `Contract signed: ${c.title}`
      : `Contract update: ${c.title}`;
    const body = `
Hi ${expert?.full_name || 'there'},

${client?.full_name || 'A client'} has signed a hire contract with you on NaijaLancers.

Title: ${c.title}
Type: ${c.contract_type === 'fixed' ? `Fixed price — NC ${Number(c.total_amount).toLocaleString()}` : `Hourly — NC ${Number(c.hourly_rate || 0).toLocaleString()}/hr`}
Status: ${c.status}
${c.deadline ? `Deadline: ${new Date(c.deadline).toLocaleDateString()}\n` : ''}
Open and download the contract here:
https://naijalancers.name.ng/contracts/${c.id}
${c.pdf_url ? `\nDirect PDF: ${c.pdf_url}` : ''}

Funds are held in escrow until completion. Thank you for using NaijaLancers.
`;

    // 1. In-app notification
    await supabase.from('notifications').insert({
      user_id: c.expert_id,
      title: subject,
      message: `${client?.full_name || 'A client'} sent you a ${c.contract_type} contract. Open to sign.`,
      type: 'hire_contract',
      data: { contract_id: c.id, event },
    });

    // 2. Email via Resend (best-effort)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey && expertEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'NaijaLancers <noreply@naijalancers.name.ng>',
            to: [expertEmail],
            subject,
            text: body,
          }),
        });
      } catch (e) { console.warn('email failed', e); }
    }

    // 3. Telegram (best-effort, via gateway connector if configured)
    if (expert?.telegram_user_id) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      const tgKey = Deno.env.get('TELEGRAM_API_KEY');
      if (lovableKey && tgKey) {
        try {
          await fetch('https://connector-gateway.lovable.dev/telegram/sendMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'X-Connection-Api-Key': tgKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chat_id: expert.telegram_user_id, text: body }),
          });
        } catch (e) { console.warn('telegram failed', e); }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
