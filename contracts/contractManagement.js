const express = require('express');
const router = express.Router();
const Contract = require('../../data/models/Contract');
const Participant = require('../../data/models/Participant');

// GET all contracts
router.get('/', async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate('parties.participantId', 'name')
      .populate('signatures.participantId', 'name');
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET contract by ID
router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('parties.participantId', 'name')
      .populate('signatures.participantId', 'name');
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new contract
router.post('/', async (req, res) => {
  try {
    const contract = new Contract(req.body);
    await contract.save();
    res.status(201).json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update contract
router.put('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST sign contract digitally
router.post('/:id/sign', async (req, res) => {
  try {
    const { participantId, signature, publicKey } = req.body;
    
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Add signature to contract
    contract.signatures.push({
      participantId,
      signedAt: new Date(),
      signature,
      publicKey
    });
    
    // Update status if all parties have signed
    const requiredSignatures = contract.parties.length;
    const currentSignatures = contract.signatures.length;
    
    if (currentSignatures >= requiredSignatures) {
      contract.status = 'Signed';
    }
    
    await contract.save();
    
    res.json({
      message: 'Contract signed successfully',
      contract
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST deploy contract to blockchain
router.post('/:id/deploy', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // In a real implementation, this would interact with blockchain
    // For now, we'll simulate successful deployment
    contract.blockchain = {
      deployed: true,
      transactionHash: `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      contractAddress: `0x${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      network: 'ethereum-mainnet'
    };
    
    contract.status = 'Active';
    await contract.save();
    
    res.json({
      message: 'Contract deployed to blockchain successfully',
      contract
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;