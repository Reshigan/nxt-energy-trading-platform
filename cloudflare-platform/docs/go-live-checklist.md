# NXT Energy Trading Platform — Go-Live Checklist

## Security
- [ ] JWT_SECRET is production-grade (32+ random bytes)
- [ ] CORS locked to `et.vantax.co.za` only
- [ ] Rate limiting active (100/min general, 300/min trading)
- [ ] Security headers enabled (X-Frame-Options, CSP, HSTS, X-Content-Type-Options)
- [ ] Token blacklisting on logout working
- [ ] Password hashing with PBKDF2 (100,000 iterations)
- [ ] OTP generation uses `crypto.getRandomValues()` (not `Math.random()`)
- [ ] `dev_otp` gated behind `ENVIRONMENT !== 'production'`
- [ ] No secrets in source code or logs
- [ ] POPIA consent flow implemented

## Database
- [ ] All 35+ tables created with proper indexes
- [ ] Seed data loaded (admin + demo participants)
- [ ] Migration tracking table exists
- [ ] Backup strategy documented

## Infrastructure
- [ ] Cloudflare Worker deployed
- [ ] D1 database bound and accessible
- [ ] KV namespace bound and accessible
- [ ] R2 bucket bound and accessible
- [ ] 5 Durable Objects deployed (OrderBook, Escrow, P2P, SmartContract, RiskEngine)
- [ ] Cron trigger configured (06:00 UTC daily)
- [ ] Custom domain `et.vantax.co.za` routing correctly
- [ ] SSL certificate valid

## Frontend
- [ ] All 19+ pages rendering correctly
- [ ] Dark/light mode toggle working
- [ ] Role-adaptive dashboards displaying correct KPIs
- [ ] API wiring: all pages fetch from real endpoints with demo data fallback
- [ ] PWA manifest valid with all icon sizes
- [ ] Service worker registered and caching
- [ ] SEO meta tags (og:title, og:description, og:image)
- [ ] robots.txt and sitemap.xml deployed

## Monitoring
- [ ] Health endpoint (`GET /health`) checks D1, KV, R2, DOs
- [ ] Structured logging on all requests
- [ ] Error boundary sends reports to `/api/v1/errors/frontend`
- [ ] Error storage in KV with 7-day TTL
- [ ] API analytics endpoint for admin

## API
- [ ] All 96+ endpoints functional
- [ ] Auth flow: register → verify OTP → login → refresh → logout
- [ ] Trading flow: place order → match → settle → invoice
- [ ] Contract flow: create → sign → amend → verify
- [ ] Carbon flow: credits → options → retire → transfer
- [ ] Compliance: KYC → statutory checks → licence tracking

## Documentation
- [ ] API reference (`docs/api-reference.md`)
- [ ] User guide (`docs/user-guide.md`)
- [ ] Admin guide (`docs/admin-guide.md`)
- [ ] Deployment runbook (`docs/deployment-runbook.md`)
- [ ] Incident response playbook (`docs/incident-response.md`)

## Testing
- [ ] vitest configured with Cloudflare Workers pool
- [ ] Unit tests for 5 Durable Objects
- [ ] Integration tests for API routes
- [ ] TypeScript compilation: 0 errors

## Final Verification
- [ ] Admin login works: `admin@et.vantax.co.za`
- [ ] Demo participant login works
- [ ] Landing page loads with pricing and FAQs
- [ ] Dashboard shows role-specific KPIs
- [ ] Theme toggle persists across navigation
- [ ] Health endpoint returns `healthy`

---

*Sign-off required by: Platform Lead (reshigan@gonxt.tech)*
*Date: _______________*
*Status: READY / NOT READY*
