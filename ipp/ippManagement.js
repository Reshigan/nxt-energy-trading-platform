const express = require('express');
const router = express.Router();
const IPP = require('../../data/models/IPP');
const PowerPlant = require('../../data/models/PowerPlant');
const Participant = require('../../data/models/Participant');

// GET all IPPs
router.get('/', async (req, res) => {
  try {
    const ipps = await IPP.find()
      .populate('projects');
    res.json(ipps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET IPP by ID
router.get('/:id', async (req, res) => {
  try {
    const ipp = await IPP.findById(req.params.id)
      .populate('projects');
    
    if (!ipp) {
      return res.status(404).json({ error: 'IPP not found' });
    }
    
    res.json(ipp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new IPP
router.post('/', async (req, res) => {
  try {
    const ipp = new IPP(req.body);
    await ipp.save();
    res.status(201).json(ipp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update IPP
router.put('/:id', async (req, res) => {
  try {
    const ipp = await IPP.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!ipp) {
      return res.status(404).json({ error: 'IPP not found' });
    }
    
    res.json(ipp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all power plants for an IPP
router.get('/:id/plants', async (req, res) => {
  try {
    const plants = await PowerPlant.find({ ipp: req.params.id });
    
    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new power plant for an IPP
router.post('/:id/plants', async (req, res) => {
  try {
    // Add IPP reference to the plant
    req.body.ipp = req.params.id;
    
    const plant = new PowerPlant(req.body);
    await plant.save();
    
    // Add plant to IPP's projects
    await IPP.findByIdAndUpdate(
      req.params.id,
      { $push: { projects: plant._id } }
    );
    
    res.status(201).json(plant);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update power plant
router.put('/plants/:plantId', async (req, res) => {
  try {
    const plant = await PowerPlant.findByIdAndUpdate(
      req.params.plantId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!plant) {
      return res.status(404).json({ error: 'Power plant not found' });
    }
    
    res.json(plant);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST handle financial close
router.post('/:id/financial-close', async (req, res) => {
  try {
    const { plantId, financingStructure, totalProjectCost } = req.body;
    
    // Update plant with financial close info
    const plant = await PowerPlant.findByIdAndUpdate(
      plantId,
      {
        'financialCloseInfo.closed': true,
        'financialCloseInfo.closureDate': new Date(),
        'financialCloseInfo.financingStructure': financingStructure,
        'financialCloseInfo.totalProjectCost': totalProjectCost,
        projectPhase: 'Construction'
      },
      { new: true }
    );
    
    if (!plant) {
      return res.status(404).json({ error: 'Power plant not found' });
    }
    
    res.json({
      message: 'Financial close completed successfully',
      plant
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST set commercial operation date (COD)
router.post('/:id/commercial-operation', async (req, res) => {
  try {
    const { plantId, codDate } = req.body;
    
    // Update plant with commercial operation date
    const plant = await PowerPlant.findByIdAndUpdate(
      plantId,
      {
        commercialOperationDate: codDate,
        projectPhase: 'CommercialOperation'
      },
      { new: true }
    );
    
    if (!plant) {
      return res.status(404).json({ error: 'Power plant not found' });
    }
    
    // Update IPP status if needed
    const ippPlants = await PowerPlant.find({ ipp: plant.ipp });
    const operationalPlants = ippPlants.filter(p => p.projectPhase === 'CommercialOperation');
    
    if (operationalPlants.length > 0) {
      await IPP.findByIdAndUpdate(plant.ipp, { status: 'Active' });
    }
    
    res.json({
      message: 'Commercial operation declared successfully',
      plant
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET IPP projects summary
router.get('/:id/projects-summary', async (req, res) => {
  try {
    const ipp = await IPP.findById(req.params.id);
    if (!ipp) {
      return res.status(404).json({ error: 'IPP not found' });
    }
    
    const plants = await PowerPlant.find({ ipp: req.params.id });
    
    // Calculate summary statistics
    const totalCapacity = plants.reduce((sum, plant) => sum + (plant.capacity?.value || 0), 0);
    const plantsByTechnology = {};
    const plantsByPhase = {};
    
    plants.forEach(plant => {
      // Count by technology
      if (plant.technologyType) {
        plantsByTechnology[plant.technologyType] = (plantsByTechnology[plant.technologyType] || 0) + 1;
      }
      
      // Count by phase
      if (plant.projectPhase) {
        plantsByPhase[plant.projectPhase] = (plantsByPhase[plant.projectPhase] || 0) + 1;
      }
    });
    
    res.json({
      ippId: ipp.ippId,
      companyName: ipp.companyName,
      totalProjects: plants.length,
      totalCapacity,
      capacityUnit: 'MW',
      projectsByTechnology: plantsByTechnology,
      projectsByPhase: plantsByPhase
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;