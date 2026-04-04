# Cloudflare Deployment Configuration

This directory contains configuration files for deploying the NXT Energy Trading Platform to Cloudflare.

## Files

- `wrangler.toml` - Main Cloudflare Workers configuration
- `README.md` - This file

## Deployment Instructions

To deploy this platform to Cloudflare:

1. Create the required Cloudflare resources (D1 database, KV namespace, R2 buckets)
2. Update the wrangler.toml file with your actual resource IDs
3. Configure GitHub repository secrets with your Cloudflare credentials
4. Push to main branch to trigger deployment via GitHub Actions

For detailed instructions on setting up Cloudflare resources for et.vantax.co.za deployment,
refer to the repository documentation.