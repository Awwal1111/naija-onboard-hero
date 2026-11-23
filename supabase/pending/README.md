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
