const {
  createProject,
  getProjectDetails,
  updateProject,
  addProjectSkills,
  removeProjectSkill,
  inviteUserToProject,
  getUserInvitations,
  respondToInvitation,
  removeTeamMember,
  findTeamMatches
} = require('../services/teamService');

const { hasPermission } = require('../services/permissionService');

/**
 * Create a new project
 */
const createNewProject = async (req, res) => {
  try {
    // Check if user has permission to create projects
    const canCreateProject = await hasPermission(req.user.uid, 'create_project');
    
    if (!canCreateProject) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create projects'
      });
    }
    
    const {
      name,
      description,
      budget,
      startDate,
      endDate
    } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }
    
    // Create project
    const result = await createProject(req.user.uid, {
      name,
      description,
      budget,
      startDate,
      endDate
    });
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      projectId: result.projectId
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get project by ID
 */
const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    // Get project details
    const project = await getProjectDetails(id);
    
    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    
    if (error.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching project details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update project details
 */
const updateProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      budget,
      startDate,
      endDate,
      status
    } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and name are required'
      });
    }
    
    // Check if user has permission to edit this project
    const canEditProject = await hasPermission(req.user.uid, 'edit_project', id);
    
    if (!canEditProject) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this project'
      });
    }
    
    // Update project
    await updateProject(id, req.user.uid, {
      name,
      description,
      budget,
      startDate,
      endDate,
      status
    });
    
    res.status(200).json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add skills to a project
 */
const addSkillsToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { skills } = req.body;
    
    if (!id || !skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and skills array are required'
      });
    }
    
    // Add skills
    await addProjectSkills(id, req.user.uid, skills);
    
    res.status(200).json({
      success: true,
      message: 'Project skills added successfully'
    });
  } catch (error) {
    console.error('Error adding project skills:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error adding project skills',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove a skill from a project
 */
const removeSkillFromProject = async (req, res) => {
  try {
    const { projectId, skillId } = req.params;
    
    if (!projectId || !skillId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and Skill ID are required'
      });
    }
    
    // Remove skill
    await removeProjectSkill(projectId, req.user.uid, skillId);
    
    res.status(200).json({
      success: true,
      message: 'Project skill removed successfully'
    });
  } catch (error) {
    console.error('Error removing project skill:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error removing project skill',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Invite user to a project
 */
const inviteUser = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role, message } = req.body;
    
    if (!projectId || !userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, user ID, and role are required'
      });
    }
    
    // Check if user has permission to invite team members
    const canInvite = await hasPermission(req.user.uid, 'invite_team_members', projectId);
    
    if (!canInvite) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to invite team members'
      });
    }
    
    // Invite user
    await inviteUserToProject(projectId, req.user.uid, userId, role, message);
    
    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    
    if (error.message.includes('already has a pending invitation') ||
        error.message.includes('already a member')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error sending invitation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's pending invitations
 */
const getPendingInvitations = async (req, res) => {
  try {
    // Get invitations
    const invitations = await getUserInvitations(req.user.uid);
    
    res.status(200).json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Respond to an invitation
 */
const respondToTeamInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { accept } = req.body;
    
    if (!invitationId || accept === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invitation ID and accept status are required'
      });
    }
    
    // Respond to invitation
    const result = await respondToInvitation(invitationId, req.user.uid, accept);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    
    if (error.message.includes('not found or already processed')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error responding to invitation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove a team member
 */
const removeTeamMemberFromProject = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    
    if (!projectId || !memberId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and member ID are required'
      });
    }
    
    // Remove team member
    await removeTeamMember(projectId, req.user.uid, memberId);
    
    res.status(200).json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error removing team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Find matching team members for a project
 */
const findTeamMatchesForProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit } = req.query;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    // Check if user has permission to view this project
    const canView = await hasPermission(req.user.uid, 'view_team_reports', projectId);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view team matches for this project'
      });
    }
    
    // Find matches
    const matches = await findTeamMatches(projectId, limit ? parseInt(limit) : 10);
    
    res.status(200).json({
      success: true,
      ...matches
    });
  } catch (error) {
    console.error('Error finding team matches:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding team matches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createNewProject,
  getProject,
  updateProjectDetails,
  addSkillsToProject,
  removeSkillFromProject,
  inviteUser,
  getPendingInvitations,
  respondToTeamInvitation,
  removeTeamMemberFromProject,
  findTeamMatchesForProject
}; 