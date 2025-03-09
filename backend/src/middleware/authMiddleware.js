const { admin } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
require('dotenv').config();

/**
 * Middleware to verify Firebase token
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add the user data to the request object
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add the user data to the request object
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

/**
 * Check if user has admin role
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated.' 
      });
    }

    // Check if user is admin in our database
    const user = await query(
      'SELECT r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', 
      [req.user.uid]
    );

    if (!user.length || user[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error when checking permissions.'
    });
  }
};

/**
 * Check if user has specific role
 */
const hasRole = (roleNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated.' 
        });
      }

      // Check if user has one of the required roles
      const user = await query(
        'SELECT r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', 
        [req.user.uid]
      );

      if (!user.length || !roleNames.includes(user[0].role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roleNames.join(', ')}.`
        });
      }

      next();
    } catch (error) {
      console.error('Error checking user role:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error when checking permissions.'
      });
    }
  };
};

module.exports = {
  verifyFirebaseToken,
  verifyToken,
  isAdmin,
  hasRole
}; 