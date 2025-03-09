const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Project routes
router.post('/projects', teamController.createNewProject);
router.get('/projects/:id', teamController.getProject);
router.put('/projects/:id', teamController.updateProjectDetails);

// Project skills routes
router.post('/projects/:id/skills', teamController.addSkillsToProject);
router.delete('/projects/:projectId/skills/:skillId', teamController.removeSkillFromProject);

// Team invitation routes
router.post('/projects/:projectId/invite', teamController.inviteUser);
router.get('/invitations', teamController.getPendingInvitations);
router.post('/invitations/:invitationId/respond', teamController.respondToTeamInvitation);

// Team member routes
router.delete('/projects/:projectId/members/:memberId', teamController.removeTeamMemberFromProject);

// Team matching routes
router.get('/projects/:projectId/matches', teamController.findTeamMatchesForProject);

module.exports = router; 