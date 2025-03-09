/**
 * Task Controller
 * 
 * Handles all task management endpoints
 */
const { validationResult } = require('express-validator');
const taskService = require('../services/taskService');

/**
 * Create a new task
 */
const createTask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    
    const result = await taskService.createTask(userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('access') || 
        error.message.includes('does not belong') || 
        error.message.includes('not a member')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get task details
 */
const getTaskDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const task = await taskService.getTaskDetails(taskId, userId);
    
    res.json({ task });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a task
 */
const updateTask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const result = await taskService.updateTask(taskId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('access') || 
        error.message.includes('does not belong') || 
        error.message.includes('not a member')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const result = await taskService.deleteTask(taskId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add a subtask
 */
const addSubtask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const result = await taskService.addSubtask(taskId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update a subtask
 */
const updateSubtask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const subtaskId = req.params.subtaskId;
    
    const result = await taskService.updateSubtask(subtaskId, userId, req.body);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a subtask
 */
const deleteSubtask = async (req, res) => {
  try {
    const userId = req.user.id;
    const subtaskId = req.params.subtaskId;
    
    const result = await taskService.deleteSubtask(subtaskId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add a task comment
 */
const addTaskComment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const result = await taskService.addTaskComment(taskId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a task comment
 */
const deleteTaskComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = req.params.commentId;
    
    const result = await taskService.deleteTaskComment(commentId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Start time tracking for a task
 */
const startTimeTracking = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const result = await taskService.startTimeTracking(taskId, userId, req.body || {});
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('active time entry')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Stop time tracking for a task
 */
const stopTimeTracking = async (req, res) => {
  try {
    const userId = req.user.id;
    const timeEntryId = req.params.timeEntryId;
    
    const result = await taskService.stopTimeTracking(timeEntryId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('already stopped')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add a task dependency
 */
const addTaskDependency = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const taskId = req.params.id;
    
    const result = await taskService.addTaskDependency(taskId, userId, req.body);
    
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('circular reference') || error.message.includes('already exists')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('access') || error.message.includes('does not belong')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Remove a task dependency
 */
const removeTaskDependency = async (req, res) => {
  try {
    const userId = req.user.id;
    const dependencyId = req.params.dependencyId;
    
    const result = await taskService.removeTaskDependency(dependencyId, userId);
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('access')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getTaskDetails,
  updateTask,
  deleteTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addTaskComment,
  deleteTaskComment,
  startTimeTracking,
  stopTimeTracking,
  addTaskDependency,
  removeTaskDependency
}; 