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
