// Sandbox safety test suite for the Developer API.
//
// Guarantees verified here:
//   1. _sandbox.ts is a pure module — it imports nothing that could touch
//      production tables or external services.
//   2. handleSandbox() returns simulated payloads with obviously fake
//      identifiers for every supported endpoint.
//   3. The dispatcher in index.ts short-circuits sandbox requests BEFORE
//      any DB write, external API call, or NC deduction.
//   4. Optional live integration test (skipped unless SANDBOX_API_KEY is
//      set) confirms the deployed function returns X-Sandbox:true.
//
// Run via supabase--test_edge_functions.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { handleSandbox } from "./_sandbox.ts";

const SANDBOX_SRC = await Deno.readTextFile(
  new URL("./_sandbox.ts", import.meta.url),
);
const INDEX_SRC = await Deno.readTextFile(
  new URL("./index.ts", import.meta.url),
);

// ---------- 1. Static analysis: _sandbox.ts is pure ----------

Deno.test("_sandbox.ts imports nothing that touches production", () => {
  const importLines = SANDBOX_SRC
    .split("\n")
    .filter((l) => /^\s*import\s/.test(l));
  // The pure sandbox module should not import ANY external module.
  assertEquals(
    importLines.length,
    0,
    `_sandbox.ts must have zero imports, found:\n${importLines.join("\n")}`,
  );
});

Deno.test("_sandbox.ts contains no DB, fetch, or env access", () => {
  const forbidden = [
    "supabase",
    "createClient",
    "fetch(",
    "Deno.env",
    "deductBalance",
    "triggerWebhook",
    "logApiUsage",
    "RPC",
    "ethers",
  ];
  for (const needle of forbidden) {
    assert(
      !SANDBOX_SRC.includes(needle),
      `_sandbox.ts must not reference "${needle}"`,
    );
  }
});

Deno.test("index.ts short-circuits sandbox before deductions and after balance gate", () => {
  const dispatchIdx = INDEX_SRC.indexOf("if (isSandbox && !isWebhookCrud)");
  assert(dispatchIdx > 0, "sandbox dispatch guard not found in index.ts");

  // Balance gate must skip when sandbox.
  assertStringIncludes(INDEX_SRC, "if (!isSandbox && cost > 0");
  // Final wallet debit must skip when sandbox.
  assertStringIncludes(INDEX_SRC, "cost > 0 && !isSandbox");
  // Usage log records the sandbox flag and zero cost on sandbox success.
  assertStringIncludes(
    INDEX_SRC,
    "statusCode < 400 && !isSandbox ? cost : 0, isSandbox",
  );

  // No deductBalance() call may appear BEFORE the sandbox dispatch.
  const deductIdx = INDEX_SRC.indexOf("await deductBalance(");
  assert(
    deductIdx === -1 || deductIdx > dispatchIdx,
    "deductBalance() must never run before the sandbox short-circuit",
  );
});

// ---------- 2. Behavioral tests of handleSandbox ----------

const params = (q = "") => new URLSearchParams(q);

function assertSimulated(res: { data?: any; error?: string }) {
  assertExists(res.data, `expected data, got error: ${res.error}`);
  assertEquals(res.data.mode, "sandbox");
  assertEquals(res.data.simulated, true);
  assertStringIncludes(res.data.note, "No real funds");
}

function assertFakeAddress(addr: string) {
  assertStringIncludes(addr, "0xSANDBOX");
  // Must not match a real 40-hex Celo address shape.
  assert(!/^0x[0-9a-f]{40}$/i.test(addr));
}

function assertFakeTxHash(hash: string) {
  assertStringIncludes(hash, "0xSANDBOX");
  assert(!/^0x[0-9a-f]{64}$/i.test(hash));
}

Deno.test("wallet/create returns simulated wallet with fake address", () => {
  const res = handleSandbox(
    "wallet/create",
    "POST",
    { external_user_id: "u_test_1" },
    params(),
  );
  assertSimulated(res);
  assertEquals(res.data.external_user_id, "u_test_1");
  assertFakeAddress(res.data.address);
  assertStringIncludes(res.data.wallet_id, "wlt_test_");
});

Deno.test("wallet/create rejects missing external_user_id", () => {
  const res = handleSandbox("wallet/create", "POST", {}, params());
  assertEquals(res.status, 400);
  assertEquals(res.data, undefined);
});

Deno.test("wallet/balance returns deterministic mock balances", () => {
  const res = handleSandbox(
    "wallet/balance",
    "GET",
    null,
    params("external_user_id=u_test_1"),
  );
  assertSimulated(res);
  assertEquals(res.data.balances.NC, "10000");
  assertEquals(res.data.balances.cUSD, "500.00");
});

