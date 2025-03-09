/**
 * Project Service
 * 
 * Handles project management functionality
 */
const { query } = require('../config/db');

/**
 * Get all project templates
 */
const getProjectTemplates = async (includePrivate = false, userId = null) => {
  let sql = 'SELECT * FROM project_templates WHERE is_public = TRUE';
  const params = [];
  
  if (includePrivate && userId) {
    sql += ' OR user_id = ?';
    params.push(userId);
  }
  
  sql += ' ORDER BY title';
  
  const templates = await query(sql, params);
  
  return templates;
};

/**
 * Get a project template with its tasks
 */
const getProjectTemplateDetails = async (templateId) => {
  // Get template details
  const templates = await query(
    'SELECT * FROM project_templates WHERE id = ?',
    [templateId]
  );
  
  if (templates.length === 0) {
    throw new Error('Project template not found');
  }
  
  const template = templates[0];
  
  // Get template tasks
  const tasks = await query(
    `SELECT * FROM template_tasks 
     WHERE template_id = ? 
     ORDER BY relative_start_day, id`,
    [templateId]
  );
  
  template.tasks = tasks;
  
  return template;
};

/**
 * Create a new project
 */
const createProject = async (userId, projectData) => {
  const { 
    title, 
    description, 
    status = 'planning', 
    priority = 'medium', 
    startDate, 
    dueDate, 
    budget, 
    templateId 
  } = projectData;
  
  if (!title) {
    throw new Error('Project title is required');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Create the project
    const projectResult = await query(
      `INSERT INTO projects 
       (user_id, title, description, status, priority, start_date, due_date, budget) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description || '', status, priority, startDate || null, dueDate || null, budget || null]
    );
    
    const projectId = projectResult.insertId;
    
    // Add creator as project owner
    await query(
      `INSERT INTO project_members 
       (project_id, user_id, role) 
       VALUES (?, ?, 'owner')`,
      [projectId, userId]
    );
    
    // If a template is specified, create tasks from the template
    if (templateId) {
      // Get template tasks
      const templateTasks = await query(
        'SELECT * FROM template_tasks WHERE template_id = ? ORDER BY id',
        [templateId]
      );
      
      // Calculate actual dates based on relative days
      const projectStartDate = startDate ? new Date(startDate) : new Date();
      
      // Create tasks from template
      for (const templateTask of templateTasks) {
        let taskStartDate = null;
        let taskDueDate = null;
        
        if (templateTask.relative_start_day !== null) {
          taskStartDate = new Date(projectStartDate);
          taskStartDate.setDate(projectStartDate.getDate() + templateTask.relative_start_day);
        }
        
        if (templateTask.relative_due_day !== null) {
          taskDueDate = new Date(projectStartDate);
          taskDueDate.setDate(projectStartDate.getDate() + templateTask.relative_due_day);
        }
        
        // Create the task
        await query(
          `INSERT INTO tasks 
           (project_id, creator_id, title, description, estimated_hours, start_date, due_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId, 
            userId, 
            templateTask.title, 
            templateTask.description || '', 
            templateTask.estimated_hours || null,
            taskStartDate ? taskStartDate.toISOString().split('T')[0] : null,
            taskDueDate ? taskDueDate.toISOString().split('T')[0] : null
          ]
        );
      }
    }
    
    // Create a default kanban board for the project
    const boardResult = await query(
      `INSERT INTO kanban_boards (project_id, title, is_default) VALUES (?, 'Default Board', TRUE)`,
      [projectId]
    );
    
    const boardId = boardResult.insertId;
    
    // Create default columns
    const defaultColumns = [
      { title: 'Backlog', position: 1 },
      { title: 'To Do', position: 2 },
      { title: 'In Progress', position: 3 },
      { title: 'In Review', position: 4 },
      { title: 'Done', position: 5 }
    ];
    
    for (const column of defaultColumns) {
      await query(
        `INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)`,
        [boardId, column.title, column.position]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Project created successfully',
      projectId
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Get all projects for a user (owned and member of)
 */
const getUserProjects = async (userId, status = null) => {
  let sql = `
    SELECT p.*, pm.role
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ?
  `;
  const params = [userId];
  
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY p.created_at DESC';
  
  const projects = await query(sql, params);
  
  // Get member count for each project
  for (const project of projects) {
    const memberCount = await query(
      'SELECT COUNT(*) as count FROM project_members WHERE project_id = ?',
      [project.id]
    );
    
    project.memberCount = memberCount[0].count;
    
    // Get task counts
    const taskCounts = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
       FROM tasks 
       WHERE project_id = ?`,
      [project.id]
    );
    
    project.taskCount = {
      total: taskCounts[0].total || 0,
      completed: taskCounts[0].completed || 0
    };
  }
  
  return projects;
};

/**
 * Get project details with members and tasks
 */
const getProjectDetails = async (projectId, userId) => {
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have access to it');
  }
  
  // Get project details
  const projects = await query(
    'SELECT * FROM projects WHERE id = ?',
    [projectId]
  );
  
  if (projects.length === 0) {
    throw new Error('Project not found');
  }
  
  const project = projects[0];
  
  // Get all project members
  project.members = await query(
    `SELECT pm.*, u.name, u.email, u.profile_picture
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = ?
     ORDER BY pm.role, u.name`,
    [projectId]
  );
  
  // Get project milestones
  project.milestones = await query(
    'SELECT * FROM project_milestones WHERE project_id = ? ORDER BY due_date',
    [projectId]
  );
  
  // Get project tasks
  project.tasks = await query(
    `SELECT t.*, u.name as assignee_name, u.profile_picture as assignee_picture
     FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.project_id = ?
     ORDER BY t.due_date, t.priority DESC, t.title`,
    [projectId]
  );
  
  // Get project boards
  project.boards = await query(
    'SELECT * FROM kanban_boards WHERE project_id = ? ORDER BY is_default DESC, title',
    [projectId]
  );
  
  return project;
};

/**
 * Update a project
 */
const updateProject = async (projectId, userId, projectData) => {
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to update it');
  }
  
  const { 
    title, 
    description, 
    status, 
    priority, 
    startDate, 
    dueDate, 
    completedDate,
    progress,
    budget 
  } = projectData;
  
  if (!title) {
    throw new Error('Project title is required');
  }
  
  // Update the project
  await query(
    `UPDATE projects 
     SET title = ?, 
         description = ?, 
         status = ?, 
         priority = ?, 
         start_date = ?, 
         due_date = ?, 
         completed_date = ?,
         progress = ?,
         budget = ?
     WHERE id = ?`,
    [
      title, 
      description || '', 
      status || 'planning', 
      priority || 'medium', 
      startDate || null, 
      dueDate || null, 
      completedDate || null,
      progress || 0,
      budget || null,
      projectId
    ]
  );
  
  return {
    success: true,
    message: 'Project updated successfully'
  };
};

/**
 * Delete a project
 */
const deleteProject = async (projectId, userId) => {
  // Check if user is a project owner
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'owner'",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to delete it');
  }
  
  // Delete the project (all related records will be deleted via cascading)
  await query(
    'DELETE FROM projects WHERE id = ?',
    [projectId]
  );
  
  return {
    success: true,
    message: 'Project deleted successfully'
  };
};

/**
 * Add a member to a project
 */
const addProjectMember = async (projectId, userId, memberData) => {
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to add members');
  }
  
  const { memberId, role = 'member' } = memberData;
  
  if (!memberId) {
    throw new Error('Member ID is required');
  }
  
  // Check if user exists
  const users = await query(
    'SELECT * FROM users WHERE id = ?',
    [memberId]
  );
  
  if (users.length === 0) {
    throw new Error('User not found');
  }
  
  // Check if user is already a member
  const existingMembers = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, memberId]
  );
  
  if (existingMembers.length > 0) {
    throw new Error('User is already a member of this project');
  }
  
  // Add the member
  await query(
    `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`,
    [projectId, memberId, role]
  );
  
  return {
    success: true,
    message: 'Member added successfully'
  };
};

/**
 * Update a project member's role
 */
const updateProjectMember = async (projectId, userId, memberData) => {
  // Check if user is a project owner
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = 'owner'",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to update members');
  }
  
  const { memberId, role } = memberData;
  
  if (!memberId || !role) {
    throw new Error('Member ID and role are required');
  }
  
  // Check if trying to update the owner
  if (members[0].user_id === memberId && role !== 'owner') {
    throw new Error('Cannot change the role of the project owner');
  }
  
  // Update the member
  await query(
    `UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?`,
    [role, projectId, memberId]
  );
  
  return {
    success: true,
    message: 'Member role updated successfully'
  };
};

/**
 * Remove a member from a project
 */
const removeProjectMember = async (projectId, userId, memberId) => {
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to remove members');
  }
  
  // Check if trying to remove the owner
  const targetMember = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ?",
    [projectId, memberId]
  );
  
  if (targetMember.length > 0 && targetMember[0].role === 'owner') {
    throw new Error('Cannot remove the project owner');
  }
  
  // Remove the member
  await query(
    `DELETE FROM project_members WHERE project_id = ? AND user_id = ?`,
    [projectId, memberId]
  );
  
  return {
    success: true,
    message: 'Member removed successfully'
  };
};

/**
 * Create a project milestone
 */
const createMilestone = async (projectId, userId, milestoneData) => {
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to create milestones');
  }
  
  const { title, description, dueDate, status = 'not_started' } = milestoneData;
  
  if (!title) {
    throw new Error('Milestone title is required');
  }
  
  // Create the milestone
  const result = await query(
    `INSERT INTO project_milestones (project_id, title, description, due_date, status) 
     VALUES (?, ?, ?, ?, ?)`,
    [projectId, title, description || '', dueDate || null, status]
  );
  
  return {
    success: true,
    message: 'Milestone created successfully',
    milestoneId: result.insertId
  };
};

/**
 * Update a project milestone
 */
const updateMilestone = async (milestoneId, userId, milestoneData) => {
  // Get the milestone to check project
  const milestones = await query(
    'SELECT * FROM project_milestones WHERE id = ?',
    [milestoneId]
  );
  
  if (milestones.length === 0) {
    throw new Error('Milestone not found');
  }
  
  const projectId = milestones[0].project_id;
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to update this milestone');
  }
  
  const { title, description, dueDate, status, completionDate } = milestoneData;
  
  if (!title) {
    throw new Error('Milestone title is required');
  }
  
  // Update the milestone
  await query(
    `UPDATE project_milestones 
     SET title = ?, description = ?, due_date = ?, status = ?, completion_date = ? 
     WHERE id = ?`,
    [title, description || '', dueDate || null, status || 'not_started', completionDate || null, milestoneId]
  );
  
  return {
    success: true,
    message: 'Milestone updated successfully'
  };
};

/**
 * Delete a project milestone
 */
const deleteMilestone = async (milestoneId, userId) => {
  // Get the milestone to check project
  const milestones = await query(
    'SELECT * FROM project_milestones WHERE id = ?',
    [milestoneId]
  );
  
  if (milestones.length === 0) {
    throw new Error('Milestone not found');
  }
  
  const projectId = milestones[0].project_id;
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to delete this milestone');
  }
  
  // Delete the milestone
  await query(
    'DELETE FROM project_milestones WHERE id = ?',
    [milestoneId]
  );
  
  return {
    success: true,
    message: 'Milestone deleted successfully'
  };
};

module.exports = {
  getProjectTemplates,
  getProjectTemplateDetails,
  createProject,
  getUserProjects,
  getProjectDetails,
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  createMilestone,
  updateMilestone,
  deleteMilestone
}; 