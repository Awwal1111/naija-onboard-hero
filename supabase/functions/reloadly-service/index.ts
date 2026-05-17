// Reloadly proxy: airtime top-ups, gift cards, utility bill payments.
// All transactions are charged in NC from the user's withdrawable balance,
// then forwarded to Reloadly using the platform-prefunded account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 1 USD ≈ 1600 NC (matches the rest of the platform)
const NC_PER_USD = 1600;

const RELOADLY_ENV = (Deno.env.get("RELOADLY_ENV") || "live").toLowerCase();
const IS_SANDBOX = RELOADLY_ENV === "sandbox";

const AUDIENCES = {
  airtime: IS_SANDBOX ? "https://topups-sandbox.reloadly.com" : "https://topups.reloadly.com",
  giftcard: IS_SANDBOX ? "https://giftcards-sandbox.reloadly.com" : "https://giftcards.reloadly.com",
  utility: IS_SANDBOX ? "https://utilities-sandbox.reloadly.com" : "https://utilities.reloadly.com",
};

const ACCEPTS = {
  airtime: "application/com.reloadly.topups-v1+json",
  giftcard: "application/com.reloadly.giftcards-v1+json",
  utility: "application/com.reloadly.utilities-v1+json",
};

// Simple in-memory token cache per cold start
const tokenCache: Record<string, { token: string; expires: number }> = {};

async function getReloadlyToken(service: keyof typeof AUDIENCES): Promise<string> {
  const cached = tokenCache[service];
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const resp = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("RELOADLY_CLIENT_ID"),
      client_secret: Deno.env.get("RELOADLY_CLIENT_SECRET"),
      grant_type: "client_credentials",
      audience: AUDIENCES[service],
    }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Reloadly auth failed: ${data?.error_description || data?.message || resp.status}`);
  }
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  tokenCache[service] = { token: data.access_token, expires: Date.now() + ttlMs };
  return data.access_token;
}

async function callReloadly(
  service: keyof typeof AUDIENCES,
  path: string,
  method: string = "GET",
  body?: unknown,
) {
  const token = await getReloadlyToken(service);
  const url = `${AUDIENCES[service]}${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: ACCEPTS[service],
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: resp.ok, status: resp.status, data };
}

