/**
 * Business Plan Routes
 * 
 * Routes for business plan management and financial modeling
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const businessPlanController = require('../controllers/businessPlanController');
const { authenticate } = require('../middleware/auth');

/**
 * Business Plan Template Routes
 */
// @route   GET /api/business-plan/templates
// @desc    Get all business plan templates
// @access  Private
router.get('/templates', authenticate, businessPlanController.getBusinessPlanTemplates);

// @route   GET /api/business-plan/templates/:id
// @desc    Get template details
// @access  Private
router.get('/templates/:id', authenticate, businessPlanController.getTemplateDetails);

/**
 * Business Plan Routes
 */
// @route   GET /api/business-plan
// @desc    Get user's business plans
// @access  Private
router.get('/', authenticate, businessPlanController.getUserBusinessPlans);

// @route   POST /api/business-plan
// @desc    Create a new business plan
// @access  Private
router.post(
  '/',
  [
    authenticate,
    [
      check('title', 'Title is required').not().isEmpty()
    ]
  ],
  businessPlanController.createBusinessPlan
);

// @route   GET /api/business-plan/:id
// @desc    Get business plan details
// @access  Private
router.get('/:id', authenticate, businessPlanController.getBusinessPlanDetails);

// @route   PUT /api/business-plan/:id
// @desc    Update business plan
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    [
      check('title', 'Title is required').not().isEmpty()
    ]
  ],
  businessPlanController.updateBusinessPlan
);

// @route   DELETE /api/business-plan/:id
// @desc    Delete business plan
// @access  Private
router.delete('/:id', authenticate, businessPlanController.deleteBusinessPlan);

/**
 * Business Plan Section Routes
 */
// @route   POST /api/business-plan/:id/sections
// @desc    Add a business plan section
// @access  Private
router.post(
  '/:id/sections',
  [
    authenticate,
    [
      check('title', 'Section title is required').not().isEmpty(),
      check('order', 'Section order is required').isNumeric()
    ]
  ],
  businessPlanController.addBusinessPlanSection
);

// @route   PUT /api/business-plan/sections/:sectionId
// @desc    Update business plan section
// @access  Private
router.put(
  '/sections/:sectionId',
  [
    authenticate,
    [
      check('title', 'Section title is required').not().isEmpty()
    ]
  ],
  businessPlanController.updateBusinessPlanSection
);

// @route   DELETE /api/business-plan/sections/:sectionId
// @desc    Delete business plan section
// @access  Private
router.delete('/sections/:sectionId', authenticate, businessPlanController.deleteBusinessPlanSection);

/**
 * Financial Model Routes
 */
// @route   GET /api/business-plan/models
// @desc    Get user's financial models
// @access  Private
router.get('/models', authenticate, businessPlanController.getUserFinancialModels);

// @route   POST /api/business-plan/models
// @desc    Create a financial model
// @access  Private
router.post(
  '/models',
  [
    authenticate,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('modelType', 'Model type is required').not().isEmpty()
    ]
  ],
  businessPlanController.createFinancialModel
);

// @route   GET /api/business-plan/models/:id
// @desc    Get financial model details
// @access  Private
router.get('/models/:id', authenticate, businessPlanController.getFinancialModelDetails);

// @route   PUT /api/business-plan/models/:id
// @desc    Update financial model
// @access  Private
router.put(
  '/models/:id',
  [
    authenticate,
    [
      check('title', 'Title is required').not().isEmpty()
    ]
  ],
  businessPlanController.updateFinancialModel
);

// @route   DELETE /api/business-plan/models/:id
// @desc    Delete financial model
// @access  Private
router.delete('/models/:id', authenticate, businessPlanController.deleteFinancialModel);

/**
 * Financial Projection Routes
 */
// @route   POST /api/business-plan/projections/revenue
// @desc    Generate revenue projection
// @access  Private
router.post(
  '/projections/revenue',
  [
    authenticate,
    [
      check('initialRevenue', 'Initial revenue is required').isNumeric(),
      check('growthRate', 'Growth rate is required').isNumeric(),
      check('timeframe', 'Timeframe is required').isNumeric()
    ]
  ],
  businessPlanController.generateRevenueProjection
);

// @route   POST /api/business-plan/projections/expenses
// @desc    Generate expense projection
// @access  Private
router.post(
  '/projections/expenses',
  [
    authenticate,
    [
      check('initialExpenses', 'Initial expenses is required').isNumeric(),
      check('growthRate', 'Growth rate is required').isNumeric(),
      check('timeframe', 'Timeframe is required').isNumeric()
    ]
  ],
  businessPlanController.generateExpenseProjection
);

// @route   POST /api/business-plan/projections/cashflow
// @desc    Generate cash flow projection
// @access  Private
router.post(
  '/projections/cashflow',
  [
    authenticate,
    [
      check('initialCash', 'Initial cash is required').isNumeric(),
      check('timeframe', 'Timeframe is required').isNumeric()
    ]
  ],
  businessPlanController.generateCashFlowProjection
);

// @route   POST /api/business-plan/analysis/breakeven
// @desc    Generate break-even analysis
// @access  Private
router.post(
  '/analysis/breakeven',
  [
    authenticate,
    [
      check('fixedCosts', 'Fixed costs are required').isNumeric(),
      check('variableCostPerUnit', 'Variable cost per unit is required').isNumeric(),
      check('pricePerUnit', 'Price per unit is required').isNumeric()
    ]
  ],
  businessPlanController.generateBreakEvenAnalysis
);

module.exports = router; 