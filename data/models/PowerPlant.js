const mongoose = require('mongoose');

// Power Plant Schema
const PowerPlantSchema = new mongoose.Schema({
  plantId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  ipp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IPP',
    required: true
  },
  technologyType: {
    type: String,
    enum: ['SolarPV', 'Wind', 'Hydro', 'NaturalGas', 'Coal', 'Nuclear', 'Biomass', 'Geothermal', 'Other'],
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
    address: String,
    latitude: Number,
    longitude: Number,
    region: String,
    country: String
  },
  commissioningDate: Date,
  commercialOperationDate: Date,
  expectedLifetime: {
    value: Number,
    unit: {
      type: String,
      enum: ['years', 'months'],
      default: 'years'
    }
  },
  projectPhase: {
    type: String,
    enum: ['Development', 'Financing', 'Construction', 'Commissioning', 'CommercialOperation'],
    required: true
  },
  permits: [{
    permitType: String,
    issuingAuthority: String,
    issueDate: Date,
    expiryDate: Date,
    documentUrl: String
  }],
  financialCloseInfo: {
    closed: {
      type: Boolean,
      default: false
    },
    closureDate: Date,
    financingStructure: [{
      financier: String,
      amount: Number,
      currency: String,
      interestRate: Number,
      termYears: Number
    }],
    totalProjectCost: {
      amount: Number,
      currency: String
    }
  },
  offTakeAgreements: [{
    agreementId: String,
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    startDate: Date,
    endDate: Date,
    volume: {
      value: Number,
      unit: String
    },
    price: {
      value: Number,
      currency: String
    }
  }],
  gridConnection: {
    gridCompany: String,
    connectionPoint: String,
    voltageLevel: String,
    capacityAllocation: Number
  },
  monitoringSystem: {
    scadaProvider: String,
    dataAccessEndpoint: String,
    reportingFrequency: String
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
PowerPlantSchema.index({ ipp: 1 });
PowerPlantSchema.index({ technologyType: 1 });
PowerPlantSchema.index({ projectPhase: 1 });
PowerPlantSchema.index({ commercialOperationDate: 1 });

// Pre-save middleware to update the updatedAt field
PowerPlantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PowerPlant', PowerPlantSchema);