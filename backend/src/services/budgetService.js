/**
 * Budget Service
 * 
 * Handles budget management, expense tracking, and financial reporting
 */
const { query } = require('../config/db');

/**
 * Get all budget categories for a user
 */
const getBudgetCategories = async (userId, type = null) => {
  let sql = 'SELECT * FROM budget_categories WHERE user_id = ?';
  const params = [userId];
  
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  
  sql += ' ORDER BY name';
  
  const categories = await query(sql, params);
  
  return categories;
};

/**
 * Create a new budget category
 */
const createBudgetCategory = async (userId, categoryData) => {
  const { name, description, type, color, icon } = categoryData;
  
  if (!name || !type) {
    throw new Error('Category name and type are required');
  }
  
  // Check if category already exists
  const existingCategories = await query(
    'SELECT id FROM budget_categories WHERE user_id = ? AND name = ? AND type = ?',
    [userId, name, type]
  );
  
  if (existingCategories.length > 0) {
    throw new Error(`A ${type} category with this name already exists`);
  }
  
  // Create category
  const result = await query(
    'INSERT INTO budget_categories (user_id, name, description, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, name, description || '', type, color || '#808080', icon || '']
  );
  
  return {
    success: true,
    message: 'Budget category created successfully',
    categoryId: result.insertId
  };
};

/**
 * Update budget category
 */
const updateBudgetCategory = async (categoryId, userId, categoryData) => {
  const { name, description, color, icon } = categoryData;
  
  // Check if category exists and belongs to user
  const categories = await query(
    'SELECT id FROM budget_categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!categories.length) {
    throw new Error('Category not found or you do not have permission to update it');
  }
  
  // Update category
  await query(
    'UPDATE budget_categories SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?',
    [name, description || '', color || '#808080', icon || '', categoryId]
  );
  
  return {
    success: true,
    message: 'Budget category updated successfully'
  };
};

/**
 * Delete budget category
 */
const deleteBudgetCategory = async (categoryId, userId) => {
  // Check if category exists and belongs to user
  const categories = await query(
    'SELECT id FROM budget_categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!categories.length) {
    throw new Error('Category not found or you do not have permission to delete it');
  }
  
  // Check if category is used in any budgets or expenses
  const budgetItems = await query(
    'SELECT id FROM budget_items WHERE category_id = ? LIMIT 1',
    [categoryId]
  );
  
  const expenses = await query(
    'SELECT id FROM expenses WHERE category_id = ? LIMIT 1',
    [categoryId]
  );
  
  const incomes = await query(
    'SELECT id FROM income_records WHERE category_id = ? LIMIT 1',
    [categoryId]
  );
  
  if (budgetItems.length || expenses.length || incomes.length) {
    throw new Error('Cannot delete category because it is being used in budgets, expenses, or income records');
  }
  
  // Delete category
  await query(
    'DELETE FROM budget_categories WHERE id = ?',
    [categoryId]
  );
  
  return {
    success: true,
    message: 'Budget category deleted successfully'
  };
};

/**
 * Create a new budget
 */
const createBudget = async (userId, budgetData) => {
  const { title, description, startDate, endDate, items } = budgetData;
  
  if (!title || !startDate || !endDate) {
    throw new Error('Budget title, start date, and end date are required');
  }
  
  // Create budget
  const result = await query(
    'INSERT INTO budgets (user_id, title, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
    [userId, title, description || '', startDate, endDate]
  );
  
  const budgetId = result.insertId;
  
  // Add budget items if provided
  if (items && Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      if (item.categoryId && item.amount) {
        await query(
          'INSERT INTO budget_items (budget_id, category_id, amount, description) VALUES (?, ?, ?, ?)',
          [budgetId, item.categoryId, item.amount, item.description || '']
        );
      }
    }
  }
  
  return {
    success: true,
    message: 'Budget created successfully',
    budgetId
  };
};

/**
 * Get all budgets for a user
 */
const getUserBudgets = async (userId) => {
  const budgets = await query(
    `SELECT id, title, description, start_date, end_date, is_active, created_at 
     FROM budgets 
     WHERE user_id = ? 
     ORDER BY start_date DESC`,
    [userId]
  );
  
  return budgets;
};

