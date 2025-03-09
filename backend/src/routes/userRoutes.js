const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', userController.getCurrentUserProfile);
router.get('/profile/:id', userController.getUserProfileById);
router.put('/profile', userController.updateProfile);
router.put('/profile/entrepreneur', userController.updateEntrepreneurProfileDetails);
router.put('/profile/freelancer', userController.updateFreelancerProfileDetails);

// Skills routes
router.get('/skills', userController.getAllSkills);
router.put('/skills', userController.updateUserSkillList);
router.delete('/skills/:skillId', userController.removeSkillFromUser);

// Portfolio routes
router.post('/portfolio', userController.addPortfolioItemToUser);
router.put('/portfolio/:itemId', userController.updatePortfolioItemById);
router.delete('/portfolio/:itemId', userController.deletePortfolioItemById);

// User search routes
router.post('/search', userController.searchUsers);

module.exports = router; 