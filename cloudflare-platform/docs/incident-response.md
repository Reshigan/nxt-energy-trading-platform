# NXT Energy Trading Platform — Incident Response Playbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 — Critical | Platform down, trading halted, data loss | 15 min | Worker crash, D1 unavailable, auth broken |
| P2 — High | Major feature broken, degraded performance | 1 hour | Order matching slow, carbon sync fails |
| P3 — Medium | Minor feature broken, workaround exists | 4 hours | Report generation fails, single page error |
| P4 — Low | Cosmetic, minor inconvenience | 24 hours | UI misalignment, typo in notification |

## Incident Response Steps

### 1. Detect
- **Health check**: `GET /health` returns 503 or all services unhealthy
- **User reports**: Support email or direct contact
- **Monitoring**: Cloudflare Dashboard → Workers → Errors

### 2. Triage
1. Check health endpoint: `curl https://et.vantax.co.za/api/v1/../health`
2. Check Cloudflare Dashboard for error spikes
3. Check D1 status in Cloudflare Dashboard
4. Assign severity level (P1-P4)

### 3. Communicate
- **P1/P2**: Notify stakeholders immediately via email
- Update status at: reshigan@gonxt.tech
- Post incident channel updates every 30 min for P1

### 4. Resolve

#### Worker Down (P1)
```bash
# Check recent deployments
npx wrangler deployments list
# Rollback
npx wrangler rollback
# Verify
curl https://et.vantax.co.za/api/v1/../health
```

#### D1 Database Issues (P1)
```bash
# Test connection
npx wrangler d1 execute nxt_energy_trading --command="SELECT 1"
# Check for long-running queries or locks
# Contact Cloudflare support if D1 is unresponsive
```

#### Auth/JWT Issues (P1)
```bash
# Verify JWT_SECRET is set
npx wrangler secret list
# Flush token blacklist if needed
npx wrangler d1 execute nxt_energy_trading --command="DELETE FROM ... WHERE ..."
```

#### Frontend Build Issues (P2)
```bash
cd cloudflare-platform/pages
npm run build
npx wrangler pages deploy dist --project-name=nxt-energy-trading-platform
```

#### Durable Object Issues (P2)
```bash
# Check DO bindings in wrangler.toml
# Verify migrations are applied
npx wrangler deploy
```

### 5. Post-Incident
1. Write incident report (what happened, timeline, root cause, fix, prevention)
2. Update runbook if new failure mode discovered
3. Add monitoring for the failure scenario
4. Review and improve relevant tests

## Contacts
| Role | Contact |
|------|---------|
| Platform Lead | reshigan@gonxt.tech |
| Support | support@et.vantax.co.za |
| Cloudflare Support | https://dash.cloudflare.com/support |

## Escalation
1. On-call engineer (reshigan@gonxt.tech)
2. Cloudflare support for infrastructure issues
3. Domain registrar for DNS issues

---

*GONXT Technology (Pty) Ltd | Last updated: 2025*
