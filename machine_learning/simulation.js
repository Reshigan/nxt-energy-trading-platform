const express = require('express');
const router = express.Router();

// Mock simulation data for demonstration
const generateMockMarketData = () => {
  const energyTypes = ['Solar', 'Wind', 'Hydro', 'NaturalGas', 'Coal', 'Nuclear'];
  const now = new Date();
  
  return {
    timestamp: now.toISOString(),
    marketConditions: {
      demand: Math.floor(Math.random() * 50000) + 30000, // MWh
      supply: Math.floor(Math.random() * 55000) + 30000,  // MWh
      priceIndex: Math.random() * 200 + 50,               // $/MWh
      volatility: Math.random()
    },
    energyPrices: energyTypes.map(type => ({
      type,
      price: Math.random() * 150 + 30,                   // $/MWh
      trend: Math.random() > 0.5 ? 'up' : 'down',
      forecast: {
        '1h': Math.random() * 10 - 5,
        '6h': Math.random() * 20 - 10,
        '24h': Math.random() * 30 - 15
      }
    })),
    participants: {
      buyers: Math.floor(Math.random() * 50) + 10,
      sellers: Math.floor(Math.random() * 50) + 10,
      activeTrades: Math.floor(Math.random() * 200) + 50
    }
  };
};

// GET market simulation data
router.get('/market', (req, res) => {
  try {
    const simulation = generateMockMarketData();
    res.json(simulation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST run buyer behavior simulation
router.post('/buyers', (req, res) => {
  try {
    const { count, energyType } = req.body;
    
    // Generate simulated buyer behaviors
    const behaviors = [];
    for (let i = 0; i < (count || 10); i++) {
      behaviors.push({
        buyerId: `BUYER_${Math.floor(Math.random() * 1000)}`,
        preference: energyType || ['Solar', 'Wind', 'Hydro'][Math.floor(Math.random() * 3)],
        maxPrice: Math.random() * 200 + 50,
        minVolume: Math.random() * 100 + 10,
        riskTolerance: Math.random(),
        urgency: Math.random()
      });
    }
    
    res.json({
      simulationId: `SIM_${Date.now()}`,
      timestamp: new Date().toISOString(),
      behaviors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST run offer/acceptance simulation
router.post('/offers', (req, res) => {
  try {
    const { scenario } = req.body;
    
    // Simulate offer and acceptance patterns
    const offers = [];
    const numOffers = Math.floor(Math.random() * 50) + 20;
    
    for (let i = 0; i < numOffers; i++) {
      const offer = {
        offerId: `OFFER_${Math.floor(Math.random() * 10000)}`,
        seller: `SELLER_${Math.floor(Math.random() * 100)}`,
        energyType: ['Solar', 'Wind', 'Hydro', 'NaturalGas', 'Coal'][Math.floor(Math.random() * 5)],
        quantity: Math.random() * 1000 + 100, // MWh
        price: Math.random() * 150 + 30,      // $/MWh
        deliveryDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: ['Pending', 'Accepted', 'Rejected'][Math.floor(Math.random() * 3)]
      };
      
      offers.push(offer);
    }
    
    res.json({
      simulationId: `OFFER_SIM_${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalOffers: offers.length,
      offers: offers.slice(0, 20), // Return first 20 for brevity
      statistics: {
        avgPrice: offers.reduce((sum, o) => sum + o.price, 0) / offers.length,
        energyDistribution: offers.reduce((dist, o) => {
          dist[o.energyType] = (dist[o.energyType] || 0) + 1;
          return dist;
        }, {})
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET predictive analytics
router.get('/predictive-analytics', (req, res) => {
  try {
    // Simulate predictive analytics for energy trading
    const predictions = {
      nextHour: {
        demandForecast: Math.floor(Math.random() * 5000) + 30000,
        priceForecast: Math.random() * 200 + 50,
        confidence: Math.random() * 0.3 + 0.7
      },
      nextDay: {
        demandForecast: Math.floor(Math.random() * 10000) + 100000,
        priceForecast: Math.random() * 250 + 40,
        confidence: Math.random() * 0.2 + 0.6
      },
      nextWeek: {
        demandForecast: Math.floor(Math.random() * 50000) + 300000,
        priceForecast: Math.random() * 300 + 30,
        confidence: Math.random() * 0.1 + 0.5
      },
      renewableAvailability: {
        solar: Math.random() > 0.3 ? 'High' : 'Low',
        wind: Math.random() > 0.4 ? 'Moderate' : 'High',
        hydro: Math.random() > 0.2 ? 'Stable' : 'Variable'
      }
    };
    
    res.json({
      timestamp: new Date().toISOString(),
      predictions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;