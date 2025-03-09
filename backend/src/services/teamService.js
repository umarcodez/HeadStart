/**
 * Team Service
 * 
 * Handles team creation, invitations, and AI-based team matching
 */
const { query } = require('../config/db');

/**
 * Create a new project
 */
const createProject = async (userId, projectData) => {
  const {
    name,
    description,
    budget,
    startDate,
    endDate
  } = projectData;
  
  // Insert project record
  const result = await query(
    `INSERT INTO projects 
      (name, description, owner_id, budget, start_date, end_date, status) 
     VALUES (?, ?, ?, ?, ?, ?, 'planning')`,
    [name, description, userId, budget, startDate, endDate]
  );
  
  const projectId = result.insertId;
  
  return {
    success: true,
    message: 'Project created successfully',
    projectId
  };
};

/**
 * Get project details
 */
const getProjectDetails = async (projectId) => {
  // Get basic project info
  const projects = await query(
    `SELECT p.*, u.first_name as owner_first_name, u.last_name as owner_last_name 
     FROM projects p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [projectId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found');
  }
  
  const project = projects[0];
  
  // Get project skills
  const skills = await query(
    `SELECT ps.*, s.name, s.category 
     FROM project_skills ps
     JOIN skills s ON ps.skill_id = s.id
     WHERE ps.project_id = ?`,
    [projectId]
  );
  
  // Get team members
  const teamMembers = await query(
    `SELECT tm.*, u.first_name, u.last_name, u.email, u.profile_picture, r.name as role
     FROM team_members tm
     JOIN users u ON tm.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     WHERE tm.project_id = ?`,
    [projectId]
  );
  
  return {
    ...project,
    skills,
    teamMembers
  };
};

/**
 * Update project details
 */
const updateProject = async (projectId, userId, projectData) => {
  // Check if user is project owner
  const projects = await query(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, userId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found or you do not have permission to update it');
  }
  
  const {
    name,
    description,
    budget,
    startDate,
    endDate,
    status
  } = projectData;
  
  // Update project
  await query(
    `UPDATE projects 
     SET name = ?, description = ?, budget = ?, 
         start_date = ?, end_date = ?, status = ?, updated_at = NOW() 
     WHERE id = ?`,
    [name, description, budget, startDate, endDate, status, projectId]
  );
  
  return {
    success: true,
    message: 'Project updated successfully'
  };
};

/**
 * Add required skills to a project
 */
const addProjectSkills = async (projectId, userId, skills) => {
  // Check if user is project owner
  const projects = await query(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, userId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found or you do not have permission to update it');
  }
  
  // Add skills
  for (const skill of skills) {
    // Check if skill already exists
    const existingSkills = await query(
      'SELECT id FROM project_skills WHERE project_id = ? AND skill_id = ?',
      [projectId, skill.skillId]
    );
    
    if (existingSkills.length) {
      // Update existing skill
      await query(
        'UPDATE project_skills SET importance = ? WHERE project_id = ? AND skill_id = ?',
        [skill.importance, projectId, skill.skillId]
      );
    } else {
      // Add new skill
      await query(
        'INSERT INTO project_skills (project_id, skill_id, importance) VALUES (?, ?, ?)',
        [projectId, skill.skillId, skill.importance]
      );
    }
  }
  
  return {
    success: true,
    message: 'Project skills added successfully'
  };
};

/**
 * Remove a skill from a project
 */
const removeProjectSkill = async (projectId, userId, skillId) => {
  // Check if user is project owner
  const projects = await query(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, userId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found or you do not have permission to update it');
  }
  
  // Remove skill
  await query(
    'DELETE FROM project_skills WHERE project_id = ? AND skill_id = ?',
    [projectId, skillId]
  );
  
  return {
    success: true,
    message: 'Project skill removed successfully'
  };
};

/**
 * Invite user to a project
 */
const inviteUserToProject = async (projectId, inviterId, inviteeId, role, message) => {
  // Check if user is project owner or has permission
  const projects = await query(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, inviterId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found or you do not have permission to invite users');
  }
  
  // Check if invitation already exists
  const existingInvitations = await query(
    'SELECT id FROM team_invitations WHERE project_id = ? AND invitee_id = ? AND status = "pending"',
    [projectId, inviteeId]
  );
  
  if (existingInvitations.length) {
    throw new Error('User already has a pending invitation to this project');
  }
  
  // Check if already a team member
  const existingMembers = await query(
    'SELECT id FROM team_members WHERE project_id = ? AND user_id = ?',
    [projectId, inviteeId]
  );
  
  if (existingMembers.length) {
    throw new Error('User is already a member of this project');
  }
  
  // Create invitation
  await query(
    `INSERT INTO team_invitations 
      (project_id, inviter_id, invitee_id, role, message, status) 
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [projectId, inviterId, inviteeId, role, message]
  );
  
  return {
    success: true,
    message: 'Invitation sent successfully'
  };
};

