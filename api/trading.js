const express = require('express');
const router = express.Router();
const Trade = require('../data/models/Trade');
const Participant = require('../data/models/Participant');

// GET all trades
router.get('/', async (req, res) => {
  try {
    const trades = await Trade.find()
      .populate('buyer', 'name')
      .populate('seller', 'name')
      .populate('contractId', 'title');
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET trade by ID
router.get('/:id', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('buyer', 'name')
      .populate('seller', 'name')
      .populate('contractId', 'title');
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    res.json(trade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new trade
router.post('/', async (req, res) => {
  try {
    const trade = new Trade(req.body);
    await trade.save();
    res.status(201).json(trade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update trade
router.put('/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    res.json(trade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE trade
router.delete('/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndDelete(req.params.id);
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    res.json({ message: 'Trade deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;