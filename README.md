# NaijaLancers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/Awwal1111/naija-onboard-hero/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

NaijaLancers is a comprehensive fintech and gig-economy platform empowering Nigerian freelancers and businesses. Built with modern web technologies, it provides secure payment solutions, VTU services, and collaborative tools to bridge the gap between talent and opportunity in Nigeria.

## Vision

To create a trusted, blockchain-powered ecosystem that democratizes access to financial services and gig opportunities for Nigerians, fostering economic growth through technology.

## Features

- **Web3 Wallet Integration**: Create and manage wallets with Celo blockchain support
- **Secure Payments**: Escrow system for safe transactions between freelancers and clients
- **VTU Services**: Airtime and data top-up services
- **Video Conferencing**: WebRTC-powered calls for remote collaboration
- **AI Assistant**: Intelligent chat support for users
- **Developer API**: Public SDK for third-party integrations
- **MiniPay Support**: Seamless mini-app experiences

## Screenshots

<!-- Add screenshots here -->

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/Awwal1111/naija-onboard-hero.git
   cd naija-onboard-hero
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Visit `http://localhost:8081`

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon key

## Project Structure

```
├── src/                 # React application source
├── supabase/           # Backend functions and migrations
├── naija-api-sdk/      # Public API SDK
├── docs/               # Documentation and guides
├── public/             # Static assets
└── dist/               # Build output
```

## API Documentation

Access developer docs at `/developers` when running locally, or visit the live site.

## Deployment

Deploy to Vercel, Netlify, or any static host. For Supabase functions:

```bash
npx supabase login
npx supabase functions deploy
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Issues](https://github.com/Awwal1111/naija-onboard-hero/issues)
- [Discussions](https://github.com/Awwal1111/naija-onboard-hero/discussions)
```

## Notes for public repository

- Do not commit `.env` or any secret keys.
- Use `.env.example` as the template for local configuration.
- The repo can remain public without exposing your backend keys.

## Want to publish the public SDK?

See `SDK_SETUP_GUIDE.md` for the instructions to publish the SDK repository and package.

## License

MIT
