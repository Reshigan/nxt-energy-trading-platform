const express = require('express');
const router = express.Router();
const Portfolio = require('../data/models/Portfolio');
const Participant = require('../data/models/Participant');

// GET all portfolios
router.get('/', async (req, res) => {
  try {
    const portfolios = await Portfolio.find()
      .populate('owner', 'name');
    res.json(portfolios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET portfolio by ID
router.get('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate('owner', 'name');
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new portfolio
router.post('/', async (req, res) => {
  try {
    const portfolio = new Portfolio(req.body);
    await portfolio.save();
    res.status(201).json(portfolio);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update portfolio
router.put('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json(portfolio);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE portfolio
router.delete('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findByIdAndDelete(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json({ message: 'Portfolio deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET portfolio energy mix
router.get('/:id/energy-mix', async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json({
      portfolioId: portfolio.portfolioId,
      name: portfolio.name,
      energyMix: portfolio.energyMix
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;