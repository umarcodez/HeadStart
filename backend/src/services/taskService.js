/**
 * Task Service
 * 
 * Handles task management functionality
 */
const { query } = require('../config/db');

/**
 * Create a new task
 */
const createTask = async (userId, taskData) => {
  const { 
    projectId, 
    milestoneId, 
    title, 
    description, 
    status = 'to_do', 
    priority = 'medium', 
    startDate, 
    dueDate, 
    estimatedHours, 
    assigneeId, 
    tags 
  } = taskData;
  
  if (!projectId || !title) {
    throw new Error('Project ID and task title are required');
  }
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have access to it');
  }
  
  // If milestone is specified, verify it belongs to the project
  if (milestoneId) {
    const milestones = await query(
      'SELECT * FROM project_milestones WHERE id = ? AND project_id = ?',
      [milestoneId, projectId]
    );
    
    if (milestones.length === 0) {
      throw new Error('Milestone not found or does not belong to this project');
    }
  }
  
  // If assignee is specified, verify they are a member of the project
  if (assigneeId) {
    const assigneeMembers = await query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, assigneeId]
    );
    
    if (assigneeMembers.length === 0) {
      throw new Error('Assignee is not a member of this project');
    }
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Create the task
    const taskResult = await query(
      `INSERT INTO tasks 
       (project_id, milestone_id, creator_id, assignee_id, title, description, 
        status, priority, start_date, due_date, estimated_hours, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId, 
        milestoneId || null, 
        userId, 
        assigneeId || null, 
        title, 
        description || '', 
        status, 
        priority, 
        startDate || null, 
        dueDate || null, 
        estimatedHours || null, 
        tags || null
      ]
    );
    
    const taskId = taskResult.insertId;
    
    // Find the appropriate kanban column based on status
    let statusToColumnMap = {
      'backlog': 'Backlog',
      'to_do': 'To Do',
      'in_progress': 'In Progress',
      'in_review': 'In Review',
      'done': 'Done'
    };
    
    const columnName = statusToColumnMap[status] || 'To Do';
    
    // Get the default board
    const boards = await query(
      'SELECT id FROM kanban_boards WHERE project_id = ? AND is_default = TRUE LIMIT 1',
      [projectId]
    );
    
    if (boards.length > 0) {
      const boardId = boards[0].id;
      
      // Find the column
      const columns = await query(
        'SELECT id FROM kanban_columns WHERE board_id = ? AND title = ? LIMIT 1',
        [boardId, columnName]
      );
      
      if (columns.length > 0) {
        const columnId = columns[0].id;
        
        // Get the highest position in the column
        const positions = await query(
          'SELECT MAX(position) as max_position FROM kanban_tasks WHERE column_id = ?',
          [columnId]
        );
        
        const position = (positions[0].max_position || 0) + 1;
        
        // Add the task to the kanban board
        await query(
          'INSERT INTO kanban_tasks (column_id, task_id, position) VALUES (?, ?, ?)',
          [columnId, taskId, position]
        );
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Task created successfully',
      taskId
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Get task details
 */
const getTaskDetails = async (taskId, userId) => {
  // Get task with project info to check access
  const tasks = await query(
    `SELECT t.*, p.title as project_title 
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?`,
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [task.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this task');
  }
  
  // Get assignee details
  if (task.assignee_id) {
    const assignees = await query(
      'SELECT id, name, email, profile_picture FROM users WHERE id = ?',
      [task.assignee_id]
    );
    
    if (assignees.length > 0) {
      task.assignee = assignees[0];
    }
  }
  
  // Get creator details
  const creators = await query(
    'SELECT id, name, email, profile_picture FROM users WHERE id = ?',
    [task.creator_id]
  );
  
  if (creators.length > 0) {
    task.creator = creators[0];
  }
  
  // Get subtasks
  task.subtasks = await query(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY id',
    [taskId]
  );
  
  // Get comments
  task.comments = await query(
    `SELECT c.*, u.name, u.profile_picture
     FROM task_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.task_id = ?
     ORDER BY c.created_at DESC`,
    [taskId]
  );
  
  // Get attachments
  task.attachments = await query(
    `SELECT a.*, u.name as uploaded_by_name
     FROM task_attachments a
     JOIN users u ON a.user_id = u.id
     WHERE a.task_id = ?
     ORDER BY a.uploaded_at DESC`,
    [taskId]
  );
  
  // Get time entries
  task.timeEntries = await query(
    `SELECT t.*, u.name as user_name
     FROM time_entries t
     JOIN users u ON t.user_id = u.id
     WHERE t.task_id = ?
     ORDER BY t.start_time DESC`,
    [taskId]
  );
  
  // Calculate total time spent
  let totalDuration = 0;
  task.timeEntries.forEach(entry => {
    totalDuration += entry.duration || 0;
  });
  
  task.totalTimeSpent = totalDuration;
  
  // Get dependencies
  task.dependencies = await query(
    `SELECT d.*, t.title as dependency_title, t.status as dependency_status
     FROM task_dependencies d
     JOIN tasks t ON d.depends_on_task_id = t.id
     WHERE d.task_id = ?`,
    [taskId]
  );
  
  // Get tasks that depend on this task
  task.dependents = await query(
    `SELECT d.*, t.title as dependent_title, t.status as dependent_status
     FROM task_dependencies d
     JOIN tasks t ON d.task_id = t.id
     WHERE d.depends_on_task_id = ?`,
    [taskId]
  );
  
  return task;
};

/**
 * Update a task
 */
const updateTask = async (taskId, userId, taskData) => {
  // Get task with project info to check access
  const tasks = await query(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [task.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to update this task');
  }
  
  const { 
    title, 
    description, 
    status, 
    priority, 
    startDate, 
    dueDate, 
    completedDate,
    estimatedHours, 
    assigneeId, 
    milestoneId,
    tags 
  } = taskData;
  
  if (!title) {
    throw new Error('Task title is required');
  }
  
  // If milestone is specified, verify it belongs to the project
  if (milestoneId) {
    const milestones = await query(
      'SELECT * FROM project_milestones WHERE id = ? AND project_id = ?',
      [milestoneId, task.project_id]
    );
    
    if (milestones.length === 0) {
      throw new Error('Milestone not found or does not belong to this project');
    }
  }
  
  // If assignee is specified, verify they are a member of the project
  if (assigneeId) {
    const assigneeMembers = await query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, assigneeId]
    );
    
    if (assigneeMembers.length === 0) {
      throw new Error('Assignee is not a member of this project');
    }
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Update the task
    await query(
      `UPDATE tasks 
       SET title = ?, 
           description = ?, 
           status = ?, 
           priority = ?, 
           start_date = ?, 
           due_date = ?, 
           completed_date = ?,
           estimated_hours = ?, 
           assignee_id = ?, 
           milestone_id = ?,
           tags = ?
       WHERE id = ?`,
      [
        title, 
        description || '', 
        status || task.status, 
        priority || task.priority, 
        startDate || task.start_date, 
        dueDate || task.due_date, 
        completedDate || task.completed_date,
        estimatedHours || task.estimated_hours, 
        assigneeId !== undefined ? assigneeId : task.assignee_id, 
        milestoneId !== undefined ? milestoneId : task.milestone_id,
        tags || task.tags,
        taskId
      ]
    );
    
    // If status changed, update the kanban board position
    if (status && status !== task.status) {
      let statusToColumnMap = {
        'backlog': 'Backlog',
        'to_do': 'To Do',
        'in_progress': 'In Progress',
        'in_review': 'In Review',
        'done': 'Done'
      };
      
      const columnName = statusToColumnMap[status] || 'To Do';
      
      // Get current kanban task
      const kanbanTasks = await query(
        `SELECT kt.id, kt.column_id 
         FROM kanban_tasks kt
         JOIN kanban_columns kc ON kt.column_id = kc.id
         WHERE kt.task_id = ?`,
        [taskId]
      );
      
      if (kanbanTasks.length > 0) {
        // Get the board ID from the current column
        const columns = await query(
          'SELECT board_id FROM kanban_columns WHERE id = ?',
          [kanbanTasks[0].column_id]
        );
        
        if (columns.length > 0) {
          const boardId = columns[0].board_id;
          
          // Find the target column
          const targetColumns = await query(
            'SELECT id FROM kanban_columns WHERE board_id = ? AND title = ? LIMIT 1',
            [boardId, columnName]
          );
          
          if (targetColumns.length > 0) {
            const targetColumnId = targetColumns[0].id;
            
            // If the column is different, move the task
            if (targetColumnId !== kanbanTasks[0].column_id) {
              // Get the highest position in the target column
              const positions = await query(
                'SELECT MAX(position) as max_position FROM kanban_tasks WHERE column_id = ?',
                [targetColumnId]
              );
              
              const position = (positions[0].max_position || 0) + 1;
              
              // Update the kanban task
              await query(
                'UPDATE kanban_tasks SET column_id = ?, position = ? WHERE id = ?',
                [targetColumnId, position, kanbanTasks[0].id]
              );
            }
          }
        }
      }
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Task updated successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Delete a task
 */
const deleteTask = async (taskId, userId) => {
  // Get task with project info to check access
  const tasks = await query(
    'SELECT t.*, p.user_id as project_owner_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?',
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is task creator, assignee, project owner, or has a manager role
  const isCreator = task.creator_id === userId;
  const isAssignee = task.assignee_id === userId;
  const isProjectOwner = task.project_owner_id === userId;
  
  const managers = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [task.project_id, userId]
  );
  
  const isManager = managers.length > 0;
  
  if (!isCreator && !isAssignee && !isProjectOwner && !isManager) {
    throw new Error('You do not have permission to delete this task');
  }
  
  // Delete the task (all related records will be deleted via cascading)
  await query(
    'DELETE FROM tasks WHERE id = ?',
    [taskId]
  );
  
  return {
    success: true,
    message: 'Task deleted successfully'
  };
};

/**
 * Add a subtask
 */
const addSubtask = async (taskId, userId, subtaskData) => {
  // Get task with project info to check access
  const tasks = await query(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [task.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this task');
  }
  
  const { title, description } = subtaskData;
  
  if (!title) {
    throw new Error('Subtask title is required');
  }
  
  // Create the subtask
  const result = await query(
    'INSERT INTO subtasks (task_id, title, description) VALUES (?, ?, ?)',
    [taskId, title, description || '']
  );
  
  return {
    success: true,
    message: 'Subtask added successfully',
    subtaskId: result.insertId
  };
};

/**
 * Update a subtask
 */
const updateSubtask = async (subtaskId, userId, subtaskData) => {
  // Get subtask with task and project info to check access
  const subtasks = await query(
    `SELECT s.*, t.project_id
     FROM subtasks s
     JOIN tasks t ON s.task_id = t.id
     WHERE s.id = ?`,
    [subtaskId]
  );
  
  if (subtasks.length === 0) {
    throw new Error('Subtask not found');
  }
  
  const subtask = subtasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [subtask.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this subtask');
  }
  
  const { title, description, isCompleted } = subtaskData;
  
  if (!title) {
    throw new Error('Subtask title is required');
  }
  
  // Update the subtask
  await query(
    'UPDATE subtasks SET title = ?, description = ?, is_completed = ? WHERE id = ?',
    [title, description || '', isCompleted !== undefined ? isCompleted : subtask.is_completed, subtaskId]
  );
  
  return {
    success: true,
    message: 'Subtask updated successfully'
  };
};

/**
 * Delete a subtask
 */
const deleteSubtask = async (subtaskId, userId) => {
  // Get subtask with task and project info to check access
  const subtasks = await query(
    `SELECT s.*, t.project_id
     FROM subtasks s
     JOIN tasks t ON s.task_id = t.id
     WHERE s.id = ?`,
    [subtaskId]
  );
  
  if (subtasks.length === 0) {
    throw new Error('Subtask not found');
  }
  
  const subtask = subtasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [subtask.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this subtask');
  }
  
  // Delete the subtask
  await query(
    'DELETE FROM subtasks WHERE id = ?',
    [subtaskId]
  );
  
  return {
    success: true,
    message: 'Subtask deleted successfully'
  };
};

/**
 * Add a task comment
 */
const addTaskComment = async (taskId, userId, commentData) => {
  // Get task with project info to check access
  const tasks = await query(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [task.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this task');
  }
  
  const { comment } = commentData;
  
  if (!comment) {
    throw new Error('Comment text is required');
  }
  
  // Create the comment
  const result = await query(
    'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
    [taskId, userId, comment]
  );
  
  // Return the created comment with user info
  const comments = await query(
    `SELECT c.*, u.name, u.profile_picture
     FROM task_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [result.insertId]
  );
  
  return {
    success: true,
    message: 'Comment added successfully',
    comment: comments[0]
  };
};