/**
 * Get budget details with items
 */
const getBudgetDetails = async (budgetId, userId) => {
  // Get budget details
  const budgets = await query(
    `SELECT id, title, description, start_date, end_date, is_active, created_at 
     FROM budgets 
     WHERE id = ? AND user_id = ?`,
    [budgetId, userId]
  );
  
  if (!budgets.length) {
    throw new Error('Budget not found or you do not have permission to access it');
  }
  
  const budget = budgets[0];
  
  // Get budget items with category details
  const items = await query(
    `SELECT bi.*, bc.name as category_name, bc.type as category_type, bc.color, bc.icon 
     FROM budget_items bi
     JOIN budget_categories bc ON bi.category_id = bc.id
     WHERE bi.budget_id = ?
     ORDER BY bc.type, bc.name`,
    [budgetId]
  );
  
  budget.items = items;
  
  // Calculate totals
  const income = items
    .filter(item => item.category_type === 'income')
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  const expenses = items
    .filter(item => item.category_type === 'expense')
    .reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  budget.summary = {
    totalIncome: income,
    totalExpenses: expenses,
    netAmount: income - expenses
  };
  
  return budget;
};

/**
 * Update budget details
 */
const updateBudget = async (budgetId, userId, budgetData) => {
  const { title, description, startDate, endDate, isActive } = budgetData;
  
  // Check if budget exists and belongs to user
  const budgets = await query(
    'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
    [budgetId, userId]
  );
  
  if (!budgets.length) {
    throw new Error('Budget not found or you do not have permission to update it');
  }
  
  // Update budget
  await query(
    'UPDATE budgets SET title = ?, description = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
    [title, description || '', startDate, endDate, isActive !== undefined ? isActive : true, budgetId]
  );
  
  return {
    success: true,
    message: 'Budget updated successfully'
  };
};

/**
 * Add budget item
 */
const addBudgetItem = async (budgetId, userId, itemData) => {
  const { categoryId, amount, description } = itemData;
  
  if (!categoryId || amount === undefined) {
    throw new Error('Category ID and amount are required');
  }
  
  // Check if budget exists and belongs to user
  const budgets = await query(
    'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
    [budgetId, userId]
  );
  
  if (!budgets.length) {
    throw new Error('Budget not found or you do not have permission to update it');
  }
  
  // Check if category exists and belongs to user
  const categories = await query(
    'SELECT id FROM budget_categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!categories.length) {
    throw new Error('Category not found or you do not have permission to use it');
  }
  
  // Add budget item
  const result = await query(
    'INSERT INTO budget_items (budget_id, category_id, amount, description) VALUES (?, ?, ?, ?)',
    [budgetId, categoryId, amount, description || '']
  );
  
  return {
    success: true,
    message: 'Budget item added successfully',
    itemId: result.insertId
  };
};

/**
 * Update budget item
 */
const updateBudgetItem = async (itemId, userId, itemData) => {
  const { amount, description } = itemData;
  
  // Check if item exists and belongs to user's budget
  const items = await query(
    `SELECT bi.id 
     FROM budget_items bi
     JOIN budgets b ON bi.budget_id = b.id
     WHERE bi.id = ? AND b.user_id = ?`,
    [itemId, userId]
  );
  
  if (!items.length) {
    throw new Error('Budget item not found or you do not have permission to update it');
  }
  
  // Update item
  await query(
    'UPDATE budget_items SET amount = ?, description = ? WHERE id = ?',
    [amount, description || '', itemId]
  );
  
  return {
    success: true,
    message: 'Budget item updated successfully'
  };
};

/**
 * Delete budget item
 */
const deleteBudgetItem = async (itemId, userId) => {
  // Check if item exists and belongs to user's budget
  const items = await query(
    `SELECT bi.id 
     FROM budget_items bi
     JOIN budgets b ON bi.budget_id = b.id
     WHERE bi.id = ? AND b.user_id = ?`,
    [itemId, userId]
  );
  
  if (!items.length) {
    throw new Error('Budget item not found or you do not have permission to delete it');
  }
  
  // Delete item
  await query(
    'DELETE FROM budget_items WHERE id = ?',
    [itemId]
  );
  
  return {
    success: true,
    message: 'Budget item deleted successfully'
  };
};

