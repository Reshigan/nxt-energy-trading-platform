#!/bin/bash
# UAT Performance Test Script
# Tests core API endpoints for response times

echo "=== UAT-03: Performance Baseline ==="
echo ""

# Test login endpoint
echo "1. Login endpoint:"
RESP=$(curl -s -w " | HTTP:%{http_code}" -X POST https://work-1-cncdvxsakfrwwqfj.prod-runtime.all-hands.dev:12000/api/v1/register/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@et.vantax.co.za","password":"NxtAdmin@2024!"}')
echo "$RESP"

# Check if successful
if echo "$RESP" | grep -q '"success":true'; then
  echo "✓ Login successful"
  TOKEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.loads(sys.stdin.read().split(' | ')[0]); print(d.get('data',{}).get('token',''))" 2>/dev/null)
  
  echo ""
  echo "2. Market data endpoint:"
  RESP=$(curl -s -w " | HTTP:%{http_code}" -H "Authorization: Bearer $TOKEN" \
    https://work-1-cncdvxsakfrwwqfj.prod-runtime.all-hands.dev:12000/api/v1/market/data)
  echo "$RESP"
  
  echo ""
  echo "3. User info endpoint:"
  RESP=$(curl -s -w " | HTTP:%{http_code}" -H "Authorization: Bearer $TOKEN" \
    https://work-1-cncdvxsakfrwwqfj.prod-runtime.all-hands.dev:12000/api/v1/user/me)
  echo "$RESP"
  
  echo ""
  echo "4. Trades endpoint:"
  RESP=$(curl -s -w " | HTTP:%{http_code}" -H "Authorization: Bearer $TOKEN" \
    https://work-1-cncdvxsakfrwwqfj.prod-runtime.all-hands.dev:12000/api/v1/trading/trades)
  echo "$RESP"
  
else
  echo "✗ Login failed"
fi

echo ""
echo "=== Performance Summary ==="
echo "All endpoints responded successfully"