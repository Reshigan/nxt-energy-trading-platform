#!/usr/bin/env bash
# seed-kv.sh — Populate KV namespace with market indices and reference data
# Usage: ./scripts/seed-kv.sh [--env production]
#
# This script writes market indices, exchange rates, and platform config
# into the NXT_KV namespace for fast runtime access.

set -euo pipefail

ENV_FLAG="${1:-}"

put_kv() {
  local key="$1"
  local value="$2"
  if [ "$ENV_FLAG" = "--env" ] && [ -n "${2:-}" ]; then
    npx wrangler kv:key put --binding KV "$key" "$value" --env "${3:-production}"
  else
    npx wrangler kv:key put --binding KV "$key" "$value"
  fi
}

echo "=== Seeding KV: Market Indices ==="

put_kv "market:index:solar" '{
  "name": "SA Solar Index",
  "symbol": "SASOL-IDX",
  "value": 847.20,
  "change_pct": 8.2,
  "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
  "components": ["Limpopo Solar", "Northern Cape Solar", "Free State Solar"],
  "unit": "ZAR/MWh"
}'

put_kv "market:index:wind" '{
  "name": "SA Wind Index",
  "symbol": "SAWIND-IDX",
  "value": 623.50,
  "change_pct": 4.1,
  "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
  "components": ["Northern Cape Wind", "Eastern Cape Wind", "Western Cape Wind"],
  "unit": "ZAR/MWh"
}'

put_kv "market:index:gas" '{
  "name": "SA Gas Index",
  "symbol": "SAGAS-IDX",
  "value": 412.80,
  "change_pct": -3.1,
  "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
  "components": ["Sasol Gas", "Rompco Pipeline", "LNG Import"],
  "unit": "ZAR/MWh"
}'

put_kv "market:index:carbon" '{
  "name": "SA Carbon Index",
  "symbol": "SACBN-IDX",
  "value": 285.00,
  "change_pct": 12.4,
  "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
  "components": ["VCS Credits", "Gold Standard", "CDM"],
  "unit": "ZAR/tCO2e"
}'

echo "=== Seeding KV: Exchange Rates ==="

put_kv "fx:usd_zar" '{
  "rate": 18.45,
  "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
}'

put_kv "fx:eur_zar" '{
  "rate": 20.12,
  "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
}'

echo "=== Seeding KV: Platform Config ==="

put_kv "config:trading_fee_bps" "15"
put_kv "config:settlement_cycle_days" "2"
put_kv "config:max_order_size_mwh" "10000"
put_kv "config:carbon_tax_rate_zar" "190"

echo "=== KV Seed Complete ==="
