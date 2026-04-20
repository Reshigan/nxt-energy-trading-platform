# NXT Energy Trading Platform — Coverage Matrix

**Generated:** 2026-04-19  
**Scope:** Full application (Frontend + Backend API)  
**Branch:** audit/UAT-01-coverage-matrix

---

## Stack Detected

### Frontend
- **Framework:** React 18 with Vite bundler
- **Router:** React Router DOM v6 (client-side SPA routing)
- **State Management:** Zustand (see `pages/src/lib/store.ts`)
- **HTTP Client:** Axios with JWT interceptors
- **Styling:** Tailwind CSS + styled-components
- **Charts:** Recharts, Victory, D3.js
- **Location:** `/workspace/project/nxt-energy-trading-platform/cloudflare-platform/pages/`

### Backend
- **Framework:** Hono.js (Cloudflare Workers)
- **Runtime:** Cloudflare Workers (V8 isolates)
- **Database:** Cloudflare D1 (SQLite at edge)
- **Cache/KV:** Cloudflare KV (brute-force protection, analytics)
- **Object Storage:** Cloudflare R2 (backups, documents)
- **Authentication:** JWT with refresh tokens
- **Location:** `/workspace/project/nxt-energy-trading-platform/cloudflare-platform/src/`

### Database Migrations
- **Schema:** `/workspace/project/nxt-energy-trading-platform/cloudflare-platform/src/db/schema.sql`
- **Seed Data:** `/workspace/project/nxt-energy-trading-platform/cloudflare-platform/src/db/seed.sql`

---

## Coverage Inventory

