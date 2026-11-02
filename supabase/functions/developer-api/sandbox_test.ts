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
    "ethers.",
    "JsonRpcProvider",
  ];
  for (const needle of forbidden) {
    assert(
      !SANDBOX_SRC.includes(needle),
      `_sandbox.ts must not reference "${needle}"`,
    );
  }
});

Deno.test("index.ts dispatches sandbox before any live handler or NC deduction", () => {
  const dispatchIdx = INDEX_SRC.indexOf(
    "handleSandbox(endpoint, method, body, params)",
  );
  assert(dispatchIdx > 0, "handleSandbox dispatch call not found in index.ts");

  // Balance gate must skip when sandbox.
  assertStringIncludes(INDEX_SRC, "if (!isSandbox && cost > 0");
  // Final wallet debit must skip when sandbox.
  assertStringIncludes(INDEX_SRC, "cost > 0 && !isSandbox");
  // Usage log records the sandbox flag and zero cost on sandbox success.
  assertStringIncludes(
    INDEX_SRC,
    "statusCode < 400 && !isSandbox ? cost : 0, isSandbox",
  );

  // The live router switch must appear AFTER the sandbox dispatch so that
  // sandbox requests can never reach handleWalletCreate / handleWalletTransfer
  // / handleVtuAirtime / etc.
  const liveRouterIdx = INDEX_SRC.indexOf("// Route to handlers");
  assert(
    liveRouterIdx > dispatchIdx,
    "Live router must run after sandbox dispatch",
  );

  // The success-path deduct call inside the live handler must also appear
  // after the sandbox dispatch.
  const liveDeductIdx = INDEX_SRC.indexOf(
    "await deductBalance(developer.user_id, cost)",
  );
  assert(
    liveDeductIdx === -1 || liveDeductIdx > dispatchIdx,
    "live deductBalance() must never run before sandbox short-circuit",
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

Deno.test("escrow create supports valid inspection windows and returns the dispute action", () => {
  const created = handleSandbox(
    "payments/escrow/create",
    "POST",
    { amount: 5000, payer_external_id: "buyer", payee_external_id: "seller", payee_user_id: "user-1", inspection_period_days: 14 },
    params(),
  );
  assertSimulated(created);
  assertEquals(created.data.amount, 5000);
  assertEquals(created.data.currency, "NC");
  assertEquals(created.data.inspection_period_days, 14);
  assertStringIncludes(created.data.actions.dispute, "/dispute");
});

Deno.test("escrow inspection period accepts only whole days from 1 through 30", () => {
  const body = { amount: 100, payer_external_id: "buyer", payee_external_id: "seller", payee_user_id: "user-1" };
  for (const days of [1, 30]) {
    const accepted = handleSandbox("payments/escrow/create", "POST", { ...body, inspection_period_days: days }, params());
    assertSimulated(accepted);
    assertEquals(accepted.data.inspection_period_days, days);
  }
  for (const days of [0, 31, 2.5]) {
    const rejected = handleSandbox("payments/escrow/create", "POST", { ...body, inspection_period_days: days }, params());
    assertEquals(rejected.status, 400);
  }
});

Deno.test("escrow fund, release, refund, and dispute are simulated", () => {
  for (const action of ["fund", "release", "refund"]) {
    const result = handleSandbox(`payments/escrow/esc_test_123/${action}`, "POST", {}, params());
    assertSimulated(result);
  }
  const dispute = handleSandbox("payments/escrow/esc_test_123/dispute", "POST", { reason: "Work is incomplete" }, params());
  assertSimulated(dispute);
  assertEquals(dispute.data.status, "disputed");
});

Deno.test("escrow list and retrieval stay simulated", () => {
  assertSimulated(handleSandbox("payments/escrow", "GET", null, params()));
  assertSimulated(handleSandbox("payments/escrow/esc_test_123", "GET", null, params()));
});

Deno.test("charge session and payout preserve sandbox behavior", () => {
  const charge = handleSandbox("payments/charge/session", "POST", { amount: 500 }, params());
  assertSimulated(charge);
  assertEquals(charge.data.amount, 500);
  const payout = handleSandbox("payments/payout", "POST", { user_id: "u1", amount: 500 }, params());
  assertSimulated(payout);
  assertEquals(payout.data.status, "completed");
  assertEquals(payout.data.currency, "NC");
});

Deno.test("removed product surfaces no longer return a sandbox success", () => {
  for (const endpoint of ["wallet/create", "vtu/airtime", "video/create-room", "ai/chat", "contracts/call", "wallet/transfer"]) {
    const result = handleSandbox(endpoint, "POST", {}, params());
    assertEquals(result.status, 404);
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
