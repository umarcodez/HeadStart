/**
 * Project Controller
 * 
 * Handles all project management endpoints
 */
const { validationResult } = require('express-validator');
const projectService = require('../services/projectService');
const taskService = require('../services/taskService');
const kanbanService = require('../services/kanbanService');

/**
 * Get project templates
 */
const getProjectTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const includePrivate = true; // Include user's private templates
    
    const templates = await projectService.getProjectTemplates(includePrivate, userId);
    
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get template details
 */
const getTemplateDetails = async (req, res) => {
  try {
    const templateId = req.params.id;
    
    const template = await projectService.getProjectTemplateDetails(templateId);
    
    res.json({ template });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Create a new project
 */
const createProject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    
    const result = await projectService.createProject(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all user projects
 */
const getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status; // Filter by status if provided
    
    const projects = await projectService.getUserProjects(userId, status);
    
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get project details
 */
const getProjectDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const project = await projectService.getProjectDetails(projectId, userId);
    
    res.json({ project });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a project
 */
const updateProject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const result = await projectService.updateProject(projectId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a project
 */
const deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const result = await projectService.deleteProject(projectId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add a project member
 */
const addProjectMember = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const result = await projectService.addProjectMember(projectId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('already a member')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a project member's role
 */
const updateProjectMember = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const projectId = req.params.id;
    const memberId = req.params.memberId;
    
    // Add memberId to the request body
    const memberData = {
      ...req.body,
      memberId
    };
    
    const result = await projectService.updateProjectMember(projectId, userId, memberData);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('role of the project owner')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Remove a project member
 */
const removeProjectMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    const memberId = req.params.memberId;
    
    const result = await projectService.removeProjectMember(projectId, userId, memberId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('remove the project owner')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a project milestone
 */
const createMilestone = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const result = await projectService.createMilestone(projectId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a project milestone
 */
const updateMilestone = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const milestoneId = req.params.milestoneId;
    
    const result = await projectService.updateMilestone(milestoneId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a project milestone
 */
const deleteMilestone = async (req, res) => {
  try {
    const userId = req.user.id;
    const milestoneId = req.params.milestoneId;
    
    const result = await projectService.deleteMilestone(milestoneId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get project tasks
 */
const getProjectTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      assigneeId: req.query.assignee,
      milestoneId: req.query.milestone,
      search: req.query.search,
      dueDate: req.query.dueDate,
      tag: req.query.tag,
      sort: req.query.sort,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    const tasks = await taskService.getProjectTasks(projectId, userId, filters);
    
    // Also return task status counts
    const statusCounts = await taskService.getTaskStatusCounts(projectId, userId);
    
    res.json({ tasks, statusCounts });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get project kanban boards
 */
const getProjectKanbanBoards = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const boards = await kanbanService.getProjectKanbanBoards(projectId, userId);
    
    res.json({ boards });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get kanban board details
 */
const getKanbanBoard = async (req, res) => {
  try {
    const userId = req.user.id;
    const boardId = req.params.boardId;
    
    const board = await kanbanService.getKanbanBoard(boardId, userId);
    
    res.json({ board });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a kanban board
 */
const createKanbanBoard = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const projectId = req.params.id;
    
    const result = await kanbanService.createKanbanBoard(projectId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a kanban board
 */
const updateKanbanBoard = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const boardId = req.params.boardId;
    
    const result = await kanbanService.updateKanbanBoard(boardId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a kanban board
 */
const deleteKanbanBoard = async (req, res) => {
  try {
    const userId = req.user.id;
    const boardId = req.params.boardId;
    
    const result = await kanbanService.deleteKanbanBoard(boardId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('only kanban board') || 
        error.message.includes('default kanban board')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a kanban column
 */
const createKanbanColumn = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const boardId = req.params.boardId;
    
    const result = await kanbanService.createKanbanColumn(boardId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a kanban column
 */
const updateKanbanColumn = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const columnId = req.params.columnId;
    
    const result = await kanbanService.updateKanbanColumn(columnId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a kanban column
 */
const deleteKanbanColumn = async (req, res) => {
  try {
    const userId = req.user.id;
    const columnId = req.params.columnId;
    
    const result = await kanbanService.deleteKanbanColumn(columnId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('only column')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Reorder kanban columns
 */
const reorderKanbanColumns = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const boardId = req.params.boardId;
    
    const result = await kanbanService.reorderKanbanColumns(boardId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('Invalid column order')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Move a kanban task
 */
const moveKanbanTask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const taskId = req.params.taskId;
    
    const result = await kanbanService.moveKanbanTask(taskId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('WIP limit')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProjectTemplates,
  getTemplateDetails,
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
  deleteMilestone,
  getProjectTasks,
  getProjectKanbanBoards,
  getKanbanBoard,
  createKanbanBoard,
  updateKanbanBoard,
  deleteKanbanBoard,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  reorderKanbanColumns,
  moveKanbanTask
}; 