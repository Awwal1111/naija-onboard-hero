# NaijaLancers

NaijaLancers is a full-stack Nigerian fintech and gig-economy platform built with React, Supabase, and Celo blockchain integration.

This repository contains the NaijaLancers web application, Supabase functions, developer API docs, and support files for the platform.

Live site: https://naijalancers.name.ng

## What this project includes

- Web3 wallet creation, balance, and transfer support
- Escrow payment flows and secure payouts
- VTU services for airtime and data purchases
- Video call and WebRTC integrations
- AI chat and assistant features
- Public developer docs and API playground
- Supabase Edge Functions for backend workflows
- MiniPay SDK support for external mini-app integration

## Quick start

1. Clone the repository:

```bash
git clone https://github.com/Awwal1111/naija-onboard-hero.git
cd naija-onboard-hero
```

2. Install dependencies:

```bash
npm install
```

3. Create a local environment file from example:

```bash
cp .env.example .env
```

4. Update `.env` with your Supabase project values:

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-public-anon-key"
```

5. Start the development server:

```bash
npm run dev
```

6. Open the app in your browser:

```text
http://localhost:8081
```

## Environment variables

Use the following client env vars in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

> `README` is configured so `.env` stays local and is not committed.

## Available scripts

- `npm run dev` — start local development server
- `npm run build` — build the production app
- `npm run build:dev` — build with development mode
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint over the project

## Developer documentation

The app exposes public developer documentation at:

- `/developers`

The `naija-api-sdk/` folder also contains a lightweight SDK and docs scaffold for public API integration.

## Project structure

- `src/` — app source code and React components
- `public/` — static assets
- `supabase/` — Supabase functions and database migration files
- `naija-api-sdk/` — SDK demo and package files for public consumption

## Deployment

This app can be deployed to any static hosting provider that supports Vite apps.

For Supabase Edge Functions, use the Supabase CLI to deploy functions after you log in:

```bash
npx supabase login
npx supabase functions deploy
```

## Notes for public repository

- Do not commit `.env` or any secret keys.
- Use `.env.example` as the template for local configuration.
- The repo can remain public without exposing your backend keys.

## Want to publish the public SDK?

See `SDK_SETUP_GUIDE.md` for the instructions to publish the SDK repository and package.

## License

MIT
