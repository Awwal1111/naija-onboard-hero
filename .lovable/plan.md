
## Scope

Six connected changes across expert discovery, gigs, profile, and a new Hire-Contract system.

---

### 1. Portfolio link on expert discovery

- `expert_applications` already stores `portfolio_url` (and similar). Surface it on:
  - `PublicExpert.tsx` (public profile) — new "Portfolio" section with the external link from their application, separate from `portfolio_items` in profile.
  - `PublicExperts.tsx` discovery card — small "Portfolio ↗" chip when present.
- Extend `get_public_expert` RPC to also return `portfolio_url` from the latest approved expert application.

---

### 2. Gig packages: Basic / Standard / Premium

- New table `gig_packages(gig_id, tier, price, delivery_days, revisions, description, features[])`. Unique on `(gig_id, tier)`.
- Migrate existing single-price gigs: seed a `basic` row from current `price`/`delivery_days`.
- Edit Gig UI (`EditGig.tsx` / new `CreateGig.tsx`): tabbed Basic/Standard/Premium editor (Standard & Premium optional).
- Buyer ordering UI (`PublicGig.tsx`, `GigDetail`): tier picker → passes `tier` to `place_gig_order` RPC (extended to accept `p_tier`).

---

### 3. Milestone orders with upfront escrow

- Extend `place_gig_order` RPC: optional `p_milestones jsonb` (array of `{title, amount, due_date}`).
  - Sum must equal `amount`.
  - Same withdrawable-balance check + escrow lock as today.
  - Creates `project_milestones` rows tied to the new order.
- Order checkout UI: "Pay all at once" (default) vs "Split into milestones" toggle. Milestones editor (add/remove rows). Validates sum.
- Release flow already exists via `useMilestones.approveMilestone` → wire `releaseMilestone` to a new RPC `release_gig_milestone(p_milestone_id)` that moves that milestone's amount from escrow to seller's withdrawable and marks released. Order auto-completes when all milestones released.

---

### 4. Profile: Certificates + Skill section + Expert Levels

- New table `user_certificates(user_id, title, issuer, issue_date, credential_url, credential_id)`. Owner RLS; public read.
- Profile edit UI: under existing Skills section, add "Certificates" subsection (add/edit/delete rows, just link + title).
- Public profile renders both.
- **Expert levels** (auto-computed, no manual override):
  - `New`: <3 completed orders
  - `Level 1`: ≥3 completed, avg ≥4.5★
  - `Level 2`: ≥10 completed, avg ≥4.7★, active in last 60d
  - `Top Rated`: ≥25 completed, avg ≥4.8★, ≥90% completion rate
  - Add `expert_level` column to `profiles` + SQL function `compute_expert_level(user_id)` + trigger on `gig_orders` status change & `expert_ratings` insert to recompute.
  - Render badge on `PublicExpert`, `PublicExperts` card, `ExpertProfile`, and inside chat headers via existing profile preview.

---

### 5. Rename "Hire Now" tab from Gig → "My Gig" + new "Hire" flow

- On Expert profile actions, rename existing "Hire Now" (gig list) to **"My Gigs"**.
- Add separate **"Hire"** button → opens new `HireContractDialog`.
- Contract types:
  - **Fixed**: total amount, scope, deadline. Full amount escrowed at signing.
  - **Hourly**: hourly rate, weekly cap, expected hours. Deposit = `min(weekly_cap × rate, requested_initial_deposit)` escrowed at signing; weekly billing handled in a follow-up (out of scope for this batch — note in code).
- Signing: client fills form → both parties e-sign (typed name + checkbox + IP/timestamp). Status flow: `draft → pending_expert_signature → active → completed/cancelled/disputed`.

---

### 6. Hire-Contract storage, escrow, delivery

- New tables:
  - `hire_contracts(id, client_id, expert_id, type ['fixed'|'hourly'], title, scope, total_amount, hourly_rate, weekly_cap_hours, deposit_amount, escrow_held, deadline, status, client_signed_at, expert_signed_at, client_signature, expert_signature, pdf_url, created_at)`
  - `hire_contract_events(contract_id, type, payload, created_at)` for audit.
- RPCs:
  - `create_hire_contract(...)` — inserts draft.
  - `sign_hire_contract(p_contract_id)` — when both signed: deduct escrow from client's `balance_withdrawable` → admin_wallet (mirrors `place_gig_order`). Atomic. Sets `status='active'`, `escrow_held=true`.
  - `complete_hire_contract`, `cancel_hire_contract` — release/refund logic identical pattern.
- PDF: client-side `jspdf` (already installed) builds a clean contract PDF with both signatures, scope, payment terms. Uploaded to Catbox via existing `uploadToCatbox` → `pdf_url`.
- Delivery on signing (edge function `notify-hire-contract`):
  - **In-app**: row in `notifications` for expert.
  - **Email**: via existing Resend pipeline using profile `email`. Attach PDF URL (link, not attachment, to keep payload small).
  - **Telegram**: if expert has `telegram_user_id`, send via existing Telegram bot edge function with link to PDF.
  - Each notification includes filled message body + download link.

---

### Technical details

**Migrations (single file):**
1. `gig_packages` table + grants/RLS + backfill from `jobs_services`.
2. Extend `place_gig_order` RPC with `p_tier` and `p_milestones`.
3. `release_gig_milestone` RPC.
4. `user_certificates` table + grants/RLS.
5. `profiles.expert_level text default 'new'` + `compute_expert_level` function + triggers.
6. `hire_contracts`, `hire_contract_events` tables + grants/RLS.
7. `create_hire_contract`, `sign_hire_contract`, `complete_hire_contract`, `cancel_hire_contract` RPCs.
8. Update `get_public_expert` to include `portfolio_url`, `expert_level`, `certificates`.

**Edge function:** `notify-hire-contract` (in-app + email via Resend + Telegram). Uses existing secrets (`RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`).

**Frontend additions:**
- `src/components/gig/PackageTierEditor.tsx`
- `src/components/gig/PackageTierPicker.tsx`
- `src/components/order/MilestoneCheckout.tsx`
- `src/components/profile/CertificatesEditor.tsx`
- `src/components/profile/ExpertLevelBadge.tsx`
- `src/components/hire/HireContractDialog.tsx`
- `src/components/hire/ContractSignaturePad.tsx`
- `src/lib/contractPdf.ts` (jsPDF builder)
- `src/hooks/useHireContracts.tsx`
- `src/hooks/useCertificates.tsx`
- `src/pages/HireContractDetail.tsx` (view/sign/download)
- Update `PublicExpert.tsx`, `PublicExperts.tsx`, `ExpertProfile.tsx`, `EditGig.tsx`, `PublicGig.tsx`, `useGigOrders.tsx`.

**Out of scope (call out to user after):**
- Hourly weekly auto-billing cron (need separate decision on cadence).
- Email attachment of PDF (we send link instead — much more reliable).

---

Given the size, I'll implement in this order and ship in one pass: migration → edge function → hooks → UI components → page wiring. I'll stop and confirm only if I hit something requiring a product decision.
