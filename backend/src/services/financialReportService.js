/**
 * Financial Report Service
 * 
 * Handles generation of financial reports and KPIs
 */
const { query } = require('../config/db');

/**
 * Create a new financial report
 */
const createFinancialReport = async (userId, reportData) => {
  const { title, description, reportType, parameters, startDate, endDate } = reportData;
  
  if (!title || !reportType) {
    throw new Error('Report title and type are required');
  }
  
  // Create report record
  const result = await query(
    `INSERT INTO financial_reports 
     (user_id, title, description, report_type, parameters, start_date, end_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, 
      title, 
      description || '', 
      reportType, 
      parameters ? JSON.stringify(parameters) : '{}',
      startDate || null,
      endDate || null
    ]
  );
  
  return {
    success: true,
    message: 'Financial report created successfully',
    reportId: result.insertId
  };
};

/**
 * Get all financial reports for a user
 */
const getUserFinancialReports = async (userId) => {
  const reports = await query(
    `SELECT id, title, description, report_type, start_date, end_date, created_at 
     FROM financial_reports 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [userId]
  );
  
  return reports;
};

/**
 * Get a specific financial report
 */
const getFinancialReportDetails = async (reportId, userId) => {
  const reports = await query(
    `SELECT id, title, description, report_type, parameters, start_date, end_date, created_at 
     FROM financial_reports 
     WHERE id = ? AND user_id = ?`,
    [reportId, userId]
  );
  
  if (!reports.length) {
    throw new Error('Report not found or you do not have permission to access it');
  }
  
  const report = reports[0];
  
  // Parse the parameters JSON
  if (report.parameters) {
    try {
      report.parameters = JSON.parse(report.parameters);
    } catch (err) {
      report.parameters = {};
    }
  }
  
  return report;
};

/**
 * Delete a financial report
 */
const deleteFinancialReport = async (reportId, userId) => {
  // Check if report exists and belongs to user
  const reports = await query(
    'SELECT id FROM financial_reports WHERE id = ? AND user_id = ?',
    [reportId, userId]
  );
  
  if (!reports.length) {
    throw new Error('Report not found or you do not have permission to delete it');
  }
  
  // Delete report
  await query(
    'DELETE FROM financial_reports WHERE id = ?',
    [reportId]
  );
  
  return {
    success: true,
    message: 'Financial report deleted successfully'
  };
};

/**
 * Get cash flow analysis
 * Shows inflow, outflow, and net flow by period (day, week, month, year)
 */
const getCashFlowAnalysis = async (userId, { startDate, endDate, period = 'month' } = {}) => {
  if (!startDate || !endDate) {
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
  }
  
  // Define the period format
  let periodFormat;
  switch (period) {
    case 'day':
      periodFormat = '%Y-%m-%d';
      break;
    case 'week':
      periodFormat = '%Y-%u'; // ISO week number
      break;
    case 'month':
      periodFormat = '%Y-%m-01';
      break;
    case 'year':
      periodFormat = '%Y-01-01';
      break;
    default:
      periodFormat = '%Y-%m-01'; // Default to month
  }
  
  // Get income data
  const incomeData = await query(
    `SELECT 
       DATE_FORMAT(income_date, ?) as period,
       SUM(amount) as total_inflow
     FROM income_records
     WHERE user_id = ? AND income_date BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period`,
    [periodFormat, userId, startDate, endDate]
  );
  
  // Get expense data
  const expenseData = await query(
    `SELECT 
       DATE_FORMAT(expense_date, ?) as period,
       SUM(amount) as total_outflow
     FROM expenses
     WHERE user_id = ? AND expense_date BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period`,
    [periodFormat, userId, startDate, endDate]
  );
  
  // Create a map of all periods
  const periods = new Set();
  incomeData.forEach(item => periods.add(item.period));
  expenseData.forEach(item => periods.add(item.period));
  
  // Create maps for quick lookup
  const incomeMap = {};
  incomeData.forEach(item => {
    incomeMap[item.period] = parseFloat(item.total_inflow);
  });
  
  const expenseMap = {};
  expenseData.forEach(item => {
    expenseMap[item.period] = parseFloat(item.total_outflow);
  });
  
  // Generate the combined cash flow data
  const cashFlowData = Array.from(periods).sort().map(period => {
    const inflow = incomeMap[period] || 0;
    const outflow = expenseMap[period] || 0;
    const netFlow = inflow - outflow;
    
    return {
      period,
      inflow,
      outflow,
      netFlow
    };
  });
  
  // Calculate totals
  const totalInflow = cashFlowData.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = cashFlowData.reduce((sum, item) => sum + item.outflow, 0);
  const totalNetFlow = totalInflow - totalOutflow;
  
  return {
    cashFlow: cashFlowData,
    summary: {
      totalInflow,
      totalOutflow,
      totalNetFlow,
      averageInflow: totalInflow / cashFlowData.length,
      averageOutflow: totalOutflow / cashFlowData.length,
      averageNetFlow: totalNetFlow / cashFlowData.length
    }
  };
};

