/**
 * Contract Service
 * 
 * Handles contract creation, management, and payment processing
 */
const { query } = require('../config/db');

/**
 * Create a new contract
 */
const createContract = async (projectId, creatorId, contractData) => {
  const {
    freelancerId,
    clientId,
    title,
    description,
    contractType,
    amount,
    startDate,
    endDate,
    terms
  } = contractData;
  
  // Check if user has permission to create contract
  const projects = await query(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, creatorId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found or you do not have permission to create contracts');
  }
  
  // Check if freelancer is part of the project
  const teamMembers = await query(
    'SELECT * FROM team_members WHERE project_id = ? AND user_id = ?',
    [projectId, freelancerId]
  );
  
  if (!teamMembers.length) {
    throw new Error('Freelancer is not a member of this project');
  }
  
  // Create contract
  const result = await query(
    `INSERT INTO contracts 
      (project_id, freelancer_id, client_id, title, description, 
       contract_type, amount, start_date, end_date, status, terms) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [projectId, freelancerId, clientId, title, description, 
     contractType, amount, startDate, endDate, terms]
  );
  
  const contractId = result.insertId;
  
  // If milestone-based contract, add milestones
  if (contractType === 'milestone' && contractData.milestones && contractData.milestones.length > 0) {
    for (const milestone of contractData.milestones) {
      await query(
        `INSERT INTO contract_milestones 
          (contract_id, title, description, amount, due_date, status) 
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [contractId, milestone.title, milestone.description, 
         milestone.amount, milestone.dueDate]
      );
    }
  }
  
  return {
    success: true,
    message: 'Contract created successfully',
    contractId
  };
};

/**
 * Get contract details
 */
const getContractDetails = async (contractId, userId) => {
  // Get contract with related user info
  const contracts = await query(
    `SELECT c.*, 
            p.name as project_name,
            fc.first_name as freelancer_first_name, fc.last_name as freelancer_last_name,
            cc.first_name as client_first_name, cc.last_name as client_last_name
     FROM contracts c
     JOIN projects p ON c.project_id = p.id
     JOIN users fc ON c.freelancer_id = fc.id
     JOIN users cc ON c.client_id = cc.id
     WHERE c.id = ? AND (c.freelancer_id = ? OR c.client_id = ? OR p.owner_id = ?)`,
    [contractId, userId, userId, userId]
  );
  
  if (!contracts.length) {
    throw new Error('Contract not found or you do not have permission to view it');
  }
  
  const contract = contracts[0];
  
  // Get milestones if applicable
  if (contract.contract_type === 'milestone') {
    const milestones = await query(
      'SELECT * FROM contract_milestones WHERE contract_id = ? ORDER BY due_date',
      [contractId]
    );
    
    contract.milestones = milestones;
  }
  
  // Get payments
  const payments = await query(
    'SELECT * FROM payments WHERE contract_id = ? ORDER BY created_at DESC',
    [contractId]
  );
  
  contract.payments = payments;
  
  return contract;
};

/**
 * Update contract status
 */
const updateContractStatus = async (contractId, userId, status) => {
  // Check if user has permission to update contract
  const contracts = await query(
    `SELECT c.*, p.owner_id
     FROM contracts c
     JOIN projects p ON c.project_id = p.id
     WHERE c.id = ? AND (c.freelancer_id = ? OR c.client_id = ? OR p.owner_id = ?)`,
    [contractId, userId, userId, userId]
  );
  
  if (!contracts.length) {
    throw new Error('Contract not found or you do not have permission to update it');
  }
  
  const contract = contracts[0];
  
  // Update contract status
  await query(
    'UPDATE contracts SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, contractId]
  );
  
  return {
    success: true,
    message: `Contract status updated to ${status}`
  };
};

/**
 * Add milestone to contract
 */
