# IndexNow integration

NaijaLancers notifies IndexNow when public content changes in Supabase.

## Domain and key
- Canonical host: https://www.naijalancers.name.ng
- Public key file: /4d5861522fec4aa69c8c6e6eeb325050.txt
- The key file contains only the IndexNow key.
- The key is public by protocol design; the webhook secret is not.

## Runtime configuration
Set these Vercel environment variables for Production and Preview:
- INDEXNOW_KEY: the public IndexNow key.
- INDEXNOW_WEBHOOK_SECRET: a random secret shared with Supabase Vault as indexnow_webhook_secret.

## Events
Database triggers submit public profile, gig, job, course, URLs on inserts, relevant updates, and deletes. Updates to wallet, counters, login timestamps, and other unrelated fields do not trigger notifications.

## Safety
The API accepts only authenticated database webhook calls, derives URLs from an allowlisted table/event payload, and rejects URLs outside the canonical host. IndexNow accepts the URL notification; it does not guarantee indexing or ranking.
