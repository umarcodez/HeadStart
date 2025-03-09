const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const expenseService = require('../services/expenseService');
const { ValidationError } = require('../utils/errors');

// Configure multer for file upload
const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new ValidationError('Only image files are allowed'));
        }
    }
});

// Get expense categories
router.get('/categories', authenticate, async (req, res, next) => {
    try {
        const categories = await expenseService.getExpenseCategories();
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// Get expenses with filters
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { startDate, endDate, categoryId, minAmount, maxAmount } = req.query;
        const expenses = await expenseService.getExpenses(req.user.id, {
            startDate,
            endDate,
            categoryId,
            minAmount: minAmount ? parseFloat(minAmount) : null,
            maxAmount: maxAmount ? parseFloat(maxAmount) : null
        });
        res.json(expenses);
    } catch (error) {
        next(error);
    }
});

// Get expense by ID
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const expense = await expenseService.getExpenseById(req.params.id, req.user.id);
        res.json(expense);
    } catch (error) {
        next(error);
    }
});

// Create expense with receipt
router.post('/', authenticate, upload.single('receipt'), async (req, res, next) => {
    try {
        const { categoryId, amount, description, date } = req.body;
        
        if (!categoryId) {
            throw new ValidationError('Category ID is required');
        }

        const expense = await expenseService.createExpense(
            req.user.id,
            {
                categoryId,
                amount: amount ? parseFloat(amount) : null,
                description,
                date: date || new Date()
            },
            req.file
        );
        
        res.status(201).json(expense);
    } catch (error) {
        next(error);
    }
});

// Update expense
router.put('/:id', authenticate, async (req, res, next) => {
    try {
        const { categoryId, amount, description, date, status } = req.body;
        
        if (!categoryId || !amount) {
            throw new ValidationError('Category ID and amount are required');
        }

        const expense = await expenseService.updateExpense(
            req.params.id,
            req.user.id,
            {
                categoryId,
                amount: parseFloat(amount),
                description,
                date,
                status
            }
        );
        
        res.json(expense);
    } catch (error) {
        next(error);
    }
});

// Delete expense
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        await expenseService.deleteExpense(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Get expense statistics
router.get('/stats/summary', authenticate, async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            throw new ValidationError('Start date and end date are required');
        }

        const stats = await expenseService.getExpenseStats(
            req.user.id,
            startDate,
            endDate
        );
        
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// Process receipt only (without creating expense)
router.post('/process-receipt', authenticate, upload.single('receipt'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ValidationError('Receipt file is required');
        }

        const result = await expenseService.processReceipt(req.file.buffer);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router; 