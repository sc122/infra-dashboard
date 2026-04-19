# 🏗️ Infra Dashboard

**One dashboard for all your infrastructure.** Monitor Vercel, Netlify, Cloudflare, Hetzner VPS & GitHub — auto-discovered, zero config.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sc122/infra-dashboard&env=DASHBOARD_PASSWORD&envDescription=Set%20a%20password%20to%20protect%20your%20dashboard&project-name=my-infra-dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

**[Live Demo (mock data)](https://infra-demo-coral.vercel.app)** — try it without connecting any platforms

<video src="https://github.com/sc122/infra-dashboard/releases/download/v1.0.0/infra-dashboard-v2.mp4" width="100%" autoplay muted loop></video>

> *43s overview — auto-discovery, filters, code map, health monitoring, and one-click deploy.*

---

## Why?

If you deploy across multiple platforms, you know the pain: Vercel dashboard for web apps, Cloudflare for DNS, Hetzner console for VPS, GitHub for repos — switching between 5 tabs to understand what's running where.

**Infra Dashboard** gives you a single unified view. It auto-discovers all your projects, maps code to deployments, monitors health, audits security — and alerts you on Telegram when something breaks.

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Discovery** | Finds all projects across Vercel, Netlify, Cloudflare, Hetzner, GitHub |
| **Smart Classification** | Production / Active / Inactive tiers with instant filter chips |
| **Code → Deploy Map** | Traces each repo to its platform, deployment, and domain |
| **Health Monitoring** | HTTP checks with response times, daily Telegram reports |
| **Infrastructure Audit** | 12 rules detect security gaps, missing CI/CD, stale repos |
| **Telegram Bot** | Daily reports at 8am, instant alerts, commands: `/status` `/health` `/audit` |
| **Cost Tracking** | Usage bars showing free tier consumption per platform |
| **Command Palette** | `Cmd+K` to search across all projects, pages, and external dashboards |
| **Settings UI** | Connect platforms, test tokens, configure notifications — no YAML |

## Quick Start

### Option 1: One-Click Deploy (2 minutes)

1. Click **Deploy with Vercel** above
2. Set a dashboard password
3. Open dashboard → **Settings** → connect your platforms

### Option 2: Manual Setup

```bash
git clone https://github.com/sc122/infra-dashboard.git
cd infra-dashboard
npm install
cp .env.example .env.local
# Fill in your tokens (see table below)
npm run dev
```

## API Tokens

All tokens are optional — connect only what you use.

| Platform | Where to get it | Permissions |
|----------|----------------|-------------|
| Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Read |
| Netlify | [app.netlify.com/user/applications](https://app.netlify.com/user/applications#personal-access-tokens) | Read |
| Cloudflare | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) | Zone:Read, DNS:Read |
| Hetzner | [console.hetzner.cloud](https://console.hetzner.cloud) → Security → API Tokens | Read |
| GitHub | [github.com/settings/tokens](https://github.com/settings/tokens) | `repo` scope |
| Telegram | [@BotFather](https://t.me/BotFather) → `/newbot` | Bot token + chat ID |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Next.js App                      │
├──────────┬──────────┬──────────┬────────────────┤
│ Overview │ Code Map │  Audit   │   Settings     │
├──────────┴──────────┴──────────┴────────────────┤
│            Project Discovery Engine              │
│  Vercel + Netlify + DNS/VPS + GitHub → Project[] │
├──────────┬──────────┬──────────┬────────────────┤
│ Vercel   │ Netlify  │ Cloud-   │ Hetzner │GitHub│
│ API      │ API      │ flare    │ API     │ API  │
└──────────┴──────────┴──────────┴─────────┴──────┘
```

**How discovery works:**
1. GitHub `homepage` field → most accurate mapping
2. Repo config files (docker-compose, deploy scripts) → domain references
3. Name matching (subdomain ↔ repo name)
4. Dockerfile detection → VPS/Docker project

## Security

- **HMAC-SHA256 cookies** — passwords never stored in cookies
- **Rate limiting** — 3 login attempts/min, 5-min lockout after 6 failures
- **Timing-safe comparison** — constant-time password verification
- **Security headers** — X-Frame-Options, CSP, HSTS, nosniff on all responses
- **API protection** — all routes return 401 without auth
- **No secrets in code** — everything from environment variables

**Recommended:** Put your dashboard behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/) for SSO login (free, up to 50 users).

## Adding a Platform

1. `lib/api/newplatform.ts` — API client
2. `app/api/newplatform/route.ts` — proxy route
3. `app/newplatform/page.tsx` — dedicated page
4. Update: discovery engine, health checker, audit engine, sidebar

## Development

```bash
npm run dev          # Dev server
npm test             # Unit tests (Vitest)
npm run type-check   # TypeScript check
npm run build        # Production build
```

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui · Recharts · Vitest

## Contributing

Contributions welcome! Fork the repo, create a branch, and open a PR. Please keep changes focused and include tests where applicable.

## License

[MIT](LICENSE)
