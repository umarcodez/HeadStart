/**
 * Authentication Middleware
 * 
 * Verifies the JWT token and adds the user to the request object
 */
const admin = require('../config/firebase');

/**
 * Middleware to authenticate requests using Firebase Auth
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Add user info to request
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      role: decodedToken.role || 'user'
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: error.message
    });
  }
};

module.exports = {
  authenticate
}; 