# Infra Dashboard

> Open-source unified infrastructure management. Monitor all your platforms from one place.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sc122/infra-dashboard&env=DASHBOARD_PASSWORD&envDescription=Set%20a%20password%20to%20protect%20your%20dashboard&project-name=my-infra-dashboard)

## Features

- **Auto-Discovery** — Finds all your projects automatically across platforms
- **Unified View** — Vercel, Netlify, Cloudflare, Hetzner VPS, GitHub in one table
- **Smart Classification** — Production / Active / Inactive tiers with filters
- **Code-to-Deploy Map** — Traces repo → platform → deployment → domain
- **Health Monitoring** — HTTP checks with response times and Telegram alerts
- **Infrastructure Audit** — 12 automated rules detect security, deployment, CI/CD issues
- **Telegram Bot** — Daily reports, instant alerts, bot commands (/status, /health, /audit)
- **Cost Tracking** — Usage bars for each platform's free tier limits
- **Command Palette** — Cmd+K search across all projects and pages
- **Zero Config** — No YAML files. Connect platforms via Settings page

## Quick Start

### Option 1: Deploy to Vercel (2 minutes)

1. Click the **Deploy** button above
2. Set a dashboard password
3. Open your dashboard → go to **Settings** → connect platforms

### Option 2: Manual Setup

```bash
git clone https://github.com/sc122/infra-dashboard.git
cd infra-dashboard
npm install
cp .env.example .env.local
# Edit .env.local with your tokens
npm run dev
```

## Getting API Tokens

| Platform | Where | Permissions |
|----------|-------|-------------|
| Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Read |
| Netlify | [app.netlify.com/user/applications](https://app.netlify.com/user/applications#personal-access-tokens) | Read |
| Cloudflare | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) | Zone:Read, DNS:Read |
| Hetzner | [console.hetzner.cloud](https://console.hetzner.cloud) → Security → API Tokens | Read |
| GitHub | [github.com/settings/tokens](https://github.com/settings/tokens) | `repo` scope |
| Telegram | [@BotFather](https://t.me/BotFather) → /newbot | Bot token + chat ID |

All tokens are optional. Connect only what you use.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
├──────────┬──────────┬──────────┬────────────────┤
│ Overview │ Code Map │  Audit   │   Settings     │
│ (auto-   │ (repo →  │ (12 mod- │   (connect     │
│ discover)│ deploy)  │ ular     │   platforms)   │
│          │          │ rules)   │                │
├──────────┴──────────┴──────────┴────────────────┤
│              Project Discovery Engine            │
│  Vercel + Netlify + DNS/VPS + GitHub → Project[] │
├──────────┬──────────┬──────────┬────────────────┤
│ Vercel   │ Netlify  │ Cloud-   │ Hetzner │GitHub│
│ API      │ API      │ flare    │ API     │ API  │
└──────────┴──────────┴──────────┴─────────┴──────┘
```

**Discovery strategies (in priority order):**
1. GitHub `homepage` field (most accurate)
2. Repo config files (docker-compose.yml, deploy scripts)
3. Name matching (subdomain ↔ repo name)
4. Dockerfile detection

## Adding a New Platform

1. Create `lib/api/newplatform.ts` — API client
2. Create `app/api/newplatform/route.ts` — proxy route
3. Create `app/newplatform/page.tsx` — dedicated page
4. Update `lib/project-discovery.ts` — add discovery source
5. Update `lib/api/health-checker.ts` — add health checks
6. Update `lib/audit/engine.ts` — add to data gathering
7. Update sidebar, overview cards, command palette

## Security

Your dashboard contains sensitive infrastructure data. Multiple layers of protection are built in:

- **Authentication** — Password-based login with HMAC-SHA256 token cookies (not raw passwords). Cookies are `httpOnly`, `secure`, `sameSite: strict`
- **Rate Limiting** — Login: 3 attempts per minute per IP, lockout after 6 failed attempts (5 minutes). Audit endpoint: 3 requests per minute
- **Timing-Safe Comparison** — Password and token verification use constant-time comparison to prevent timing attacks
- **Security Headers** — All responses include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, and HSTS
- **API Protection** — All `/api/*` routes require authentication. Unauthenticated requests return `401`
- **No Secrets in Code** — Zero hardcoded tokens, passwords, or user-specific values. Everything comes from environment variables
- **Telegram Webhook** — Optional `TELEGRAM_WEBHOOK_SECRET` header verification

**Recommended: Cloudflare Access** — For maximum security, put your dashboard behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/) (free up to 50 users). This adds Google/GitHub SSO login at the network level, before requests reach your server.

## Development

```bash
npm run dev          # Start dev server
npm test             # Run unit tests (Vitest)
npm run type-check   # TypeScript check
npm run build        # Production build
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Testing:** Vitest
- **Hosting:** Vercel
- **Language:** TypeScript

## License

MIT
