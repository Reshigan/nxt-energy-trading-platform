# Cloudflare Setup Guide for NXT Energy Trading Platform

This guide will help you set up and deploy the NXT Energy Trading Platform to `et.vantax.co.za` using your Cloudflare credentials.

## Prerequisites

- GitHub repository with the NXT Energy Trading Platform code
- Cloudflare account access with appropriate credentials

## Step-by-Step Cloudflare Setup

### 1. Configure Cloudflare DNS

1. Log in to Cloudflare Dashboard with your credentials
2. Add the domain `et.vantax.co.za` to your Cloudflare account
3. Update the nameservers for the domain to point to Cloudflare
4. In the DNS section, add the following records:
   - CNAME record for the root (@) pointing to your Pages deployment
   - Additional records as needed for email or other services

### 2. Configure API Token

1. Go to My Profile > API Tokens
2. Create a new API token with these permissions:
   - Zone - DNS - Edit
   - Zone - Zone - Read
   - Account - Workers Scripts - Edit
   - Account - Workers Routes - Edit
   - Account - Cloudflare Pages - Edit
   - Account - Workers Tail - Read

### 3. Set Up Workers

1. In the Cloudflare Dashboard, navigate to Workers & Pages
2. Create a new Worker named `nxt-energy-trading-api`
3. Configure the route to handle API requests:
   - Pattern: `et.vantax.co.za/api/*`
   - Worker: `nxt-energy-trading-api`

### 4. Configure D1 Database

1. In Workers & Pages, go to D1
2. Create a new database named `nxt_energy_trading`
3. Update the database_id in `wrangler.toml` with the created database ID

### 5. Configure KV Namespace

1. In Workers & Pages, go to KV
2. Create a new namespace named `nxt-energy-trading-kv`
3. Update the namespace ID in `wrangler.toml` with the created namespace ID

### 6. Configure R2 Bucket

1. In Workers & Pages, go to R2
2. Create a new bucket named `nxt-energy-assets`
3. Update the bucket name in `wrangler.toml` if needed

## GitHub Repository Configuration

### 1. Add Secrets to GitHub

In your GitHub repository settings:
1. Go to Settings > Secrets and variables > Actions
2. Add the following secrets:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: [Your Cloudflare API Token]
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: [Your Cloudflare Account ID]
   - Name: `GITHUB_TOKEN`, Value: [Your GitHub Token]

### 2. Configure GitHub Actions

The repository already contains GitHub Actions workflows that will:
- Automatically deploy the backend API to Cloudflare Workers on pushes to main
- Automatically build and deploy the frontend to Cloudflare Pages on pushes to main

## Manual Deployment

If you need to deploy manually, run:

```bash
# Set environment variables
export CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
export CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Run deployment script
./scripts/deploy.sh
```

## Environment Configuration

### Production Environment (.env.production)
```
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Application Settings
ENVIRONMENT=production
API_BASE_URL=https://et.vantax.co.za/api
```

### Development Environment (.env.development)
```
# Development Settings
ENVIRONMENT=development
API_BASE_URL=http://localhost:8787
```

## Domain Configuration

To configure `et.vantax.co.za`:

1. Ensure DNS records are set up correctly:
   - A record pointing to Cloudflare Pages
   - CNAME records for subdomains if needed

2. Configure SSL/TLS settings:
   - Set to "Full (strict)" for maximum security

3. Enable Cloudflare features:
   - Always Use HTTPS
   - HTTP/2
   - HTTP/3 (if supported)
   - Auto Minify for CSS, HTML, JS
   - Brotli compression

## Monitoring and Maintenance

### Performance Monitoring
- Use Cloudflare Analytics to monitor API performance
- Set up uptime monitoring for et.vantax.co.za
- Configure alerts for error rate thresholds

### Security Settings
- Enable Rate Limiting to prevent abuse
- Configure WAF rules for added protection
- Set up Firewall rules for IP access control if needed

### Backup and Recovery
- Regular backups of D1 database
- Version control all configuration files
- Document recovery procedures

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check API token permissions
   - Verify account limits and billing
   - Review error logs in Cloudflare Dashboard

2. **DNS Resolution Issues**
   - Confirm DNS records are correct
   - Check TTL values
   - Verify nameserver propagation

3. **SSL/TLS Certificate Issues**
   - Check certificate validity
   - Confirm SSL mode setting
   - Review origin server configuration

### Support Resources

- Cloudflare Documentation: https://developers.cloudflare.com/
- Workers Community: https://community.cloudflare.com/c/developers/workers
- GitHub Actions Documentation: https://docs.github.com/en/actions

## Post-Deployment Checklist

- [ ] Verify API endpoints are accessible at https://et.vantax.co.za/api/*
- [ ] Confirm frontend loads at https://et.vantax.co.za/
- [ ] Test all application features
- [ ] Set up monitoring and alerting
- [ ] Configure backup procedures
- [ ] Document operational procedures

Once completed, the NXT Energy Trading Platform will be available at https://et.vantax.co.za/ with all features including AI-powered trading insights, carbon credit marketplace, and IPP project management.