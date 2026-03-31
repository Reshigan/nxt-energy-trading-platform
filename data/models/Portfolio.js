const mongoose = require('mongoose');

// Energy Portfolio Schema
const PortfolioSchema = new mongoose.Schema({
  portfolioId: {
    type: String,
    required: true,
    unique: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  assets: [{
    assetId: String,
    type: {
      type: String,
      enum: ['Generation', 'Storage', 'DemandResponse', 'Transmission', 'Distribution'],
      required: true
    },
    technology: {
      type: String,
      enum: ['SolarPV', 'Wind', 'Hydro', 'NaturalGas', 'Coal', 'Nuclear', 'Battery', 'PumpedHydro', 'EVCharging', 'ThermalStorage', 'Other'],
      required: true
    },
    capacity: {
      value: Number,
      unit: {
        type: String,
        enum: ['MW', 'kW'],
        default: 'MW'
      }
    },
    location: {
      latitude: Number,
      longitude: Number,
      region: String
    },
    operationalStatus: {
      type: String,
      enum: ['Operational', 'UnderConstruction', 'Planned', 'Decommissioned', 'Maintenance'],
      default: 'Operational'
    },
    commissionDate: Date,
    decommissionDate: Date
  }],
  energyMix: {
    renewablePercentage: Number,
    solarPercentage: Number,
    windPercentage: Number,
    hydroPercentage: Number,
    otherRenewablesPercentage: Number,
    fossilFuelsPercentage: Number
  },
  performanceMetrics: {
    historicalGeneration: [{
      period: String,  // Monthly, Quarterly, Annual
      startDate: Date,
      endDate: Date,
      energyProduced: {
        value: Number,
        unit: String
      },
      revenue: Number,
      carbonEmissions: Number  // kg CO2
    }],
    forecastGeneration: [{
      period: String,
      startDate: Date,
      endDate: Date,
      energyForecast: {
        value: Number,
        unit: String
      },
      confidenceInterval: Number
    }]
  },
  carbonFootprint: {
    totalEmissions: Number,  // kg CO2
    offsetCredits: Number,   // tons CO2 equivalent
    netEmissions: Number     // kg CO2
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
PortfolioSchema.index({ owner: 1 });
PortfolioSchema.index({ 'assets.technology': 1 });
PortfolioSchema.index({ 'assets.operationalStatus': 1 });

// Pre-save middleware to update the updatedAt field
PortfolioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Calculate energy mix percentages
  if (this.assets && this.assets.length > 0) {
    this.calculateEnergyMix();
  }
  next();
});

// Method to calculate energy mix percentages
PortfolioSchema.methods.calculateEnergyMix = function() {
  if (!this.assets || this.assets.length === 0) return;
  
  const totalAssets = this.assets.length;
  let renewableCount = 0;
  let solarCount = 0;
  let windCount = 0;
  let hydroCount = 0;
  let fossilCount = 0;
  
  this.assets.forEach(asset => {
    if (['SolarPV', 'Wind', 'Hydro', 'Other'].includes(asset.technology)) {
      renewableCount++;
      if (asset.technology === 'SolarPV') solarCount++;
      if (asset.technology === 'Wind') windCount++;
      if (asset.technology === 'Hydro') hydroCount++;
    } else if (['NaturalGas', 'Coal', 'Nuclear'].includes(asset.technology)) {
      fossilCount++;
    }
  });
  
  this.energyMix = {
    renewablePercentage: (renewableCount / totalAssets) * 100,
    solarPercentage: (solarCount / totalAssets) * 100,
    windPercentage: (windCount / totalAssets) * 100,
    hydroPercentage: (hydroCount / totalAssets) * 100,
    otherRenewablesPercentage: ((renewableCount - solarCount - windCount - hydroCount) / totalAssets) * 100,
    fossilFuelsPercentage: (fossilCount / totalAssets) * 100
  };
};

module.exports = mongoose.model('Portfolio', PortfolioSchema);