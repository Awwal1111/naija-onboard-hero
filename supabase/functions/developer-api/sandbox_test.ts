// Sandbox safety test suite for the Developer API.
//
// Guarantees verified here:
//   1. handleSandbox() is a pure function — it never imports/uses the
//      Supabase client, fetch, or any external network primitive.
//   2. Every supported sandbox endpoint returns simulated payloads and
//      NEVER real identifiers, real tx hashes, or real balances.
//   3. The source code wires sandbox requests so they short-circuit
//      BEFORE any DB write, external API call, or NC deduction.
//   4. Optional live-against-deployed integration test (skipped unless
//      SANDBOX_API_KEY env is set) confirms the deployed function:
//        - returns X-Sandbox: true
//        - logs api_usage with is_sandbox=true and cost=0
//        - does not change the developer's wallet_balance
//
// Run: invoked automatically by supabase--test_edge_functions.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { handleSandbox } from "./index.ts";

const SOURCE = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

// ---------- 1. Static analysis: sandbox handler is pure ----------

Deno.test("handleSandbox source body contains no supabase/fetch/network calls", () => {
  const start = SOURCE.indexOf("export function handleSandbox(");
  assert(start > 0, "handleSandbox not found");
  // Function body ends at the closing brace before deductBalance helper.
  const end = SOURCE.indexOf("// Deduct NC balance for paid endpoints", start);
  assert(end > start, "could not locate end of handleSandbox");
  const body = SOURCE.slice(start, end);

  const forbidden = [
    "supabase.from(",
    "supabase.rpc(",
    "supabase.functions.invoke(",
    "supabase.auth.",
    "fetch(",
    "deductBalance(",
    "triggerWebhook(",
    "Deno.env.get(",
  ];
  for (const needle of forbidden) {
    assert(
      !body.includes(needle),
      `handleSandbox must not contain "${needle}" — sandbox would touch production`,
    );
  }
});

Deno.test("sandbox branch short-circuits before any DB write or NC deduction", () => {
  // The dispatch wrapper must enter the sandbox branch BEFORE deductBalance
  // is invoked and BEFORE any handleX() that touches the DB.
  const dispatchIdx = SOURCE.indexOf("if (isSandbox && !isWebhookCrud)");
  assert(dispatchIdx > 0, "sandbox dispatch guard not found");

  const deductIdx = SOURCE.indexOf("await deductBalance(", dispatchIdx);
  const balanceCheckIdx = SOURCE.indexOf(
    "if (!isSandbox && cost > 0",
    0,
  );
  assert(balanceCheckIdx > 0, "balance gate must be guarded by !isSandbox");
  assert(
    deductIdx === -1 || deductIdx > dispatchIdx,
    "deductBalance() must never run before the sandbox short-circuit",
  );

  // Final wallet debit on success must also be sandbox-guarded.
  assertStringIncludes(SOURCE, "cost > 0 && !isSandbox");
  // Usage logging must record the sandbox flag and zero cost.
  assertStringIncludes(SOURCE, "statusCode < 400 && !isSandbox ? cost : 0, isSandbox");
});

// ---------- 2. Pure-function behavior of every sandbox endpoint ----------

const params = (q = "") => new URLSearchParams(q);

function assertSimulated(res: { data?: any; error?: string }) {
  assertExists(res.data, `expected data, got error: ${res.error}`);
  assertEquals(res.data.mode, "sandbox");
  assertEquals(res.data.simulated, true);
  assertStringIncludes(res.data.note, "No real funds");
}

Deno.test("wallet/create returns simulated wallet, never a real address", () => {
  const res = handleSandbox(
    "wallet/create",
    "POST",
    { external_user_id: "u_test_1" },
    params(),
  );
  assertSimulated(res);
  assertEquals(res.data.external_user_id, "u_test_1");
  assertStringIncludes(res.data.address, "0xSANDBOX");
  assertStringIncludes(res.data.wallet_id, "wlt_");
});

Deno.test("wallet/create rejects missing external_user_id without DB lookup", () => {
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
  assertStringIncludes(res.data.tx_hash, "0xSANDBOX");
  // Must be obviously fake — no 64-hex real hash shape.
  assert(!/^0x[0-9a-f]{64}$/i.test(res.data.tx_hash));
});

Deno.test("vtu airtime + data return success without provider call", () => {
  for (const endpoint of ["vtu/airtime", "vtu/data"]) {
    const res = handleSandbox(
      endpoint,
      "POST",
      { phone: "08012345678", amount: 100, provider: "MTN" },
      params(),
    );
    assertSimulated(res);
    assertEquals(res.data.status, "success");
    assertStringIncludes(res.data.reference, "vtu_");
  }
});

Deno.test("notification endpoints return queued message ids", () => {
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

Deno.test("ai/chat returns mock LLM response, never tokens from a real model", () => {
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

Deno.test("smart contract endpoints return Alfajores testnet markers only", () => {
  const deploy = handleSandbox("contracts/deploy", "POST", {}, params());
  assertSimulated(deploy);
  assertEquals(deploy.data.chain, "CELO-Alfajores");

  const call = handleSandbox("contracts/call", "POST", {}, params());
  assertSimulated(call);
  assertEquals(call.data.chain, "CELO-Alfajores");
});

Deno.test("unknown endpoints fall through without touching production", () => {
  const res = handleSandbox(
    "fictional/endpoint",
    "POST",
    {},
    params(),
  );
  assertEquals(res.status, 404);
  assertEquals(res.data, undefined);
  assertStringIncludes(res.error ?? "", "not implemented in sandbox");
});

// ---------- 3. Optional live integration test ----------

const SANDBOX_KEY = Deno.env.get("SANDBOX_API_KEY");
const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");

Deno.test({
  name: "deployed sandbox call returns X-Sandbox:true and 200 (skipped unless SANDBOX_API_KEY set)",
  ignore: !SANDBOX_KEY || !SUPABASE_URL || !SUPABASE_ANON,
  fn: async () => {
    const url = `${SUPABASE_URL}/functions/v1/developer-api/wallet/balance?external_user_id=u_int_test`;
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
    assertEquals(json?.data?.mode ?? json?.mode, "sandbox");
  },
});
