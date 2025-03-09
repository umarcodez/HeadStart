/**
 * Event Service
 * 
 * Handles event management and calendar functionality
 */
const { query } = require('../config/db');
const notificationService = require('./notificationService');

/**
 * Create a new event
 */
const createEvent = async (userId, eventData) => {
  const { 
    title, 
    description, 
    location,
    locationUrl,
    startTime, 
    endTime, 
    isAllDay = false,
    recurrencePattern, 
    recurrenceEndDate,
    color,
    isPrivate = false,
    participants,
    categoryIds
  } = eventData;
  
  // Validate required fields
  if (!title || !startTime || !endTime) {
    throw new Error('Event title, start time, and end time are required');
  }
  
  // Validate start and end times
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end time');
  }
  
  if (start > end) {
    throw new Error('Start time must be before end time');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Create the event
    const eventResult = await query(
      `INSERT INTO events 
       (creator_id, title, description, location, location_url, 
        start_time, end_time, is_all_day, recurrence_pattern, 
        recurrence_end_date, color, is_private, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [
        userId, 
        title, 
        description || '', 
        location || null, 
        locationUrl || null,
        startTime, 
        endTime, 
        isAllDay, 
        recurrencePattern || null, 
        recurrenceEndDate || null,
        color || '#3788d8',
        isPrivate
      ]
    );
    
    const eventId = eventResult.insertId;
    
    // Add the creator as a participant (automatically accepted)
    await query(
      'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, "accepted")',
      [eventId, userId]
    );
    
    // Add event categories if provided
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await query(
          'INSERT INTO event_category_relationship (event_id, category_id) VALUES (?, ?)',
          [eventId, categoryId]
        );
      }
    }
    
    // Add participants if provided
    if (participants && Array.isArray(participants) && participants.length > 0) {
      for (const participantId of participants) {
        // Skip if it's the creator (already added)
        if (participantId === userId) continue;
        
        await query(
          'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, "pending")',
          [eventId, participantId]
        );
        
        // Send notification to the participant
        try {
          await notificationService.sendNotification({
            userId: participantId,
            type: 'event_invitation',
            referenceId: eventId,
            referenceType: 'event',
            data: {
              event_title: title,
              event_date: new Date(startTime).toLocaleString(),
              creator_name: userId // This should ideally be the user's name, not ID
            }
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
          // Continue execution even if notification fails
        }
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Event created successfully',
      eventId
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Update an event
 */
const updateEvent = async (eventId, userId, eventData) => {
  // Get event details to check permissions
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found');
  }
  
  const event = events[0];
  
  // Check if user is the creator of the event
  if (event.creator_id !== userId) {
    throw new Error('You do not have permission to update this event');
  }
  
  const { 
    title, 
    description, 
    location,
    locationUrl,
    startTime, 
    endTime, 
    isAllDay,
    recurrencePattern, 
    recurrenceEndDate,
    color,
    isPrivate,
    status,
    categoryIds
  } = eventData;
  
  // Validate start and end times if provided
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid start or end time');
    }
    
    if (start > end) {
      throw new Error('Start time must be before end time');
    }
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Update the event
    await query(
      `UPDATE events 
       SET title = ?, 
           description = ?, 
           location = ?, 
           location_url = ?, 
           start_time = ?, 
           end_time = ?, 
           is_all_day = ?, 
           recurrence_pattern = ?, 
           recurrence_end_date = ?, 
           color = ?, 
           is_private = ?,
           status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || event.title, 
        description !== undefined ? description : event.description, 
        location !== undefined ? location : event.location, 
        locationUrl !== undefined ? locationUrl : event.location_url,
        startTime || event.start_time, 
        endTime || event.end_time, 
        isAllDay !== undefined ? isAllDay : event.is_all_day, 
        recurrencePattern !== undefined ? recurrencePattern : event.recurrence_pattern, 
        recurrenceEndDate !== undefined ? recurrenceEndDate : event.recurrence_end_date,
        color || event.color,
        isPrivate !== undefined ? isPrivate : event.is_private,
        status || event.status,
        eventId
      ]
    );
    
    // Update event categories if provided
    if (categoryIds && Array.isArray(categoryIds)) {
      // Remove all existing categories
      await query(
        'DELETE FROM event_category_relationship WHERE event_id = ?',
        [eventId]
      );
      
      // Add new categories
      for (const categoryId of categoryIds) {
        await query(
          'INSERT INTO event_category_relationship (event_id, category_id) VALUES (?, ?)',
          [eventId, categoryId]
        );
      }
    }
    
    // Get all participants to notify them about the update
    const participants = await query(
      'SELECT user_id FROM event_participants WHERE event_id = ? AND user_id != ?',
      [eventId, userId]
    );
    
    // Send notifications to all participants
    for (const participant of participants) {
      try {
        await notificationService.sendNotification({
          userId: participant.user_id,
          type: 'event_update',
          referenceId: eventId,
          referenceType: 'event',
          data: {
            event_title: title || event.title
          }
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Continue execution even if notification fails
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Event updated successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Delete an event
 */
const deleteEvent = async (eventId, userId) => {
  // Get event details to check permissions
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found');
  }
  
  const event = events[0];
  
  // Check if user is the creator of the event
  if (event.creator_id !== userId) {
    throw new Error('You do not have permission to delete this event');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Get all participants to notify them about the cancellation
    const participants = await query(
      'SELECT user_id FROM event_participants WHERE event_id = ? AND user_id != ?',
      [eventId, userId]
    );
    
    // Delete the event
    await query(
      'DELETE FROM events WHERE id = ?',
      [eventId]
    );
    
    // Send notifications to all participants
    for (const participant of participants) {
      try {
        await notificationService.sendNotification({
          userId: participant.user_id,
          type: 'event_cancelled',
          referenceId: eventId,
          referenceType: 'event',
          data: {
            event_title: event.title,
            event_date: new Date(event.start_time).toLocaleString()
          }
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Continue execution even if notification fails
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Event deleted successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Get event details
 */
const getEventDetails = async (eventId, userId) => {
  // Get event details
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found');
  }
  
  const event = events[0];
  
  // Check if user has access to the event
  // User has access if:
  // 1. They are the creator
  // 2. The event is not private
  // 3. They are a participant
  
  if (event.creator_id !== userId && event.is_private) {
    // If event is private, check if user is a participant
    const participants = await query(
      'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    
    if (participants.length === 0) {
      throw new Error('You do not have permission to view this event');
    }
  }
  
  // Get creator details
  const creators = await query(
    'SELECT id, name, email, profile_picture FROM users WHERE id = ?',
    [event.creator_id]
  );
  
  if (creators.length > 0) {
    event.creator = creators[0];
  }
  
  // Get event categories
  const categories = await query(
    `SELECT ec.* 
     FROM event_categories ec
     JOIN event_category_relationship ecr ON ec.id = ecr.category_id
     WHERE ecr.event_id = ?`,
    [eventId]
  );
  
  event.categories = categories;
  
  // Get event participants
  const participants = await query(
    `SELECT ep.*, u.name, u.email, u.profile_picture
     FROM event_participants ep
     JOIN users u ON ep.user_id = u.id
     WHERE ep.event_id = ?`,
    [eventId]
  );
  
  event.participants = participants;
  
  // Get event reminders for the current user
  const reminders = await query(
    'SELECT * FROM event_reminders WHERE event_id = ? AND user_id = ?',
    [eventId, userId]
  );
  
  event.reminders = reminders;
  
  // Get event attachments
  const attachments = await query(
    `SELECT ea.*, u.name as uploaded_by_name
     FROM event_attachments ea
     JOIN users u ON ea.user_id = u.id
     WHERE ea.event_id = ?`,
    [eventId]
  );
  
  event.attachments = attachments;
  
  return event;
};

/**
 * Get all events for a user
 */
const getUserEvents = async (userId, filters = {}) => {
  const { 
    startDate, 
    endDate, 
    status, 
    categories,
    includePrivate = true, // Include user's own private events
    includeParticipating = true // Include events the user is participating in
  } = filters;
  
  // Build the query based on filters
  let sql = `
    SELECT DISTINCT e.* 
    FROM events e
    LEFT JOIN event_participants ep ON e.id = ep.event_id
    LEFT JOIN event_category_relationship ecr ON e.id = ecr.event_id
    WHERE (e.creator_id = ? OR
          (e.is_private = FALSE) OR
          (e.is_private = TRUE AND ep.user_id = ?))
  `;
  
  const params = [userId, userId];
  
  // Add date range filter
  if (startDate && endDate) {
    sql += `
      AND (
        (e.start_time BETWEEN ? AND ?) OR
        (e.end_time BETWEEN ? AND ?) OR
        (e.start_time <= ? AND e.end_time >= ?)
      )
    `;
    params.push(startDate, endDate, startDate, endDate, startDate, endDate);
  } else if (startDate) {
    sql += ' AND e.end_time >= ?';
    params.push(startDate);
  } else if (endDate) {
    sql += ' AND e.start_time <= ?';
    params.push(endDate);
  }
  
  // Add status filter
  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }
  
  // Add category filter
  if (categories && Array.isArray(categories) && categories.length > 0) {
    sql += ' AND ecr.category_id IN (?)';
    params.push(categories);
  }
  
  // Include/exclude filters
  if (!includePrivate) {
    sql += ' AND (e.is_private = FALSE OR e.creator_id = ?)';
    params.push(userId);
  }
  
  if (!includeParticipating) {
    sql += ' AND e.creator_id = ?';
    params.push(userId);
  }
  
  sql += ' ORDER BY e.start_time ASC';
  
  const events = await query(sql, params);
  
  // Get additional details for each event
  for (const event of events) {
    // Get creator details
    const creators = await query(
      'SELECT id, name, email, profile_picture FROM users WHERE id = ?',
      [event.creator_id]
    );
    
    if (creators.length > 0) {
      event.creator = creators[0];
    }
    
    // Get event categories
    const eventCategories = await query(
      `SELECT ec.* 
       FROM event_categories ec
       JOIN event_category_relationship ecr ON ec.id = ecr.category_id
       WHERE ecr.event_id = ?`,
      [event.id]
    );
    
    event.categories = eventCategories;
    
    // Get participant count
    const participantCount = await query(
      'SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?',
      [event.id]
    );
    
    event.participantCount = participantCount[0].count;
    
    // Get user's participation status
    const participation = await query(
      'SELECT status FROM event_participants WHERE event_id = ? AND user_id = ?',
      [event.id, userId]
    );
    
    event.userParticipation = participation.length > 0 ? participation[0].status : null;
  }
  
  return events;
};

/**
 * Respond to an event invitation
 */
const respondToEvent = async (eventId, userId, response) => {
  // Check if the invitation exists
  const invitations = await query(
    'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
    [eventId, userId]
  );
  
  if (invitations.length === 0) {
    throw new Error('Event invitation not found');
  }
  
  // Check if the response is valid
  const validResponses = ['accepted', 'declined', 'tentative'];
  if (!validResponses.includes(response)) {
    throw new Error('Invalid response. Must be "accepted", "declined", or "tentative"');
  }
  
  // Update the participant status
  await query(
    'UPDATE event_participants SET status = ? WHERE event_id = ? AND user_id = ?',
    [response, eventId, userId]
  );
  
  // If accepted or tentative, create default reminder (e.g., 15 minutes before)
  if (response === 'accepted' || response === 'tentative') {
    // Get event details to calculate reminder time
    const events = await query(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );
    
    if (events.length > 0) {
      const event = events[0];
      const eventStartTime = new Date(event.start_time);
      const reminderTime = new Date(eventStartTime.getTime() - 15 * 60000); // 15 minutes before
      
      // Only create a reminder if the event is in the future
      if (reminderTime > new Date()) {
        // Check if a reminder already exists
        const existingReminders = await query(
          'SELECT * FROM event_reminders WHERE event_id = ? AND user_id = ?',
          [eventId, userId]
        );
        
        if (existingReminders.length === 0) {
          await query(
            'INSERT INTO event_reminders (event_id, user_id, reminder_time) VALUES (?, ?, ?)',
            [eventId, userId, reminderTime]
          );
        }
      }
    }
  }
  
  // Notify the event creator
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length > 0) {
    const event = events[0];
    
    if (event.creator_id !== userId) {
      // Get user name for the notification message
      const users = await query(
        'SELECT name FROM users WHERE id = ?',
        [userId]
      );
      
      const userName = users.length > 0 ? users[0].name : userId;
      
      try {
        await notificationService.sendNotification({
          userId: event.creator_id,
          type: 'event_update',
          referenceId: eventId,
          referenceType: 'event',
          data: {
            event_title: event.title,
            message: `${userName} has ${response} your invitation`
          }
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Continue execution even if notification fails
      }
    }
  }
  
  return {
    success: true,
    message: `Successfully ${response} the event invitation`
  };
};

/**
 * Add a reminder for an event
 */
const addEventReminder = async (eventId, userId, reminderData) => {
  const { reminderTime } = reminderData;
  
  if (!reminderTime) {
    throw new Error('Reminder time is required');
  }
  
  // Check if user has access to the event
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found');
  }
  
  const event = events[0];
  
  if (event.creator_id !== userId) {
    const participants = await query(
      'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    
    if (participants.length === 0) {
      throw new Error('You do not have access to this event');
    }
  }
  
  // Validate reminder time
  const reminderDate = new Date(reminderTime);
  if (isNaN(reminderDate.getTime())) {
    throw new Error('Invalid reminder time');
  }
  
  const eventStartTime = new Date(event.start_time);
  if (reminderDate >= eventStartTime) {
    throw new Error('Reminder time must be before the event start time');
  }
  
  // Add the reminder
  await query(
    'INSERT INTO event_reminders (event_id, user_id, reminder_time) VALUES (?, ?, ?)',
    [eventId, userId, reminderTime]
  );
  
  return {
    success: true,
    message: 'Reminder added successfully'
  };
};

/**
 * Delete an event reminder
 */
const deleteEventReminder = async (reminderId, userId) => {
  // Check if the reminder exists and belongs to the user
  const reminders = await query(
    'SELECT * FROM event_reminders WHERE id = ? AND user_id = ?',
    [reminderId, userId]
  );
  
  if (reminders.length === 0) {
    throw new Error('Reminder not found or you do not have permission to delete it');
  }
  
  // Delete the reminder
  await query(
    'DELETE FROM event_reminders WHERE id = ?',
    [reminderId]
  );
  
  return {
    success: true,
    message: 'Reminder deleted successfully'
  };
};

/**
 * Get all event categories
 */
const getEventCategories = async () => {
  const categories = await query(
    'SELECT * FROM event_categories ORDER BY name',
    []
  );
  
  return categories;
};

/**
 * Create a new event category
 */
const createEventCategory = async (categoryData) => {
  const { name, color } = categoryData;
  
  if (!name || !color) {
    throw new Error('Category name and color are required');
  }
  
  // Check if the category already exists
  const existingCategories = await query(
    'SELECT * FROM event_categories WHERE name = ?',
    [name]
  );
  
  if (existingCategories.length > 0) {
    throw new Error('A category with this name already exists');
  }
  
  // Create the category
  const result = await query(
    'INSERT INTO event_categories (name, color) VALUES (?, ?)',
    [name, color]
  );
  
  return {
    success: true,
    message: 'Category created successfully',
    categoryId: result.insertId
  };
};

/**
 * Add an attachment to an event
 */
const addEventAttachment = async (eventId, userId, attachmentData, file) => {
  // Check if user has access to add attachments to the event
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found');
  }
  
  const event = events[0];
  
  // Only the creator or participants can add attachments
  if (event.creator_id !== userId) {
    const participants = await query(
      'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ? AND status IN ("accepted", "tentative")',
      [eventId, userId]
    );
    
    if (participants.length === 0) {
      throw new Error('You do not have permission to add attachments to this event');
    }
  }
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Add the attachment
  await query(
    'INSERT INTO event_attachments (event_id, user_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
    [eventId, userId, file.originalname, file.path, file.mimetype, file.size]
  );
  
  return {
    success: true,
    message: 'Attachment added successfully'
  };
};

/**
 * Delete an event attachment
 */
const deleteEventAttachment = async (attachmentId, userId) => {
  // Check if the attachment exists
  const attachments = await query(
    'SELECT * FROM event_attachments WHERE id = ?',
    [attachmentId]
  );
  
  if (attachments.length === 0) {
    throw new Error('Attachment not found');
  }
  
  const attachment = attachments[0];
  
  // Check if the user is the creator of the event or uploaded the attachment
  if (attachment.user_id !== userId) {
    const events = await query(
      'SELECT * FROM events WHERE id = ?',
      [attachment.event_id]
    );
    
    if (events.length === 0 || events[0].creator_id !== userId) {
      throw new Error('You do not have permission to delete this attachment');
    }
  }
  
  // Delete the attachment
  await query(
    'DELETE FROM event_attachments WHERE id = ?',
    [attachmentId]
  );
  
  return {
    success: true,
    message: 'Attachment deleted successfully'
  };
};

/**
 * Add participants to an event
 */
const addEventParticipants = async (eventId, userId, participantIds) => {
  // Check if user is the creator of the event
  const events = await query(
    'SELECT * FROM events WHERE id = ? AND creator_id = ?',
    [eventId, userId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found or you do not have permission to add participants');
  }
  
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new Error('Participant IDs are required');
  }
  
  const event = events[0];
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    for (const participantId of participantIds) {
      // Check if the participant is already invited
      const existingParticipants = await query(
        'SELECT * FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, participantId]
      );
      
      if (existingParticipants.length === 0) {
        // Add the participant
        await query(
          'INSERT INTO event_participants (event_id, user_id, status) VALUES (?, ?, "pending")',
          [eventId, participantId]
        );
        
        // Send notification to the participant
        try {
          await notificationService.sendNotification({
            userId: participantId,
            type: 'event_invitation',
            referenceId: eventId,
            referenceType: 'event',
            data: {
              event_title: event.title,
              event_date: new Date(event.start_time).toLocaleString(),
              creator_name: userId // This should ideally be the user's name, not ID
            }
          });
        } catch (error) {
          console.error('Failed to send notification:', error);
          // Continue execution even if notification fails
        }
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Participants added successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Remove a participant from an event
 */
const removeEventParticipant = async (eventId, userId, participantId) => {
  // Check if user is the creator of the event or removing themselves
  const events = await query(
    'SELECT * FROM events WHERE id = ?',
    [eventId]
  );
  
  if (events.length === 0) {
    throw new Error('Event not found');
  }
  
  // If user is not the creator and not removing themselves, deny permission
  if (events[0].creator_id !== userId && userId !== participantId) {
    throw new Error('You do not have permission to remove this participant');
  }
  
  // Cannot remove the creator
  if (events[0].creator_id === participantId) {
    throw new Error('Cannot remove the event creator');
  }
  
  // Remove the participant
  await query(
    'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
    [eventId, participantId]
  );
  
  // Also remove any reminders
  await query(
    'DELETE FROM event_reminders WHERE event_id = ? AND user_id = ?',
    [eventId, participantId]
  );
  
  return {
    success: true,
    message: 'Participant removed successfully'
  };
};

/**
 * Process due reminders (to be called by a cron job)
 */
const processDueReminders = async () => {
  // Get all reminders that are due but not yet sent
  const now = new Date();
  
  const dueReminders = await query(
    `SELECT er.*, e.title as event_title, e.start_time as event_start_time
     FROM event_reminders er
     JOIN events e ON er.event_id = e.id
     WHERE er.reminder_time <= ? AND er.reminded = FALSE AND e.start_time > ?`,
    [now, now]
  );
  
  // Process each reminder
  for (const reminder of dueReminders) {
    try {
      // Send notification to the user
      await notificationService.sendNotification({
        userId: reminder.user_id,
        type: 'event_reminder',
        referenceId: reminder.event_id,
        referenceType: 'event',
        data: {
          event_title: reminder.event_title,
          event_date: new Date(reminder.event_start_time).toLocaleString()
        }
      });
      
      // Mark the reminder as sent
      await query(
        'UPDATE event_reminders SET reminded = TRUE WHERE id = ?',
        [reminder.id]
      );
    } catch (error) {
      console.error(`Failed to process reminder ${reminder.id}:`, error);
      // Continue with next reminder
    }
  }
  
  return {
    success: true,
    processedCount: dueReminders.length
  };
};

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventDetails,
  getUserEvents,
  respondToEvent,
  addEventReminder,
  deleteEventReminder,
  getEventCategories,
  createEventCategory,
  addEventAttachment,
  deleteEventAttachment,
  addEventParticipants,
  removeEventParticipant,
  processDueReminders
}; 