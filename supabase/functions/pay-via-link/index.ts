import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...corsHeaders } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing authorization" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: aerr } = await anon.auth.getUser(auth.replace("Bearer ", ""));
    if (aerr || !user) return json({ error: "Unauthorized" }, 401);

    const { recipient_user_id, amount, pin, request_id } = await req.json().catch(() => ({}));
    if (!recipient_user_id || !amount || !pin) return json({ error: "Missing fields" }, 400);
    if (recipient_user_id === user.id) return json({ error: "Cannot pay yourself" }, 400);

    const { data: rUser, error: uerr } = await admin.auth.admin.getUserById(recipient_user_id);
    if (uerr || !rUser?.user?.email) return json({ error: "Recipient not found" }, 404);

    const { data, error } = await admin.rpc("transfer_funds", {
      sender_id: user.id,
      recipient_email: rUser.user.email,
      amount: Number(amount),
      pin_hash: String(pin),
    });
    if (error) return json({ error: error.message }, 400);
    const result = data as any;
    if (!result?.success) return json({ error: result?.error || "Transfer failed" }, 400);

    if (request_id) {
      await admin.from("payment_requests").update({
        status: "paid", paid_by_user_id: user.id, paid_at: new Date().toISOString(), paid_amount: Number(amount),
      }).eq("id", request_id);
    }
    return json({ success: true, recipient_name: result.recipient_name });
  } catch (e: any) {
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
