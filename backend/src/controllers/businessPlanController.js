/**
 * Business Plan Controller
 * 
 * Handles all business plan and financial model routes
 */
const businessPlanService = require('../services/businessPlanService');
const financialModelService = require('../services/financialModelService');
const { validationResult } = require('express-validator');

/**
 * Get all business plan templates
 */
const getBusinessPlanTemplates = async (req, res) => {
  try {
    const templates = await businessPlanService.getBusinessPlanTemplates();
    
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get template details
 */
const getTemplateDetails = async (req, res) => {
  try {
    const templateId = req.params.id;
    
    const template = await businessPlanService.getTemplateDetails(templateId);
    
    res.json({ template });
  } catch (error) {
    if (error.message.includes('Template not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new business plan
 */
const createBusinessPlan = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const result = await businessPlanService.createBusinessPlan(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Template not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user's business plans
 */
const getUserBusinessPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const plans = await businessPlanService.getUserBusinessPlans(userId);
    
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get business plan details
 */
const getBusinessPlanDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const planId = req.params.id;
    
    const plan = await businessPlanService.getBusinessPlanDetails(planId, userId);
    
    res.json({ plan });
  } catch (error) {
    if (error.message.includes('Business plan not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update business plan
 */
const updateBusinessPlan = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const planId = req.params.id;
    
    const result = await businessPlanService.updateBusinessPlan(planId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Business plan not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update business plan section
 */
const updateBusinessPlanSection = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const sectionId = req.params.sectionId;
    
    const result = await businessPlanService.updateBusinessPlanSection(sectionId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Section not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add business plan section
 */
const addBusinessPlanSection = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const planId = req.params.id;
    
    const result = await businessPlanService.addBusinessPlanSection(planId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Business plan not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete business plan section
 */
const deleteBusinessPlanSection = async (req, res) => {
  try {
    const userId = req.user.id;
    const sectionId = req.params.sectionId;
    
    const result = await businessPlanService.deleteBusinessPlanSection(sectionId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Section not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete business plan
 */
const deleteBusinessPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const planId = req.params.id;
    
    const result = await businessPlanService.deleteBusinessPlan(planId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Business plan not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a financial model
 */
const createFinancialModel = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    
    const result = await financialModelService.createFinancialModel(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user's financial models
 */
const getUserFinancialModels = async (req, res) => {
  try {
    const userId = req.user.id;
    const planId = req.query.planId;
    
    const models = await financialModelService.getUserFinancialModels(userId, planId);
    
    res.json({ models });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get financial model details
 */
const getFinancialModelDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const modelId = req.params.id;
    
    const model = await financialModelService.getFinancialModelDetails(modelId, userId);
    
    res.json({ model });
  } catch (error) {
    if (error.message.includes('Financial model not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update financial model
 */
const updateFinancialModel = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const modelId = req.params.id;
    
    const result = await financialModelService.updateFinancialModel(modelId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Financial model not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete financial model
 */
const deleteFinancialModel = async (req, res) => {
  try {
    const userId = req.user.id;
    const modelId = req.params.id;
    
    const result = await financialModelService.deleteFinancialModel(modelId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Financial model not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate revenue projection
 */
const generateRevenueProjection = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await financialModelService.generateRevenueProjection(req.body);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate expense projection
 */
const generateExpenseProjection = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await financialModelService.generateExpenseProjection(req.body);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate cash flow projection
 */
const generateCashFlowProjection = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await financialModelService.generateCashFlowProjection(req.body);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generate break-even analysis
 */
const generateBreakEvenAnalysis = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await financialModelService.generateBreakEvenAnalysis(req.body);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBusinessPlanTemplates,
  getTemplateDetails,
  createBusinessPlan,
  getUserBusinessPlans,
  getBusinessPlanDetails,
  updateBusinessPlan,
  updateBusinessPlanSection,
  addBusinessPlanSection,
  deleteBusinessPlanSection,
  deleteBusinessPlan,
  createFinancialModel,
  getUserFinancialModels,
  getFinancialModelDetails,
  updateFinancialModel,
  deleteFinancialModel,
  generateRevenueProjection,
  generateExpenseProjection,
  generateCashFlowProjection,
  generateBreakEvenAnalysis
}; 