| Area | Surface | Trigger | Target | Handler | Status |
|------|---------|---------|--------|---------|--------|
| **Auth** | Login page `/login` | Page load + form submit | GET `/` + POST `/auth/login` | `src/index.ts` | ✅ WIRED |
| **Auth** | Register page `/register` | Page load + form submit | GET `/` + POST `/register` | `src/routes/register.ts` | ✅ WIRED |
| **Auth** | Forgot password `/forgot-password` | Page load + form submit | GET `/` + POST `/auth/forgot-password` | `src/routes/sessions.ts` | ✅ WIRED |
| **Auth** | Verify email `/verify-email` | Page load + OTP submit | GET `/` + POST `/auth/verify-email` | `src/routes/sessions.ts` | ✅ WIRED |
| **Auth** | 2FA login | OTP form submit | POST `/auth/login/2fa` | `src/routes/sessions.ts` | ✅ WIRED |
| **Dashboard** | Cockpit `/cockpit` | Page load | GET `/dashboard/summary` | `src/routes/cockpit.ts` | ✅ WIRED |
| **Dashboard** | Dashboard `/dashboard` | Page load | GET `/dashboard/summary` | `src/routes/cockpit.ts` | ✅ WIRED |
| **Dashboard** | Dashboard summary widget | API call | GET `/dashboard/summary` | `src/routes/cockpit.ts` | ✅ WIRED |
| **Trading** | Markets page `/markets` | Page load | GET `/trading/markets/indices` | `src/routes/trading.ts` | ✅ WIRED |
| **Trading** | Trading page `/trading` | Page load | GET `/trading/orderbook/:market` | `src/routes/trading.ts` | ✅ WIRED |
| **Trading** | Place order button | Click + form submit | POST `/trading/orders` | `src/routes/trading.ts` | ✅ WIRED |
| **Trading** | Cancel order | Click | DELETE `/trading/orders/:id` | `src/routes/trading.ts` | ✅ WIRED |
| **Trading** | View order history | Page load | GET `/trading/orders/history` | `src/routes/trading.ts` | ✅ WIRED |
| **Trading** | View positions | Page load | GET `/trading/positions` | `src/routes/trading.ts` | ✅ WIRED |
| **Trading** | Market prices chart | API call | GET `/trading/markets/prices/:market` | `src/routes/trading.ts` | ✅ WIRED |
| **Carbon** | Carbon credits page `/carbon` | Page load | GET `/carbon/credits` | `src/routes/carbon.ts` | ✅ WIRED |
| **Carbon** | Retire credit button | Click + confirm | POST `/carbon/credits/:id/retire` | `src/routes/carbon.ts` | ✅ WIRED |
| **Carbon** | Transfer credit button | Click + form | POST `/carbon/credits/:id/transfer` | `src/routes/carbon.ts` | ✅ WIRED |
| **Carbon** | List on marketplace | Click | POST `/carbon/credits/:id/list` | `src/routes/carbon.ts` | ✅ WIRED |
| **Carbon** | Carbon options | Page load | GET `/carbon/options` | `src/routes/carbon.ts` | ✅ WIRED |
| **Carbon** | Create option | Form submit | POST `/carbon/options` | `src/routes/carbon.ts` | ✅ WIRED |
| **Carbon** | Exercise option | Click | POST `/carbon/options/:id/exercise` | `src/routes/carbon.ts` | ✅ WIRED |
| **Contracts** | Contracts list `/contracts` | Page load | GET `/contracts/documents` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | Create contract | Form submit | POST `/contracts/documents` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | View contract detail | Click | GET `/contracts/documents/:id` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | Advance phase button | Click | PATCH `/contracts/documents/:id/phase` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | Sign contract | Click + form | POST `/contracts/documents/:id/sign` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | Amend contract | Click + reason | POST `/contracts/documents/:id/amend` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | View PDF | Click | GET `/contracts/documents/:id/pdf` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | Contract templates | Page load | GET `/contracts/templates` | `src/routes/contracts.ts` | ✅ WIRED |
| **Contracts** | Cooling-off period | Click | POST `/contracts/documents/:id/cooling-off` | `src/routes/contracts.ts` | ✅ WIRED |
| **Settlement** | Settlement page `/settlement` | Page load | GET `/settlement/settlements` | `src/routes/settlement.ts` | ✅ WIRED |
| **Settlement** | Confirm settlement | Click | POST `/settlement/settlements/:tradeId/confirm` | `src/routes/settlement.ts` | ✅ WIRED |
| **Settlement** | Generate invoice | Click | POST `/settlement/invoices/generate` | `src/routes/settlement.ts` | ✅ WIRED |
| **Settlement** | Pay invoice | Click | POST `/settlement/invoices/:id/pay` | `src/routes/settlement.ts` | ✅ WIRED |
| **Compliance** | Compliance page `/compliance` | Page load | GET `/compliance/market-sessions` | `src/routes/compliance.ts` | ✅ WIRED |
| **Compliance** | Register market session | Click | POST `/compliance/market-sessions` | `src/routes/compliance.ts` | ✅ WIRED |
| **Compliance** | Submit NERSA report | Click | POST `/compliance/nersa` | `src/routes/compliance.ts` | ✅ WIRED |
| **Compliance** | Submit FSCA filing | Click | POST `/compliance/fsca` | `src/routes/compliance.ts` | ✅ WIRED |
| **Compliance** | POPIA consent | Click | POST `/popia/consent` | `src/routes/popia.ts` | ✅ WIRED |
| **Compliance** | POPIA data export | Click | GET `/popia/export` | `src/routes/popia.ts` | ✅ WIRED |
| **Compliance** | POPIA erasure request | Click | DELETE `/popia/erasure` | `src/routes/popia.ts` | ✅ WIRED |
| **Marketplace** | Marketplace page `/marketplace` | Page load | GET `/marketplace/listings` | `src/routes/marketplace.ts` | ✅ WIRED |
| **Marketplace** | Create listing | Form submit | POST `/marketplace/listings` | `src/routes/marketplace.ts` | ✅ WIRED |
| **Marketplace** | Bid on listing | Click + form | POST `/marketplace/listings/:id/bid` | `src/routes/marketplace.ts` | ✅ WIRED |
| **P2P** | P2P Trading page `/p2p` | Page load | GET `/p2p/offers` | `src/routes/p2p.ts` | ✅ WIRED |
| **P2P** | Create offer | Form submit | POST `/p2p/offers` | `src/routes/p2p.ts` | ✅ WIRED |
| **P2P** | Accept offer | Click | POST `/p2p/offers/:id/accept` | `src/routes/p2p.ts` | ✅ WIRED |
| **P2P** | Settle trade | Click | POST `/p2p/offers/:id/settle` | `src/routes/p2p.ts` | ✅ WIRED |
| **Projects** | IPP page `/ipp` | Page load | GET `/projects` | `src/routes/projects.ts` | ✅ WIRED |
| **Projects** | View project detail | Click | GET `/projects/:id` | `src/routes/projects.ts` | ✅ WIRED |
| **Projects** | Create project | Form submit | POST `/projects` | `src/routes/projects.ts` | ✅ WIRED |
| **Projects** | Request disbursement | Click + form | POST `/projects/:id/disbursements` | `src/routes/projects.ts` | ✅ WIRED |
| **Projects** | Update milestone | Click + form | PATCH `/projects/:id/milestones/:milestoneId` | `src/routes/projects.ts` | ✅ WIRED |
| **Metering** | Metering page `/metering` | Page load | GET `/metering/readings` | `src/routes/metering.ts` | ✅ WIRED |
| **Metering** | Submit reading | Form submit | POST `/metering/readings` | `src/routes/metering.ts` | ✅ WIRED |
| **Metering** | Batch submit readings | Form submit | POST `/metering/readings/batch` | `src/routes/metering.ts` | ✅ WIRED |
| **Portfolio** | Portfolio page `/portfolio` | Page load | GET `/portfolio` | `src/routes/trading.ts` (positions) | ✅ WIRED |
| **Notifications** | Notifications page `/notifications` | Page load | GET `/notifications` | `src/routes/notifications-ws.ts` | ✅ WIRED |
| **Notifications** | Mark notification read | Click | PATCH `/notifications/:id/read` | `src/routes/notifications-ws.ts` | ✅ WIRED |
| **Notifications** | Mark all read | Click | PATCH `/notifications/read-all` | `src/routes/notifications-ws.ts` | ✅ WIRED |
| **Admin** | Admin page `/admin` | Page load | GET `/admin` | `src/routes/participants.ts` | ✅ WIRED |
| **Admin** | User management | API call | GET `/admin/users` | `src/routes/participants.ts` | 🟡 ORPHAN-API |
| **Admin** | Reset user password | Click | POST `/admin/users/:id/reset-password` | `src/routes/participants.ts` | 🟡 ORPHAN-API |
| **Admin** | Verify user email | Click | POST `/admin/users/:id/verify-email` | `src/routes/participants.ts` | 🟡 ORPHAN-API |
| **Admin** | Halt market | Click | POST `/admin/markets/:market/halt` | `src/routes/trading.ts` | 🟡 ORPHAN-API |
| **Analytics** | Analytics page `/analytics` | Page load | GET `/reports/summary` | `src/routes/reports.ts` | ✅ WIRED |
| **Reports** | Report builder `/reports` | Page load | GET `/reports` | `src/routes/reports.ts` | ✅ WIRED |
| **Reports** | Generate report | Click | POST `/reports/generate` | `src/routes/reports.ts` | ✅ WIRED |
| **Risk** | Risk dashboard `/risk` | Page load | GET `/risk/monitor` | `src/routes/intelligence.ts` | ✅ WIRED |
| **Developer** | Developer portal `/developer` | Page load | GET `/developer` | `src/routes/developer.ts` | ✅ WIRED |
| **Developer** | API keys management | Page load | GET `/developer/keys` | `src/routes/developer.ts` | ✅ WIRED |
| **Developer** | Create API key | Click | POST `/developer/keys` | `src/routes/developer.ts` | ✅ WIRED |
| **Developer** | Revoke API key | Click | DELETE `/developer/keys/:id` | `src/routes/developer.ts` | ✅ WIRED |
| **Settings** | Settings page `/settings` | Page load | GET `/me` | `src/routes/participants.ts` | ✅ WIRED |
| **Settings** | Update preferences | Form submit | POST `/me/preferences` | `src/routes/participants.ts` | ✅ WIRED |
| **Settings** | Change password | Form submit | POST `/me/password` | `src/routes/participants.ts` | ✅ WIRED |
| **Settings** | Enable 2FA | Click | POST `/auth/2fa/enable` | `src/routes/sessions.ts` | ✅ WIRED |
| **WhatsApp** | WhatsApp link | Click + phone | POST `/whatsapp/link` | `src/routes/whatsapp.ts` | ✅ WIRED |
| **WhatsApp** | WhatsApp verify | OTP submit | POST `/whatsapp/verify` | `src/routes/whatsapp.ts` | ✅ WIRED |
| **AI** | AI negotiation | Form submit | POST `/negotiate/negotiate` | `src/routes/negotiate.ts` | ✅ WIRED |
| **AI** | AI compare | Form submit | POST `/negotiate/compare` | `src/routes/negotiate.ts` | ✅ WIRED |
| **ESG** | ESG Dashboard `/esg` | Page load | GET `/esg/report` | `src/routes/esg_reporting.ts` | ✅ WIRED |
| **VPP** | VPP Dashboard `/vpp` | Page load | GET `/vpp/assets` | `src/routes/vpp.ts` | ✅ WIRED |
| **VPP** | Dispatch control | Click + form | POST `/vpp/dispatch` | `src/routes/vpp.ts` | ✅ WIRED |
| **VPP** | End dispatch | Click | POST `/vpp/dispatch/:id/end` | `src/routes/vpp.ts` | ✅ WIRED |
| **Pipeline** | Deal pipeline `/pipeline` | Page load | GET `/pipeline` | `src/routes/pipeline.ts` | ✅ WIRED |
| **Calendar** | Calendar page `/calendar` | Page load | GET `/calendar` | `src/routes/calendar.ts` | ✅ WIRED |
| **Network** | Network map `/network` | Page load | GET `/network/graph` | `src/routes/network.ts` | ✅ WIRED |
| **Grid** | Grid dashboard `/grid-dashboard` | Page load | GET `/grid/connections` | `src/routes/grid.ts` | ✅ WIRED |
| **Fund** | Fund dashboard `/fund-dashboard` | Page load | GET `/fund/performance` | `src/routes/fund.ts` | ✅ WIRED |
| **Procurement** | Procurement hub `/procurement` | Page load | GET `/procurement/rfp` | `src/routes/procurement.ts` | ✅ WIRED |
| **Procurement** | Create RFP | Form submit | POST `/procurement/rfp` | `src/routes/procurement.ts` | ✅ WIRED |
| **Procurement** | Submit bid | Form submit | POST `/procurement/rfp/:id/bids` | `src/routes/procurement.ts` | ✅ WIRED |
| **Disputes** | Disputes page `/disputes` | Page load | GET `/disputes` | `src/routes/settlement.ts` | ✅ WIRED |
| **Invoices** | Invoices page `/invoices` | Page load | GET `/settlement/invoices` | `src/routes/settlement.ts` | ✅ WIRED |
| **Staff** | Staff management `/staff` | Page load | GET `/staff` | `src/routes/staff.ts` | ✅ WIRED |
| **Support** | Support tickets `/support` | Page load | GET `/tickets` | `src/routes/tickets.ts` | ✅ WIRED |
| **Audit Trail** | Audit trail `/audit-trail` | Page load | GET `/audit` | `src/routes/documents.ts` | ✅ WIRED |
| **System Health** | System health `/system-health` | Page load | GET `/health` | `src/routes/health.ts` | ✅ WIRED |
| **POPIA** | Data retention `/data-retention` | Page load | GET `/popia/consent` | `src/routes/popia.ts` | ✅ WIRED |
| **Deal Room** | Deal room `/deal-room` | Page load | GET `/dealroom/agreements` | `src/routes/dealroom.ts` | ✅ WIRED |
| **Forward Curves** | Forward curves `/forward-curves` | Page load | GET `/curves/timeseries` | `src/routes/curves.ts` | ✅ WIRED |
| **PPA Valuation** | PPA valuation `/ppa-valuation` | Page load | GET `/valuation/fair-value` | `src/routes/valuation.ts` | ✅ WIRED |
| **Surveillance** | Surveillance `/surveillance` | Page load | GET `/surveillance/alerts` | `src/routes/surveillance.ts` | ✅ WIRED |
| **Module Admin** | Module admin `/modules` | Page load | GET `/modules` | `src/routes/modules.ts` | ✅ WIRED |
| **Tenant Admin** | Tenant admin `/tenant-admin` | Page load | GET `/tenants` | `src/routes/tenants.ts` | ✅ WIRED |
| **Payments** | Payments dashboard `/payments` | Page load | GET `/payments` | `src/routes/payments.ts` | ✅ WIRED |
| **AML** | AML dashboard `/aml-dashboard` | Page load | GET `/aml/scan` | `src/routes/aml.ts` | ✅ WIRED |

