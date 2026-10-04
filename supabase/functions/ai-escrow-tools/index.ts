import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { aiText } from "../_shared/ai-fallback.ts";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("milestones"),
    title: z.string().min(1).max(200),
    scope: z.string().min(1).max(4000),
    total: z.number().positive().max(100_000_000),
  }),
  z.object({ action: z.literal("dispute"), dispute_id: z.string().uuid() }),
  z.object({
    action: z.literal("match"),
    query: z.string().min(1).max(1000),
    candidates: z.array(z.object({ id: z.string().max(64), text: z.string().max(600) })).min(1).max(30),
  }),
]);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function parseJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Please sign in" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    if (b.action === "milestones") {
      const out = await aiText(
        "You split freelance contract budgets into fair escrow milestones. Reply ONLY with JSON: {\"milestones\":[{\"title\":string,\"deliverable\":string,\"percent\":number}]}. 2-4 milestones, percents are integers summing to 100, first milestone 20-40%.",
        `Contract: ${b.title}\nScope: ${b.scope}\nTotal: ${b.total} NC`,
        true,
      );
      const data = parseJson(out);
      let ms = (data.milestones ?? []).slice(0, 4).map((m: any) => ({
        title: String(m.title ?? "Milestone").slice(0, 80),
        deliverable: String(m.deliverable ?? "").slice(0, 200),
        percent: Math.max(1, Math.round(Number(m.percent) || 0)),
      }));
      if (ms.length < 2) throw new Error("AI returned no milestones");
      const sum = ms.reduce((s: number, m: any) => s + m.percent, 0);
      ms = ms.map((m: any) => ({ ...m, percent: Math.round((m.percent / sum) * 100) }));
      ms[ms.length - 1].percent += 100 - ms.reduce((s: number, m: any) => s + m.percent, 0);
      let allocated = 0;
      ms = ms.map((m: any, i: number) => {
        const amount = i === ms.length - 1 ? b.total - allocated : Math.round((b.total * m.percent) / 100);
        allocated += amount;
        return { ...m, amount };
      });
      return json({ milestones: ms });
    }

    if (b.action === "match") {
      const list = b.candidates.map((c, i) => `${i}. [${c.id}] ${c.text}`).join("\n");
      const out = await aiText(
        "You rank freelancers by how well their skills semantically fit a client's request (related tools and domains count). Reply ONLY with JSON: {\"scores\":[{\"id\":string,\"score\":number,\"reason\":string}]} with score 0-40 and a reason under 8 words.",
        `Client request: ${b.query}\n\nFreelancers:\n${list}`,
        true,
      );
      const data = parseJson(out);
      const ids = new Set(b.candidates.map((c) => c.id));
      const scores = (data.scores ?? [])
        .filter((s: any) => ids.has(String(s.id)))
        .map((s: any) => ({ id: String(s.id), score: Math.max(0, Math.min(40, Number(s.score) || 0)), reason: String(s.reason ?? "").slice(0, 60) }));
      return json({ scores });
    }

    // dispute — admins only
    const { data: isAdmin } = await userClient.rpc("has_admin_access");
    if (!isAdmin) return json({ error: "Admins only" }, 403);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: d } = await admin
      .from("transaction_disputes")
      .select("id, user_id, counterparty_id, dispute_reason, dispute_details, dispute_type, safepay_id, created_at")
      .eq("id", b.dispute_id).maybeSingle();
    if (!d) return json({ error: "Dispute not found" }, 404);

    let deal = "";
    let chat = "";
    if (d.safepay_id) {
      const { data: sp } = await admin.from("safepay_transactions")
        .select("buyer_id, seller_id, amount, status, completed_at, created_at")
        .eq("id", d.safepay_id).maybeSingle();
      if (sp) deal = `Buyer: ${sp.buyer_id}\nSeller: ${sp.seller_id}\nAmount: ${sp.amount} NC\nStatus: ${sp.status}\nMarked complete: ${sp.completed_at ?? "no"}`;
      const { data: msgs } = await admin.from("disputed_chat_snapshots")
        .select("sender_id, message_text, created_at")
        .eq("safepay_id", d.safepay_id).order("created_at", { ascending: true }).limit(80);
      chat = (msgs ?? []).map((m) => `[${m.created_at}] ${m.sender_id === sp?.buyer_id ? "BUYER" : m.sender_id === sp?.seller_id ? "SELLER" : "USER"}: ${String(m.message_text).slice(0, 400)}`).join("\n");
    }

    const out = await aiText(
      "You are an impartial escrow dispute analyst for a freelance marketplace. Use only the evidence given. Reply ONLY with JSON: {\"agreed\":string,\"delivered\":string,\"friction\":string,\"seller_percent\":number,\"buyer_percent\":number,\"rationale\":string,\"confidence\":\"low\"|\"medium\"|\"high\"}. Percents sum to 100. Keep each text field under 60 words. If evidence is thin, say so and use low confidence.",
      `Dispute raised by: ${d.user_id}\nType: ${d.dispute_type}\nReason: ${d.dispute_reason}\nDetails: ${d.dispute_details ?? "none"}\n\nDeal:\n${deal || "No linked deal record"}\n\nChat evidence:\n${chat || "No chat snapshot available"}`,
      true,
    );
    const a = parseJson(out);
    const sp = Math.max(0, Math.min(100, Math.round(Number(a.seller_percent) || 0)));
    return json({
      analysis: {
        agreed: String(a.agreed ?? ""), delivered: String(a.delivered ?? ""), friction: String(a.friction ?? ""),
        seller_percent: sp, buyer_percent: 100 - sp, rationale: String(a.rationale ?? ""),
        confidence: ["low", "medium", "high"].includes(a.confidence) ? a.confidence : "low",
      },
    });
  } catch (e) {
    console.error("ai-escrow-tools error:", e instanceof Error ? e.message : e);
    return json({ error: "AI tool is temporarily unavailable. Please try again." }, 500);
  }
});