/**
 * Record an expense
 */
const recordExpense = async (userId, expenseData) => {
  const { categoryId, amount, description, expenseDate, receiptImage } = expenseData;
  
  if (!categoryId || !amount || !expenseDate) {
    throw new Error('Category, amount, and date are required');
  }
  
  // Check if category exists and belongs to user
  const categories = await query(
    'SELECT id, type FROM budget_categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!categories.length) {
    throw new Error('Category not found or you do not have permission to use it');
  }
  
  // Ensure category is an expense category
  if (categories[0].type !== 'expense') {
    throw new Error('Selected category is not an expense category');
  }
  
  // Record expense
  const result = await query(
    'INSERT INTO expenses (user_id, category_id, amount, description, expense_date, receipt_image) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, categoryId, amount, description || '', expenseDate, receiptImage || null]
  );
  
  return {
    success: true,
    message: 'Expense recorded successfully',
    expenseId: result.insertId
  };
};

/**
 * Record income
 */
const recordIncome = async (userId, incomeData) => {
  const { categoryId, amount, description, incomeDate } = incomeData;
  
  if (!categoryId || !amount || !incomeDate) {
    throw new Error('Category, amount, and date are required');
  }
  
  // Check if category exists and belongs to user
  const categories = await query(
    'SELECT id, type FROM budget_categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  
  if (!categories.length) {
    throw new Error('Category not found or you do not have permission to use it');
  }
  
  // Ensure category is an income category
  if (categories[0].type !== 'income') {
    throw new Error('Selected category is not an income category');
  }
  
  // Record income
  const result = await query(
    'INSERT INTO income_records (user_id, category_id, amount, description, income_date) VALUES (?, ?, ?, ?, ?)',
    [userId, categoryId, amount, description || '', incomeDate]
  );
  
  return {
    success: true,
    message: 'Income recorded successfully',
    incomeId: result.insertId
  };
};

/**
 * Get user expenses
 */
const getUserExpenses = async (userId, { startDate, endDate, categoryId, limit } = {}) => {
  let sql = `
    SELECT e.*, bc.name as category_name, bc.color, bc.icon
    FROM expenses e
    JOIN budget_categories bc ON e.category_id = bc.id
    WHERE e.user_id = ?
  `;
  const params = [userId];
  
  if (startDate) {
    sql += ' AND e.expense_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND e.expense_date <= ?';
    params.push(endDate);
  }
  
  if (categoryId) {
    sql += ' AND e.category_id = ?';
    params.push(categoryId);
  }
  
  sql += ' ORDER BY e.expense_date DESC';
  
  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit));
  }
  
  const expenses = await query(sql, params);
  
  return expenses;
};

/**
 * Get user income records
 */
const getUserIncome = async (userId, { startDate, endDate, categoryId, limit } = {}) => {
  let sql = `
    SELECT i.*, bc.name as category_name, bc.color, bc.icon
    FROM income_records i
    JOIN budget_categories bc ON i.category_id = bc.id
    WHERE i.user_id = ?
  `;
  const params = [userId];
  
  if (startDate) {
    sql += ' AND i.income_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND i.income_date <= ?';
    params.push(endDate);
  }
  
  if (categoryId) {
    sql += ' AND i.category_id = ?';
    params.push(categoryId);
  }
  
  sql += ' ORDER BY i.income_date DESC';
  
  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit));
  }
  
  const income = await query(sql, params);
  
  return income;
};

/**
 * Generate expense summary by category
 */