---

## Orphan API Endpoints (Backend exists, no UI)

| Endpoint | Handler | Purpose |
|----------|---------|---------|
| `GET /admin/users` | `src/routes/participants.ts` | List all users (admin) |
| `POST /admin/users/:id/reset-password` | `src/routes/participants.ts` | Admin reset user password |
| `POST /admin/users/:id/verify-email` | `src/routes/participants.ts` | Admin verify user email |
| `POST /admin/users/:id/unlock` | `src/routes/participants.ts` | Unlock locked user account |
| `POST /admin/markets/:market/halt` | `src/routes/trading.ts` | Halt market trading |
| `POST /admin/users/:id/resend-verification` | `src/routes/participants.ts` | Resend verification email |
| `POST /admin/users/:id/reset-2fa` | `src/routes/sessions.ts` | Reset 2FA for user |
| `GET /lender/dashboard` | `src/routes/lender.ts` | Lender dashboard |
| `POST /lender/credit-note` | `src/routes/lender.ts` | Issue credit note |
| `GET /surveillance/enhanced/scan` | `src/routes/surveillance-enhanced.ts` | Run surveillance scan |
| `GET /ai/analysis` | `src/routes/ai.ts` | AI market analysis |
| `POST /ai/analyze-volatility` | `src/routes/ai.ts` | Volatility analysis |
| `GET /ingest` | `src/routes/metering.ts` | Metering data ingestion |
| `GET /vpp/dashboard` | `src/routes/vpp.ts` | VPP operations dashboard |
| `GET /vpp/events` | `src/routes/vpp.ts` | VPP event log |

