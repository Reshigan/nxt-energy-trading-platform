# Environment Variables and Secrets Configuration

## Required Secrets for GitHub Actions

To deploy the NXT Energy Trading Platform to Cloudflare, you need to configure the following secrets in your GitHub repository:

### Cloudflare Credentials
1. `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with Workers and Pages permissions
2. `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare Account ID

Note: Replace placeholder IDs in `wrangler.toml` with your actual resource IDs:
- KV namespace ID
- D1 database ID
- R2 bucket names

### Domain Configuration
3. `CUSTOM_DOMAIN` - et.vantax.co.za (the domain to deploy to)

## Setting Up Cloudflare

### 1. Configure Cloudflare API Token
Using your Cloudflare credentials:
- Go to Cloudflare Dashboard
- Navigate to My Profile > API Tokens
- Create a token with following permissions:
  - Zone - DNS - Edit
  - Zone - Zone - Read
  - Account - Workers Scripts - Edit
  - Account - Workers Routes - Edit
  - Account - Workers Tail - Read

### 2. Add Secrets to GitHub Repository
In your GitHub repository settings:
1. Go to Settings > Secrets and variables > Actions
2. Add the following secrets:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: [Your Cloudflare API Token]
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: [Your Cloudflare Account ID]

## Cloudflare Setup Instructions

### Workers Setup
1. Create a new Worker in Cloudflare Dashboard named `nxt-energy-trading-api`
2. Configure the route to handle API requests:
   - Pattern: `et.vantax.co.za/api/*`
   - Worker: `nxt-energy-trading-api`

### Pages Setup
1. Create a new Pages project in Cloudflare Dashboard named `nxt-energy-trading-platform`
2. Connect to your GitHub repository
3. Configure build settings:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/cloudflare-platform/pages`

### Domain Configuration
1. Add the domain `et.vantax.co.za` to your Cloudflare account
2. Update DNS records:
   - A record pointing to Cloudflare Pages
   - CNAME records for API endpoints if needed
3. Configure SSL/TLS settings to Full (strict)

## Environment Variables for Local Development

Create `.env` file in `cloudflare-platform` directory:
```bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Development Settings
ENVIRONMENT=development
NODE_ENV=development
```

Create `.env` file in `cloudflare-platform/pages` directory:
```bash
# API Configuration
VITE_API_BASE_URL=https://et.vantax.co.za/api

# Development Settings
NODE_ENV=development
```

## Deployment Commands

### Manual Deployment
To deploy manually without CI/CD:

1. Backend (Workers):
```bash
cd cloudflare-platform
wrangler deploy
```

2. Frontend (Pages):
```bash
cd cloudflare-platform/pages
npm run build
# Then upload dist folder to Cloudflare Pages
```

## Monitoring and Maintenance

### Logs and Debugging
- View Worker logs in Cloudflare Dashboard > Workers > Your Worker > Logs
- Monitor Pages deployments in Cloudflare Dashboard > Pages > Your Project > Deployments

### Performance Monitoring
- Use Cloudflare Analytics to monitor API performance
- Set up uptime monitoring for et.vantax.co.za
- Configure alerts for error rate thresholds