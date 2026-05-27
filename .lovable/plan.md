## 1) Introduction Chat (no connection required)

Goal: Any user can send ONE "introduction message" to anyone they aren't connected/chatting with. Recipient sees an Intro card with Accept / Decline. Sender cannot send more until accepted. On Accept, a normal chat opens and conversation begins. On Decline, intro is hidden and sender is blocked from re-sending for 7 days.

Schema
- New table `public.chat_intro_requests`
  - `id`, `sender_id`, `recipient_id`, `message` (text, max 500), `status` ('pending' | 'accepted' | 'declined'), `created_at`, `responded_at`
  - Unique partial index: one pending intro per (sender, recipient)
  - RLS: sender can insert/select own; recipient can select + update status of intros to them
  - GRANTs for authenticated + service_role
- DB function `accept_chat_intro(p_intro_id)` — marks accepted, creates/returns `chats` row, inserts the intro message into `messages` from sender, marks responded_at.
- DB function `decline_chat_intro(p_intro_id)` — marks declined.

Frontend
- New hook `useChatIntro.tsx` — `sendIntro`, `acceptIntro`, `declineIntro`, list pending intros for current user.
- Chat entry guard in `useChat.tsx` / `Chat.tsx`: if not connected AND no existing chat AND no accepted intro, show Intro composer (single message, 500 char limit) instead of normal input. Once sent, show "Intro sent, waiting for acceptance".
- `MessagesTab.tsx`: add an "Introductions" section at top listing pending intros received with Accept / Decline buttons + sender preview.
- Notification on intro received and intro accepted (reuse existing notifications table).

## 2) SafePay Disputes

Goal: Either party in an active or completed SafePay can raise a dispute. Funds stay locked. Admin reviews in dashboard and rules (release to seller / refund to buyer).

Schema
- Reuse existing `transaction_disputes` table. Add columns:
  - `dispute_type text default 'generic'` ('generic' | 'safepay')
  - `safepay_id uuid null` (FK references safepay_transactions)
  - `counterparty_id uuid null`
- Set `safepay_transactions.status` to `'disputed'` when raised (already in type union).
- DB function `raise_safepay_dispute(p_safepay_id, p_reason, p_details)` — verifies caller is buyer/seller, status in ('active','complete'), sets status='disputed', inserts into `transaction_disputes` with type='safepay', safepay_id, counterparty_id.
- DB function `admin_resolve_safepay_dispute(p_dispute_id, p_ruling, p_response)` — `p_ruling` ∈ ('release_seller','refund_buyer'). Moves funds accordingly (mirrors `release_safepay_funds` / `cancel_safepay_proposal` logic), sets safepay status to 'released' or 'cancelled', sets dispute status='resolved' with admin_response.

Frontend
- `SafePayDialog.tsx`: when status is `active` or `complete`, add "Raise Dispute" button → small dialog with reason dropdown + details textarea → calls `raise_safepay_dispute`. When status === 'disputed', show a "Under Admin Review" state for both parties.
- `useSafePay.tsx`: add `raiseDispute(reason, details)`; include `'disputed'` in fetched statuses so the disputed transaction stays visible.
- `useDisputes.tsx`: no change needed (already reads all user disputes).
- `AdminDisputeManagement.tsx`: 
  - Show `dispute_type` badge; for safepay disputes show buyer, seller, amount, current safepay status, and two ruling buttons "Release to Seller" and "Refund Buyer" that call `admin_resolve_safepay_dispute`.
  - Filter tabs: All / Generic / SafePay / Pending / Resolved.

## Technical Notes
- All money movement stays in SECURITY DEFINER DB functions — no client-side balance edits.
- Add transactions log entries on admin ruling for audit (insert into existing `transactions` table with appropriate type).
- Push/in-app notifications fire on: intro received, intro accepted, dispute raised (to counterparty + admins), dispute resolved (to both parties).
- Realtime: `AdminDisputeManagement` already subscribes to `transaction_disputes` — new safepay rows will appear automatically.

## Files to add/edit
- New migration (schema + functions + grants + RLS)
- New: `src/hooks/useChatIntro.tsx`, `src/components/ChatIntroComposer.tsx`, `src/components/IntroRequestsList.tsx`, `src/components/RaiseDisputeDialog.tsx`
- Edit: `src/pages/Chat.tsx`, `src/components/MessagesTab.tsx`, `src/components/SafePayDialog.tsx`, `src/hooks/useSafePay.tsx`, `src/components/AdminDisputeManagement.tsx`
