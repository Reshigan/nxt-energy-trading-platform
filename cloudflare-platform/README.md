# NXT Energy Trading Platform - Cloudflare Edition

The world's best energy trading platform running entirely on Cloudflare's edge infrastructure.

## Architecture Overview

This implementation leverages Cloudflare's powerful edge computing platform to deliver exceptional performance and global availability:

### Backend (Cloudflare Workers)
- **Serverless Functions**: Ultra-low latency API endpoints running at the edge
- **D1 Database**: SQLite-compatible database for persistent storage
- **KV Storage**: Key-value store for caching and session management
- **R2 Storage**: Object storage for documents and assets
- **Workers AI**: Integrated machine learning models for predictive analytics

### Frontend (Cloudflare Pages)
- **Edge Hosting**: Lightning-fast global content delivery
- **Modern React UI**: Award-winning design with glassmorphism and neumorphism
- **AI Integration**: Embedded AI assistants throughout the interface
- **Responsive Design**: Works seamlessly across all devices

## Key Features

### AI-Powered Capabilities
- Real-time market simulation and predictive analytics
- Intelligent trading recommendations with confidence scoring
- Portfolio optimization suggestions
- Risk assessment and mitigation strategies
- Natural language processing for conversational AI

### Award-Winning UI
- Dark theme with vibrant accent colors tailored for energy sector
- Glassmorphism and neumorphism design elements
- Custom animations and micro-interactions
- Contextual data visualizations with real-time updates
- Voice-enabled controls and chatbot interface

### Core Functionality
- Trading engine with real-time matching
- Digital contract management with blockchain integration
- Carbon credit marketplace with fund manager integration
- IPP project lifecycle management
- Energy portfolio analytics with carbon footprint tracking

## Deployment

The platform consists of two main components:

1. **Cloudflare Worker** (`/workers`): API backend written in TypeScript
2. **Cloudflare Pages** (`/pages`): React frontend with modern UI

### Prerequisites
- Cloudflare account with Workers and Pages enabled
- Wrangler CLI installed (`npm install -g wrangler`)

### Deploying the Worker
```bash
cd workers
npm install
wrangler deploy
```

### Deploying the Frontend
```bash
cd pages
npm install
npm run build
# Then deploy using Cloudflare Pages dashboard or CLI
```

## API Endpoints

All API endpoints are hosted on Cloudflare Workers and accessible globally with minimal latency:

- `GET /api/v1/market/insights` - AI-powered market insights
- `GET /api/v1/portfolio/analytics/:portfolioId` - Portfolio analytics
- `POST /api/v1/trading/advisor` - AI trading recommendations
- `GET /api/v1/carbon/valuation` - Carbon credit valuation
- `POST /api/v1/contracts/negotiate` - AI contract negotiation

## Frontend Features

### Dashboard
- Real-time market data visualization
- Portfolio performance metrics
- AI-powered insights and recommendations
- Interactive data exploration tools

### Markets
- Live energy pricing across regions
- Trading signals and volatility indicators
- AI-driven trading recommendations

### Portfolio Management
- Asset allocation visualization
- Performance analytics with risk metrics
- Sustainability impact tracking

The platform represents the pinnacle of energy trading technology, combining cutting-edge AI capabilities with an award-winning user experience - all delivered with the speed and reliability of Cloudflare's global edge network.