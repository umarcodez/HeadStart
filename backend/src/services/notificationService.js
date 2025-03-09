/**
 * Notification Service
 * 
 * Handles notification delivery and management
 */
const { query } = require('../config/db');
const Handlebars = require('handlebars');
// For email delivery - you might use nodemailer or a similar service
const nodemailer = require('nodemailer');

/**
 * Send a notification to a user
 * 
 * @param {Object} options
 * @param {string} options.userId - The ID of the user to notify
 * @param {string} options.type - The notification type (e.g., 'event_invitation')
 * @param {number} options.referenceId - The ID of the related entity (e.g., event ID)
 * @param {string} options.referenceType - The type of the related entity (e.g., 'event')
 * @param {Object} options.data - Additional data for the notification template
 * @returns {Promise<Object>} - The result of the notification operation
 */
const sendNotification = async (options) => {
  const { userId, type, referenceId, referenceType, data = {} } = options;
  
  // Get the notification type details
  const types = await query(
    'SELECT * FROM notification_types WHERE name = ?',
    [type]
  );
  
  if (types.length === 0) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  
  const notificationType = types[0];
  
  // Get user notification preferences
  const preferences = await query(
    'SELECT * FROM user_notification_preferences WHERE user_id = ? AND notification_type_id = ?',
    [userId, notificationType.id]
  );
  
  // Default preferences if not set
  const userPrefs = preferences.length > 0 ? preferences[0] : {
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true
  };
  
  // Get user details for the notification
  const users = await query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }
  
  const user = users[0];
  
  // Add user data to template data
  const templateData = {
    ...data,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email
  };
  
  // Compile the notification templates
  const subjectTemplate = Handlebars.compile(notificationType.template_subject);
  const bodyTemplate = Handlebars.compile(notificationType.template_body);
  
  // Render the notification content
  const subject = subjectTemplate(templateData);
  const message = bodyTemplate(templateData);
  
  // Create in-app notification if enabled
  if (userPrefs.in_app_enabled) {
    await createInAppNotification(userId, notificationType.id, referenceId, referenceType, subject, message);
  }
  
  // Send email notification if enabled
  if (userPrefs.email_enabled && user.email) {
    await sendEmailNotification(user.email, subject, message);
  }
  
  // Send push notification if enabled
  if (userPrefs.push_enabled) {
    await sendPushNotification(userId, subject, message);
  }
  
  return {
    success: true,
    message: 'Notification sent successfully'
  };
};

/**
 * Create an in-app notification
 */
