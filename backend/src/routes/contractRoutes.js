const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Contract routes
router.post('/projects/:projectId/contracts', contractController.createNewContract);
router.get('/contracts/:contractId', contractController.getContract);
router.put('/contracts/:contractId', contractController.updateContract);

// Milestone routes
router.post('/contracts/:contractId/milestones', contractController.addMilestoneToContract);
router.put('/milestones/:milestoneId', contractController.updateMilestone);

// Payment routes
router.post('/contracts/:contractId/payments', contractController.processContractPayment);

// User contracts
router.get('/my-contracts', contractController.getMyContracts);

module.exports = router; 