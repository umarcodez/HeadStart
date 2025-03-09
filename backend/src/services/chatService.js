/**
 * Chat Service
 * 
 * Handles chat functionality and real-time messaging
 */
const { query } = require('../config/db');
const notificationService = require('./notificationService');

/**
 * Create a new chat channel
 */
const createChannel = async (userId, channelData) => {
  const { name, description, isDirect, participants } = channelData;

  if (isDirect && (!participants || participants.length !== 1)) {
    throw new Error('Direct message channels must have exactly one participant');
  }

  // For direct messages, check if a channel already exists
  if (isDirect) {
    const existingChannel = await query(
      `SELECT c.* FROM chat_channels c
       JOIN chat_channel_members m1 ON c.id = m1.channel_id
       JOIN chat_channel_members m2 ON c.id = m2.channel_id
       WHERE c.is_direct = TRUE
       AND ((m1.user_id = ? AND m2.user_id = ?)
       OR (m1.user_id = ? AND m2.user_id = ?))
       AND m1.user_id != m2.user_id`,
      [userId, participants[0], participants[0], userId]
    );

    if (existingChannel.length > 0) {
      return {
        success: true,
        message: 'Channel already exists',
        channelId: existingChannel[0].id
      };
    }
  }

  // Start transaction
  await query('START TRANSACTION');

  try {
    // Create the channel
    const channelResult = await query(
      `INSERT INTO chat_channels 
       (name, description, is_direct, created_by) 
       VALUES (?, ?, ?, ?)`,
      [name, description, isDirect, userId]
    );

    const channelId = channelResult.insertId;

    // Add the creator as a member with owner role
    await query(
      `INSERT INTO chat_channel_members 
       (channel_id, user_id, role) 
       VALUES (?, ?, 'owner')`,
      [channelId, userId]
    );

    // Add participants if provided
    if (participants && participants.length > 0) {
      for (const participantId of participants) {
        if (participantId === userId) continue;

        await query(
          `INSERT INTO chat_channel_members 
           (channel_id, user_id, role) 
           VALUES (?, ?, 'member')`,
          [channelId, participantId]
        );

        // Notify the participant
        await notificationService.sendNotification({
          userId: participantId,
          type: 'chat_invitation',
          referenceId: channelId,
          referenceType: 'chat_channel',
          data: {
            channel_name: name || 'Direct Message',
            inviter_name: userId // Should be user's name in production
          }
        });
      }
    }

    await query('COMMIT');

    return {
      success: true,
      message: 'Channel created successfully',
      channelId
    };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Send a message in a channel
 */
const sendMessage = async (userId, channelId, messageData) => {
  const { content, parentMessageId = null } = messageData;

  // Check if user is a member of the channel
  const members = await query(
    'SELECT * FROM chat_channel_members WHERE channel_id = ? AND user_id = ?',
    [channelId, userId]
  );

  if (members.length === 0) {
    throw new Error('You are not a member of this channel');
  }

  // If this is a reply, verify the parent message exists in the same channel
  if (parentMessageId) {
    const parentMessages = await query(
      'SELECT * FROM chat_messages WHERE id = ? AND channel_id = ?',
      [parentMessageId, channelId]
    );

    if (parentMessages.length === 0) {
      throw new Error('Parent message not found in this channel');
    }
  }

  // Send the message
  const messageResult = await query(
    `INSERT INTO chat_messages 
     (channel_id, sender_id, message, parent_message_id) 
     VALUES (?, ?, ?, ?)`,
    [channelId, userId, content, parentMessageId]
  );

  const messageId = messageResult.insertId;

  // Get channel members to notify them
  const channelMembers = await query(
    'SELECT user_id FROM chat_channel_members WHERE channel_id = ? AND user_id != ?',
    [channelId, userId]
  );

  // Notify other channel members
  for (const member of channelMembers) {
    await notificationService.sendNotification({
      userId: member.user_id,
      type: 'new_message',
      referenceId: messageId,
      referenceType: 'chat_message',
      data: {
        sender_name: userId, // Should be user's name in production
        channel_id: channelId
      }
    });
  }

  return {
    success: true,
    message: 'Message sent successfully',
    messageId
  };
};

/**
 * Get messages from a channel
 */
const getChannelMessages = async (userId, channelId, options = {}) => {
  const { 
    limit = 50, 
    before = null, 
    parentMessageId = null 
  } = options;

  // Check if user is a member of the channel
  const members = await query(
    'SELECT * FROM chat_channel_members WHERE channel_id = ? AND user_id = ?',
    [channelId, userId]
  );

  if (members.length === 0) {
    throw new Error('You are not a member of this channel');
  }

  // Build query based on options
  let sql = `
    SELECT m.*, u.name as sender_name, u.profile_picture as sender_profile_picture
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.channel_id = ?
    AND m.parent_message_id ${parentMessageId ? '= ?' : 'IS NULL'}
  `;

  const params = [channelId];
  if (parentMessageId) params.push(parentMessageId);

  if (before) {
    sql += ' AND m.id < ?';
    params.push(before);
  }

  sql += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(limit);

  const messages = await query(sql, params);

  // Update last read message for the user
  if (messages.length > 0) {
    const latestMessageId = Math.max(...messages.map(m => m.id));
    await query(
      'UPDATE chat_channel_members SET last_read_message_id = ? WHERE channel_id = ? AND user_id = ?',
      [latestMessageId, channelId, userId]
    );
  }

  // Get reactions for each message
  for (const message of messages) {
    const reactions = await query(
      `SELECT r.*, u.name as user_name 
       FROM chat_message_reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.message_id = ?`,
      [message.id]
    );
    message.reactions = reactions;

    // Get attachments
    const attachments = await query(
      'SELECT * FROM chat_message_attachments WHERE message_id = ?',
      [message.id]
    );
    message.attachments = attachments;
  }

  return messages;
};

/**
 * Get user's channels
 */
const getUserChannels = async (userId) => {
  const channels = await query(
    `SELECT c.*, 
            cm.role as user_role,
            cm.last_read_message_id,
            (SELECT COUNT(*) 
             FROM chat_messages m 
             WHERE m.channel_id = c.id 
             AND m.id > COALESCE(cm.last_read_message_id, 0)) as unread_count
     FROM chat_channels c
     JOIN chat_channel_members cm ON c.id = cm.channel_id
     WHERE cm.user_id = ?
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  // Get members for each channel
  for (const channel of channels) {
    const members = await query(
      `SELECT cm.*, u.name, u.profile_picture 
       FROM chat_channel_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.channel_id = ?`,
      [channel.id]
    );
    channel.members = members;
  }

  return channels;
};

/**
 * Add reaction to a message
 */
const addMessageReaction = async (userId, messageId, reaction) => {
  // Check if the message exists and user has access
  const messages = await query(
    `SELECT m.* FROM chat_messages m
     JOIN chat_channel_members cm ON m.channel_id = cm.channel_id
     WHERE m.id = ? AND cm.user_id = ?`,
    [messageId, userId]
  );

  if (messages.length === 0) {
    throw new Error('Message not found or you do not have access');
  }

  // Add the reaction
  await query(
    `INSERT INTO chat_message_reactions (message_id, user_id, reaction)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE reaction = ?`,
    [messageId, userId, reaction, reaction]
  );

  return {
    success: true,
    message: 'Reaction added successfully'
  };
};

/**
 * Remove reaction from a message
 */
const removeMessageReaction = async (userId, messageId, reaction) => {
  await query(
    'DELETE FROM chat_message_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?',
    [messageId, userId, reaction]
  );

  return {
    success: true,
    message: 'Reaction removed successfully'
  };
};

/**
 * Add members to a channel
 */
const addChannelMembers = async (userId, channelId, newMemberIds) => {
  // Check if user has permission to add members
  const members = await query(
    'SELECT * FROM chat_channel_members WHERE channel_id = ? AND user_id = ? AND role IN ("owner", "admin")',
    [channelId, userId]
  );

  if (members.length === 0) {
    throw new Error('You do not have permission to add members to this channel');
  }

  // Get channel details
  const channels = await query(
    'SELECT * FROM chat_channels WHERE id = ?',
    [channelId]
  );

  if (channels.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = channels[0];

  if (channel.is_direct) {
    throw new Error('Cannot add members to a direct message channel');
  }

  // Add new members
  for (const memberId of newMemberIds) {
    // Check if already a member
    const existingMember = await query(
      'SELECT * FROM chat_channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, memberId]
    );

    if (existingMember.length === 0) {
      await query(
        'INSERT INTO chat_channel_members (channel_id, user_id, role) VALUES (?, ?, "member")',
        [channelId, memberId]
      );

      // Notify the new member
      await notificationService.sendNotification({
        userId: memberId,
        type: 'chat_invitation',
        referenceId: channelId,
        referenceType: 'chat_channel',
        data: {
          channel_name: channel.name,
          inviter_name: userId // Should be user's name in production
        }
      });
    }
  }

  return {
    success: true,
    message: 'Members added successfully'
  };
};

/**
 * Remove a member from a channel
 */
const removeChannelMember = async (userId, channelId, memberIdToRemove) => {
  // Check if user has permission to remove members
  const members = await query(
    'SELECT * FROM chat_channel_members WHERE channel_id = ? AND user_id = ? AND role IN ("owner", "admin")',
    [channelId, userId]
  );

  if (members.length === 0 && userId !== memberIdToRemove) {
    throw new Error('You do not have permission to remove members from this channel');
  }

  // Get channel details
  const channels = await query(
    'SELECT * FROM chat_channels WHERE id = ?',
    [channelId]
  );

  if (channels.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = channels[0];

  if (channel.is_direct) {
    throw new Error('Cannot remove members from a direct message channel');
  }

  // Cannot remove the owner
  if (channel.created_by === memberIdToRemove) {
    throw new Error('Cannot remove the channel owner');
  }

  // Remove the member
  await query(
    'DELETE FROM chat_channel_members WHERE channel_id = ? AND user_id = ?',
    [channelId, memberIdToRemove]
  );

  return {
    success: true,
    message: 'Member removed successfully'
  };
};

module.exports = {
  createChannel,
  sendMessage,
  getChannelMessages,
  getUserChannels,
  addMessageReaction,
  removeMessageReaction,
  addChannelMembers,
  removeChannelMember
}; 