## Goal

Let third-party miniapps request **USDT** (Celo USDT) in addition to **NC**, so external developers can integrate without forcing their users into the internal NaijaLancers currency.

## What changes (and what doesn't)

The SDK protocol stays backward compatible. We just add an optional `currency` field. If a miniapp doesn't send it, behavior is identical to today (NC). If it sends `"USDT"`, we route through the user's MiniPay/Celo wallet.

```text
Miniapp → host                    Host → Miniapp
─────────────────────             ─────────────────────
njl_charge {                      njl_charge_result {
  amount: 5,                        success, txRef,
  currency: "USDT",  ← new          currency, error?
  description: "..."              }
}
```

## Scope

### 1. `MiniAppViewer.tsx` — protocol upgrade
- Parse optional `currency` field on `njl_charge`, `njl_payout`, `njl_balance` (default `"NC"`).
- `njl_balance` with `currency:"USDT"` → return the on-chain USDT balance via `getMiniPayUSDTBalance` (read from `useCeloWallet` / MiniPay address).
- `njl_charge` with `currency:"USDT"`:
  - Show the existing charge confirmation dialog with the USDT amount + symbol.
  - On confirm, call `sendUSDTViaMiniPay(<app_payout_address>, amount)` instead of the NC RPC.
  - Echo back `currency:"USDT"` and the on-chain `txHash` as `txRef`.
- `njl_payout` with `currency:"USDT"` → reject for now (apps paying USERS in USDT requires the app's own funded wallet, out of scope).
- If the user has no wallet connected and the app requests USDT, return a clear error so the SDK can prompt the user.

### 2. `mini_apps` table — payout address
Add an optional `usdt_payout_address` column (Celo wallet). Apps that want USDT charges register their address there. Without it, USDT charge requests are rejected with `"App not configured for USDT"`.

### 3. `SubmitMiniAppForm.tsx` — let developers register the address
Add a single optional input: "USDT payout wallet (Celo)" with a `0x...` validator.

### 4. `DeveloperDocs.tsx` — document the new field
Short section showing the `currency` parameter with one NC example and one USDT example.

## Out of scope (intentionally)

- No internal USDT balance ledger (would need full custody + accounting).
- No NC↔USDT auto-conversion inside the SDK.
- No payouts in USDT to users (deferred until escrow/custody story is ready).
- No changes to NC Savings, NC Converter, or any non-SDK surface.

## Technical notes

- `sendUSDTViaMiniPay` already exists in `src/lib/minipay.ts` (Celo mainnet, 6 decimals).
- USDT amount comes through as a decimal number (e.g. `1.5` USDT), no conversion math needed.
- Confirmation dialog will format as `1.5 USDT` (Celo) when `currency==="USDT"` instead of `₦NC`.
- All changes are additive — existing miniapps keep working unchanged.

## Verification

After build: open an existing miniapp in the viewer, confirm NC flow still works. Then test a `njl_charge` with `currency:"USDT"` from the browser console to confirm the dialog shows USDT and the MiniPay transaction is triggered.

Approve and I'll implement.