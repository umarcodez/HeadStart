/**
 * Project Routes
 * 
 * Routes for project management and kanban boards
 */
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

/**
 * Project Template Routes
 */
// @route   GET /api/projects/templates
// @desc    Get all project templates
// @access  Private
router.get('/templates', authenticate, projectController.getProjectTemplates);

// @route   GET /api/projects/templates/:id
// @desc    Get template details
// @access  Private
router.get('/templates/:id', authenticate, projectController.getTemplateDetails);

/**
 * Project Routes
 */
// @route   GET /api/projects
// @desc    Get all projects for user
// @access  Private
router.get('/', authenticate, projectController.getUserProjects);

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post(
  '/',
  [
    authenticate,
    [
      check('title', 'Project title is required').not().isEmpty()
    ]
  ],
  projectController.createProject
);

// @route   GET /api/projects/:id
// @desc    Get project details
// @access  Private
router.get('/:id', authenticate, projectController.getProjectDetails);

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    [
      check('title', 'Project title is required').not().isEmpty()
    ]
  ],
  projectController.updateProject
);

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', authenticate, projectController.deleteProject);

/**
 * Project Members Routes
 */
// @route   POST /api/projects/:id/members
// @desc    Add a member to a project
// @access  Private
router.post(
  '/:id/members',
  [
    authenticate,
    [
      check('memberId', 'Member ID is required').not().isEmpty(),
      check('role', 'Role must be owner, manager, member, or viewer')
        .optional()
        .isIn(['owner', 'manager', 'member', 'viewer'])
    ]
  ],
  projectController.addProjectMember
);

// @route   PUT /api/projects/:id/members/:memberId
// @desc    Update a project member's role
// @access  Private
router.put(
  '/:id/members/:memberId',
  [
    authenticate,
    [
      check('role', 'Role must be owner, manager, member, or viewer')
        .isIn(['owner', 'manager', 'member', 'viewer'])
    ]
  ],
  projectController.updateProjectMember
);

// @route   DELETE /api/projects/:id/members/:memberId
// @desc    Remove a member from a project
// @access  Private
router.delete('/:id/members/:memberId', authenticate, projectController.removeProjectMember);

/**
 * Project Milestone Routes
 */
// @route   POST /api/projects/:id/milestones
// @desc    Create a project milestone
// @access  Private
router.post(
  '/:id/milestones',
  [
    authenticate,
    [
      check('title', 'Milestone title is required').not().isEmpty()
    ]
  ],
  projectController.createMilestone
);

// @route   PUT /api/projects/milestones/:milestoneId
// @desc    Update a project milestone
// @access  Private
router.put(
  '/milestones/:milestoneId',
  [
    authenticate,
    [
      check('title', 'Milestone title is required').not().isEmpty()
    ]
  ],
  projectController.updateMilestone
);

// @route   DELETE /api/projects/milestones/:milestoneId
// @desc    Delete a project milestone
// @access  Private
router.delete('/milestones/:milestoneId', authenticate, projectController.deleteMilestone);

/**
 * Project Tasks Routes
 */
// @route   GET /api/projects/:id/tasks
// @desc    Get all tasks for a project with filtering
// @access  Private
router.get('/:id/tasks', authenticate, projectController.getProjectTasks);

/**
 * Kanban Board Routes
 */
// @route   GET /api/projects/:id/boards
// @desc    Get all kanban boards for a project
// @access  Private
router.get('/:id/boards', authenticate, projectController.getProjectKanbanBoards);

// @route   POST /api/projects/:id/boards
// @desc    Create a kanban board
// @access  Private
router.post(
  '/:id/boards',
  [
    authenticate,
    [
      check('title', 'Board title is required').not().isEmpty()
    ]
  ],
  projectController.createKanbanBoard
);

// @route   GET /api/projects/boards/:boardId
// @desc    Get kanban board details
// @access  Private
router.get('/boards/:boardId', authenticate, projectController.getKanbanBoard);

// @route   PUT /api/projects/boards/:boardId
// @desc    Update a kanban board
// @access  Private
router.put(
  '/boards/:boardId',
  [
    authenticate,
    [
      check('title', 'Board title is required').not().isEmpty()
    ]
  ],
  projectController.updateKanbanBoard
);

// @route   DELETE /api/projects/boards/:boardId
// @desc    Delete a kanban board
// @access  Private
router.delete('/boards/:boardId', authenticate, projectController.deleteKanbanBoard);

/**
 * Kanban Column Routes
 */
// @route   POST /api/projects/boards/:boardId/columns
// @desc    Create a kanban column
// @access  Private
router.post(
  '/boards/:boardId/columns',
  [
    authenticate,
    [
      check('title', 'Column title is required').not().isEmpty()
    ]
  ],
  projectController.createKanbanColumn
);

// @route   PUT /api/projects/columns/:columnId
// @desc    Update a kanban column
// @access  Private
router.put(
  '/columns/:columnId',
  [
    authenticate,
    [
      check('title', 'Column title is required').not().isEmpty()
    ]
  ],
  projectController.updateKanbanColumn
);

// @route   DELETE /api/projects/columns/:columnId
// @desc    Delete a kanban column
// @access  Private
router.delete('/columns/:columnId', authenticate, projectController.deleteKanbanColumn);

// @route   PUT /api/projects/boards/:boardId/columns/reorder
// @desc    Reorder columns in a board
// @access  Private
router.put(
  '/boards/:boardId/columns/reorder',
  [
    authenticate,
    [
      check('columnIds', 'Column IDs array is required').isArray()
    ]
  ],
  projectController.reorderKanbanColumns
);

// @route   PUT /api/projects/tasks/:taskId/move
// @desc    Move a task to a different column or position
// @access  Private
router.put(
  '/tasks/:taskId/move',
  [
    authenticate,
    [
      check('columnId', 'Column ID is required').not().isEmpty(),
      check('position', 'Position is required').isNumeric()
    ]
  ],
  projectController.moveKanbanTask
);

module.exports = router; 