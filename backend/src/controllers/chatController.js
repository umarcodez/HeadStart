/**
 * Chat Controller
 * 
 * Handles chat-related HTTP endpoints
 */
const chatService = require('../services/chatService');
const { validateRequest } = require('../middleware/validation');
const { handleError } = require('../utils/errorHandler');

/**
 * Create a new chat channel
 * @route POST /api/chat/channels
 */
const createChannel = async (req, res) => {
  try {
    const { name, description, isDirect, participants } = req.body;
    const userId = req.user.id;

    // Validate request
    validateRequest({
      name: { type: 'string', required: !isDirect },
      description: { type: 'string', required: false },
      isDirect: { type: 'boolean', required: true },
      participants: { type: 'array', required: true, minLength: isDirect ? 1 : 0 }
    }, req.body);

    const result = await chatService.createChannel(userId, {
      name,
      description,
      isDirect,
      participants
    });

    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Send a message in a channel
 * @route POST /api/chat/channels/:channelId/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, parentMessageId } = req.body;
    const userId = req.user.id;

    // Validate request
    validateRequest({
      content: { type: 'string', required: true, minLength: 1 },
      parentMessageId: { type: 'number', required: false }
    }, req.body);

    const result = await chatService.sendMessage(userId, channelId, {
      content,
      parentMessageId
    });

    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Get messages from a channel
 * @route GET /api/chat/channels/:channelId/messages
 */
const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit, before, parentMessageId } = req.query;
    const userId = req.user.id;

    const messages = await chatService.getChannelMessages(userId, channelId, {
      limit: limit ? parseInt(limit) : undefined,
      before: before ? parseInt(before) : undefined,
      parentMessageId: parentMessageId ? parseInt(parentMessageId) : undefined
    });

    res.json(messages);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Get user's channels
 * @route GET /api/chat/channels
 */
const getUserChannels = async (req, res) => {
  try {
    const userId = req.user.id;
    const channels = await chatService.getUserChannels(userId);
    res.json(channels);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Add reaction to a message
 * @route POST /api/chat/messages/:messageId/reactions
 */
const addMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.id;

    // Validate request
    validateRequest({
      reaction: { type: 'string', required: true }
    }, req.body);

    const result = await chatService.addMessageReaction(userId, messageId, reaction);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Remove reaction from a message
 * @route DELETE /api/chat/messages/:messageId/reactions/:reaction
 */
const removeMessageReaction = async (req, res) => {
  try {
    const { messageId, reaction } = req.params;
    const userId = req.user.id;

    const result = await chatService.removeMessageReaction(userId, messageId, reaction);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Add members to a channel
 * @route POST /api/chat/channels/:channelId/members
 */
const addChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.id;

    // Validate request
    validateRequest({
      memberIds: { type: 'array', required: true, minLength: 1 }
    }, req.body);

    const result = await chatService.addChannelMembers(userId, channelId, memberIds);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Remove a member from a channel
 * @route DELETE /api/chat/channels/:channelId/members/:memberId
 */
const removeChannelMember = async (req, res) => {
  try {
    const { channelId, memberId } = req.params;
    const userId = req.user.id;

    const result = await chatService.removeChannelMember(userId, channelId, memberId);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
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