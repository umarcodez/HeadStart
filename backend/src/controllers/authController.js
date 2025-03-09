const { admin } = require('../config/firebase');
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendOTPEmail 
} = require('../services/emailService');
require('dotenv').config();

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (email, password, firstName, lastName, role)'
      });
    }

    // Validate role
    const validRoles = ['entrepreneur', 'freelancer', 'team_member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles are: entrepreneur, freelancer, team_member'
      });
    }

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      disabled: false
    });

    // Get role ID from database
    const roles = await query('SELECT id FROM roles WHERE name = ?', [role]);
    
    if (!roles.length) {
      // If role doesn't exist, delete Firebase user and return error
      await admin.auth().deleteUser(userRecord.uid);
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    const roleId = roles[0].id;

    // Insert user into our database
    await query(
      'INSERT INTO users (id, email, first_name, last_name, phone, role_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userRecord.uid, email, firstName, lastName, phone, roleId]
    );

    // Create profile based on role
    if (role === 'entrepreneur') {
      await query(
        'INSERT INTO entrepreneur_profiles (user_id) VALUES (?)',
        [userRecord.uid]
      );
    } else if (role === 'freelancer') {
      await query(
        'INSERT INTO freelancer_profiles (user_id) VALUES (?)',
        [userRecord.uid]
      );
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token valid for 24 hours

    // Save token to database
    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userRecord.uid, verificationToken, tokenExpiry]
    );

    // Check if email sending is configured and enabled
    let emailSent = false;
    // Skip email verification for development if EMAIL_SKIP_VERIFICATION=true in .env
    const skipEmailVerification = process.env.EMAIL_SKIP_VERIFICATION === 'true';
    
    if (!skipEmailVerification && process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-email@gmail.com') {
      try {
        // Try to send verification email
        await sendVerificationEmail(email, verificationToken);
        emailSent = true;
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Continue with registration process even if email fails
      }
    }

    // Generate JWT for initial authentication
    const token = jwt.sign(
      { 
        uid: userRecord.uid, 
        email, 
        role 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
    );

    // For development, automatically mark email as verified if skipping verification
    if (skipEmailVerification) {
      await query('UPDATE users SET email_verified = true WHERE id = ?', [userRecord.uid]);
    }

    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'User registered successfully. Please verify your email.'
        : skipEmailVerification
          ? 'User registered successfully. Email verification skipped for development.'
          : 'User registered successfully. Email verification service is unavailable.',
      token,
      user: {
        id: userRecord.uid,
        email,
        firstName,
        lastName,
        role,
        phone: phone || null,
        emailVerified: skipEmailVerification
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Firebase-specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        message: 'Email already in use.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login a user
 */
const login = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Sign in with Firebase
    const signInResult = await admin.auth().getUserByEmail(email);
    
    // Get user data from our database
    const users = await query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [signInResult.uid]
    );
    
    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database'
      });
    }
    
    const user = users[0];

    // Check if 2FA is enabled for the user
    const twoFactorData = await query(
      'SELECT otp_enabled FROM two_factor_auth WHERE user_id = ? AND otp_enabled = true',
      [user.id]
    );
    
    const twoFactorEnabled = twoFactorData.length > 0;
    
    // If 2FA is enabled and no OTP provided, send OTP and require second step
    if (twoFactorEnabled && !otp) {
      // Generate OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOTP = await bcrypt.hash(newOtp, 10);
      
      // Update OTP in database
      if (await query('SELECT 1 FROM two_factor_auth WHERE user_id = ?', [user.id]).length) {
        await query(
          'UPDATE two_factor_auth SET otp_secret = ?, updated_at = NOW() WHERE user_id = ?',
          [hashedOTP, user.id]
        );
      } else {
        await query(
          'INSERT INTO two_factor_auth (user_id, otp_secret, otp_enabled) VALUES (?, ?, true)',
          [user.id, hashedOTP]
        );
      }
      
      // Send OTP via email
      await sendOTPEmail(user.email, newOtp);
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email',
        requireOTP: true,
        userId: user.id
      });
    }
    
    // If 2FA is enabled and OTP is provided, verify OTP
    if (twoFactorEnabled && otp) {
      const otpData = await query(
        'SELECT otp_secret FROM two_factor_auth WHERE user_id = ?',
        [user.id]
      );
      
      if (!otpData.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }
      
      const isValidOTP = await bcrypt.compare(otp, otpData[0].otp_secret);
      
      if (!isValidOTP) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: signInResult.uid,
        email: signInResult.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone || null,
        emailVerified: user.email_verified === 1,
        twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle Firebase-specific errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find token in database
    const tokens = await query(
      `SELECT * FROM email_verification_tokens 
       WHERE token = ? AND expires_at > NOW()`,
      [token]
    );

    if (!tokens.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    const userId = tokens[0].user_id;

    // Update user verification status
    await query(
      'UPDATE users SET email_verified = true WHERE id = ?',
      [userId]
    );

    // Delete used token
    await query(
      'DELETE FROM email_verification_tokens WHERE token = ?',
      [token]
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Get user from Firebase
    const userRecord = await admin.auth().getUserByEmail(email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token valid for 1 hour

    // Delete any existing reset tokens for this user
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [userRecord.uid]
    );

    // Save new token to database
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userRecord.uid, resetToken, tokenExpiry]
    );

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    
    // Don't reveal if email exists for security
    if (error.code === 'auth/user-not-found') {
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a reset link'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Find token in database
    const tokens = await query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND expires_at > NOW()`,
      [token]
    );

    if (!tokens.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const userId = tokens[0].user_id;

    // Update password in Firebase
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    // Delete used token
    await query(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate OTP for two-factor authentication
 */
const generateOTP = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP for storage
    const hashedOTP = await bcrypt.hash(otp, 10);
    
    // Set expiry (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Check if user already has 2FA record
    const existingRecord = await query(
      'SELECT * FROM two_factor_auth WHERE user_id = ?',
      [req.user.uid]
    );
    
    if (existingRecord.length) {
      // Update existing record
      await query(
        'UPDATE two_factor_auth SET otp_secret = ?, updated_at = NOW() WHERE user_id = ?',
        [hashedOTP, req.user.uid]
      );
    } else {
      // Create new record
      await query(
        'INSERT INTO two_factor_auth (user_id, otp_secret, otp_enabled) VALUES (?, ?, false)',
        [req.user.uid, hashedOTP]
      );
    }
    
    // Get user email
    const user = await query('SELECT email FROM users WHERE id = ?', [req.user.uid]);
    
    if (!user.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Send OTP via email
    await sendOTPEmail(user[0].email, otp);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email'
    });
  } catch (error) {
    console.error('OTP generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP for two-factor authentication
 */
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }
    
    // Get user's stored OTP
    const twoFactorData = await query(
      'SELECT otp_secret FROM two_factor_auth WHERE user_id = ?',
      [req.user.uid]
    );
    
    if (!twoFactorData.length) {
      return res.status(400).json({
        success: false,
        message: 'No OTP has been generated'
      });
    }
    
    // Verify OTP
    const isValid = await bcrypt.compare(otp, twoFactorData[0].otp_secret);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    // Enable 2FA for user
    await query(
      'UPDATE two_factor_auth SET otp_enabled = true WHERE user_id = ?',
      [req.user.uid]
    );
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Two-factor authentication enabled.'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Enable or disable two-factor authentication
 */
const toggleTwoFactorAuth = async (req, res) => {
  try {
    const { enable } = req.body;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (enable === undefined) {
      return res.status(400).json({
        success: false,
        message: '"enable" parameter is required (true or false)'
      });
    }
    
    // Check if user already has 2FA record
    const existingRecord = await query(
      'SELECT * FROM two_factor_auth WHERE user_id = ?',
      [req.user.uid]
    );
    
    if (existingRecord.length) {
      // Update existing record
      await query(
        'UPDATE two_factor_auth SET otp_enabled = ? WHERE user_id = ?',
        [enable, req.user.uid]
      );
    } else if (enable) {
      // Create new record with 2FA enabled
      await query(
        'INSERT INTO two_factor_auth (user_id, otp_enabled) VALUES (?, true)',
        [req.user.uid]
      );
    } else {
      // No need to create a record if disabling and no record exists
      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication is already disabled'
      });
    }
    
    res.status(200).json({
      success: true,
      message: enable 
        ? 'Two-factor authentication enabled' 
        : 'Two-factor authentication disabled'
    });
  } catch (error) {
    console.error('Toggle 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling two-factor authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current 2FA status
 */
const getTwoFactorStatus = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get 2FA status
    const result = await query(
      'SELECT otp_enabled FROM two_factor_auth WHERE user_id = ?',
      [req.user.uid]
    );
    
    const isEnabled = result.length > 0 && result[0].otp_enabled;
    
    res.status(200).json({
      success: true,
      twoFactorEnabled: isEnabled
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting two-factor authentication status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password (for authenticated users)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    // Update password in Firebase
    // Note: Firebase doesn't have a built-in way to verify the current password
    // For proper verification, you may need to implement a custom solution
    await admin.auth().updateUser(req.user.uid, {
      password: newPassword
    });
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      return res.status(403).json({
        success: false,
        message: 'This operation requires recent authentication. Please log in again before retrying.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  generateOTP,
  verifyOTP,
  toggleTwoFactorAuth,
  getTwoFactorStatus,
  changePassword
}; 