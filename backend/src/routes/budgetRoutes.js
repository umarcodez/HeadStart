/**
 * Budget Routes
 * 
 * Routes for budget management, expense tracking, and financial reporting
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const budgetController = require('../controllers/budgetController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/multerConfig');

/**
 * Budget Category Routes
 */
// @route   GET /api/budget/categories
// @desc    Get all budget categories for user
// @access  Private
router.get('/categories', authenticate, budgetController.getBudgetCategories);

// @route   POST /api/budget/categories
// @desc    Create a budget category
// @access  Private
router.post(
  '/categories',
  [
    authenticate,
    [
      check('name', 'Category name is required').not().isEmpty(),
      check('type', 'Category type must be income or expense').isIn(['income', 'expense'])
    ]
  ],
  budgetController.createBudgetCategory
);

// @route   PUT /api/budget/categories/:id
// @desc    Update a budget category
// @access  Private
router.put(
  '/categories/:id',
  [
    authenticate,
    [
      check('name', 'Category name is required').not().isEmpty()
    ]
  ],
  budgetController.updateBudgetCategory
);

// @route   DELETE /api/budget/categories/:id
// @desc    Delete a budget category
// @access  Private
router.delete('/categories/:id', authenticate, budgetController.deleteBudgetCategory);

/**
 * Budget Routes
 */
// @route   GET /api/budget
// @desc    Get all budgets for user
// @access  Private
router.get('/', authenticate, budgetController.getUserBudgets);

// @route   POST /api/budget
// @desc    Create a budget
// @access  Private
router.post(
  '/',
  [
    authenticate,
    [
      check('title', 'Budget title is required').not().isEmpty(),
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty()
    ]
  ],
  budgetController.createBudget
);

// @route   GET /api/budget/:id
// @desc    Get budget details
// @access  Private
router.get('/:id', authenticate, budgetController.getBudgetDetails);

// @route   PUT /api/budget/:id
// @desc    Update a budget
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    [
      check('title', 'Budget title is required').not().isEmpty(),
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty()
    ]
  ],
  budgetController.updateBudget
);

// @route   POST /api/budget/:id/items
// @desc    Add a budget item
// @access  Private
router.post(
  '/:id/items',
  [
    authenticate,
    [
      check('categoryId', 'Category ID is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric()
    ]
  ],
  budgetController.addBudgetItem
);

// @route   PUT /api/budget/items/:itemId
// @desc    Update a budget item
// @access  Private
router.put(
  '/items/:itemId',
  [
    authenticate,
    [
      check('amount', 'Amount is required').isNumeric()
    ]
  ],
  budgetController.updateBudgetItem
);

// @route   DELETE /api/budget/items/:itemId
// @desc    Delete a budget item
// @access  Private
router.delete('/items/:itemId', authenticate, budgetController.deleteBudgetItem);

// @route   GET /api/budget/:id/report
// @desc    Get budget vs actual report
// @access  Private
router.get('/:id/report', authenticate, budgetController.getBudgetVsActualReport);

/**
 * Expense Routes
 */
// @route   POST /api/budget/expenses
// @desc    Record an expense
// @access  Private
router.post(
  '/expenses',
  [
    authenticate,
    upload.single('receipt'), // Handle file uploads
    [
      check('categoryId', 'Category ID is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('expenseDate', 'Expense date is required').not().isEmpty()
    ]
  ],
  budgetController.recordExpense
);

// @route   GET /api/budget/expenses
// @desc    Get user expenses
// @access  Private
router.get('/expenses', authenticate, budgetController.getUserExpenses);

// @route   GET /api/budget/expenses/summary
// @desc    Get expense summary by category
// @access  Private
router.get('/expenses/summary', authenticate, budgetController.getExpenseSummaryByCategory);

// @route   GET /api/budget/expenses/monthly
// @desc    Get monthly expense summary
// @access  Private
router.get('/expenses/monthly', authenticate, budgetController.getMonthlyExpenseSummary);

/**
 * Income Routes
 */
// @route   POST /api/budget/income
// @desc    Record income
// @access  Private
router.post(
  '/income',
  [
    authenticate,
    [
      check('categoryId', 'Category ID is required').not().isEmpty(),
      check('amount', 'Amount is required').isNumeric(),
      check('incomeDate', 'Income date is required').not().isEmpty()
    ]
  ],
  budgetController.recordIncome
);

// @route   GET /api/budget/income
// @desc    Get user income
// @access  Private
router.get('/income', authenticate, budgetController.getUserIncome);

// @route   GET /api/budget/income/summary
// @desc    Get income summary by category
// @access  Private
router.get('/income/summary', authenticate, budgetController.getIncomeSummaryByCategory);

// @route   GET /api/budget/income/monthly
// @desc    Get monthly income summary
// @access  Private
router.get('/income/monthly', authenticate, budgetController.getMonthlyIncomeSummary);

/**
 * Financial Analysis Routes
 */
// @route   GET /api/budget/analysis/cashflow
// @desc    Get cash flow analysis
// @access  Private
router.get('/analysis/cashflow', authenticate, budgetController.getCashFlowAnalysis);

// @route   GET /api/budget/analysis/kpis
// @desc    Get financial KPIs
// @access  Private
router.get('/analysis/kpis', authenticate, budgetController.getFinancialKPIs);

// @route   GET /api/budget/analysis/forecast
// @desc    Get expense forecast
// @access  Private
router.get('/analysis/forecast', authenticate, budgetController.getExpenseForecast);

module.exports = router; 
 