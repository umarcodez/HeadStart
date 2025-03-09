/**
 * Task Routes
 * 
 * Routes for task management
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

/**
 * Task Routes
 */
// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post(
  '/',
  [
    authenticate,
    [
      check('projectId', 'Project ID is required').not().isEmpty(),
      check('title', 'Task title is required').not().isEmpty()
    ]
  ],
  taskController.createTask
);

// @route   GET /api/tasks/:id
// @desc    Get task details
// @access  Private
router.get('/:id', authenticate, taskController.getTaskDetails);

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    [
      check('title', 'Task title is required').not().isEmpty()
    ]
  ],
  taskController.updateTask
);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', authenticate, taskController.deleteTask);

/**
 * Subtask Routes
 */
// @route   POST /api/tasks/:id/subtasks
// @desc    Add a subtask
// @access  Private
router.post(
  '/:id/subtasks',
  [
    authenticate,
    [
      check('title', 'Subtask title is required').not().isEmpty()
    ]
  ],
  taskController.addSubtask
);

// @route   PUT /api/tasks/subtasks/:subtaskId
// @desc    Update a subtask
// @access  Private
router.put(
  '/subtasks/:subtaskId',
  [
    authenticate,
    [
      check('title', 'Subtask title is required').not().isEmpty()
    ]
  ],
  taskController.updateSubtask
);

// @route   DELETE /api/tasks/subtasks/:subtaskId
// @desc    Delete a subtask
// @access  Private
router.delete('/subtasks/:subtaskId', authenticate, taskController.deleteSubtask);

/**
 * Task Comment Routes
 */
// @route   POST /api/tasks/:id/comments
// @desc    Add a task comment
// @access  Private
router.post(
  '/:id/comments',
  [
    authenticate,
    [
      check('comment', 'Comment text is required').not().isEmpty()
    ]
  ],
  taskController.addTaskComment
);

// @route   DELETE /api/tasks/comments/:commentId
// @desc    Delete a task comment
// @access  Private
router.delete('/comments/:commentId', authenticate, taskController.deleteTaskComment);

/**
 * Time Tracking Routes
 */
// @route   POST /api/tasks/:id/time/start
// @desc    Start time tracking for a task
// @access  Private
router.post('/:id/time/start', authenticate, taskController.startTimeTracking);

// @route   PUT /api/tasks/time/:timeEntryId/stop
// @desc    Stop time tracking for a task
// @access  Private
router.put('/time/:timeEntryId/stop', authenticate, taskController.stopTimeTracking);

/**
 * Task Dependency Routes
 */
// @route   POST /api/tasks/:id/dependencies
// @desc    Add a task dependency
// @access  Private
router.post(
  '/:id/dependencies',
  [
    authenticate,
    [
      check('dependsOnTaskId', 'Dependency task ID is required').not().isEmpty()
    ]
  ],
  taskController.addTaskDependency
);

// @route   DELETE /api/tasks/dependencies/:dependencyId
// @desc    Remove a task dependency
// @access  Private
router.delete('/dependencies/:dependencyId', authenticate, taskController.removeTaskDependency);

module.exports = router; 