const getExpenseSummaryByCategory = async (userId, { startDate, endDate } = {}) => {
  let sql = `
    SELECT 
      bc.id as category_id, 
      bc.name as category_name, 
      bc.color, 
      bc.icon, 
      SUM(e.amount) as total_amount,
      COUNT(e.id) as transaction_count
    FROM expenses e
    JOIN budget_categories bc ON e.category_id = bc.id
    WHERE e.user_id = ?
  `;
  const params = [userId];
  
  if (startDate) {
    sql += ' AND e.expense_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND e.expense_date <= ?';
    params.push(endDate);
  }
  
  sql += ' GROUP BY bc.id, bc.name, bc.color, bc.icon ORDER BY total_amount DESC';
  
  const categorySummary = await query(sql, params);
  
  // Calculate total expenses
  const totalExpenses = categorySummary.reduce(
    (sum, category) => sum + parseFloat(category.total_amount), 
    0
  );
  
  // Add percentage to each category
  categorySummary.forEach(category => {
    category.percentage = totalExpenses > 0 
      ? Math.round((parseFloat(category.total_amount) / totalExpenses) * 1000) / 10 
      : 0;
  });
  
  return {
    categories: categorySummary,
    totalExpenses
  };
};

/**
 * Generate income summary by category
 */
const getIncomeSummaryByCategory = async (userId, { startDate, endDate } = {}) => {
  let sql = `
    SELECT 
      bc.id as category_id, 
      bc.name as category_name, 
      bc.color, 
      bc.icon, 
      SUM(i.amount) as total_amount,
      COUNT(i.id) as transaction_count
    FROM income_records i
    JOIN budget_categories bc ON i.category_id = bc.id
    WHERE i.user_id = ?
  `;
  const params = [userId];
  
  if (startDate) {
    sql += ' AND i.income_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND i.income_date <= ?';
    params.push(endDate);
  }
  
  sql += ' GROUP BY bc.id, bc.name, bc.color, bc.icon ORDER BY total_amount DESC';
  
  const categorySummary = await query(sql, params);
  
  // Calculate total income
  const totalIncome = categorySummary.reduce(
    (sum, category) => sum + parseFloat(category.total_amount), 
    0
  );
  
  // Add percentage to each category
  categorySummary.forEach(category => {
    category.percentage = totalIncome > 0 
      ? Math.round((parseFloat(category.total_amount) / totalIncome) * 1000) / 10 
      : 0;
  });
  
  return {
    categories: categorySummary,
    totalIncome
  };
};

/**
 * Generate monthly expense summary
 */
const getMonthlyExpenseSummary = async (userId, { startDate, endDate } = {}) => {
  // Default to last 12 months if no dates provided
  if (!startDate && !endDate) {
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
  }
  
  let sql = `
    SELECT 
      DATE_FORMAT(e.expense_date, '%Y-%m-01') as month,
      SUM(e.amount) as total_amount
    FROM expenses e
    WHERE e.user_id = ?
  `;
  const params = [userId];
  
  if (startDate) {
    sql += ' AND e.expense_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND e.expense_date <= ?';
    params.push(endDate);
  }
  
  sql += ' GROUP BY DATE_FORMAT(e.expense_date, "%Y-%m-01") ORDER BY month';
  
  const monthlySummary = await query(sql, params);
  
  return monthlySummary;
};

/**
 * Generate monthly income summary
 */
const getMonthlyIncomeSummary = async (userId, { startDate, endDate } = {}) => {
  // Default to last 12 months if no dates provided
  if (!startDate && !endDate) {
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
  }
  
  let sql = `
    SELECT 
      DATE_FORMAT(i.income_date, '%Y-%m-01') as month,
      SUM(i.amount) as total_amount
    FROM income_records i
    WHERE i.user_id = ?
  `;
  const params = [userId];
  
  if (startDate) {
    sql += ' AND i.income_date >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND i.income_date <= ?';
    params.push(endDate);
  }
  
  sql += ' GROUP BY DATE_FORMAT(i.income_date, "%Y-%m-01") ORDER BY month';
  
  const monthlySummary = await query(sql, params);
  
  return monthlySummary;
};

/**
 * Generate budget vs actual report
 */
