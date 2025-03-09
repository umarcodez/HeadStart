const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Protected routes (require authentication)
router.post('/generate-otp', authenticate, authController.generateOTP);
router.post('/verify-otp', authenticate, authController.verifyOTP);
router.post('/toggle-2fa', authenticate, authController.toggleTwoFactorAuth);
router.get('/2fa-status', authenticate, authController.getTwoFactorStatus);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router; 