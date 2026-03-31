const express = require('express');
const router = express.Router();
const CarbonCredit = require('../../data/models/CarbonCredit');
const FundManager = require('../../data/models/FundManager');
const CarbonProject = require('../../data/models/CarbonProject');

// GET all carbon credits
router.get('/credits', async (req, res) => {
  try {
    const credits = await CarbonCredit.find()
      .populate('ownershipHistory.ownerId', 'name');
    res.json(credits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET carbon credit by ID
router.get('/credits/:id', async (req, res) => {
  try {
    const credit = await CarbonCredit.findById(req.params.id)
      .populate('ownershipHistory.ownerId', 'name');
    
    if (!credit) {
      return res.status(404).json({ error: 'Carbon credit not found' });
    }
    
    res.json(credit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new carbon credit
router.post('/credits', async (req, res) => {
  try {
    const credit = new CarbonCredit(req.body);
    await credit.save();
    res.status(201).json(credit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST trade/buy carbon credits
router.post('/credits/:id/trade', async (req, res) => {
  try {
    const { buyerId, quantity } = req.body;
    
    const credit = await CarbonCredit.findById(req.params.id);
    if (!credit) {
      return res.status(404).json({ error: 'Carbon credit not found' });
    }
    
    if (credit.status !== 'Available') {
      return res.status(400).json({ error: 'Carbon credit not available for trading' });
    }
    
    if (quantity > credit.quantity) {
      return res.status(400).json({ error: 'Insufficient carbon credit quantity' });
    }
    
    // Update credit quantity and ownership
    credit.quantity -= quantity;
    credit.ownershipHistory.push({
      ownerId: buyerId,
      transferDate: new Date(),
      quantity: quantity
    });
    
    // Update status if all credits are transferred
    if (credit.quantity <= 0) {
      credit.status = 'Retired';
    }
    
    await credit.save();
    
    res.json({
      message: 'Carbon credits traded successfully',
      credit,
      transferredQuantity: quantity
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all fund managers
router.get('/fund-managers', async (req, res) => {
  try {
    const managers = await FundManager.find();
    res.json(managers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET fund manager by ID
router.get('/fund-managers/:id', async (req, res) => {
  try {
    const manager = await FundManager.findById(req.params.id)
      .populate('carbonProjects');
    
    if (!manager) {
      return res.status(404).json({ error: 'Fund manager not found' });
    }
    
    res.json(manager);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new fund manager
router.post('/fund-managers', async (req, res) => {
  try {
    const manager = new FundManager(req.body);
    await manager.save();
    res.status(201).json(manager);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all carbon projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await CarbonProject.find()
      .populate('fundManager', 'companyName');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET carbon project by ID
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await CarbonProject.findById(req.params.id)
      .populate('fundManager', 'companyName');
    
    if (!project) {
      return res.status(404).json({ error: 'Carbon project not found' });
    }
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new carbon project
router.post('/projects', async (req, res) => {
  try {
    const project = new CarbonProject(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET carbon credit marketplace summary
router.get('/marketplace-summary', async (req, res) => {
  try {
    // Get aggregates for marketplace summary
    const totalCredits = await CarbonCredit.countDocuments();
    const availableCredits = await CarbonCredit.countDocuments({ status: 'Available' });
    const retiredCredits = await CarbonCredit.countDocuments({ status: 'Retired' });
    
    const creditsByType = await CarbonCredit.aggregate([
      { $group: { _id: '$projectType', count: { $sum: 1 } } }
    ]);
    
    const creditsByVintage = await CarbonCredit.aggregate([
      { $group: { _id: '$vintageYear', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      totalCredits,
      availableCredits,
      retiredCredits,
      creditsByType,
      creditsByVintage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;