const createInAppNotification = async (userId, typeId, referenceId, referenceType, title, message) => {
  // Insert the notification into the database
  await query(
    `INSERT INTO notifications 
     (user_id, type_id, reference_id, reference_type, title, message) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, typeId, referenceId, referenceType, title, message]
  );
  
  // In a real application, you might use WebSockets to notify connected clients
  // about new notifications in real-time
  // Example: socket.to(userId).emit('new-notification', { title, message });
  
  return true;
};

/**
 * Send an email notification
 */
const sendEmailNotification = async (email, subject, message) => {
  // In a production environment, this would be configured with your SMTP settings
  // For now, we'll just log that the email would be sent
  console.log(`Email would be sent to ${email} with subject: "${subject}" and message: "${message}"`);
  
  // Example implementation with nodemailer
  try {
    /*
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Send the email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });
    
    return info.messageId;
    */
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email notification');
  }
};

/**
 * Send a push notification
 */
const sendPushNotification = async (userId, title, message) => {
  // In a production environment, this would use a push notification service
  // like Firebase Cloud Messaging, OneSignal, etc.
  // For now, we'll just log that the push notification would be sent
  console.log(`Push notification would be sent to user ${userId} with title: "${title}" and message: "${message}"`);
  
  // Example implementation with Firebase Cloud Messaging
  try {
    /*
    // Get the user's FCM tokens
    const tokens = await query(
      'SELECT token FROM user_devices WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );
    
    if (tokens.length === 0) {
      return false; // No active devices
    }
    
    const tokenList = tokens.map(t => t.token);
    
    // Send the push notification
    const message = {
      notification: {
        title,
        body: message
      },
      tokens: tokenList
    };
    
    const response = await admin.messaging().sendMulticast(message);
    return response.successCount > 0;
    */
    
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw new Error('Failed to send push notification');
  }
};

/**
 * Get all notifications for a user
 */
const getUserNotifications = async (userId, filters = {}) => {
  const { 
    isRead, 
    isDismissed, 
    limit = 20, 
    offset = 0
  } = filters;
  
  let sql = `
    SELECT n.*, nt.name as type_name, nt.importance
    FROM notifications n
    JOIN notification_types nt ON n.type_id = nt.id
    WHERE n.user_id = ?
  `;
  
  const params = [userId];
  
  if (isRead !== undefined) {
    sql += ' AND n.is_read = ?';
    params.push(isRead);
  }
  
  if (isDismissed !== undefined) {
    sql += ' AND n.is_dismissed = ?';
    params.push(isDismissed);
  }
  
  sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const notifications = await query(sql, params);
  
  return notifications;
};

/**
 * Mark a notification as read
 */
const markNotificationAsRead = async (notificationId, userId) => {
  // Check if the notification belongs to the user
  const notifications = await query(
    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  if (notifications.length === 0) {
    throw new Error('Notification not found or does not belong to you');
  }
  
  // Mark as read
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = ?',
    [notificationId]
  );
  
  return {
    success: true,
    message: 'Notification marked as read'
  };
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (userId) => {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  
  return {
    success: true,
    message: 'All notifications marked as read'
  };
};

/**
 * Dismiss a notification
 */
const dismissNotification = async (notificationId, userId) => {
  // Check if the notification belongs to the user
  const notifications = await query(
    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  if (notifications.length === 0) {
    throw new Error('Notification not found or does not belong to you');
  }
  
  // Mark as dismissed
  await query(
    'UPDATE notifications SET is_dismissed = TRUE WHERE id = ?',
    [notificationId]
  );
  
  return {
    success: true,
    message: 'Notification dismissed'
  };
};

/**
 * Get user notification preferences
 */
const getUserNotificationPreferences = async (userId) => {
  // Get all notification types
  const types = await query(
    'SELECT * FROM notification_types ORDER BY name',
    []
  );
  
  // Get user preferences
  const preferences = await query(
    'SELECT * FROM user_notification_preferences WHERE user_id = ?',
    [userId]
  );
  
  // Create a map of preferences by type ID
  const prefsMap = {};
  preferences.forEach(pref => {
    prefsMap[pref.notification_type_id] = pref;
  });
  
  // Combine types with preferences
  const result = types.map(type => {
    const pref = prefsMap[type.id] || {
      notification_type_id: type.id,
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true
    };
    
    return {
      type: {
        id: type.id,
        name: type.name,
        description: type.description,
        importance: type.importance
      },
      preferences: {
        emailEnabled: !!pref.email_enabled,
        pushEnabled: !!pref.push_enabled,
        inAppEnabled: !!pref.in_app_enabled
      }
    };
  });
  
  return result;
};

/**
 * Update user notification preferences
 */
const updateUserNotificationPreferences = async (userId, typeId, preferences) => {
  const { emailEnabled, pushEnabled, inAppEnabled } = preferences;
  
  // Check if the notification type exists
  const types = await query(
    'SELECT * FROM notification_types WHERE id = ?',
    [typeId]
  );
  
  if (types.length === 0) {
    throw new Error('Notification type not found');
  }
  
  // Check if preference already exists
  const existingPrefs = await query(
    'SELECT * FROM user_notification_preferences WHERE user_id = ? AND notification_type_id = ?',
    [userId, typeId]
  );
  
  if (existingPrefs.length > 0) {
    // Update existing preference
    await query(
      `UPDATE user_notification_preferences 
       SET email_enabled = ?, push_enabled = ?, in_app_enabled = ? 
       WHERE user_id = ? AND notification_type_id = ?`,
      [
        emailEnabled !== undefined ? emailEnabled : existingPrefs[0].email_enabled,
        pushEnabled !== undefined ? pushEnabled : existingPrefs[0].push_enabled,
        inAppEnabled !== undefined ? inAppEnabled : existingPrefs[0].in_app_enabled,
        userId,
        typeId
      ]
    );
  } else {
    // Create new preference
    await query(
      `INSERT INTO user_notification_preferences 
       (user_id, notification_type_id, email_enabled, push_enabled, in_app_enabled) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        typeId,
        emailEnabled !== undefined ? emailEnabled : true,
        pushEnabled !== undefined ? pushEnabled : true,
        inAppEnabled !== undefined ? inAppEnabled : true
      ]
    );
  }
  
  return {
    success: true,
    message: 'Notification preferences updated successfully'
  };
};

module.exports = {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  getUserNotificationPreferences,
  updateUserNotificationPreferences
}; 