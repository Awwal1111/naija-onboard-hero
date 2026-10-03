// Primary AI call with automatic Pollinations AI fallback.
// Falls back on 402 (credits), 429 (busy), 5xx, or network failure.
// Pollinations returns OpenAI-compatible JSON, so callers parse it unchanged.
const POLLINATIONS_URL = "https://text.pollinations.ai/openai/chat/completions";

async function callPollinations(body: Record<string, unknown>): Promise<Response> {
  const payload: Record<string, unknown> = {
    model: "openai-fast",
    messages: body.messages,
    stream: body.stream ?? false,
  };
  if (body.tools) payload.tools = body.tools;
  if (body.tool_choice) payload.tool_choice = body.tool_choice;
  return fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(String(init.body ?? "{}"));
  } catch { /* non-JSON body */ }

  // Image generation requests can't be served by the text fallback.
  const canFallback = Array.isArray(body.messages) && !body.modalities;

  try {
    const res = await fetch(url, init);
    if (res.ok || !canFallback) return res;
    if (res.status === 402 || res.status === 429 || res.status >= 500 || res.status === 401) {
      console.warn(`Primary AI returned ${res.status}; using Pollinations fallback`);
      const fb = await callPollinations(body);
      return fb.ok ? fb : res;
    }
    return res;
  } catch (err) {
    if (!canFallback) throw err;
    console.warn("Primary AI unreachable; using Pollinations fallback");
    return callPollinations(body);
  }
}
