/**
 * Budget Controller
 * 
 * Handles all budget, expense tracking, and financial reporting API routes
 */
const budgetService = require('../services/budgetService');
const financialReportService = require('../services/financialReportService');
const { validationResult } = require('express-validator');

/**
 * Get budget categories
 */
const getBudgetCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const type = req.query.type; // income or expense
    
    const categories = await budgetService.getBudgetCategories(userId, type);
    
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a budget category
 */
const createBudgetCategory = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const result = await budgetService.createBudgetCategory(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a budget category
 */
const updateBudgetCategory = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const categoryId = req.params.id;
    
    const result = await budgetService.updateBudgetCategory(categoryId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a budget category
 */
const deleteBudgetCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    
    const result = await budgetService.deleteBudgetCategory(categoryId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Cannot delete category')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a budget
 */
const createBudget = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const result = await budgetService.createBudget(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all budgets for a user
 */
const getUserBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const budgets = await budgetService.getUserBudgets(userId);
    
    res.json({ budgets });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get budget details
 */
const getBudgetDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;
    
    const budget = await budgetService.getBudgetDetails(budgetId, userId);
    
    res.json({ budget });
  } catch (error) {
    if (error.message.includes('Budget not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a budget
 */
const updateBudget = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const budgetId = req.params.id;
    
    const result = await budgetService.updateBudget(budgetId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Budget not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add a budget item
 */
const addBudgetItem = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const budgetId = req.params.id;
    
    const result = await budgetService.addBudgetItem(budgetId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Budget not found') || error.message.includes('Category not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a budget item
 */
const updateBudgetItem = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const itemId = req.params.itemId;
    
    const result = await budgetService.updateBudgetItem(itemId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Budget item not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a budget item
 */
const deleteBudgetItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;
    
    const result = await budgetService.deleteBudgetItem(itemId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Budget item not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Record an expense
 */
const recordExpense = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    
    // Handle file upload if present
    let receiptImage = null;
    if (req.file) {
      receiptImage = req.file.filename;
    }
    
    const expenseData = {
      ...req.body,
      receiptImage
    };
    
    const result = await budgetService.recordExpense(userId, expenseData);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Category not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Record income
 */
const recordIncome = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    
    const result = await budgetService.recordIncome(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('Category not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user expenses
 */
const getUserExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, categoryId, limit } = req.query;
    
    const expenses = await budgetService.getUserExpenses(userId, {
      startDate,
      endDate,
      categoryId,
      limit
    });
    
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user income
 */
const getUserIncome = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, categoryId, limit } = req.query;
    
    const income = await budgetService.getUserIncome(userId, {
      startDate,
      endDate,
      categoryId,
      limit
    });
    
    res.json({ income });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get expense summary by category
 */
const getExpenseSummaryByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const summary = await budgetService.getExpenseSummaryByCategory(userId, {
      startDate,
      endDate
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get income summary by category
 */
const getIncomeSummaryByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const summary = await budgetService.getIncomeSummaryByCategory(userId, {
      startDate,
      endDate
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get monthly expense summary
 */
const getMonthlyExpenseSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const summary = await budgetService.getMonthlyExpenseSummary(userId, {
      startDate,
      endDate
    });
    
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get monthly income summary
 */
const getMonthlyIncomeSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const summary = await budgetService.getMonthlyIncomeSummary(userId, {
      startDate,
      endDate
    });
    
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get budget vs actual report
 */
const getBudgetVsActualReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;
    
    const report = await budgetService.getBudgetVsActualReport(userId, budgetId);
    
    res.json(report);
  } catch (error) {
    if (error.message.includes('Budget not found')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get cash flow analysis
 */
const getCashFlowAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, period } = req.query;
    
    const analysis = await financialReportService.getCashFlowAnalysis(userId, {
      startDate,
      endDate,
      period
    });
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get financial KPIs
 */
const getFinancialKPIs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const kpis = await financialReportService.getFinancialKPIs(userId, {
      startDate,
      endDate
    });
    
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get expense forecast
 */
const getExpenseForecast = async (req, res) => {
  try {
    const userId = req.user.id;
    const months = req.query.months ? parseInt(req.query.months) : 3;
    
    const forecast = await financialReportService.getExpenseForecast(userId, {
      months
    });
    
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  createBudget,
  getUserBudgets,
  getBudgetDetails,
  updateBudget,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  recordExpense,
  recordIncome,
  getUserExpenses,
  getUserIncome,
  getExpenseSummaryByCategory,
  getIncomeSummaryByCategory,
  getMonthlyExpenseSummary,
  getMonthlyIncomeSummary,
  getBudgetVsActualReport,
  getCashFlowAnalysis,
  getFinancialKPIs,
  getExpenseForecast
}; 