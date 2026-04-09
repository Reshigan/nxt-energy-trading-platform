# NXT Energy Trading Platform — Deployment Runbook

## Prerequisites
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers, D1, KV, R2, AI access
- Domain: et.vantax.co.za configured in Cloudflare DNS

## Environment Variables
```
CLOUDFLARE_API_KEY=<global API key>
CLOUDFLARE_EMAIL=reshigan@vantax.co.za
```

## 1. Deploy Backend (Worker)
```bash
cd cloudflare-platform
npm install
npx wrangler deploy
```
This deploys to `et.vantax.co.za/api/*` with:
- D1 database: `nxt_energy_trading`
- KV namespace for caching and rate limiting
- R2 bucket for document storage
- 5 Durable Objects (OrderBook, Escrow, P2P, SmartContract, RiskEngine)
- Cron trigger at 06:00 UTC daily

## 2. Deploy Frontend (Pages)
```bash
cd cloudflare-platform/pages
npm install
npm run build
cd ..
npx wrangler pages deploy dist --project-name=nxt-energy-trading-platform --branch=energy-trading-platform-v1
```

## 3. Database Migrations
```bash
# Apply new migrations
npx wrangler d1 execute nxt_energy_trading --file=migrations/001_add_migrations_table.sql

# Seed data (first time only)
npx wrangler d1 execute nxt_energy_trading --file=seed.sql
```

## 4. Verify Deployment
```bash
# Health check
curl https://et.vantax.co.za/api/v1/../health

# API test
curl https://et.vantax.co.za/api/v1/market/insights

# Frontend
curl -s -o /dev/null -w "%{http_code}" https://et.vantax.co.za/
```

## 5. Rollback
```bash
# List recent deployments
npx wrangler deployments list

# Rollback to previous version
npx wrangler rollback
```

## 6. Monitoring
- Cloudflare Dashboard → Workers → nxt-energy-trading-api → Logs
- Health endpoint: GET /health (checks D1, KV, R2)
- Cron logs: Workers → Triggers → Cron Events

## 7. Common Issues

### 522 Error on Custom Domain
- Verify route exists: `et.vantax.co.za/api/*`
- Verify Pages custom domain is set to production branch

### D1 Schema Changes
- Create numbered migration file in `migrations/`
- Execute: `npx wrangler d1 execute nxt_energy_trading --file=migrations/NNN_description.sql`

### Durable Object Migrations
- Add new classes to `[[migrations]]` in wrangler.toml
- Increment tag version
- Deploy

---

*GONXT Technology (Pty) Ltd | et.vantax.co.za*
