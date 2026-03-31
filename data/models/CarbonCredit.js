const mongoose = require('mongoose');

// Carbon Credit Schema
const CarbonCreditSchema = new mongoose.Schema({
  creditId: {
    type: String,
    required: true,
    unique: true
  },
  projectId: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  projectType: {
    type: String,
    enum: ['Solar', 'Wind', 'Hydro', 'Reforestation', 'MethaneCapture', 'EnergyEfficiency', 'Other'],
    required: true
  },
  issuingBody: {
    type: String,
    required: true
  },
  issuanceDate: {
    type: Date,
    required: true
  },
  expirationDate: {
    type: Date,
    required: true
  },
  vintageYear: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['tons', 'kg'],
    default: 'tons'
  },
  pricePerUnit: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  certificationStandard: {
    type: String,
    enum: ['Verra', 'GoldStandard', 'ClimateActionReserve', 'AmericanCarbonRegistry', 'Other'],
    required: true
  },
  ownershipHistory: [{
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant'
    },
    transferDate: Date,
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['Available', 'Reserved', 'Retired', 'Expired'],
    default: 'Available'
  },
  metadata: {
    geographicRegion: String,
    sdgImpacts: [String],  // Sustainable Development Goals impacts
    additionalAttributes: Object
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
CarbonCreditSchema.index({ projectId: 1 });
CarbonCreditSchema.index({ projectType: 1 });
CarbonCreditSchema.index({ status: 1 });
CarbonCreditSchema.index({ vintageYear: 1 });

// Pre-save middleware to update the updatedAt field
CarbonCreditSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CarbonCredit', CarbonCreditSchema);