function friendlyError(status: number, data: any): string {
  const msg = (data?.message || data?.errorCode || data?.error || "").toString();
  if (/insufficient/i.test(msg) || /balance/i.test(msg) || status === 402) {
    return "Service temporarily unavailable — our top-up wallet is being refilled. Please try again in a few minutes. Your NC has been refunded.";
  }
  if (status === 401 || status === 403) {
    return "We could not authenticate with the top-up provider. Your NC has been refunded — please try again shortly.";
  }
  if (status === 404 || /not.found|unsupported/i.test(msg)) {
    return "This product or operator is not currently available. Your NC has been refunded.";
  }
  if (status === 400 || /invalid/i.test(msg)) {
    return msg || "Some details are invalid. Please check the recipient/amount and try again. Your NC has been refunded.";
  }
  return msg || "The top-up provider could not complete this transaction. Your NC has been refunded.";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Auth: validate JWT and resolve user
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      userId = userData?.user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "";

    // ===== Read-only catalog actions (no auth required) =====
    if (action === "airtime_countries") {
      const r = await callReloadly("airtime", "/countries");
      return json({ success: r.ok, countries: r.data });
    }
    if (action === "airtime_operators") {
      const iso = String(body.country || "NG").toUpperCase();
      const r = await callReloadly("airtime", `/operators/countries/${iso}`);
      return json({ success: r.ok, operators: r.data });
    }
    if (action === "airtime_detect") {
      const phone = String(body.phone || "");
      const iso = String(body.country || "NG").toUpperCase();
      const r = await callReloadly("airtime", `/operators/auto-detect/phone/${encodeURIComponent(phone)}/countries/${iso}`);
      return json({ success: r.ok, operator: r.data, error: r.ok ? null : friendlyError(r.status, r.data) });
    }
    if (action === "giftcard_products") {
      const country = body.country ? `?countryCode=${String(body.country).toUpperCase()}` : "";
      const r = await callReloadly("giftcard", `/products${country}`);
      return json({ success: r.ok, products: r.data });
    }
    if (action === "utility_billers") {
      const iso = String(body.country || "NG").toUpperCase();
      const type = body.type ? `&type=${encodeURIComponent(body.type)}` : "";
      const r = await callReloadly("utility", `/billers?countryISOCode=${iso}${type}`);
      return json({ success: r.ok, billers: r.data });
    }

    // ===== Mutating actions (require auth) =====
    if (!userId) return json({ success: false, error: "Unauthorized" }, 401);

    // Helper to debit NC and create a pending tx row
    async function chargeNC(amountNC: number, productType: string, meta: any) {
      if (!Number.isFinite(amountNC) || amountNC <= 0) throw new Error("Invalid amount");
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance_withdrawable, wallet_balance")
        .eq("user_id", userId)
        .single();
      const w = Number(profile?.balance_withdrawable ?? 0);
      if (w < amountNC) {
        throw new Error(`Insufficient NC. You have NC ${w.toLocaleString()}, need NC ${amountNC.toLocaleString()}`);
      }
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          balance_withdrawable: w - amountNC,
          wallet_balance: Number(profile?.wallet_balance ?? 0) - amountNC,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (upErr) throw new Error("Balance update failed");

      const { data: tx, error: txErr } = await supabase
        .from("reloadly_transactions")
        .insert({
          user_id: userId,
          product_type: productType,
          nc_amount: amountNC,
          status: "pending",
          ...meta,
        })
        .select("id")
        .single();
      if (txErr) throw new Error(txErr.message);
      return tx.id as string;
    }

    async function refundNC(txId: string, amountNC: number, reason: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance_withdrawable, wallet_balance")
        .eq("user_id", userId)
        .single();
      await supabase.from("profiles").update({
        balance_withdrawable: Number(profile?.balance_withdrawable ?? 0) + amountNC,
        wallet_balance: Number(profile?.wallet_balance ?? 0) + amountNC,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      await supabase.from("reloadly_transactions").update({
        status: "refunded",
        failure_reason: reason.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", txId);
    }

    // ===== Airtime top-up =====
    if (action === "airtime_topup") {
      const { operatorId, amount, useLocalAmount, phone, country } = body;
      if (!operatorId || !amount || !phone) return json({ success: false, error: "Missing fields" }, 400);
      // Reloadly amount is in operator's destination/sender currency. We assume USD sender → convert NC.
      const usdAmount = Number(amount);
      const ncAmount = Math.ceil(usdAmount * NC_PER_USD * 1.05); // 5% service fee
      const txId = await chargeNC(ncAmount, "airtime", {
        provider: String(operatorId),
        recipient: String(phone),
        country_code: country || null,
        usd_amount: usdAmount,
        metadata: { useLocalAmount: !!useLocalAmount },
      });
      const r = await callReloadly("airtime", "/topups", "POST", {
        operatorId: Number(operatorId),
        amount: usdAmount,
        useLocalAmount: !!useLocalAmount,
        customIdentifier: txId,
        recipientPhone: { countryCode: country || "NG", number: String(phone) },
      });
      if (!r.ok) {
        const reason = friendlyError(r.status, r.data);
        await refundNC(txId, ncAmount, reason);
        return json({ success: false, error: reason, txId });
      }
      await supabase.from("reloadly_transactions").update({
        status: "success",
        reloadly_transaction_id: String(r.data?.transactionId || ""),
        metadata: r.data,
        updated_at: new Date().toISOString(),
      }).eq("id", txId);
      return json({ success: true, txId, data: r.data });
    }

    // ===== Gift card order =====
    if (action === "giftcard_order") {
      const { productId, unitPrice, quantity, recipientEmail, recipientPhone, senderName } = body;
      if (!productId || !unitPrice) return json({ success: false, error: "Missing fields" }, 400);
      const qty = Math.max(1, Number(quantity || 1));
      const usdAmount = Number(unitPrice) * qty;
      const ncAmount = Math.ceil(usdAmount * NC_PER_USD * 1.05);
      const txId = await chargeNC(ncAmount, "giftcard", {
        provider: String(productId),
        recipient: recipientEmail || recipientPhone || null,
        usd_amount: usdAmount,
        metadata: { quantity: qty, senderName },
      });
      const r = await callReloadly("giftcard", "/orders", "POST", {
        productId: Number(productId),
        countryCode: body.country || "US",
        quantity: qty,
        unitPrice: Number(unitPrice),
        customIdentifier: txId,
        senderName: senderName || "NaijaLancers",
        recipientEmail: recipientEmail || undefined,
        recipientPhoneDetails: recipientPhone
          ? { countryCode: body.country || "US", phoneNumber: recipientPhone }
          : undefined,
      });
      if (!r.ok) {
        const reason = friendlyError(r.status, r.data);
        await refundNC(txId, ncAmount, reason);
        return json({ success: false, error: reason, txId });
      }
      await supabase.from("reloadly_transactions").update({
        status: "success",
        reloadly_transaction_id: String(r.data?.transactionId || ""),
        metadata: r.data,
        updated_at: new Date().toISOString(),
      }).eq("id", txId);
      return json({ success: true, txId, data: r.data });
    }

    // ===== Utility bill payment =====
    if (action === "utility_pay") {
      const { billerId, amount, subscriberAccountNumber, country } = body;
      if (!billerId || !amount || !subscriberAccountNumber)
        return json({ success: false, error: "Missing fields" }, 400);
      const usdAmount = Number(amount);
      const ncAmount = Math.ceil(usdAmount * NC_PER_USD * 1.05);
      const txId = await chargeNC(ncAmount, "utility", {
        provider: String(billerId),
        recipient: String(subscriberAccountNumber),
        country_code: country || null,
        usd_amount: usdAmount,
      });
      const r = await callReloadly("utility", "/pay", "POST", {
        billerId: Number(billerId),
        amount: usdAmount,
        useLocalAmount: !!body.useLocalAmount,
        subscriberAccountNumber: String(subscriberAccountNumber),
        customIdentifier: txId,
        referenceId: txId,
        additionalInfo: body.additionalInfo || undefined,
      });
      if (!r.ok) {
        const reason = friendlyError(r.status, r.data);
        await refundNC(txId, ncAmount, reason);
        return json({ success: false, error: reason, txId });
      }
      await supabase.from("reloadly_transactions").update({
        status: "success",
        reloadly_transaction_id: String(r.data?.transactionId || r.data?.id || ""),
        metadata: r.data,
        updated_at: new Date().toISOString(),
      }).eq("id", txId);
      return json({ success: true, txId, data: r.data });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("[reloadly-service]", err?.message);
    return json({ success: false, error: err?.message || "Server error" }, 500);
  }
});
