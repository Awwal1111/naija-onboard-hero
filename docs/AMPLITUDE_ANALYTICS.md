# Amplitude product analytics

Amplitude is an optional second analytics destination alongside the existing PostHog setup.

## Enable it
1. In Amplitude, open the intended NaijaLancers project and copy its **Project API Key**.
2. Add `VITE_AMPLITUDE_API_KEY` to the Vercel production and preview environment settings. Use the same key in Lovable only if you want analytics in its preview environment (the adapter intentionally skips previews).
3. Redeploy the application.

The project API key is a public ingestion identifier, not a secret. Never put an Amplitude Secret Key or any private credential in a `VITE_*` variable.

## Tracking behavior
- Existing PostHog initialization and tracking remain unchanged.
- Calls to the shared `trackEvent` helper are also sent to Amplitude.
- User identity is the Supabase UUID only; email and other profile details are not sent.
- Sensitive event-property names (messages, wallet/account details, tokens, passwords, phone/email, names and addresses) are filtered.
- Analytics requests are fire-and-forget and cannot block app actions.
- Amplitude is disabled until the environment variable is configured.

## Event instrumentation
The app now records `page_viewed` on route changes without query strings or user-entered content.

Add explicit `trackEvent` calls at the real success points for:
- `sign_up_completed`, `onboarding_completed`
- `gig_viewed`, `order_created`, `project_completed`
- `job_viewed`, `job_application_submitted`, `hire_completed`
- `expert_profile_viewed`, `search_performed)
- `subscription_viewed`, `subscription_purchased`

Do not fire conversion events on button clicks alone; fire them only after the corresponding server operation succeeds. Keep event properties to non-sensitive dimensions such as role, category, currency code, plan identifier, and source. Never track chat text, uploaded document contents, credentials, payment details, wallet addresses, or private user data.

## Validation
After deployment, perform one controlled test action, then check Amplitude **User Activity** / event stream for the configured project. The project must be the intended NaijaLancers project; do not assume a generic project named `default` is the correct destination without confirming it in the Amplitude UI.
