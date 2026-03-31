// Utility functions for the energy trading platform

// Generate unique identifiers
const generateId = (prefix = '') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Calculate contract duration in months
const calculateDurationInMonths = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  return years * 12 + months;
};

// Validate energy quantities
const validateEnergyQuantity = (quantity, unit) => {
  if (typeof quantity !== 'number' || quantity <= 0) {
    return false;
  }
  
  if (!['MWh', 'kWh'].includes(unit)) {
    return false;
  }
  
  return true;
};

// Convert energy units
const convertEnergyUnits = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) {
    return value;
  }
  
  if (fromUnit === 'MWh' && toUnit === 'kWh') {
    return value * 1000;
  }
  
  if (fromUnit === 'kWh' && toUnit === 'MWh') {
    return value / 1000;
  }
  
  throw new Error(`Unsupported conversion from ${fromUnit} to ${toUnit}`);
};

// Calculate carbon emissions savings
const calculateCarbonSavings = (energyQuantity, energyType) => {
  // kg CO2 saved per MWh of different energy types
  const emissionFactors = {
    Solar: 0,
    Wind: 0,
    Hydro: 0,
    NaturalGas: 490,
    Coal: 1000,
    Nuclear: 0,
    Battery: 0,
    Other: 200
  };
  
  const factor = emissionFactors[energyType] || 200; // default factor
  return energyQuantity * factor; // result in kg CO2
};

// Format dates for display
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Validate email addresses
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate contract pricing
const validatePricing = (pricing) => {
  if (!pricing || !pricing.mechanism) {
    return false;
  }
  
  if (pricing.ceilingPrice && pricing.floorPrice && pricing.ceilingPrice < pricing.floorPrice) {
    return false;
  }
  
  return true;
};

module.exports = {
  generateId,
  formatCurrency,
  calculateDurationInMonths,
  validateEnergyQuantity,
  convertEnergyUnits,
  calculateCarbonSavings,
  formatDate,
  validateEmail,
  validatePricing
};