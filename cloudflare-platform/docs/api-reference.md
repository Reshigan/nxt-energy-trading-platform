# NXT Energy Trading Platform — API Reference

**Base URL:** `https://et.vantax.co.za/api/v1`
**Auth:** Bearer JWT token in `Authorization` header
**Format:** JSON request/response

---

## Authentication

### POST /register/auth/login
Login with email and password.
```json
{ "email": "user@example.co.za", "password": "..." }
```
**Response:** `{ success, data: { token, refreshToken, user } }`

### POST /auth/logout
Blacklist current JWT token. **Requires auth.**
**Response:** `{ success, message }`

### POST /auth/refresh
Rotate refresh token.
```json
{ "refreshToken": "..." }
```
**Response:** `{ success, data: { token, refreshToken } }`

---

## Dashboard

### GET /dashboard/summary
Role-adaptive dashboard summary. **Requires auth.**
**Response:** `{ success, data: { participants, projects, pending_trades, active_contracts, ... } }`

---

## Trading

### GET /trading/orders
List open orders for current user. **Requires auth.**

### POST /trading/orders
Place a new order. **Requires auth.**
```json
{ "direction": "buy|sell", "market": "solar", "volume": 10, "price_cents": 12500, "order_type": "limit|market|stop_loss|iceberg", "validity": "day|gtc|ioc|gtd" }
```

### DELETE /trading/orders/:id
Cancel an open order. **Requires auth.**

### GET /trading/orderbook/:market
Get order book depth for a market.

### GET /trading/positions
Get current positions with P&L. **Requires auth.**

### GET /trading/markets/indices
Get all market index prices.

### GET /trading/markets/prices/:market
Get price history for a market.

---

## Carbon

### GET /carbon/credits
List carbon credits. **Requires auth.**

### POST /carbon/credits/:id/retire
Retire a carbon credit. **Requires auth.**

### POST /carbon/credits/:id/transfer
Transfer a carbon credit. **Requires auth.**

### GET /carbon/options
List carbon options. **Requires auth.**

### POST /carbon/options
Write a new carbon option. **Requires auth.**

### POST /carbon/options/:id/exercise
Exercise a carbon option. **Requires auth.**

### GET /carbon/fund/nav
Get carbon fund NAV. **Requires auth.**

### POST /carbon/registry/sync/:registry
Sync with external registry (gold_standard, verra). **Requires auth.**

---

## Contracts

### GET /contracts/documents
List contract documents with filters. **Requires auth.**

### POST /contracts/documents
Create a new contract document. **Requires auth.**

### POST /contracts/:id/sign
Sign a contract document. **Requires auth.**

### PATCH /contracts/:id/phase
Advance contract phase. **Requires auth.**

### GET /contracts/:id/versions
Get amendment history. **Requires auth.**

### POST /contracts/:id/amend
Create an amendment. **Requires auth.**

### GET /contracts/:id/pdf
Download contract as PDF. **Requires auth.**

### GET /contracts/:id/audit-trail
Get audit trail. **Requires auth.**

### GET /contracts/:id/verify
Verify document integrity and signature chain. **Requires auth.**

---

## Projects (IPP)

### GET /projects
List projects. **Requires auth.**

### POST /projects
Create a new project. **Requires auth.**

### PATCH /projects/:id/milestones/:mid
Update milestone status. **Requires auth.**

### PATCH /projects/:id/conditions/:cid
Update condition precedent status. **Requires auth.**

---

## Settlement

### GET /settlement/invoices
List invoices. **Requires auth.**

### POST /settlement/invoices/generate
Generate invoices from settled trades. **Requires auth.**

### POST /settlement/invoices/:id/pay
Mark invoice as paid. **Requires auth.**

### GET /settlement/escrows
List escrows. **Requires auth.**

### POST /settlement/escrows
Create a new escrow. **Requires auth.**

### GET /settlement/disputes
List disputes. **Requires auth.**

### POST /settlement/disputes
File a new dispute. **Requires auth.**

### PATCH /settlement/disputes/:id/status
Update dispute status. **Requires auth.**

---

## Compliance

### GET /compliance/kyc/:participantId
Get KYC status and checks. **Requires auth.**

### POST /compliance/kyc/:participantId/documents
Upload KYC document. **Requires auth.**

### GET /compliance/statutory/:participantId
Get statutory check results. **Requires auth.**

### POST /compliance/statutory/:participantId/run
Run statutory checks. **Requires auth (admin).**

### GET /compliance/licences/:participantId
Get licences. **Requires auth.**

