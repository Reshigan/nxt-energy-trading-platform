const mongoose = require('mongoose');

// Carbon Project Schema
const CarbonProjectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  projectName: {
    type: String,
    required: true
  },
  projectDescription: String,
  projectType: {
    type: String,
    enum: ['Solar', 'Wind', 'Hydro', 'Reforestation', 'MethaneCapture', 'EnergyEfficiency', 'Other'],
    required: true
  },
  location: {
    country: String,
    region: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  fundManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FundManager',
    required: true
  },
  projectDeveloper: String,
  startDate: Date,
  endDate: Date,
  estimatedAnnualReduction: {
    value: Number,
    unit: {
      type: String,
      enum: ['tons', 'kg'],
      default: 'tons'
    }
  },
  totalCreditsIssued: {
    value: Number,
    unit: {
      type: String,
      enum: ['tons', 'kg'],
      default: 'tons'
    }
  },
  certificationDetails: {
    standard: {
      type: String,
      enum: ['Verra', 'GoldStandard', 'ClimateActionReserve', 'AmericanCarbonRegistry', 'Other'],
      required: true
    },
    certificationDate: Date,
    certificationId: String,
    verificationReports: [String]  // URLs to verification reports
  },
  sdgGoals: [{
    goalNumber: Number,
    description: String
  }],
  monitoringData: [{
    measurementDate: Date,
    actualReductions: Number,
    methodology: String
  }],
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
CarbonProjectSchema.index({ projectType: 1 });
CarbonProjectSchema.index({ fundManager: 1 });
CarbonProjectSchema.index({ location: 1 });

// Pre-save middleware to update the updatedAt field
CarbonProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CarbonProject', CarbonProjectSchema);