/**
 * Delete a task comment
 */
const deleteTaskComment = async (commentId, userId) => {
  // Get comment details
  const comments = await query(
    `SELECT c.*, t.project_id
     FROM task_comments c
     JOIN tasks t ON c.task_id = t.id
     WHERE c.id = ?`,
    [commentId]
  );
  
  if (comments.length === 0) {
    throw new Error('Comment not found');
  }
  
  const comment = comments[0];
  
  // Check if user is the comment author or a project manager/owner
  if (comment.user_id !== userId) {
    const managers = await query(
      "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
      [comment.project_id, userId]
    );
    
    if (managers.length === 0) {
      throw new Error('You do not have permission to delete this comment');
    }
  }
  
  // Delete the comment
  await query(
    'DELETE FROM task_comments WHERE id = ?',
    [commentId]
  );
  
  return {
    success: true,
    message: 'Comment deleted successfully'
  };
};

/**
 * Start time tracking for a task
 */
const startTimeTracking = async (taskId, userId, timeData) => {
  // Get task with project info to check access
  const tasks = await query(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [task.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this task');
  }
  
  const { description, isBillable = true } = timeData;
  
  // Check if user already has an active time entry for this task
  const activeEntries = await query(
    'SELECT * FROM time_entries WHERE task_id = ? AND user_id = ? AND end_time IS NULL',
    [taskId, userId]
  );
  
  if (activeEntries.length > 0) {
    throw new Error('You already have an active time entry for this task');
  }
  
  // Create the time entry
  const result = await query(
    'INSERT INTO time_entries (task_id, user_id, description, start_time, is_billable) VALUES (?, ?, ?, NOW(), ?)',
    [taskId, userId, description || '', isBillable]
  );
  
  // Get the created entry
  const entries = await query(
    'SELECT * FROM time_entries WHERE id = ?',
    [result.insertId]
  );
  
  return {
    success: true,
    message: 'Time tracking started successfully',
    timeEntry: entries[0]
  };
};

/**
 * Stop time tracking for a task
 */
const stopTimeTracking = async (timeEntryId, userId) => {
  // Get time entry details
  const entries = await query(
    `SELECT e.*, t.project_id
     FROM time_entries e
     JOIN tasks t ON e.task_id = t.id
     WHERE e.id = ?`,
    [timeEntryId]
  );
  
  if (entries.length === 0) {
    throw new Error('Time entry not found');
  }
  
  const entry = entries[0];
  
  // Check if this is the user's time entry
  if (entry.user_id !== userId) {
    throw new Error('You do not have permission to stop this time entry');
  }
  
  // Check if the entry is already stopped
  if (entry.end_time) {
    throw new Error('This time entry is already stopped');
  }
  
  // Stop the time entry
  await query(
    `UPDATE time_entries 
     SET end_time = NOW(), 
         duration = TIMESTAMPDIFF(SECOND, start_time, NOW())
     WHERE id = ?`,
    [timeEntryId]
  );
  
  // Get the updated entry
  const updatedEntries = await query(
    'SELECT * FROM time_entries WHERE id = ?',
    [timeEntryId]
  );
  
  return {
    success: true,
    message: 'Time tracking stopped successfully',
    timeEntry: updatedEntries[0]
  };
};

/**
 * Get tasks for a project with filtering and sorting
 */
const getProjectTasks = async (projectId, userId, filters = {}) => {
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have access to it');
  }
  
  // Build query with filters
  let sql = `
    SELECT t.*, 
           u1.name as creator_name, 
           u2.name as assignee_name, 
           u2.profile_picture as assignee_picture,
           m.title as milestone_title
    FROM tasks t
    LEFT JOIN users u1 ON t.creator_id = u1.id
    LEFT JOIN users u2 ON t.assignee_id = u2.id
    LEFT JOIN project_milestones m ON t.milestone_id = m.id
    WHERE t.project_id = ?
  `;
  
  const params = [projectId];
  
  // Apply filters
  if (filters.status) {
    sql += ' AND t.status = ?';
    params.push(filters.status);
  }
  
  if (filters.priority) {
    sql += ' AND t.priority = ?';
    params.push(filters.priority);
  }
  
  if (filters.assigneeId) {
    if (filters.assigneeId === 'unassigned') {
      sql += ' AND t.assignee_id IS NULL';
    } else {
      sql += ' AND t.assignee_id = ?';
      params.push(filters.assigneeId);
    }
  }
  
  if (filters.milestoneId) {
    if (filters.milestoneId === 'without_milestone') {
      sql += ' AND t.milestone_id IS NULL';
    } else {
      sql += ' AND t.milestone_id = ?';
      params.push(filters.milestoneId);
    }
  }
  
  if (filters.search) {
    sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  if (filters.dueDate) {
    const today = new Date().toISOString().split('T')[0];
    
    if (filters.dueDate === 'overdue') {
      sql += ' AND t.due_date < ? AND t.status != "done"';
      params.push(today);
    } else if (filters.dueDate === 'today') {
      sql += ' AND t.due_date = ?';
      params.push(today);
    } else if (filters.dueDate === 'upcoming') {
      sql += ' AND t.due_date > ? AND t.due_date <= DATE_ADD(?, INTERVAL 7 DAY)';
      params.push(today, today);
    } else if (filters.dueDate === 'future') {
      sql += ' AND t.due_date > DATE_ADD(?, INTERVAL 7 DAY)';
      params.push(today);
    } else if (filters.dueDate === 'no_date') {
      sql += ' AND t.due_date IS NULL';
    }
  }
  
  if (filters.tag) {
    sql += ' AND t.tags LIKE ?';
    params.push(`%${filters.tag}%`);
  }
  
  // Apply sorting
  if (filters.sort) {
    const sortField = filters.sort.split('_')[0];
    const sortDirection = filters.sort.includes('desc') ? 'DESC' : 'ASC';
    
    const allowedFields = ['title', 'status', 'priority', 'due_date', 'created_at'];
    
    if (allowedFields.includes(sortField)) {
      sql += ` ORDER BY t.${sortField} ${sortDirection}`;
    } else {
      sql += ' ORDER BY t.due_date ASC, t.priority DESC, t.title ASC';
    }
  } else {
    sql += ' ORDER BY t.due_date ASC, t.priority DESC, t.title ASC';
  }
  
  // Apply pagination
  if (filters.limit) {
    const limit = parseInt(filters.limit) || 50;
    const offset = parseInt(filters.offset) || 0;
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  
  // Get tasks
  const tasks = await query(sql, params);
  
  // Get subtask counts for each task
  for (const task of tasks) {
    const subtaskCounts = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
       FROM subtasks 
       WHERE task_id = ?`,
      [task.id]
    );
    
    task.subtaskCount = {
      total: subtaskCounts[0].total || 0,
      completed: subtaskCounts[0].completed || 0
    };
    
    // Format tags as array
    if (task.tags) {
      task.tagList = task.tags.split(',').map(tag => tag.trim());
    } else {
      task.tagList = [];
    }
  }
  
  return tasks;
};

/**
 * Get task count by status for a project
 */
const getTaskStatusCounts = async (projectId, userId) => {
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have access to it');
  }
  
  // Get counts by status
  const statusCounts = await query(
    `SELECT 
       status,
       COUNT(*) as count
     FROM tasks
     WHERE project_id = ?
     GROUP BY status`,
    [projectId]
  );
  
  // Format into an object
  const counts = {
    backlog: 0,
    to_do: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    cancelled: 0,
    total: 0
  };
  
  statusCounts.forEach(item => {
    counts[item.status] = item.count;
    counts.total += item.count;
  });
  
  return counts;
};

/**
 * Add a dependency between tasks
 */
const addTaskDependency = async (taskId, userId, dependencyData) => {
  // Get task with project info to check access
  const tasks = await query(
    'SELECT * FROM tasks WHERE id = ?',
    [taskId]
  );
  
  if (tasks.length === 0) {
    throw new Error('Task not found');
  }
  
  const task = tasks[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [task.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this task');
  }
  
  const { dependsOnTaskId, dependencyType = 'finish_to_start' } = dependencyData;
  
  if (!dependsOnTaskId) {
    throw new Error('Dependency task ID is required');
  }
  
  // Verify the dependency task exists and belongs to the same project
  const dependencyTasks = await query(
    'SELECT * FROM tasks WHERE id = ? AND project_id = ?',
    [dependsOnTaskId, task.project_id]
  );
  
  if (dependencyTasks.length === 0) {
    throw new Error('Dependency task not found or does not belong to the same project');
  }
  
  // Check for circular dependencies
  const isCircular = await checkCircularDependency(taskId, dependsOnTaskId);
  if (isCircular) {
    throw new Error('This dependency would create a circular reference');
  }
  
  // Check if dependency already exists
  const existingDependencies = await query(
    'SELECT * FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?',
    [taskId, dependsOnTaskId]
  );
  
  if (existingDependencies.length > 0) {
    throw new Error('This dependency already exists');
  }
  
  // Add the dependency
  const result = await query(
    'INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type) VALUES (?, ?, ?)',
    [taskId, dependsOnTaskId, dependencyType]
  );
  
  return {
    success: true,
    message: 'Task dependency added successfully',
    dependencyId: result.insertId
  };
};

/**
 * Remove a task dependency
 */
const removeTaskDependency = async (dependencyId, userId) => {
  // Get dependency details with task and project info
  const dependencies = await query(
    `SELECT d.*, t.project_id
     FROM task_dependencies d
     JOIN tasks t ON d.task_id = t.id
     WHERE d.id = ?`,
    [dependencyId]
  );
  
  if (dependencies.length === 0) {
    throw new Error('Dependency not found');
  }
  
  const dependency = dependencies[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [dependency.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this task');
  }
  
  // Remove the dependency
  await query(
    'DELETE FROM task_dependencies WHERE id = ?',
    [dependencyId]
  );
  
  return {
    success: true,
    message: 'Task dependency removed successfully'
  };
};

/**
 * Helper function to check for circular dependencies
 */
async function checkCircularDependency(taskId, dependsOnTaskId) {
  // If they're the same, it's circular
  if (taskId === dependsOnTaskId) {
    return true;
  }
  
  // Check if the dependency task depends on this task (direct circular)
  const directCircular = await query(
    'SELECT * FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?',
    [dependsOnTaskId, taskId]
  );
  
  if (directCircular.length > 0) {
    return true;
  }
  
  // Check for indirect circular dependencies
  const dependencies = await query(
    'SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?',
    [dependsOnTaskId]
  );
  
  // Recursively check each dependency
  for (const dep of dependencies) {
    const isCircular = await checkCircularDependency(taskId, dep.depends_on_task_id);
    if (isCircular) {
      return true;
    }
  }
  
  return false;
}

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
  getProjectTasks,
  getTaskStatusCounts,
  addTaskDependency,
  removeTaskDependency
}; 