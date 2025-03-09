const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { createWorker } = require('tesseract.js');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { uploadFile, getFileUrl } = require('../utils/fileStorage');

// Initialize Tesseract worker
let ocrWorker = null;

const initializeOCR = async () => {
    if (!ocrWorker) {
        ocrWorker = await createWorker('eng');
    }
    return ocrWorker;
};

// Expense Categories
const getExpenseCategories = async () => {
    return await query('SELECT * FROM expense_categories');
};

// Expenses
const getExpenses = async (userId, filters = {}) => {
    let sql = `
        SELECT e.*, ec.name as category_name 
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.user_id = ?
    `;
    const params = [userId];

    if (filters.startDate) {
        sql += ' AND e.date >= ?';
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        sql += ' AND e.date <= ?';
        params.push(filters.endDate);
    }
    if (filters.categoryId) {
        sql += ' AND e.category_id = ?';
        params.push(filters.categoryId);
    }
    if (filters.minAmount) {
        sql += ' AND e.amount >= ?';
        params.push(filters.minAmount);
    }
    if (filters.maxAmount) {
        sql += ' AND e.amount <= ?';
        params.push(filters.maxAmount);
    }

    sql += ' ORDER BY e.date DESC';

    return await query(sql, params);
};

const getExpenseById = async (id, userId) => {
    const [expense] = await query(
        `SELECT e.*, ec.name as category_name 
         FROM expenses e
         JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.id = ? AND e.user_id = ?`,
        [id, userId]
    );
    if (!expense) throw new NotFoundError('Expense not found');
    return expense;
};

const extractReceiptData = async (receiptText) => {
    // Initialize patterns for common receipt fields
    const patterns = {
        total: /(?:total|amount|sum)[:\s]*[$€£]?\s*(\d+(?:\.\d{2})?)/i,
        date: /(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/,
        vendor: /(?:vendor|merchant|store|company)[:\s]*([A-Za-z0-9\s&]+)/i,
        taxAmount: /(?:tax|vat|gst)[:\s]*[$€£]?\s*(\d+(?:\.\d{2})?)/i
    };

    const extractedData = {
        total: null,
        date: null,
        vendor: null,
        taxAmount: null,
        items: []
    };

    // Extract structured data using patterns
    for (const [key, pattern] of Object.entries(patterns)) {
        const match = receiptText.match(pattern);
        if (match) {
            extractedData[key] = match[1] || match[0];
        }
    }

    // Extract potential line items (looking for amount patterns)
    const lineItemPattern = /([A-Za-z0-9\s&]+)\s+[$€£]?\s*(\d+(?:\.\d{2})?)/g;
    let match;
    while ((match = lineItemPattern.exec(receiptText)) !== null) {
        if (!patterns.total.test(match[0]) && !patterns.taxAmount.test(match[0])) {
            extractedData.items.push({
                description: match[1].trim(),
                amount: match[2]
            });
        }
    }

    return extractedData;
};

const processReceipt = async (receiptBuffer) => {
    try {
        const worker = await initializeOCR();
        
        // Perform OCR
        const { data: { text } } = await worker.recognize(receiptBuffer);
        
        // Extract structured data from the OCR text
        const extractedData = await extractReceiptData(text);
        
        return {
            text,
            extractedData
        };
    } catch (error) {
        console.error('Error processing receipt:', error);
        throw new Error('Failed to process receipt');
    }
};

const createExpense = async (userId, data, receiptFile = null) => {
    const { categoryId, amount, description, date } = data;
    const id = uuidv4();
    let receiptData = null;
    let receiptUrl = null;
    let receiptText = null;

    // Process receipt if provided
    if (receiptFile) {
        // Upload receipt file
        receiptUrl = await uploadFile(receiptFile, `receipts/${userId}/${id}`);
        
        // Process receipt with OCR
        const processedReceipt = await processReceipt(receiptFile.buffer);
        receiptText = processedReceipt.text;
        receiptData = processedReceipt.extractedData;
    }

    // Create expense record
    await query(
        `INSERT INTO expenses 
         (id, user_id, category_id, amount, description, date, receipt_url, receipt_text, receipt_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            userId,
            categoryId,
            amount || receiptData?.total || 0,
            description,
            date || receiptData?.date || new Date(),
            receiptUrl,
            receiptText,
            JSON.stringify(receiptData)
        ]
    );

    return getExpenseById(id, userId);
};

const updateExpense = async (id, userId, data) => {
    const { categoryId, amount, description, date, status } = data;
    
    // Verify expense exists and belongs to user
    await getExpenseById(id, userId);
    
    // Update expense
    await query(
        `UPDATE expenses 
         SET category_id = ?, amount = ?, description = ?, date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [categoryId, amount, description, date, status, id, userId]
    );
    
    return getExpenseById(id, userId);
};

const deleteExpense = async (id, userId) => {
    // Verify expense exists and belongs to user
    await getExpenseById(id, userId);
    
    // Delete expense
    await query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    
    return { success: true };
};

const getExpenseStats = async (userId, startDate, endDate) => {
    const stats = await query(`
        SELECT 
            ec.name as category,
            COUNT(*) as count,
            SUM(e.amount) as total_amount,
            MIN(e.amount) as min_amount,
            MAX(e.amount) as max_amount,
            AVG(e.amount) as avg_amount
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.user_id = ?
            AND e.date BETWEEN ? AND ?
        GROUP BY ec.id, ec.name
    `, [userId, startDate, endDate]);

    const total = await query(`
        SELECT SUM(amount) as total
        FROM expenses
        WHERE user_id = ?
            AND date BETWEEN ? AND ?
    `, [userId, startDate, endDate]);

    return {
        categories: stats,
        total: total[0].total || 0
    };
};

module.exports = {
    getExpenseCategories,
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseStats,
    processReceipt
}; 