# NaijaLancers security and settlement audit — 25 November 2026

## Scope
Reviewed the contract-negotiation branch, live Supabase RPC definitions and grants,
wallet/profile RLS policies, digital-product checkout, gig milestones, SafePay, and
developer escrow/payout functions. No production database changes were made.

## Fixes in this branch

- Digital-product checkout now uses one SECURITY DEFINER transaction that reads
  the live price, checks the buyer's wallet, debits the buyer, credits the seller,
  records the purchase/download entitlement, updates the count, and records the
  platform fee. Both product purchase screens use the RPC. Direct client INSERT
  into `digital_product_purchases` is revoked.
- Developer payout and developer escrow RPCs now write to the actual
  `wallet_transactions` schema (`kind/reference/metadata`, not obsolete
  `type/description` columns). Privileged developer escrow/payout RPCs are
  service-role-only.
- NC conversion is owner-only and enforces the published 100:5 conversion ratio.
- Developer charge sessions now require the payer's authenticated identity and use correct wallet ledger columns.
- Mini-app charges are restricted to the paying user; NC payouts can no longer be initiated by an untrusted mini-app iframe in a user's browser. NC payouts must be issued by the developer's server through the Developer API. Mini-app payment RPCs check wallet buckets and require an approved app.
- Course enrollment now checks both wallet balance fields before debiting; scheduled course escrow release is service-role-only.
- SafePay proposal, acceptance, cancellation, completion, release and dispute
  functions now explicitly reject missing authentication and enforce the correct
  buyer/seller role. The SafePay auto-release loop locks rows with SKIP LOCKED to
  prevent a race with manual release.
- Gig checkout verifies that the seller matches the actual active gig owner and
  checks both wallet balance columns before deducting escrow.
- Gig cancellation now rejects unauthenticated callers and prevents a full refund
  after any milestone has already been paid.
- Gig completion requires the seller to mark the order delivered and cannot
  release a milestone-funded order as a second full-order payout.
- Milestone seller submission now has an RLS policy; a trigger restricts each
  party's editable fields and prevents direct amount changes or marking a
  milestone released without the payout RPC. Release requires buyer approval,
  validates that milestone totals equal the order amount, and applies partner
  commission/platform fee settlement.
- The milestone UI now calls the payout RPC instead of merely changing the
  milestone status. SafePay milestones no longer show a misleading per-milestone
  release button.
- Authenticated users can no longer update or delete their own wallet ledger
  rows. Ledger rows are append-only from browser sessions.

## Confirmed remaining blockers — do not deploy the staged profile guard yet

1. The live `profiles` RLS policy allows a user to update their entire own row,
   including wallet balances, verification flags, partner attribution, premium
   status and computed earnings. A guard trigger is staged in
   `supabase/pending/guard_profile_sensitive_fields.sql`, but applying it now
   would break existing browser-side balance writers listed in
   `supabase/pending/README.md`. Migrate those writers to trusted RPCs first.
2. `increment_wallet_balance` remains SECURITY DEFINER and executable by public
   roles. It has no caller authorization and is used by browser game/reward
   components. It must be replaced with dedicated server-side game/reward RPCs
   before its client execution grants can be revoked.
3. Authenticated users can still INSERT their own `wallet_transactions` rows.
   This can falsify transaction history even though it does not directly change
   balances. Move remaining browser ledger writes to trusted RPCs, then revoke
   direct client INSERT.
4. Hourly hire contracts still do not have timesheet submission, approval, or
   weekly settlement. The contract UI discloses this limitation.

## Deployment
This is a reviewable draft PR only. Do not apply the migration to production until
CI passes and the remaining wallet/profile writer migration plan is reviewed.
