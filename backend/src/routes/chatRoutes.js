/**
 * Chat Routes
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// All chat routes require authentication
router.use(authenticate);

// Channel routes
router.post('/channels', chatController.createChannel);
router.get('/channels', chatController.getUserChannels);

// Channel messages
router.post('/channels/:channelId/messages', chatController.sendMessage);
router.get('/channels/:channelId/messages', chatController.getChannelMessages);

// Channel members
router.post('/channels/:channelId/members', chatController.addChannelMembers);
router.delete('/channels/:channelId/members/:memberId', chatController.removeChannelMember);

// Message reactions
router.post('/messages/:messageId/reactions', chatController.addMessageReaction);
router.delete('/messages/:messageId/reactions/:reaction', chatController.removeMessageReaction);

module.exports = router; 