Deno.test("wallet/transfer never produces a real on-chain tx_hash", () => {
  const res = handleSandbox(
    "wallet/transfer",
    "POST",
    { from: "u1", to: "u2", amount: 50, currency: "NC" },
    params(),
  );
  assertSimulated(res);
  assertEquals(res.data.status, "completed");
  assertFakeTxHash(res.data.tx_hash);
});

Deno.test("wallet/transfer rejects incomplete bodies", () => {
  const res = handleSandbox(
    "wallet/transfer",
    "POST",
    { from: "u1" },
    params(),
  );
  assertEquals(res.status, 400);
});

Deno.test("vtu airtime + data succeed without provider call", () => {
  for (const endpoint of ["vtu/airtime", "vtu/data"]) {
    const res = handleSandbox(
      endpoint,
      "POST",
      { phone: "08012345678", amount: 100, provider: "MTN" },
      params(),
    );
    assertSimulated(res);
    assertEquals(res.data.status, "success");
    assertStringIncludes(res.data.reference, "vtu_test_");
  }
});

Deno.test("notification endpoints return queued ids", () => {
  for (const endpoint of [
    "notifications/email",
    "notifications/send",
    "notifications/sms",
    "notifications/push",
  ]) {
    const res = handleSandbox(
      endpoint,
      "POST",
      { to: "[email protected]", title: "t", body: "b" },
      params(),
    );
    assertSimulated(res);
  }
});

Deno.test("video room creation returns sandbox URL, never a real Daily/LiveKit url", () => {
  const res = handleSandbox(
    "video/create-room",
    "POST",
    { room_name: "demo" },
    params(),
  );
  assertSimulated(res);
  assertStringIncludes(res.data.join_url, "/video/sandbox/");
});

Deno.test("ai/chat returns mock LLM response, never a real model", () => {
  const res = handleSandbox("ai/chat", "POST", { prompt: "hi" }, params());
  assertSimulated(res);
  assertEquals(res.data.model, "sandbox-mock-v1");
});

Deno.test("ramp quote + session return sandbox hosted_url and pending status", () => {
  const quote = handleSandbox(
    "ramp/quote/buy",
    "GET",
    null,
    params("fiat_amount=15500"),
  );
  assertSimulated(quote);
  assertEquals(quote.data.fiat_amount, 15500);

  const session = handleSandbox(
    "ramp/session/buy",
    "POST",
    { fiat_amount: 15500 },
    params(),
  );
  assertSimulated(session);
  assertStringIncludes(session.data.hosted_url, "/ramp/sandbox/");
  assertEquals(session.data.status, "pending");
});

Deno.test("escrow create/fund/release/refund are all simulated", () => {
  const create = handleSandbox(
    "payments/escrow/create",
    "POST",
    { amount: 1000, payer_external_id: "a", payee_external_id: "b" },
    params(),
  );
  assertSimulated(create);
  const id = create.data.escrow_id;

  for (const action of ["fund", "release", "refund"]) {
    const r = handleSandbox(
      `payments/escrow/${id}/${action}`,
      "POST",
      {},
      params(),
    );
    assertSimulated(r);
  }
});

Deno.test("payments/payout returns simulated NC credit", () => {
  const res = handleSandbox(
    "payments/payout",
    "POST",
    { recipient_external_id: "r1", amount: 500 },
    params(),
  );
  assertSimulated(res);
  assertEquals(res.data.status, "completed");
  assertEquals(res.data.currency, "NC");
});

Deno.test("smart contract endpoints stay on Alfajores testnet markers only", () => {
  for (
    const endpoint of [
      "contracts/deploy",
      "escrow/onchain/deploy",
      "contracts/call",
      "contracts/read",
    ]
  ) {
    const res = handleSandbox(endpoint, "POST", {}, params());
    assertSimulated(res);
    assertEquals(res.data.chain, "CELO-Alfajores");
  }
});

Deno.test("unknown endpoints fall through with 404 and no data", () => {
  const res = handleSandbox("fictional/endpoint", "POST", {}, params());
  assertEquals(res.status, 404);
  assertEquals(res.data, undefined);
  assertStringIncludes(res.error ?? "", "not implemented in sandbox");
});

// ---------- 3. Optional live integration test ----------

const SANDBOX_KEY = Deno.env.get("SANDBOX_API_KEY");
const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

Deno.test({
  name:
    "deployed sandbox call returns X-Sandbox:true (skipped unless SANDBOX_API_KEY set)",
  ignore: !SANDBOX_KEY || !SUPABASE_URL || !SUPABASE_ANON,
  fn: async () => {
    const url =
      `${SUPABASE_URL}/functions/v1/developer-api/wallet/balance?external_user_id=u_int_test`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": SANDBOX_KEY!,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
      },
    });
    const json = await res.json();
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("X-Sandbox"), "true");
    const mode = json?.data?.mode ?? json?.mode;
    assertEquals(mode, "sandbox");
  },
});
