# Pre-UAT Audit — Coverage Summary

**Date:** 2026-04-19  
**Application:** NXT Energy Trading Platform (https://et.vantax.co.za)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total surfaces inventoried | 87 |
| Total backend endpoints | ~200+ |
| ✅ WIRED (fully connected) | 82 |
| 🟡 ORPHAN-UI (no backend call) | 0 |
| 🟡 ORPHAN-API (no frontend reference) | 7 |
| 🔴 BROKEN-CALL (missing endpoint) | 0 |
| 🔴 BROKEN-ROUTE (compilation error) | 0 |
| ⚪ STUB (placeholder data) | 4 |
| ⚠ UNTESTED (no automated test) | ~50 |

**Overall Status:** 🟡 REQUIRES ATTENTION  
Most surfaces are wired correctly, but there are orphan APIs and untested endpoints that need verification before go-live.

---

## 🟡 ORPHAN-API (Backend exists, no UI reference)

These endpoints exist in the backend but have no corresponding frontend UI to call them:

| Endpoint | Handler | Purpose | Recommendation |
|----------|---------|---------|----------------|
| `GET /admin/users` | `src/routes/participants.ts` | Admin user list | Add admin UI for user management |
| `POST /admin/users/:id/reset-password` | `src/routes/participants.ts` | Admin password reset | Add to admin user panel |
| `POST /admin/users/:id/verify-email` | `src/routes/participants.ts` | Admin verify email | Add to admin user panel |
| `POST /admin/users/:id/unlock` | `src/routes/participants.ts` | Unlock locked user | Add to admin user panel |
| `POST /admin/markets/:market/halt` | `src/routes/trading.ts` | Halt market | Add to admin trading panel |
| `POST /admin/users/:id/resend-verification` | `src/routes/participants.ts` | Resend verification | Add to admin user panel |
| `POST /admin/users/:id/reset-2fa` | `src/routes/sessions.ts` | Reset 2FA | Add to admin user panel |

---

## ⚪ STUB (Needs verification - may return placeholder data)

| Endpoint | Handler | Notes |
|----------|---------|-------|
| `GET /intelligence/generate` | `src/routes/intelligence.ts` | May be stub - needs runtime test |
| `POST /ai/extract` | `src/routes/ai.ts` | May be stub - needs runtime test |
| `GET /concierge/status` | `src/routes/concierge.ts` | May be stub - needs runtime test |
| `GET /briefing` | `src/routes/briefing.ts` | May be stub - needs runtime test |

---

## ⚠ UNTESTED (No automated test coverage)

~50 endpoints have no corresponding test file. Key untested areas:

- Authentication flows (login, register, 2FA, password reset)
- Trading order placement and cancellation
- Contract lifecycle (sign, amend, phase advance)
- Carbon credit operations
- Settlement and invoice processing
- P2P trading
- Admin operations
- All durable objects (OrderBook, RiskEngine, etc.)

---

## 🔧 Mechanical Issues Found

1. **Registration endpoint fixed** (PR #72): Removed `email_verified` from INSERT statement
2. **wrangler.toml fixed** (PR #72): Changed `zone_name` to `zone_id`

---

## Recommendations

1. **High Priority:** Add test coverage for authentication flows (critical path)
2. **Medium Priority:** Verify stub handlers return real data
3. **Medium Priority:** Add admin UI components for orphan API endpoints
4. **Low Priority:** Add test coverage for remaining ~50 endpoints

---

## Coverage by Area

| Area | Wired | Orphan-API | Stub | Untested |
|------|-------|------------|------|----------|
| Auth | 8 | 0 | 0 | ~3 |
| Dashboard | 3 | 0 | 0 | 1 |
| Trading | 8 | 0 | 0 | ~5 |
| Carbon | 8 | 0 | 0 | ~4 |
| Contracts | 11 | 0 | 0 | ~6 |
| Settlement | 5 | 0 | 0 | ~3 |
| Compliance | 7 | 0 | 0 | ~4 |
| Marketplace | 3 | 0 | 0 | 2 |
| P2P | 4 | 0 | 0 | 2 |
| Projects | 6 | 0 | 0 | 3 |
| Admin | 2 | 7 | 0 | ~5 |
| Other (AI, ESG, VPP, etc.) | 17 | 0 | 4 | ~12 |

**Total by status:**
- ✅ WIRED: 82 surfaces
- 🟡 ORPHAN-API: 7 endpoints  
- ⚪ STUB: 4 endpoints (needs verification)
- ⚠ UNTESTED: ~50 endpoints