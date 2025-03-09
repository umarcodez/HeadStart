/**
 * Financial Model Service
 * 
 * Handles financial modeling, calculations, and projections
 */
const { query } = require('../config/db');

/**
 * Create a new financial model
 */
const createFinancialModel = async (userId, modelData) => {
  const {
    planId,
    title,
    description,
    type,
    data,
    assumptions
  } = modelData;
  
  if (!title || !type) {
    throw new Error('Title and type are required');
  }
  
  // Insert model
  const result = await query(
    `INSERT INTO financial_models 
      (user_id, plan_id, title, description, type, data, assumptions) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      planId || null,
      title,
      description || '',
      type,
      JSON.stringify(data || {}),
      JSON.stringify(assumptions || {})
    ]
  );
  
  return {
    success: true,
    message: 'Financial model created successfully',
    modelId: result.insertId
  };
};

/**
 * Get all financial models for a user
 */
const getUserFinancialModels = async (userId, planId = null) => {
  let query;
  let params;
  
  if (planId) {
    query = `
      SELECT id, plan_id, title, description, type, created_at, updated_at 
      FROM financial_models 
      WHERE user_id = ? AND plan_id = ? 
      ORDER BY updated_at DESC
    `;
    params = [userId, planId];
  } else {
    query = `
      SELECT id, plan_id, title, description, type, created_at, updated_at 
      FROM financial_models 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `;
    params = [userId];
  }
  
  const models = await query(query, params);
  
  return models;
};

/**
 * Get financial model details
 */
const getFinancialModelDetails = async (modelId, userId) => {
  const models = await query(
    `SELECT * FROM financial_models WHERE id = ? AND user_id = ?`,
    [modelId, userId]
  );
  
  if (!models.length) {
    throw new Error('Financial model not found or you do not have permission to access it');
  }
  
  const model = models[0];
  
  // Parse JSON data
  if (model.data) {
    model.data = JSON.parse(model.data);
  }
  
  if (model.assumptions) {
    model.assumptions = JSON.parse(model.assumptions);
  }
  
  return model;
};

/**
 * Update financial model
 */
const updateFinancialModel = async (modelId, userId, modelData) => {
  const {
    title,
    description,
    data,
    assumptions
  } = modelData;
  
  // Check if model exists and belongs to user
  const models = await query(
    'SELECT id FROM financial_models WHERE id = ? AND user_id = ?',
    [modelId, userId]
  );
  
  if (!models.length) {
    throw new Error('Financial model not found or you do not have permission to update it');
  }
  
  // Update model
  await query(
    `UPDATE financial_models 
     SET title = ?, description = ?, data = ?, assumptions = ?, updated_at = NOW() 
     WHERE id = ?`,
    [
      title,
      description || '',
      JSON.stringify(data || {}),
      JSON.stringify(assumptions || {}),
      modelId
    ]
  );
  
  return {
    success: true,
    message: 'Financial model updated successfully'
  };
};

/**
 * Delete financial model
 */
const deleteFinancialModel = async (modelId, userId) => {
  // Check if model exists and belongs to user
  const models = await query(
    'SELECT id FROM financial_models WHERE id = ? AND user_id = ?',
    [modelId, userId]
  );
  
  if (!models.length) {
    throw new Error('Financial model not found or you do not have permission to delete it');
  }
  
  // Delete model
  await query(
    'DELETE FROM financial_models WHERE id = ?',
    [modelId]
  );
  
  return {
    success: true,
    message: 'Financial model deleted successfully'
  };
};

/**
 * Generate revenue projection
 * 
 * This is a simplified example. In production, this would use more sophisticated algorithms
 * or integrate with external APIs for financial modeling.
 */
const generateRevenueProjection = async (projectionData) => {
  const {
    initialRevenue,
    growthRate,
    timeframe,
    seasonality = false,
    uncertaintyFactor = 0.1
  } = projectionData;
  
  if (!initialRevenue || !growthRate || !timeframe) {
    throw new Error('Initial revenue, growth rate, and timeframe are required');
  }
  
  const projectionMonths = timeframe * 12;
  const monthlyGrowthRate = Math.pow(1 + growthRate, 1 / 12) - 1;
  
  const projection = [];
  let currentRevenue = initialRevenue;
  
  // Seasonal factors (simplified)
  const seasonalFactors = [
    1.0,  // January
    0.9,  // February
    1.1,  // March
    1.15, // April
    1.2,  // May
    1.1,  // June
    1.0,  // July
    0.9,  // August
    1.1,  // September
    1.2,  // October
    1.3,  // November (holiday season)
    1.4   // December (holiday season)
  ];
  
  for (let month = 1; month <= projectionMonths; month++) {
    const growthFactor = 1 + monthlyGrowthRate;
    
    // Add seasonal variation if enabled
    let seasonalAdjustment = 1;
    if (seasonality) {
      const monthIndex = (month - 1) % 12;
      seasonalAdjustment = seasonalFactors[monthIndex];
    }
    
    // Add some randomness for uncertainty
    const randomFactor = 1 + (Math.random() * 2 - 1) * uncertaintyFactor;
    
    // Calculate revenue for this month
    currentRevenue = currentRevenue * growthFactor * seasonalAdjustment * randomFactor;
    
    // Year and month for this projection point
    const year = Math.floor((month - 1) / 12) + 1;
    const monthOfYear = ((month - 1) % 12) + 1;
    
    projection.push({
      month,
      year,
      monthName: getMonthName(monthOfYear),
      revenue: Math.round(currentRevenue * 100) / 100
    });
  }
  
  return {
    projection,
    summary: {
      initialRevenue,
      finalRevenue: projection[projection.length - 1].revenue,
      totalRevenue: projection.reduce((sum, month) => sum + month.revenue, 0),
      cagr: growthRate
    }
  };
};

/**
 * Generate expense projection
 */
const generateExpenseProjection = async (projectionData) => {
  const {
    initialExpenses,
    growthRate,
    fixedCosts,
    variableCostsPercent,
    timeframe,
    revenueProjection
  } = projectionData;
  
  if (!initialExpenses || !timeframe) {
    throw new Error('Initial expenses and timeframe are required');
  }
  
  const projectionMonths = timeframe * 12;
  const monthlyGrowthRate = growthRate ? Math.pow(1 + growthRate, 1 / 12) - 1 : 0;
  
  const projection = [];
  let baseExpenses = initialExpenses;
  
  for (let month = 1; month <= projectionMonths; month++) {
    // Calculate base expenses with growth
    baseExpenses = baseExpenses * (1 + monthlyGrowthRate);
    
    // Calculate variable costs based on revenue (if revenue projection provided)
    let variableCosts = 0;
    if (revenueProjection && variableCostsPercent) {
      const monthRevenue = revenueProjection.projection[month - 1]?.revenue || 0;
      variableCosts = monthRevenue * (variableCostsPercent / 100);
    }
    
    // Total expenses for this month
    const totalExpenses = baseExpenses + (fixedCosts || 0) + variableCosts;
    
    // Year and month for this projection point
    const year = Math.floor((month - 1) / 12) + 1;
    const monthOfYear = ((month - 1) % 12) + 1;
    
    projection.push({
      month,
      year,
      monthName: getMonthName(monthOfYear),
      expenses: Math.round(totalExpenses * 100) / 100,
      fixedCosts: fixedCosts || 0,
      variableCosts: Math.round(variableCosts * 100) / 100
    });
  }
  
  return {
    projection,
    summary: {
      initialExpenses,
      finalExpenses: projection[projection.length - 1].expenses,
      totalExpenses: projection.reduce((sum, month) => sum + month.expenses, 0)
    }
  };
};

/**
 * Generate cash flow projection
 */
const generateCashFlowProjection = async (projectionData) => {
  const {
    initialCash,
    revenueProjection,
    expenseProjection,
    investments = [],
    timeframe
  } = projectionData;
  
  if (initialCash === undefined || !timeframe) {
    throw new Error('Initial cash balance and timeframe are required');
  }
  
  const projectionMonths = timeframe * 12;
  
  const projection = [];
  let cashBalance = initialCash;
  
  for (let month = 1; month <= projectionMonths; month++) {
    // Get revenue and expense for this month
    const monthRevenue = revenueProjection?.projection[month - 1]?.revenue || 0;
    const monthExpenses = expenseProjection?.projection[month - 1]?.expenses || 0;
    
    // Calculate investment for this month
    const monthInvestment = investments.filter(inv => inv.month === month)
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    // Calculate cash flow for this month
    const cashFlow = monthRevenue - monthExpenses + monthInvestment;
    
    // Update cash balance
    cashBalance += cashFlow;
    
    // Year and month for this projection point
    const year = Math.floor((month - 1) / 12) + 1;
    const monthOfYear = ((month - 1) % 12) + 1;
    
    projection.push({
      month,
      year,
      monthName: getMonthName(monthOfYear),
      revenue: monthRevenue,
      expenses: monthExpenses,
      investment: monthInvestment,
      cashFlow,
      cashBalance: Math.round(cashBalance * 100) / 100
    });
  }
  
  return {
    projection,
    summary: {
      initialCash,
      finalCash: projection[projection.length - 1].cashBalance,
      totalRevenue: projection.reduce((sum, month) => sum + month.revenue, 0),
      totalExpenses: projection.reduce((sum, month) => sum + month.expenses, 0),
      totalInvestments: projection.reduce((sum, month) => sum + month.investment, 0),
      netCashFlow: projection.reduce((sum, month) => sum + month.cashFlow, 0)
    }
  };
};

/**
 * Generate break-even analysis
 */
const generateBreakEvenAnalysis = async (analysisData) => {
  const {
    fixedCosts,
    variableCostPerUnit,
    pricePerUnit,
    timeframe = 1
  } = analysisData;
  
  if (fixedCosts === undefined || variableCostPerUnit === undefined || pricePerUnit === undefined) {
    throw new Error('Fixed costs, variable cost per unit, and price per unit are required');
  }
  
  // Calculate contribution margin
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  
  if (contributionMargin <= 0) {
    throw new Error('Contribution margin must be positive to reach break-even');
  }
  
  // Calculate break-even point in units
  const breakEvenUnits = fixedCosts / contributionMargin;
  
  // Calculate break-even revenue
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;
  
  // Generate monthly projection
  const projectionMonths = timeframe * 12;
  const projection = [];
  
  // Assume linear sales growth to reach break-even at 2/3 of timeframe
  const targetMonth = Math.ceil(projectionMonths * 2 / 3);
  const unitsPerMonth = breakEvenUnits / targetMonth;
  
  for (let month = 1; month <= projectionMonths; month++) {
    const units = unitsPerMonth * month;
    const revenue = units * pricePerUnit;
    const variableCosts = units * variableCostPerUnit;
    const totalCosts = fixedCosts + variableCosts;
    const profit = revenue - totalCosts;
    
    // Year and month for this projection point
    const year = Math.floor((month - 1) / 12) + 1;
    const monthOfYear = ((month - 1) % 12) + 1;
    
    projection.push({
      month,
      year,
      monthName: getMonthName(monthOfYear),
      units: Math.round(units),
      revenue: Math.round(revenue * 100) / 100,
      fixedCosts,
      variableCosts: Math.round(variableCosts * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      breakEvenReached: units >= breakEvenUnits
    });
  }
  
  return {
    breakEvenUnits: Math.ceil(breakEvenUnits),
    breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
    contributionMargin,
    contributionMarginRatio: contributionMargin / pricePerUnit,
    projection,
    summary: {
      fixedCosts,
      variableCostPerUnit,
      pricePerUnit,
      breakEvenMonth: projection.findIndex(m => m.breakEvenReached) + 1
    }
  };
};

// Helper function to get month name
function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1];
}

module.exports = {
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