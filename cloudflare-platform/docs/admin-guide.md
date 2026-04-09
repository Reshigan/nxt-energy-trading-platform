# NXT Energy Trading Platform — Admin Guide

## Admin Dashboard
Login with admin credentials to access the admin panel.

### User Management
- View all registered participants at **Admin** page
- Approve/reject KYC submissions
- Verify statutory checks (CIPC, SARS, FICA, BBBEE, etc.)
- Suspend or reactivate accounts

### Audit Log
- Full audit trail of all platform actions
- Filter by actor, action type, entity, date range
- Export for compliance reporting

### System Monitoring
- Health endpoint: `GET /health` — checks D1, KV, R2
- View API error logs in the admin dashboard
- Monitor rate limiting counters

## KYC Verification Flow
1. Participant registers and submits KYC documents
2. 10-point automated verification runs (CIPC, SARS, VAT, FICA, Sanctions, BBBEE, NERSA, FSCA, FAIS, CIDB)
3. Admin reviews results at **Compliance** page
4. Admin approves or rejects, optionally with override

## Licence Management
- Track all participant licences (NERSA, FSCA, DEA)
- Automated expiry notifications at 90 days
- Daily cron job checks for expiring licences

## Settlement Administration
- Review outstanding invoices
- Manage escrow disputes
- Process dispute resolutions

## Security
- JWT tokens with 24h expiry
- Refresh token rotation
- Token blacklisting on logout
- Rate limiting: 100 req/min general, 300 req/min trading
- CORS locked to et.vantax.co.za
- Security headers (X-Frame-Options, CSP, HSTS, etc.)

## Database Management
- D1 (SQLite) — 35+ tables
- Run migrations: `npx tsx scripts/migrate.ts`
- Backup: Export via Cloudflare Dashboard → D1 → Export

## Cron Jobs (06:00 UTC daily)
1. Licence expiry notifications (90-day window)
2. Overdue invoice status updates
3. Expired marketplace listing cleanup
4. Expired order cleanup (day orders, GTD past expiry)
5. Expired P2P trade cleanup

---

*GONXT Technology (Pty) Ltd*