const getBudgetVsActualReport = async (userId, budgetId) => {
  // Check if budget exists and belongs to user
  const budgets = await query(
    'SELECT id, start_date, end_date FROM budgets WHERE id = ? AND user_id = ?',
    [budgetId, userId]
  );
  
  if (!budgets.length) {
    throw new Error('Budget not found or you do not have permission to access it');
  }
  
  const budget = budgets[0];
  const startDate = budget.start_date;
  const endDate = budget.end_date;
  
  // Get budget items
  const budgetItems = await query(
    `SELECT bi.category_id, bc.name as category_name, bc.type as category_type, 
            bc.color, bc.icon, bi.amount as budgeted_amount
     FROM budget_items bi
     JOIN budget_categories bc ON bi.category_id = bc.id
     WHERE bi.budget_id = ?
     ORDER BY bc.type, bc.name`,
    [budgetId]
  );
  
  // Get actual expenses and income
  const expenses = await query(
    `SELECT e.category_id, SUM(e.amount) as actual_amount
     FROM expenses e
     WHERE e.user_id = ? AND e.expense_date BETWEEN ? AND ?
     GROUP BY e.category_id`,
    [userId, startDate, endDate]
  );
  
  const income = await query(
    `SELECT i.category_id, SUM(i.amount) as actual_amount
     FROM income_records i
     WHERE i.user_id = ? AND i.income_date BETWEEN ? AND ?
     GROUP BY i.category_id`,
    [userId, startDate, endDate]
  );
  
  // Create a map of actual amounts by category ID
  const actualAmounts = {};
  
  expenses.forEach(item => {
    actualAmounts[item.category_id] = parseFloat(item.actual_amount);
  });
  
  income.forEach(item => {
    actualAmounts[item.category_id] = parseFloat(item.actual_amount);
  });
  
  // Combine budget and actual amounts
  const report = budgetItems.map(item => {
    const categoryId = item.category_id;
    const budgetedAmount = parseFloat(item.budgeted_amount);
    const actualAmount = actualAmounts[categoryId] || 0;
    const difference = item.category_type === 'expense' 
      ? budgetedAmount - actualAmount  // For expenses, positive means under budget
      : actualAmount - budgetedAmount; // For income, positive means over budget
    const percentUsed = budgetedAmount > 0 
      ? Math.round((actualAmount / budgetedAmount) * 100) 
      : 0;
    
    return {
      categoryId,
      categoryName: item.category_name,
      categoryType: item.category_type,
      color: item.color,
      icon: item.icon,
      budgetedAmount,
      actualAmount,
      difference,
      percentUsed
    };
  });
  
  // Add categories that have actual amounts but no budget
  const budgetedCategoryIds = budgetItems.map(item => item.category_id);
  
  // Get all user categories
  const allCategories = await query(
    'SELECT id, name, type, color, icon FROM budget_categories WHERE user_id = ?',
    [userId]
  );
  
  allCategories.forEach(category => {
    if (
      !budgetedCategoryIds.includes(category.id) && 
      actualAmounts[category.id] !== undefined
    ) {
      const actualAmount = actualAmounts[category.id];
      report.push({
        categoryId: category.id,
        categoryName: category.name,
        categoryType: category.type,
        color: category.color,
        icon: category.icon,
        budgetedAmount: 0,
        actualAmount,
        difference: category.type === 'expense' ? -actualAmount : actualAmount,
        percentUsed: null // Not applicable when no budget
      });
    }
  });
  
  // Calculate summary
  const totalBudgetedExpenses = report
    .filter(item => item.categoryType === 'expense')
    .reduce((sum, item) => sum + item.budgetedAmount, 0);
  
  const totalActualExpenses = report
    .filter(item => item.categoryType === 'expense')
    .reduce((sum, item) => sum + item.actualAmount, 0);
  
  const totalBudgetedIncome = report
    .filter(item => item.categoryType === 'income')
    .reduce((sum, item) => sum + item.budgetedAmount, 0);
  
  const totalActualIncome = report
    .filter(item => item.categoryType === 'income')
    .reduce((sum, item) => sum + item.actualAmount, 0);
  
  return {
    report,
    summary: {
      totalBudgetedExpenses,
      totalActualExpenses,
      totalBudgetedIncome,
      totalActualIncome,
      budgetedNetAmount: totalBudgetedIncome - totalBudgetedExpenses,
      actualNetAmount: totalActualIncome - totalActualExpenses
    }
  };
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
  getBudgetVsActualReport
}; 