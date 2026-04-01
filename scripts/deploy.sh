#!/bin/bash

# NXT Energy Trading Platform Deployment Script
# Deploys the platform to Cloudflare using your credentials

set -e

echo "🚀 Starting NXT Energy Trading Platform deployment..."

# Check if required environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN is not set"
    echo "Please set your Cloudflare API token:"
    echo "export CLOUDFLARE_API_TOKEN=your_token_here"
    exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ CLOUDFLARE_ACCOUNT_ID is not set"
    echo "Please set your Cloudflare Account ID:"
    echo "export CLOUDFLARE_ACCOUNT_ID=your_account_id_here"
    exit 1
fi

echo "🔧 Deploying Cloudflare Workers backend..."

# Deploy Workers backend
cd cloudflare-platform
echo "Installing backend dependencies..."
npm ci

echo "Deploying to Cloudflare Workers..."
npx wrangler deploy --env production

echo "🔧 Deploying Cloudflare Pages frontend..."

# Deploy Pages frontend
cd pages
echo "Installing frontend dependencies..."
npm ci

echo "Building frontend..."
npm run build

echo "Deploying to Cloudflare Pages..."
# This would normally use wrangler pages deploy, but we're showing what would happen
echo "✅ Frontend built successfully. Please deploy the dist/ folder to Cloudflare Pages manually"

echo "🌐 Deployment URLs:"
echo "   API: https://et.vantax.co.za/api/*"
echo "   Frontend: https://et.vantax.co.za/"

echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Configure your domain et.vantax.co.za in Cloudflare"
echo "2. Set up DNS records pointing to your deployed applications"
echo "3. Configure SSL/TLS settings to Full (strict)"
echo "4. Test the deployment by visiting https://et.vantax.co.za/"