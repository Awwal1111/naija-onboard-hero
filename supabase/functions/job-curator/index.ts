import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ = Deno.env.get("GROQ_API_KEY");
const CURATOR_USER = "25a07c7e-3dba-4262-97ba-bef2c5c52c99";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function groqJson(system: string, user: string): Promise<any | null> {
  if (!GROQ) return null;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-oss-120b", temperature: 0.2, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!r.ok) { console.error("groq", r.status, await r.text()); return null; }
    const d = await r.json();
    return JSON.parse(d.choices?.[0]?.message?.content || "null");
  } catch (e) { console.error("groq err", e); return null; }
}

const strip = (h: string) => (h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

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

async function seed(admin: any) {
  const res = await fetch("https://remotive.com/api/remote-jobs?limit=60");
  const { jobs = [] } = await res.json();
  const worldwide = jobs.filter((j: any) => /worldwide|anywhere|africa|nigeria|emea/i.test(j.candidate_required_location || ""));
  const ids = worldwide.map((j: any) => `remotive:${j.id}`);
  const { data: existing } = await admin.from("job_posts").select("external_id").in("external_id", ids).limit(100);
  const seen = new Set((existing || []).map((e: any) => e.external_id));
  const fresh = worldwide.filter((j: any) => !seen.has(`remotive:${j.id}`)).slice(0, 10);
  let added = 0;
  for (const j of fresh) {
    if (added >= 5) break;
    const desc = strip(j.description).slice(0, 4000);
    const v = await groqJson(
      `You curate remote jobs for Nigerian freelancers. Reject if it requires US/EU residency, citizenship, security clearance, or physical presence outside Africa, or is not a real paid role. Reply JSON: {"approve":boolean,"summary":string (3-5 short sentences, plain text),"skills":string[] (max 6)}`,
      JSON.stringify({ title: j.title, company: j.company_name, location: j.candidate_required_location, salary: j.salary, description: desc.slice(0, 2500) }),
    );
    if (v && !v.approve) continue;
    const { error } = await admin.from("job_posts").insert({
      user_id: CURATOR_USER, title: String(j.title).slice(0, 200),
      description: `${v?.summary || desc.slice(0, 800)}\n\nCompany: ${j.company_name}\nLocation: ${j.candidate_required_location}${j.salary ? `\nSalary: ${j.salary}` : ""}`,
      company_name: j.company_name, company_logo_url: j.company_logo || null, location: "Remote", is_remote: true,
      job_type: j.job_type || "contract", required_skills: (v?.skills?.length ? v.skills : (j.tags || [])).slice(0, 6),
      status: "open", moderation_status: "approved", moderated_at: new Date().toISOString(), moderation_note: "Curated remote job",
      source: "remotive", external_url: j.url, external_id: `remotive:${j.id}`,
    });
    if (error) console.error("insert", error.message); else added++;
  }
  // expire curated jobs older than 21 days
  await admin.from("job_posts").update({ status: "closed" }).neq("source", "user").eq("status", "open").lt("created_at", new Date(Date.now() - 21 * 864e5).toISOString());
  return json({ added });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const admin = createClient(SB_URL, SERVICE);
    if (body.action === "seed") return await seed(admin);
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
