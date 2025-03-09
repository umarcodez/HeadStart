const express = require('express');
const router = express.Router();
const startupController = require('../controllers/startupController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Business Name Suggestions
router.post('/business-name/generate', startupController.generateBusinessNameSuggestions);
router.get('/business-name/history', startupController.getPreviousBusinessNames);
router.post('/business-name/select', startupController.saveSelectedBusinessName);

// Tagline Suggestions
router.post('/tagline/generate', startupController.generateTaglineSuggestions);
router.get('/tagline/history', startupController.getPreviousTaglines);
router.post('/tagline/select', startupController.saveSelectedTagline);

// Domain Availability
router.post('/domain/check', startupController.checkDomain);
router.post('/domain/suggestions', startupController.getDomainSuggestions);
router.get('/domain/history', startupController.getDomainHistory);

// Video Tutorials
router.get('/tutorials', startupController.getTutorials);
router.get('/tutorials/category/:category', startupController.getTutorialsByCategory);
router.get('/tutorials/:id', startupController.getTutorialWithProgress);
router.post('/tutorials/progress', startupController.updateTutorialProgress);
router.get('/tutorials/recommended', startupController.getRecommendedTutorialsForUser);

module.exports = router; 