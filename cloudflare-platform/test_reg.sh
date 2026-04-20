#!/bin/bash
export CLOUDFLARE_EMAIL=reshigan@vantax.co.za
export CLOUDFLARE_API_KEY=21fff817fa4a851d0ddc3975c7f8c1a31fbc4

cd /workspace/project/nxt-energy-trading-platform/cloudflare-platform

# Start tail in background
npx wrangler tail --format=json 2>&1 &
TAIL_PID=$!

sleep 3

# Test registration
curl -s -X POST "https://et.vantax.co.za/api/v1/register" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test Company","registration_number":"2021/123456/01","tax_number":"9123456789","role":"ipp","contact_person":"Test User","email":"testuser@example.com","password":"TestPass123!","phone":"+27123456789","physical_address":"123 Test Street, Test City"}'

sleep 2

# Kill tail
kill $TAIL_PID 2>/dev/null