/**
 * Get financial KPIs
 */
const getFinancialKPIs = async (userId, { startDate, endDate } = {}) => {
  if (!startDate || !endDate) {
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
  }
  
  // Get total income
  const incomeResult = await query(
    `SELECT SUM(amount) as total_income
     FROM income_records
     WHERE user_id = ? AND income_date BETWEEN ? AND ?`,
    [userId, startDate, endDate]
  );
  
  // Get total expenses
  const expenseResult = await query(
    `SELECT SUM(amount) as total_expenses
     FROM expenses
     WHERE user_id = ? AND expense_date BETWEEN ? AND ?`,
    [userId, startDate, endDate]
  );
  
  // Get expense breakdown by category
  const expenseCategories = await query(
    `SELECT 
       bc.name as category_name,
       SUM(e.amount) as total_amount
     FROM expenses e
     JOIN budget_categories bc ON e.category_id = bc.id
     WHERE e.user_id = ? AND e.expense_date BETWEEN ? AND ?
     GROUP BY bc.id, bc.name
     ORDER BY total_amount DESC
     LIMIT 5`,
    [userId, startDate, endDate]
  );
  
  // Get income breakdown by category
  const incomeCategories = await query(
    `SELECT 
       bc.name as category_name,
       SUM(i.amount) as total_amount
     FROM income_records i
     JOIN budget_categories bc ON i.category_id = bc.id
     WHERE i.user_id = ? AND i.income_date BETWEEN ? AND ?
     GROUP BY bc.id, bc.name
     ORDER BY total_amount DESC
     LIMIT 5`,
    [userId, startDate, endDate]
  );
  
  // Calculate KPIs
  const totalIncome = parseFloat(incomeResult[0]?.total_income || 0);
  const totalExpenses = parseFloat(expenseResult[0]?.total_expenses || 0);
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;
  
  // Calculate month-over-month change
  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - (endDate.getMonth() - startDate.getMonth() + 1));
  const previousPeriodEnd = new Date(startDate);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
  
  // Previous period income
  const prevIncomeResult = await query(
    `SELECT SUM(amount) as total_income
     FROM income_records
     WHERE user_id = ? AND income_date BETWEEN ? AND ?`,
    [userId, previousPeriodStart, previousPeriodEnd]
  );
  
  // Previous period expenses
  const prevExpenseResult = await query(
    `SELECT SUM(amount) as total_expenses
     FROM expenses
     WHERE user_id = ? AND expense_date BETWEEN ? AND ?`,
    [userId, previousPeriodStart, previousPeriodEnd]
  );
  
  const prevTotalIncome = parseFloat(prevIncomeResult[0]?.total_income || 0);
  const prevTotalExpenses = parseFloat(prevExpenseResult[0]?.total_expenses || 0);
  const prevNetIncome = prevTotalIncome - prevTotalExpenses;
  
  // Calculate change percentages
  const incomeChange = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : null;
  const expenseChange = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : null;
  const netIncomeChange = prevNetIncome !== 0 ? ((netIncome - prevNetIncome) / Math.abs(prevNetIncome)) * 100 : null;
  
  return {
    currentPeriod: {
      startDate,
      endDate,
      totalIncome,
      totalExpenses,
      netIncome,
      savingsRate
    },
    previousPeriod: {
      startDate: previousPeriodStart,
      endDate: previousPeriodEnd,
      totalIncome: prevTotalIncome,
      totalExpenses: prevTotalExpenses,
      netIncome: prevNetIncome
    },
    changes: {
      incomeChange,
      expenseChange,
      netIncomeChange
    },
    topExpenseCategories: expenseCategories.map(cat => ({
      categoryName: cat.category_name,
      amount: parseFloat(cat.total_amount),
      percentage: totalExpenses > 0 ? (parseFloat(cat.total_amount) / totalExpenses) * 100 : 0
    })),
    topIncomeCategories: incomeCategories.map(cat => ({
      categoryName: cat.category_name,
      amount: parseFloat(cat.total_amount),
      percentage: totalIncome > 0 ? (parseFloat(cat.total_amount) / totalIncome) * 100 : 0
    }))
  };
};

