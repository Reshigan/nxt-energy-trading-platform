const mongoose = require('mongoose');

// Carbon Fund Manager Schema
const FundManagerSchema = new mongoose.Schema({
  managerId: {
    type: String,
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true
  },
  contact: {
    email: {
      type: String,
      required: true
    },
    phone: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  certifications: [{
    name: String,
    issuedBy: String,
    validFrom: Date,
    validTo: Date
  }],
  managedFunds: [{
    fundId: String,
    fundName: String,
    investmentStrategy: String,
    assetsUnderManagement: Number,
    currency: String
  }],
  carbonProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CarbonProject'
  }],
  complianceStatus: {
    type: String,
    enum: ['Active', 'Suspended', 'Revoked'],
    default: 'Active'
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
FundManagerSchema.index({ companyName: 1 });
FundManagerSchema.index({ complianceStatus: 1 });

// Pre-save middleware to update the updatedAt field
FundManagerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FundManager', FundManagerSchema);