### POST /compliance/licences
Add a licence. **Requires auth.**

### GET /compliance/audit-log
Get audit log entries. **Requires auth (admin).**

### GET /compliance/aml/screening/:participantId
Run AML screening. **Requires auth.**

---

## Risk

### GET /ai/risk/:participantId
Get risk metrics (VaR, Greeks, stress tests). **Requires auth.**

### POST /ai/risk/stress-test
Run custom stress test. **Requires auth.**

---

## AI

### POST /ai/optimise
Run portfolio optimisation. **Requires auth.**

### POST /ai/chat
AI assistant chat. **Requires auth.**

---

## Metering

### GET /metering/readings
Get meter readings. **Requires auth.**

### POST /metering/ingest
Upload meter readings. **Requires auth.**

### POST /metering/validate/:id
Validate a reading. **Requires auth.**

---

## P2P Trading

### GET /p2p/offers
List P2P offers. **Requires auth.**

### POST /p2p/offers
Create a P2P offer. **Requires auth.**

### POST /p2p/offers/:id/accept
Accept a P2P offer. **Requires auth.**

### POST /p2p/match
Run P2P matching. **Requires auth.**

### POST /p2p/settle/:id
Settle a P2P trade. **Requires auth.**

### DELETE /p2p/offers/:id
Cancel a P2P offer. **Requires auth.**

### GET /p2p/zones/stats
Get zone statistics. **Requires auth.**

---

## Reports

### GET /reports
List generated reports. **Requires auth.**

### POST /reports/generate
Generate a new report. **Requires auth.**

### GET /reports/:id/download
Download a report. **Requires auth.**

### GET /reports/templates
List available report templates. **Requires auth.**

### POST /reports/schedule
Schedule recurring reports. **Requires auth.**

---

## Developer Portal

### GET /developer/api-keys
List API keys. **Requires auth.**

### POST /developer/api-keys
Create an API key. **Requires auth.**

### DELETE /developer/api-keys/:id
Revoke an API key. **Requires auth.**

### GET /developer/webhooks
List webhooks. **Requires auth.**

### POST /developer/webhooks
Register a webhook. **Requires auth.**

### DELETE /developer/webhooks/:id
Delete a webhook. **Requires auth.**

### GET /developer/usage
Get API usage stats. **Requires auth.**

### GET /developer/logs
Get API call logs. **Requires auth.**

### GET /developer/docs
Get API documentation. **Requires auth.**

---

## Marketplace

### GET /marketplace/listings
List marketplace listings.

### POST /marketplace/listings
Create a listing. **Requires auth.**

### POST /marketplace/listings/:id/bid
Place a bid. **Requires auth.**

### GET /marketplace/notifications
Get marketplace notifications. **Requires auth.**

---

## Participants (Admin)

### GET /participants
List all participants. **Requires auth (admin).**

### GET /participants/:id
Get participant details. **Requires auth.**

### PATCH /participants/:id/kyc-status
Update KYC status. **Requires auth (admin).**

---

## POPIA

### GET /popia/consent/:participantId
Get POPIA consent status. **Requires auth.**

### POST /popia/consent
Record POPIA consent. **Requires auth.**

### POST /popia/data-request
Submit data access/deletion request. **Requires auth.**

### GET /popia/data-request/:id
Get data request status. **Requires auth.**

---

## Health

### GET /health
Health check — checks D1, KV, R2 connectivity.
**Response:** `{ status: "healthy"|"degraded", version, timestamp, services }`

---

## Fees

### GET /fees
Get active fee schedule.
**Response:** `{ success, data: [{ fee_type, rate_bps, min_cents, max_cents }] }`

---

## Notifications

### GET /notifications
List notifications for current user. **Requires auth.**
Query: `?page=1&limit=20`

### PATCH /notifications/:id/read
Mark notification as read. **Requires auth.**

### PATCH /notifications/read-all
Mark all notifications as read. **Requires auth.**

---

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_FAILED | Invalid credentials or expired token |
| VALIDATION_ERROR | Request body validation failed |
| NOT_FOUND | Resource not found |
| RATE_LIMITED | Too many requests |
| INSUFFICIENT_FUNDS | Insufficient escrow balance |
| ORDER_REJECTED | Order rejected by matching engine |
| KYC_REQUIRED | KYC verification required |
| PERMISSION_DENIED | Insufficient role permissions |

---

*Generated for NXT Energy Trading Platform v2.0.0 | GONXT Technology (Pty) Ltd*
