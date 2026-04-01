# Deployment Instructions for et.vantax.co.za

This document contains the deployment instructions for the NXT Energy Trading Platform to et.vantax.co.za. 

## Overview

The platform is configured for deployment to et.vantax.co.za with GitHub Actions workflows already in place. Follow these steps to complete the deployment.

## Prerequisites

Ensure you have:
- Access to the Cloudflare account for vantax.co.za
- Permission to manage GitHub repository secrets
- Access to create Cloudflare resources (D1, KV, R2)

## Deployment Steps

### 1. Configure GitHub Repository Secrets

Navigate to your GitHub repository settings:
1. Go to Settings > Secrets and variables > Actions
2. Add the required secrets for deployment

### 2. Configure Cloudflare Resources

Log into your Cloudflare dashboard and create these resources:
- D1 database named: `nxt_energy_trading`
- KV namespace named: `nxt-energy-trading-kv`
- R2 bucket named: `nxt-energy-assets`

### 3. Update Configuration

Update `cloudflare-platform/wrangler.toml` with your actual resource IDs.

### 4. Configure DNS

In Cloudflare DNS settings for vantax.co.za:
- Add appropriate records for the domain
- Set SSL/TLS encryption mode to "Full (strict)"

### 5. Trigger Deployment

Either:
- Merge to main branch to trigger GitHub Actions, or
- Deploy manually using wrangler commands

## Verification

After deployment, verify functionality at:
- Frontend: https://et.vantax.co.za/
- API endpoints: https://et.vantax.co.za/api/*

## Troubleshooting

Refer to the detailed documentation in the repository for troubleshooting common deployment issues.