
# Premium Compilation + Free-Tier Limits

Goal: make the existing Premium page reachable, working, and meaningful by enforcing a clear set of free-tier limits across the app. Premium users bypass all limits.

## 1. Premium entry points (so users can find it)
- Add "Premium" / Crown link in: `BottomNavBar` (More menu), `Settings` page, `WalletCard` upsell, profile menu.
- `/premium` and `/upgrade` already route to `src/pages/Premium.tsx`. Verify `PremiumSubscriptionDialog` actually charges NC and flips `is_premium`. Fix if broken.
- Add "Upgrade to Premium" CTA in every limit-block toast.

## 2. Central premium gate
- Create `src/hooks/usePremiumGate.tsx` exposing:
  - `isPremium` (from profile)
  - `checkQuota(key, limit, windowHours)` → reads/increments `usage_counters` row
  - `enforce(key, limit, label)` → toast + open Premium dialog when over
- Create table `public.usage_counters (user_id, key, count, window_start)` with RLS owner-only + a SECURITY DEFINER RPC `increment_usage(_key, _window_hours)` returning new count.

## 3. Limits to enforce (free → premium)

| Area | Free limit | Premium |
|---|---|---|
| Direct message to a stranger (not connected, no proposal sent, not premium) | blocked | allowed |
| Total chat messages sent | 20 / day | unlimited |
| Platform-wide "messages" (SMS/email triggers etc.) | 10 / month | 40 / month |
| AI assistant usage (AIWritingAssistant, AIChat, Copilot) | 3 / day | unlimited |
| Any "edit" action (post/gig/profile/comment) | 1 / day | unlimited |
| Chat image upload size | 5 MB | 20 MB |
| Feed post image size | 5 MB | 20 MB |
| Story upload size | 5 MB | 20 MB |
| Audio/video call length | 10 min hard cut | unlimited |
| View other user's contact info (phone/WhatsApp/email/Meet/FB) | hidden | visible |
| Gig images | 1 max | multiple |
| Gigs per account | 1 max | unlimited |
| Portfolio items | 1 max | unlimited |
| Skills on profile | 2 max | unlimited |
| Auto image compression | always on for free | off (original) for premium |

## 4. Where each rule plugs in
- **Stranger DM block**: `src/hooks/useChat.tsx` `initializeChat` — before creating chat, check (a) `is_premium`, (b) existing connection in `connections`, (c) a proposal row from sender → recipient. Else throw + open Premium dialog.
- **20 chat msgs/day**: `useChat.sendMessage` → `enforce('chat_send', 20, 24h)`.
- **AI 3/day**: wrap `AIWritingAssistant`, `AIChatInterface`, `CopilotChat` send handlers with `enforce('ai_use', 3, 24h)`.
- **Edits 1/day**: `EditPostDialog.handleSave`, `EditGig` save, profile edit save, gig edit, comment edit → `enforce('edit_action', 1, 24h)`.
- **Image size 5 MB + auto-compress**: central helper `src/lib/imageLimits.ts` used by chat attach, feed composer, story uploader, gig uploader. Free → run browser-image-compression to ≤5 MB + downscale; Premium → pass through.
- **Call 10 min**: in WebRTC call component, start a timer; at 10:00 for free users, force-end with toast + upsell.
- **Contact view**: `ContactButtons.tsx` — if viewer is not premium and not connected, render locked state + Crown CTA instead of buttons. Same in profile pages and `useChat` exposes contact fields only when allowed.
- **Gig 1 image / 1 gig**: gig create form caps image array length; `MyGigs`/create flow checks `count(gigs where user_id = me)` < 1 for free.
- **Portfolio 1 / Skills 2**: profile add handlers check current count.
- **Status 5 MB**: story uploader uses same `imageLimits.ts`.

## 5. UX
- Single shared `PremiumUpsellToast({ reason })` component. Every blocked action shows it with one-tap "Upgrade".
- A `<PremiumBadge />` near every premium-only control so users see what they unlock.

## 6. Out of scope (won't change)
- Existing pricing (₦2,000/mo) and `subscribe_premium` RPC.
- Boost system, escrow, payouts, KYC.
- No new payment provider.

## Technical notes
- New table + RPC via migration.
- New hook + helper file.
- ~12 component touch-ups (chat, gig form, portfolio form, profile skills, feed composer, story uploader, call screen, contact buttons, AI components, edit dialogs, bottom nav, settings).
- All limits read `profiles.is_premium` + `premium_expires_at` already on `useProfile`.

Reply "go" to build, or tell me which rules to drop/adjust first.