/**
 * Get pending invitations for a user
 */
const getUserInvitations = async (userId) => {
  const invitations = await query(
    `SELECT ti.*, p.name as project_name, p.description as project_description, 
            u.first_name as inviter_first_name, u.last_name as inviter_last_name 
     FROM team_invitations ti
     JOIN projects p ON ti.project_id = p.id
     JOIN users u ON ti.inviter_id = u.id
     WHERE ti.invitee_id = ? AND ti.status = 'pending'`,
    [userId]
  );
  
  return invitations;
};

/**
 * Respond to an invitation
 */
const respondToInvitation = async (invitationId, userId, accept) => {
  // Check if invitation exists and belongs to user
  const invitations = await query(
    'SELECT * FROM team_invitations WHERE id = ? AND invitee_id = ? AND status = "pending"',
    [invitationId, userId]
  );
  
  if (!invitations.length) {
    throw new Error('Invitation not found or already processed');
  }
  
  const invitation = invitations[0];
  
  // Update invitation status
  await query(
    'UPDATE team_invitations SET status = ?, updated_at = NOW() WHERE id = ?',
    [accept ? 'accepted' : 'declined', invitationId]
  );
  
  // If accepted, add user to team members
  if (accept) {
    await query(
      `INSERT INTO team_members 
        (project_id, user_id, role, status, joined_at) 
       VALUES (?, ?, ?, 'active', NOW())`,
      [invitation.project_id, userId, invitation.role]
    );
  }
  
  return {
    success: true,
    message: accept ? 'Invitation accepted successfully' : 'Invitation declined successfully'
  };
};

/**
 * Remove a team member
 */
const removeTeamMember = async (projectId, ownerId, memberId) => {
  // Check if user is project owner
  const projects = await query(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, ownerId]
  );
  
  if (!projects.length) {
    throw new Error('Project not found or you do not have permission');
  }
  
  // Remove team member
  await query(
    'UPDATE team_members SET status = "removed", updated_at = NOW() WHERE project_id = ? AND user_id = ?',
    [projectId, memberId]
  );
  
  return {
    success: true,
    message: 'Team member removed successfully'
  };
};

/**
 * AI-based team matching algorithm
 */
const findTeamMatches = async (projectId, limit = 10) => {
  // Get project skills
  const projectSkills = await query(
    `SELECT ps.skill_id, ps.importance, s.name 
     FROM project_skills ps
     JOIN skills s ON ps.skill_id = s.id
     WHERE ps.project_id = ?`,
    [projectId]
  );
  
  if (!projectSkills.length) {
    return { 
      matches: [],
      message: 'No skills specified for this project. Add skills to find matching team members.'
    };
  }
  
  // Get skills IDs to search
  const skillIds = projectSkills.map(skill => skill.skill_id);
  
  // Find users with matching skills
  // Prioritize freelancers with required skills
  const matches = await query(`
    SELECT 
      u.id, u.first_name, u.last_name, u.email, u.profile_picture,
      r.name as role,
      COUNT(DISTINCT us.skill_id) as matching_skills,
      SUM(CASE WHEN ps.importance = 'required' AND us.skill_id = ps.skill_id THEN 1 ELSE 0 END) as required_skills_match,
      fp.hourly_rate,
      fp.availability,
      fp.years_of_experience
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN freelancer_profiles fp ON u.id = fp.user_id
    JOIN user_skills us ON u.id = us.user_id
    LEFT JOIN project_skills ps ON us.skill_id = ps.skill_id AND ps.project_id = ?
    WHERE 
      us.skill_id IN (?) AND
      r.name = 'freelancer' AND
      u.id NOT IN (
        SELECT user_id FROM team_members WHERE project_id = ?
      )
    GROUP BY u.id
    ORDER BY 
      required_skills_match DESC,
      matching_skills DESC,
      fp.years_of_experience DESC
    LIMIT ?
  `, [projectId, skillIds, projectId, limit]);
  
  // Add skill details to each match
  for (const match of matches) {
    const userSkills = await query(`
      SELECT s.id, s.name, s.category, us.proficiency_level,
             CASE WHEN ps.importance IS NOT NULL THEN true ELSE false END as project_match,
             ps.importance
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      LEFT JOIN project_skills ps ON s.id = ps.skill_id AND ps.project_id = ?
      WHERE us.user_id = ?
    `, [projectId, match.id]);
    
    match.skills = userSkills;
    
    // Calculate match percentage
    const requiredSkills = projectSkills.filter(skill => skill.importance === 'required').length;
    const matchedRequiredSkills = userSkills.filter(skill => 
      skill.project_match && skill.importance === 'required'
    ).length;
    
    match.match_percentage = requiredSkills > 0 
      ? Math.round((matchedRequiredSkills / requiredSkills) * 100) 
      : Math.round((match.matching_skills / projectSkills.length) * 100);
  }
  
  return { 
    matches,
    totalMatches: matches.length
  };
};

module.exports = {
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
}; 