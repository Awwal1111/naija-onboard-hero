// Primary AI call with automatic Pollinations AI fallback.
// Falls back on 401/402/429/5xx or network failure.
// Text: Pollinations returns OpenAI-compatible JSON, so callers parse it unchanged.
// Images: a synthetic response is returned in the gateway's image shape
// (choices[0].message.images[0].image_url.url) pointing to a Pollinations CDN URL.
const POLLINATIONS_URL = "https://text.pollinations.ai/openai/chat/completions";

async function callPollinations(body: Record<string, unknown>): Promise<Response> {
  const payload: Record<string, unknown> = {
    model: "openai-fast",
    messages: body.messages,
    stream: body.stream ?? false,
  };
  if (body.tools) payload.tools = body.tools;
  if (body.tool_choice) payload.tool_choice = body.tool_choice;
  const response = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Pollinations API request failed with status ${response.status}: ${errorText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Invalid JSON response from Pollinations API: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid JSON body received from Pollinations API");
  }

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractPrompt(body: Record<string, unknown>): string {
  const msgs = Array.isArray(body.messages) ? body.messages as any[] : [];
  const last = [...msgs].reverse().find((m) => m?.role === "user");
  if (!last) return "professional illustration";
  if (typeof last.content === "string") return last.content;
  if (Array.isArray(last.content)) {
    return last.content.filter((p: any) => p?.type === "text").map((p: any) => p.text).join(" ");
  }
  return "professional illustration";
}

export function pollinationsImageUrl(prompt: string, width = 1024, height = 1024): string {
  const seed = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 800))}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
}

function imageFallbackResponse(body: Record<string, unknown>): Response {
  const url = pollinationsImageUrl(extractPrompt(body));
  const json = {
    choices: [{
      message: {
        role: "assistant",
        content: "Here is your generated image.",
        images: [{ type: "image_url", image_url: { url } }],
      },
    }],
    provider: "pollinations",
  };
  return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq: fast fallback (sub-second). Tried before Pollinations.
// Groq rate limits are per model, so when one model returns 429 we move to the next and
// remember (per warm instance) to skip it until its retry-after has passed. Override the
// list with the GROQ_MODELS secret (comma separated) if Groq retires a model.
const GROQ_MODELS = (Deno.env.get("GROQ_MODELS") ?? "openai/gpt-oss-120b,llama-3.3-70b-versatile,llama-3.1-8b-instant")
  .split(",").map((m) => m.trim()).filter(Boolean);
const groqCooldown = new Map<string, number>();

export async function callGroq(body: Record<string, unknown>): Promise<Response> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY not set");
  const now = Date.now();
  const available = GROQ_MODELS.filter((m) => (groqCooldown.get(m) ?? 0) <= now);
  const order = available.length ? available : GROQ_MODELS; // all cooling down: try anyway
  let lastError = "no Groq model available";

  for (const model of order) {
    const payload: Record<string, unknown> = {
      model,
      messages: body.messages,
      stream: body.stream ?? false,
    };
    if (body.tools) payload.tools = body.tools;
    if (body.tool_choice) payload.tool_choice = body.tool_choice;
    if (body.response_format) payload.response_format = body.response_format;
    if (body.temperature !== undefined) payload.temperature = body.temperature;
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return res;

    const text = (await res.text().catch(() => "")).slice(0, 200);
    lastError = `Groq ${model} failed ${res.status}: ${text}`;
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Math.min((retryAfter > 0 ? retryAfter : 20) * 1000, 120_000);
      groqCooldown.set(model, Date.now() + waitMs);
      console.warn(`${lastError}; skipping ${model} for ${Math.round(waitMs / 1000)}s`);
      continue;
    }
    if (res.status === 404 || (res.status === 400 && /model/i.test(text))) {
      groqCooldown.set(model, Date.now() + 10 * 60_000); // model retired/unavailable
      console.warn(lastError);
      continue;
    }
    throw new Error(lastError);
  }
  throw new Error(lastError);
}

async function textFallback(body: Record<string, unknown>): Promise<Response> {
  try {
    return await callGroq(body);
  } catch (e) {
    console.warn("Groq fallback failed; trying Pollinations:", e instanceof Error ? e.message : e);
    return await callPollinations(body);
  }
}

export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(String(init.body ?? "{}"));
  } catch { /* non-JSON body */ }

  const isImage = Array.isArray(body.modalities) && (body.modalities as string[]).includes("image");
  const canFallback = Array.isArray(body.messages);

  const fallback = async (): Promise<Response> =>
    isImage ? imageFallbackResponse(body) : await textFallback(body);

  try {
    const res = await fetch(url, init);
    if (res.ok || !canFallback) return res;
    if (res.status === 402 || res.status === 429 || res.status >= 500 || res.status === 401) {
      console.warn(`Primary AI returned ${res.status}; using Groq/Pollinations fallback`);
      const fb = await fallback();
      return fb.ok ? fb : res;
    }
    return res;
  } catch (err) {
    if (!canFallback) throw err;
    console.warn("Primary AI unreachable; using Groq/Pollinations fallback");
    return fallback();
  }
}

// Convenience: simple prompt -> text, with fallback. Used by the new AI tools.
export async function aiText(system: string, user: string, json = false): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const body: Record<string, unknown> = {
    model: "openai/gpt-6-astra",
    reasoning_effort: "low",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  };
  if (json) body.response_format = { type: "json_object" };
  const res = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}
