import { createClient } from "npm:@supabase/supabase-js@2";
import { callGroq } from "../_shared/ai-fallback.ts";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ = Deno.env.get("GROQ_API_KEY");
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function groqJson(system: string, user: string): Promise<any | null> {
  if (!GROQ) return null;
  try {
    // Shared helper rotates across Groq models when one is rate limited (429).
    const r = await callGroq({
      temperature: 0.2, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    });
    const d = await r.json();
    return JSON.parse(d.choices?.[0]?.message?.content || "null");
  } catch (e) { console.error("groq err", e); return null; }
}


async function screen(admin: any, jobId: string, userId: string) {
  const { data: job } = await admin.from("job_posts").select("id, user_id, title, description, budget_min, budget_max, required_skills, moderation_status").eq("id", jobId).maybeSingle();
  if (!job || job.user_id !== userId) return json({ error: "Not found" }, 404);
  if (job.moderation_status !== "pending") return json({ status: job.moderation_status });
  const v = await groqJson(
    `You moderate a Nigerian freelance marketplace. Decide if a client's job post is a genuine hiring request. Reject if: spam, scam, adult, MLM/crypto schemes, a freelancer advertising their own services, contains phone numbers/WhatsApp/Telegram/emails/bank details, gibberish, or the budget is absurdly low for the work (e.g. under NGN 1000 for skilled work). Budget is in NGN/NC. Reply JSON: {"approve":boolean,"reason":string (short, user-facing),"skills":string[] (max 6)}`,
    JSON.stringify({ title: job.title, description: job.description, budget_min: job.budget_min, budget_max: job.budget_max, skills: job.required_skills }),
  );
  if (!v) return json({ status: "pending", reason: "Queued for admin review" }); // fail-open to manual review
  const upd: any = { moderated_at: new Date().toISOString(), moderation_note: `AI: ${String(v.reason || "").slice(0, 300)}` };
  upd.moderation_status = v.approve ? "approved" : "rejected";
  if (v.approve && (!job.required_skills || job.required_skills.length === 0) && Array.isArray(v.skills)) upd.required_skills = v.skills.slice(0, 6).map(String);
  await admin.from("job_posts").update(upd).eq("id", jobId);
  return json({ status: upd.moderation_status, reason: v.reason });
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const admin = createClient(SB_URL, SERVICE);
    if (body.action === "screen") {
      if (typeof body.job_id !== "string" || body.job_id.length > 64) return json({ error: "job_id required" }, 400);
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: u } = await admin.auth.getUser(token);
      if (!u?.user) return json({ error: "Unauthorized" }, 401);
      return await screen(admin, body.job_id, u.user.id);
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) { console.error(e); return json({ error: String(e) }, 500); }
});
