# Deferred Items — UAT-01 Coverage Matrix

Items discovered during UAT-01 that were deferred to subsequent tasks.

---

## High Priority (UAT-02)

### 1. Orphan API endpoints
**Issue:** 7 backend endpoints exist but have no frontend UI reference.

**Deferred to:** UAT-02 (smoke tests + fixes)

**Details:**
- Admin user management endpoints (`/admin/users/*`)
- Market halt endpoint (`/admin/markets/:market/halt`)
- 2FA reset endpoint (`/admin/users/:id/reset-2fa`)

**Recommendation:** Either add admin UI components or document these as internal API-only endpoints.

---

## Medium Priority (UAT-03)

### 2. Stub handlers verification
**Issue:** 4 endpoints may return placeholder/stub data.

**Deferred to:** UAT-03 (end-to-end flow tests)

**Details:**
- `/intelligence/generate` — may be mock
- `/ai/extract` — may be stub
- `/concierge/status` — may be stub
- `/briefing` — may be stub

**Recommendation:** Test these endpoints at runtime to verify they return real data.

---

### 3. Test coverage gaps
**Issue:** ~50 endpoints lack automated tests.

**Deferred to:** UAT-03 (end-to-end flow tests) or separate test ticket

**Details:** See COVERAGE_SUMMARY.md for list of untested endpoints.

**Recommendation:** Add Playwright or Vitest tests for critical paths.

---

## Low Priority (Post-UAT)

### 4. API documentation
**Issue:** No OpenAPI/Swagger documentation exists.

**Recommendation:** Generate OpenAPI spec from route definitions for developer documentation.

---

### 5. Frontend API integration
**Issue:** Some API calls in `pages/src/lib/api.ts` may have path mismatches with backend routes.

**Recommendation:** Review all paths in api.ts against backend route definitions.

---

## Already Fixed (PR #72)

### 6. Registration endpoint
- **Issue:** `email_verified` column mismatch causing 500 errors
- **Fix:** Removed `email_verified` from INSERT statement
- **PR:** https://github.com/Reshigan/nxt-energy-trading-platform/pull/72

### 7. wrangler.toml zone configuration
- **Issue:** `zone_name` used instead of `zone_id`
- **Fix:** Changed to `zone_id`
- **PR:** https://github.com/Reshigan/nxt-energy-trading-platform/pull/72