/**
 * Get savings goals progress
 */
const getSavingsGoalsProgress = async (userId) => {
  // Get all active financial goals
  const goals = await query(
    `SELECT id, title, goal_type, target_amount, current_amount, start_date, target_date
     FROM financial_goals
     WHERE user_id = ? AND goal_type = 'savings' AND is_completed = 0
     ORDER BY target_date`,
    [userId]
  );
  
  if (!goals.length) {
    return { goals: [] };
  }
  
  // Calculate progress for each goal
  const goalsWithProgress = goals.map(goal => {
    const targetAmount = parseFloat(goal.target_amount);
    const currentAmount = parseFloat(goal.current_amount);
    const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    
    // Calculate time-based progress
    const startDate = new Date(goal.start_date);
    const targetDate = new Date(goal.target_date);
    const currentDate = new Date();
    
    const totalDays = Math.max(1, Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const timeProgressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    
    // Calculate daily savings required to meet goal
    const daysRemaining = Math.max(0, Math.floor((targetDate - currentDate) / (1000 * 60 * 60 * 24)));
    const amountRemaining = targetAmount - currentAmount;
    const dailySavingsRequired = daysRemaining > 0 ? amountRemaining / daysRemaining : 0;
    
    // Check if on track
    const isOnTrack = progressPercentage >= timeProgressPercentage;
    
    return {
      ...goal,
      progressPercentage,
      timeProgressPercentage,
      daysRemaining,
      amountRemaining,
      dailySavingsRequired,
      isOnTrack
    };
  });
  
  return { goals: goalsWithProgress };
};

/**
 * Get expense forecast
 * Uses simple linear regression to forecast future expenses
 */
const getExpenseForecast = async (userId, { months = 3 } = {}) => {
  // Get monthly expense data for the past 12 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 11);
  startDate.setDate(1);
  
  const monthlyExpenses = await query(
    `SELECT 
       DATE_FORMAT(expense_date, '%Y-%m-01') as month,
       SUM(amount) as total_amount
     FROM expenses
     WHERE user_id = ? AND expense_date BETWEEN ? AND ?
     GROUP BY month
     ORDER BY month`,
    [userId, startDate, endDate]
  );
  
  if (monthlyExpenses.length < 3) {
    throw new Error('Insufficient historical data for forecasting. Need at least 3 months of data.');
  }
  
  // Convert to array of values for regression
  const data = monthlyExpenses.map((item, index) => ({
    x: index,
    y: parseFloat(item.total_amount),
    month: item.month
  }));
  
  // Simple linear regression
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate forecast
  const forecast = [];
  const lastMonth = new Date(data[data.length - 1].month);
  
  for (let i = 1; i <= months; i++) {
    const forecastMonth = new Date(lastMonth);
    forecastMonth.setMonth(forecastMonth.getMonth() + i);
    const forecastValue = intercept + slope * (n + i - 1);
    
    forecast.push({
      month: forecastMonth.toISOString().slice(0, 10).replace(/-\d+$/, '-01'),
      forecastAmount: Math.max(0, forecastValue),
      isProjected: true
    });
  }
  
  // Combine historical and forecast data for chart
  const chartData = [
    ...data.map(item => ({
      month: item.month,
      amount: item.y,
      isProjected: false
    })),
    ...forecast
  ];
  
  return {
    historical: data.map(item => ({
      month: item.month,
      amount: item.y
    })),
    forecast,
    chartData,
    trend: {
      slope,
      intercept,
      direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      monthlyChangeRate: slope
    }
  };
};

module.exports = {
  createFinancialReport,
  getUserFinancialReports,
  getFinancialReportDetails,
  deleteFinancialReport,
  getCashFlowAnalysis,
  getFinancialKPIs,
  getSavingsGoalsProgress,
  getExpenseForecast
}; 