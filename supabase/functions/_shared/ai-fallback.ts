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
  if (body.response_format) payload.response_format = body.response_format;
  return fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(String(init.body ?? "{}"));
  } catch { /* non-JSON body */ }

  const isImage = Array.isArray(body.modalities) && (body.modalities as string[]).includes("image");
  const canFallback = Array.isArray(body.messages);

  const fallback = async (): Promise<Response> =>
    isImage ? imageFallbackResponse(body) : await callPollinations(body);

  try {
    const res = await fetch(url, init);
    if (res.ok || !canFallback) return res;
    if (res.status === 402 || res.status === 429 || res.status >= 500 || res.status === 401) {
      console.warn(`Primary AI returned ${res.status}; using Pollinations fallback`);
      const fb = await fallback();
      return fb.ok ? fb : res;
    }
    return res;
  } catch (err) {
    if (!canFallback) throw err;
    console.warn("Primary AI unreachable; using Pollinations fallback");
    return fallback();
  }
}

// Convenience: simple prompt -> text, with fallback. Used by the new AI tools.
export async function aiText(system: string, user: string, json = false): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const body: Record<string, unknown> = {
    model: "google/gemini-2.5-flash",
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
