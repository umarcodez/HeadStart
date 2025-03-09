const {
  createContract,
  getContractDetails,
  updateContractStatus,
  addMilestone,
  updateMilestoneStatus,
  processPayment,
  getUserContracts
} = require('../services/contractService');

const { hasPermission } = require('../services/permissionService');

/**
 * Create a new contract
 */
const createNewContract = async (req, res) => {
  try {
    const { projectId } = req.params;
    const contractData = req.body;
    
    if (!projectId || !contractData.freelancerId || !contractData.clientId || 
        !contractData.title || !contractData.contractType || !contractData.amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required contract fields'
      });
    }
    
    // Check if user has permission to manage contracts
    const canManageContracts = await hasPermission(req.user.uid, 'manage_contracts', projectId);
    
    if (!canManageContracts) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create contracts for this project'
      });
    }
    
    // Create contract
    const result = await createContract(projectId, req.user.uid, contractData);
    
    res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      contractId: result.contractId
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    
    if (error.message.includes('not found or you do not have permission') ||
        error.message.includes('not a member of this project')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating contract',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contract details
 */
const getContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: 'Contract ID is required'
      });
    }
    
    // Get contract details
    const contract = await getContractDetails(contractId, req.user.uid);
    
    res.status(200).json({
      success: true,
      contract
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching contract details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update contract status
 */
const updateContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { status } = req.body;
    
    if (!contractId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Contract ID and status are required'
      });
    }
    
    // Update contract status
    const result = await updateContractStatus(contractId, req.user.uid, status);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating contract',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add milestone to contract
 */
const addMilestoneToContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const milestoneData = req.body;
    
    if (!contractId || !milestoneData.title || !milestoneData.amount || !milestoneData.dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required milestone fields'
      });
    }
    
    // Add milestone
    const result = await addMilestone(contractId, req.user.uid, milestoneData);
    
    res.status(201).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error adding milestone:', error);
    
    if (error.message.includes('not found or you do not have permission') ||
        error.message.includes('Can only add milestones to milestone-based contracts')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding milestone',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update milestone status
 */
const updateMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { status } = req.body;
    
    if (!milestoneId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Milestone ID and status are required'
      });
    }
    
    // Update milestone status
    const result = await updateMilestoneStatus(milestoneId, req.user.uid, status);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    
    if (error.message.includes('not found') ||
        error.message.includes('do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating milestone',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process a payment
 */
const processContractPayment = async (req, res) => {
  try {
    const { contractId } = req.params;
    const paymentData = req.body;
    
    if (!contractId || !paymentData.amount || !paymentData.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields'
      });
    }
    
    // Check if user has permission to process payments
    const canProcessPayments = await hasPermission(req.user.uid, 'process_payments');
    
    if (!canProcessPayments) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to process payments'
      });
    }
    
    // Process payment
    const result = await processPayment(contractId, req.user.uid, paymentData);
    
    res.status(200).json({
      success: true,
      message: result.message,
      paymentId: result.paymentId,
      transactionId: result.transactionId
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's contracts (as freelancer or client)
 */
const getMyContracts = async (req, res) => {
  try {
    // Get contracts
    const contracts = await getUserContracts(req.user.uid);
    
    res.status(200).json({
      success: true,
      contracts
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contracts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createNewContract,
  getContract,
  updateContract,
  addMilestoneToContract,
  updateMilestone,
  processContractPayment,
  getMyContracts
}; 