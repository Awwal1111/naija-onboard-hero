-- Keep the deployed order UI working during the transition to the
-- transition_gig_order RPC. The table trigger still restricts status changes
-- and protects ownership, amount, fee, and escrow-related fields.
GRANT UPDATE (status, seller_notes, delivered_at, delivery_files, revision_count, updated_at)
ON TABLE public.gig_orders TO authenticated;
