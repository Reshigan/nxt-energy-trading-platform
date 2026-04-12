# Ionvex Energy Exchange

National-scale energy trading platform built entirely on Cloudflare's edge infrastructure.

## Features

- **Trading Engine** — Order book with bid/ask matching, P2P trades, algo orders
- **Carbon Credit Marketplace** — Registry, retirement certificates, fund management
- **Digital Contracts** — SA-law templates, multi-party digital signatures, workflow tracking
- **ODSE Metering** — Open Data Schema for Energy compliant IoT asset management and timeseries analytics
- **Role-Based Cockpits** — Dedicated dashboards for 8 roles (Admin, IPP, Offtaker, Trader, Carbon Fund, Lender, Grid Operator, Regulator)
- **Compliance & KYC** — AML engine, statutory checks, licence tracking, POPIA data export/deletion
- **Settlement** — Invoice generation, netting, dispute resolution, escrow
- **Module System** — 23 platform modules with feature flags and admin toggle

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Cloudflare Workers + [Hono](https://hono.dev) framework |
| **Database** | Cloudflare D1 (SQLite) — 65 tables |
| **KV Store** | Cloudflare KV (rate limits, sessions, caching) |
| **Object Storage** | Cloudflare R2 (documents, backups) |
| **Durable Objects** | OrderBook, Escrow, P2P Matcher, Smart Contract, Risk Engine |
| **Frontend** | React 18 + Vite + Tailwind CSS + Zustand |
| **Charts** | Recharts |
| **Auth** | JWT (PBKDF2 password hashing, 100k iterations) |
| **Email** | Resend API (falls back to KV logging in dev) |

## Project Structure

```
cloudflare-platform/
  src/                  # Backend (Cloudflare Workers)
    index.ts            # Main entry point + API routes
    routes/             # Route modules (trading, carbon, settlement, etc.)
    middleware/          # Auth, rate limiting, tenant, modules
    durable-objects/     # OrderBookDO, EscrowManagerDO, etc.
    utils/              # Logger, email, PDF generation, cascade events
    integrations/       # Payment adapter, AML engine, carbon registry
    email/              # Email templates
  pages/                # Frontend (Cloudflare Pages)
    src/
      pages/            # Page components (60+)
      components/       # Shared UI components
      lib/              # API client, auth store, utilities
      config/           # Role-based navigation config
  migrations/           # D1 SQL migrations (001-013)
  wrangler.toml         # Cloudflare Workers configuration
```

## Prerequisites

- Node.js 18+
- npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Cloudflare account with D1, KV, R2, and Durable Objects enabled

## Setup

```bash
# Install backend dependencies
cd cloudflare-platform
npm install

# Install frontend dependencies
cd pages
npm install
cd ..
```

## Development

```bash
# Start backend dev server (port 8787)
cd cloudflare-platform
npm run dev

# Start frontend dev server (port 5173) — in a separate terminal
cd cloudflare-platform/pages
npm run dev
```

## Type Checking

```bash
# Backend
cd cloudflare-platform
npx tsc --noEmit

# Frontend
cd cloudflare-platform/pages
npx tsc --noEmit
```

## Building

```bash
# Frontend production build
cd cloudflare-platform/pages
npm run build
```

## Testing

```bash
# Run backend tests (requires @cloudflare/vitest-pool-workers)
cd cloudflare-platform
npm test
```

## Deployment

The platform deploys to Cloudflare via GitHub Actions CI/CD (`.github/workflows/deploy.yml`):

1. **Backend** — `wrangler deploy` (Workers)
2. **Migrations** — `wrangler d1 migrations apply` (D1)
3. **Frontend** — `wrangler pages deploy` (Pages)

Smart change detection only deploys components that changed.

### Manual Deploy

```bash
# Deploy backend
cd cloudflare-platform
wrangler deploy

# Apply migrations
wrangler d1 migrations apply nxt_energy_trading --remote

# Deploy frontend
cd pages
npm run build
wrangler pages deploy dist --project-name=nxt-energy-trading-platform --branch=main
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `JWT_SECRET` | Signing key for JWT tokens |
| `RESEND_API_KEY` | Email delivery (optional — logs to KV without it) |
| `ENCRYPTION_KEY` | PII encryption key for POPIA compliance |
| `CLOUDFLARE_API_TOKEN` | CI/CD deployment (GitHub Actions secret) |
| `CLOUDFLARE_ACCOUNT_ID` | CI/CD deployment (GitHub Actions secret) |

## Live Environment

- **URL**: https://et.vantax.co.za
- **API**: https://et.vantax.co.za/api/v1
- **Health**: https://et.vantax.co.za/api/v1/health

## Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin (superadmin) | admin@et.vantax.co.za | NxtAdmin@2024! |
| IPP | ipp@solarprime.co.za | Password123! |
| Offtaker | offtaker@citypower.co.za | Password123! |
| Trader | trader@energytrade.co.za | Password123! |
| Carbon Fund | fund@greencarbon.co.za | Password123! |
| Lender | lender@infrabank.co.za | Password123! |
| Grid Operator | grid@eskom.co.za | Password123! |
| Regulator | regulator@nersa.co.za | Password123! |

## Licence

MIT
