const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const legalService = require('../services/legalService');
const { ValidationError } = require('../utils/errors');

// Legal Resources Routes
router.get('/resources', authenticate, async (req, res, next) => {
    try {
        const { category } = req.query;
        const resources = await legalService.getLegalResources(category);
        res.json(resources);
    } catch (error) {
        next(error);
    }
});

router.get('/resources/:id', authenticate, async (req, res, next) => {
    try {
        const resource = await legalService.getLegalResourceById(req.params.id);
        res.json(resource);
    } catch (error) {
        next(error);
    }
});

router.post('/resources', authenticate, async (req, res, next) => {
    try {
        const { title, category, content, summary, tags } = req.body;
        
        if (!title || !category || !content) {
            throw new ValidationError('Title, category, and content are required');
        }
        
        const resource = await legalService.createLegalResource({
            title,
            category,
            content,
            summary,
            tags
        });
        
        res.status(201).json(resource);
    } catch (error) {
        next(error);
    }
});

// Document Templates Routes
router.get('/templates', authenticate, async (req, res, next) => {
    try {
        const { category } = req.query;
        const templates = await legalService.getDocumentTemplates(category);
        res.json(templates);
    } catch (error) {
        next(error);
    }
});

router.get('/templates/:id', authenticate, async (req, res, next) => {
    try {
        const template = await legalService.getDocumentTemplateById(req.params.id);
        res.json(template);
    } catch (error) {
        next(error);
    }
});

router.post('/templates/:id/generate', authenticate, async (req, res, next) => {
    try {
        const { variables } = req.body;
        
        if (!variables || typeof variables !== 'object') {
            throw new ValidationError('Variables object is required');
        }
        
        const document = await legalService.generateDocument(
            req.params.id,
            req.user.id,
            variables
        );
        
        res.status(201).json(document);
    } catch (error) {
        next(error);
    }
});

// Compliance Management Routes
router.get('/compliance/categories', authenticate, async (req, res, next) => {
    try {
        const categories = await legalService.getComplianceCategories();
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

router.get('/compliance/items', authenticate, async (req, res, next) => {
    try {
        const { categoryId } = req.query;
        const items = await legalService.getComplianceItems(categoryId);
        res.json(items);
    } catch (error) {
        next(error);
    }
});

router.get('/compliance/progress', authenticate, async (req, res, next) => {
    try {
        const progress = await legalService.getUserComplianceProgress(req.user.id);
        res.json(progress);
    } catch (error) {
        next(error);
    }
});

router.post('/compliance/items/:itemId/progress', authenticate, async (req, res, next) => {
    try {
        const { status, notes, attachments } = req.body;
        
        if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
            throw new ValidationError('Valid status is required');
        }
        
        const progress = await legalService.updateComplianceProgress(
            req.user.id,
            req.params.itemId,
            { status, notes, attachments }
        );
        
        res.json(progress);
    } catch (error) {
        next(error);
    }
});

module.exports = router; 