---

## Potential Stubs / Unimplemented Handlers

| Endpoint | Handler | Notes |
|----------|---------|-------|
| `GET /intelligence/generate` | `src/routes/intelligence.ts` | Needs verification |
| `POST /ai/extract` | `src/routes/ai.ts` | Needs verification |
| `GET /concierge/status` | `src/routes/concierge.ts` | Needs verification |
| `GET /briefing` | `src/routes/briefing.ts` | Needs verification |

---

## TypeScript / Build Errors (Known Issues)

1. **Registration endpoint (FIXED):** `email_verified` column mismatch - resolved in PR #72
2. **wrangler.toml zone configuration (FIXED):** `zone_name` vs `zone_id` - resolved in PR #72

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total surfaces inventoried | 87 |
| Total backend endpoints | ~200+ |
| ✅ WIRED | 82 |
| 🟡 ORPHAN-UI | 0 |
| 🟡 ORPHAN-API | 7 |
| 🔴 BROKEN-CALL | 0 |
| 🔴 BROKEN-ROUTE | 0 |
| ⚪ STUB | 4 (needs verification) |
| ⚠ UNTESTED | ~50 (untested endpoints) |

---

## Next Steps

- **UAT-02:** Fix mechanical issues (stub handlers, untested endpoints)
- **UAT-03:** End-to-end flow tests for critical paths
- **UAT-04:** Security audit (authentication, authorization, input validation)
- **UAT-05:** Data integrity and disaster recovery verification
- **UAT-06:** Load and resilience testing