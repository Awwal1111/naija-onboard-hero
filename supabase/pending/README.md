# Pending migrations (NOT applied automatically)

Files here are intentionally outside `supabase/migrations/` so `supabase db push`
does not apply them until you decide to.

## lock_down_increment_wallet_balance.sql
`increment_wallet_balance(target_user_id, amount_to_add)` is SECURITY DEFINER, has
no caller check and default PUBLIC execute, and the browser calls it directly from:

- src/components/NaijaPredictor.tsx
- src/components/NigerianTrivia.tsx
- src/pages/GuessNumberGame.tsx
- src/pages/ProductDetail.tsx

Any user can therefore credit any amount to any account from the browser console.
Applying this migration closes that hole but BREAKS those four features until their
balance logic (stakes, winnings, purchases) is moved into Edge Functions that use
the service role. Move the logic first, then apply the migration.


## guard_profile_sensitive_fields.sql
The live `profiles` table grants authenticated users UPDATE on their own entire row.
That includes wallet balances, verification flags, premium/boost flags, partner_id,
and computed reputation/earnings fields. This is unsafe.

The staged trigger prevents direct browser writes to those fields, but it is NOT
ready to apply yet. Existing browser-side flows still update balances directly and
would fail after the trigger is enabled. Migrate these callers to trusted RPCs first:

- `src/hooks/useWallet.tsx`
- `src/hooks/useTasks.tsx`
- `src/hooks/useDailySignin.tsx`
- `src/hooks/useWorkDiary.tsx`
- `src/hooks/useReferralTasks.tsx`
- `src/pages/Donations.tsx`
- `src/pages/ExpertVerification.tsx`
- `src/components/ExpertVerificationSection.tsx`
- `src/components/experts/ExpertVerificationHub.tsx`
- `src/components/ActionableAdminAI.tsx`
- `src/components/admin/AdminAIDrawer.tsx`
- `src/components/AdminReferralTasksSection.tsx`

The digital-product purchase pages were moved to the atomic
`purchase_digital_product` RPC in the security-audit branch. Do not apply the
profile guard until the remaining browser-side balance writers are migrated and
tested.

## increment_wallet_balance
This function remains a critical open issue: it is SECURITY DEFINER, has no caller
authorization, and is used by browser game flows. Do not apply
`lock_down_increment_wallet_balance.sql` until the browser callers are moved to
dedicated server-side game/reward functions. The referral Edge Function already
uses the service role and can continue after that migration.


## Wallet ledger INSERT policy
The security-audit branch removes client UPDATE and DELETE permissions from
`wallet_transactions`, but direct authenticated INSERT is still enabled because
several browser flows write their own transaction rows. This permits forged
history entries (not direct balance changes). Migrate those writers to trusted
RPCs, then revoke client INSERT as well.

Mini-app NC payouts are no longer accepted from the user browser. Developers
must issue NC rewards from their server using the Developer API.


## SafePay escrow release hardening
`security_escrow_release_hardening.sql` replaces manual release, cancellation,
automatic release, and dispute settlement with fail-closed escrow checks. A
payout or refund is rejected when the buyer's `user_wallets.escrow_hold` is
missing or smaller than the transaction amount. Automatic release skips and
logs inconsistent rows rather than paying them.

Before applying:
- Reconcile active SafePay rows against the original wallet debit and hold ledger.
- Review rows whose aggregate `escrow_hold` is below the sum of active SafePay amounts.
- Keep direct browser INSERT/UPDATE on `safepay_transactions` revoked using
  `security_permission_hotfixes.sql`.

## Gig-order escrow and status hardening
`security_gig_order_escrow_hardening.sql` introduces a private per-order escrow
hold ledger. The trusted `place_gig_order` RPC writes the hold in the same
transaction as the buyer debit. Completion, cancellation, and milestone
settlement require and consume that hold. The frontend now calls
`transition_gig_order` instead of updating `gig_orders` directly, allowing
browser UPDATE privileges to be revoked.

Important compatibility requirement:
- Existing open orders have no private hold row and will fail closed after this
  file is applied. Reconcile each order against independent wallet evidence and
  create a verified hold row manually; do not bulk-backfill from
  `wallet_transactions`, because authenticated users can still insert their own
  ledger rows.
- Confirm every non-UI writer of `gig_orders` is a trusted SECURITY DEFINER
  function before applying the UPDATE revoke.
- Test seller acceptance, work start, delivery, buyer revision requests,
  cancellation, full completion, and each milestone release.

## Profile guard follow-up
`security_permission_hotfixes.sql` now also protects verification payment and
review fields, email confirmation, partner assignment, computed expert level,
and profile aggregates. The current ExpertVerification page still writes
verification status and payment fields directly, so migrate that page to
trusted RPCs before applying the guard. Wallet balance fields remain excluded
until all browser-side wallet writers listed above have been migrated.

## Production security hotfixes already applied

The following focused migrations were applied and verified on the active
NaijaLancers Supabase project (project ref `jxybqmquymxkvxxpiuhv`):

- `require_authenticated_premium_subscription`: premium subscription now requires
  an authenticated user subscribing only for their own account; anonymous
  execution is revoked.
- `revoke_direct_safepay_client_writes`: browser INSERT/UPDATE/DELETE on
  `safepay_transactions` is revoked; SafePay uses validated RPCs.
- `revoke_direct_user_wallet_insert`: browser wallet-row creation is revoked;
  SafePay fallback now provisions a zeroed wallet through
  `ensure_user_wallet_row`.
- `secure_connection_request_workflow`: direct connection creation and request
  updates are revoked; authenticated send/respond RPCs validate the request
  owner and accepted status.

These applied changes do not mean the remaining staged escrow/profile migrations
are ready. The three legacy SafePay rows with missing/insufficient aggregate
holds remain under manual reconciliation; no funds were moved by this audit.

All files in this folder are staged review artifacts only. None of these
pending SQL files has been applied to production by this branch.
