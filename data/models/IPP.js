const mongoose = require('mongoose');

// Independent Power Producer Schema
const IPPSchema = new mongoose.Schema({
  ippId: {
    type: String,
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true
  },
  registrationNumber: String,
  companyType: {
    type: String,
    enum: ['LLC', 'Corporation', 'Partnership', 'SoleProprietorship'],
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
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PowerPlant'
  }],
  financialInfo: {
    annualRevenue: Number,
    creditRating: {
      type: String,
      enum: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D']
    },
    bankAccounts: [{
      bankName: String,
      accountNumber: String,
      accountType: String
    }]
  },
  certifications: [{
    name: String,
    issuedBy: String,
    validFrom: Date,
    validTo: Date
  }],
  status: {
    type: String,
    enum: ['Prospective', 'Prequalified', 'Qualified', 'Active', 'Inactive', 'Suspended'],
    default: 'Prospective'
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
IPPSchema.index({ companyName: 1 });
IPPSchema.index({ status: 1 });

// Pre-save middleware to update the updatedAt field
IPPSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('IPP', IPPSchema);