const addMilestone = async (contractId, userId, milestoneData) => {
  // Check if user has permission
  const contracts = await query(
    `SELECT c.*, p.owner_id
     FROM contracts c
     JOIN projects p ON c.project_id = p.id
     WHERE c.id = ? AND (c.client_id = ? OR p.owner_id = ?)`,
    [contractId, userId, userId]
  );
  
  if (!contracts.length) {
    throw new Error('Contract not found or you do not have permission to add milestones');
  }
  
  const contract = contracts[0];
  
  // Check if contract is milestone-based
  if (contract.contract_type !== 'milestone') {
    throw new Error('Can only add milestones to milestone-based contracts');
  }
  
  // Add milestone
  const {
    title,
    description,
    amount,
    dueDate
  } = milestoneData;
  
  await query(
    `INSERT INTO contract_milestones 
      (contract_id, title, description, amount, due_date, status) 
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [contractId, title, description, amount, dueDate]
  );
  
  return {
    success: true,
    message: 'Milestone added successfully'
  };
};

/**
 * Update milestone status
 */
const updateMilestoneStatus = async (milestoneId, userId, status) => {
  // Check if user has permission
  const milestones = await query(
    `SELECT cm.*, c.freelancer_id, c.client_id, p.owner_id
     FROM contract_milestones cm
     JOIN contracts c ON cm.contract_id = c.id
     JOIN projects p ON c.project_id = p.id
     WHERE cm.id = ?`,
    [milestoneId]
  );
  
  if (!milestones.length) {
    throw new Error('Milestone not found');
  }
  
  const milestone = milestones[0];
  
  // Check permissions based on status change
  if ((status === 'submitted' && milestone.freelancer_id !== userId) ||
      ((status === 'approved' || status === 'rejected') && 
       milestone.client_id !== userId && milestone.owner_id !== userId)) {
    throw new Error('You do not have permission to update this milestone status');
  }
  
  // Update milestone status
  await query(
    'UPDATE contract_milestones SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, milestoneId]
  );
  
  return {
    success: true,
    message: `Milestone status updated to ${status}`
  };
};

/**
 * Process payment
 * In a production environment, this would integrate with Stripe or other payment processor
 */
const processPayment = async (contractId, userId, paymentData) => {
  // Check if user has permission (client or project owner)
  const contracts = await query(
    `SELECT c.*, p.owner_id
     FROM contracts c
     JOIN projects p ON c.project_id = p.id
     WHERE c.id = ? AND (c.client_id = ? OR p.owner_id = ?)`,
    [contractId, userId, userId]
  );
  
  if (!contracts.length) {
    throw new Error('Contract not found or you do not have permission to process payments');
  }
  
  const contract = contracts[0];
  
  const {
    amount,
    milestoneId,
    paymentMethod
  } = paymentData;
  
  // In a real application, we would call the payment processor API here
  // For now, we'll simulate a successful payment
  
  // Record payment
  const result = await query(
    `INSERT INTO payments 
      (contract_id, milestone_id, amount, payment_date, payment_method, status) 
     VALUES (?, ?, ?, NOW(), ?, 'completed')`,
    [contractId, milestoneId, amount, paymentMethod]
  );
  
  // If milestone payment, update milestone status
  if (milestoneId) {
    await query(
      'UPDATE contract_milestones SET status = "paid", updated_at = NOW() WHERE id = ?',
      [milestoneId]
    );
  }
  
  // If full contract payment, update contract status
  if (!milestoneId || contract.contract_type === 'fixed_price') {
    await query(
      'UPDATE contracts SET status = "completed", updated_at = NOW() WHERE id = ?',
      [contractId]
    );
  }
  
  return {
    success: true,
    message: 'Payment processed successfully',
    paymentId: result.insertId,
    // In a real implementation, we would include transaction IDs from the payment processor
    transactionId: `mock-transaction-${Date.now()}`
  };
};

/**
 * Get user contracts (as freelancer or client)
 */
const getUserContracts = async (userId) => {
  const contracts = await query(
    `SELECT c.*, 
            p.name as project_name,
            fc.first_name as freelancer_first_name, fc.last_name as freelancer_last_name,
            cc.first_name as client_first_name, cc.last_name as client_last_name
     FROM contracts c
     JOIN projects p ON c.project_id = p.id
     JOIN users fc ON c.freelancer_id = fc.id
     JOIN users cc ON c.client_id = cc.id
     WHERE c.freelancer_id = ? OR c.client_id = ? OR p.owner_id = ?
     ORDER BY c.updated_at DESC`,
    [userId, userId, userId]
  );
  
  return contracts;
};

module.exports = {
  createContract,
  getContractDetails,
  updateContractStatus,
  addMilestone,
  updateMilestoneStatus,
  processPayment,
  getUserContracts
}; 