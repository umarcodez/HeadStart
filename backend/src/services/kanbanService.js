/**
 * Kanban Service
 * 
 * Handles kanban board and column management
 */
const { query } = require('../config/db');

/**
 * Get kanban board details with columns and tasks
 */
const getKanbanBoard = async (boardId, userId) => {
  // Get board details
  const boards = await query(
    `SELECT kb.*, p.title as project_title
     FROM kanban_boards kb
     JOIN projects p ON kb.project_id = p.id
     WHERE kb.id = ?`,
    [boardId]
  );
  
  if (boards.length === 0) {
    throw new Error('Kanban board not found');
  }
  
  const board = boards[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [board.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this board');
  }
  
  // Get board columns
  board.columns = await query(
    'SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position',
    [boardId]
  );
  
  // Get tasks for each column
  for (const column of board.columns) {
    column.tasks = await query(
      `SELECT t.*, kt.position, 
         u.name as assignee_name, 
         u.profile_picture as assignee_picture
       FROM kanban_tasks kt
       JOIN tasks t ON kt.task_id = t.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE kt.column_id = ?
       ORDER BY kt.position`,
      [column.id]
    );
    
    // Get subtask counts for each task
    for (const task of column.tasks) {
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
  }
  
  return board;
};

/**
 * Get all kanban boards for a project
 */
const getProjectKanbanBoards = async (projectId, userId) => {
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have access to it');
  }
  
  // Get boards
  const boards = await query(
    'SELECT * FROM kanban_boards WHERE project_id = ? ORDER BY is_default DESC, title',
    [projectId]
  );
  
  // For each board, get column count and task count
  for (const board of boards) {
    const columnCount = await query(
      'SELECT COUNT(*) as count FROM kanban_columns WHERE board_id = ?',
      [board.id]
    );
    
    board.columnCount = columnCount[0].count;
    
    const taskCount = await query(
      `SELECT COUNT(*) as count 
       FROM kanban_tasks kt 
       JOIN kanban_columns kc ON kt.column_id = kc.id 
       WHERE kc.board_id = ?`,
      [board.id]
    );
    
    board.taskCount = taskCount[0].count;
  }
  
  return boards;
};

/**
 * Create a new kanban board
 */
const createKanbanBoard = async (projectId, userId, boardData) => {
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [projectId, userId]
  );
  
  if (members.length === 0) {
    throw new Error('Project not found or you do not have permission to create boards');
  }
  
  const { title, description, isDefault = false } = boardData;
  
  if (!title) {
    throw new Error('Board title is required');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // If this is set as default, unset other defaults
    if (isDefault) {
      await query(
        'UPDATE kanban_boards SET is_default = FALSE WHERE project_id = ?',
        [projectId]
      );
    }
    
    // Create the board
    const boardResult = await query(
      'INSERT INTO kanban_boards (project_id, title, description, is_default) VALUES (?, ?, ?, ?)',
      [projectId, title, description || '', isDefault]
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
        'INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)',
        [boardId, column.title, column.position]
      );
    }
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Kanban board created successfully',
      boardId
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Update a kanban board
 */
const updateKanbanBoard = async (boardId, userId, boardData) => {
  // Get board details to check project
  const boards = await query(
    'SELECT * FROM kanban_boards WHERE id = ?',
    [boardId]
  );
  
  if (boards.length === 0) {
    throw new Error('Kanban board not found');
  }
  
  const board = boards[0];
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [board.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to update this board');
  }
  
  const { title, description, isDefault } = boardData;
  
  if (!title) {
    throw new Error('Board title is required');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // If this is set as default, unset other defaults
    if (isDefault) {
      await query(
        'UPDATE kanban_boards SET is_default = FALSE WHERE project_id = ? AND id != ?',
        [board.project_id, boardId]
      );
    }
    
    // Update the board
    await query(
      'UPDATE kanban_boards SET title = ?, description = ?, is_default = ? WHERE id = ?',
      [title, description || '', isDefault !== undefined ? isDefault : board.is_default, boardId]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Kanban board updated successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Delete a kanban board
 */
const deleteKanbanBoard = async (boardId, userId) => {
  // Get board details to check project
  const boards = await query(
    'SELECT * FROM kanban_boards WHERE id = ?',
    [boardId]
  );
  
  if (boards.length === 0) {
    throw new Error('Kanban board not found');
  }
  
  const board = boards[0];
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [board.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to delete this board');
  }
  
  // Check if this is the only board or a default board
  const boardCount = await query(
    'SELECT COUNT(*) as count FROM kanban_boards WHERE project_id = ?',
    [board.project_id]
  );
  
  if (boardCount[0].count === 1) {
    throw new Error('Cannot delete the only kanban board for this project');
  }
  
  if (board.is_default) {
    throw new Error('Cannot delete the default kanban board. Set another board as default first.');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Get all task positions from this board
    const kanbanTasks = await query(
      `SELECT kt.* 
       FROM kanban_tasks kt
       JOIN kanban_columns kc ON kt.column_id = kc.id
       WHERE kc.board_id = ?`,
      [boardId]
    );
    
    // Delete the board (columns will be deleted via cascading)
    await query(
      'DELETE FROM kanban_boards WHERE id = ?',
      [boardId]
    );
    
    // If there are tasks in this board, they need to be added to another board
    if (kanbanTasks.length > 0) {
      // Find another board, preferably the default one
      const otherBoards = await query(
        'SELECT * FROM kanban_boards WHERE project_id = ? ORDER BY is_default DESC, id LIMIT 1',
        [board.project_id]
      );
      
      if (otherBoards.length > 0) {
        const targetBoardId = otherBoards[0].id;
        
        // Find columns in the target board
        const targetColumns = await query(
          'SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position',
          [targetBoardId]
        );
        
        if (targetColumns.length > 0) {
          // Map statuses to columns (based on typical column naming)
          const statusMap = {};
          targetColumns.forEach(column => {
            const columnName = column.title.toLowerCase();
            if (columnName.includes('backlog')) statusMap.backlog = column.id;
            else if (columnName.includes('to do') || columnName.includes('todo')) statusMap.to_do = column.id;
            else if (columnName.includes('progress')) statusMap.in_progress = column.id;
            else if (columnName.includes('review')) statusMap.in_review = column.id;
            else if (columnName.includes('done') || columnName.includes('complete')) statusMap.done = column.id;
          });
          
          // Default column (first one)
          const defaultColumnId = targetColumns[0].id;
          
          // For each task, get its status and add it to the appropriate column
          for (const kanbanTask of kanbanTasks) {
            // Get task status
            const tasks = await query(
              'SELECT status FROM tasks WHERE id = ?',
              [kanbanTask.task_id]
            );
            
            if (tasks.length > 0) {
              const status = tasks[0].status;
              const targetColumnId = statusMap[status] || defaultColumnId;
              
              // Get highest position in target column
              const positions = await query(
                'SELECT MAX(position) as max_position FROM kanban_tasks WHERE column_id = ?',
                [targetColumnId]
              );
              
              const position = (positions[0].max_position || 0) + 1;
              
              // Add task to target column
              await query(
                'INSERT INTO kanban_tasks (column_id, task_id, position) VALUES (?, ?, ?)',
                [targetColumnId, kanbanTask.task_id, position]
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
      message: 'Kanban board deleted successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Create a kanban column
 */
const createKanbanColumn = async (boardId, userId, columnData) => {
  // Get board details to check project
  const boards = await query(
    'SELECT * FROM kanban_boards WHERE id = ?',
    [boardId]
  );
  
  if (boards.length === 0) {
    throw new Error('Kanban board not found');
  }
  
  const board = boards[0];
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [board.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to update this board');
  }
  
  const { title, description, position, wipLimit } = columnData;
  
  if (!title) {
    throw new Error('Column title is required');
  }
  
  // Get the highest position to add at the end if position not specified
  const positions = await query(
    'SELECT MAX(position) as max_position FROM kanban_columns WHERE board_id = ?',
    [boardId]
  );
  
  const maxPosition = positions[0].max_position || 0;
  const columnPosition = position || maxPosition + 1;
  
  // Create the column
  const result = await query(
    'INSERT INTO kanban_columns (board_id, title, description, position, wip_limit) VALUES (?, ?, ?, ?, ?)',
    [boardId, title, description || '', columnPosition, wipLimit || null]
  );
  
  return {
    success: true,
    message: 'Kanban column created successfully',
    columnId: result.insertId
  };
};

/**
 * Update a kanban column
 */
const updateKanbanColumn = async (columnId, userId, columnData) => {
  // Get column details with board and project info
  const columns = await query(
    `SELECT kc.*, kb.project_id
     FROM kanban_columns kc
     JOIN kanban_boards kb ON kc.board_id = kb.id
     WHERE kc.id = ?`,
    [columnId]
  );
  
  if (columns.length === 0) {
    throw new Error('Kanban column not found');
  }
  
  const column = columns[0];
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [column.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to update this column');
  }
  
  const { title, description, wipLimit } = columnData;
  
  if (!title) {
    throw new Error('Column title is required');
  }
  
  // Update the column
  await query(
    'UPDATE kanban_columns SET title = ?, description = ?, wip_limit = ? WHERE id = ?',
    [title, description || '', wipLimit || null, columnId]
  );
  
  return {
    success: true,
    message: 'Kanban column updated successfully'
  };
};

/**
 * Delete a kanban column
 */
const deleteKanbanColumn = async (columnId, userId) => {
  // Get column details with board and project info
  const columns = await query(
    `SELECT kc.*, kb.project_id
     FROM kanban_columns kc
     JOIN kanban_boards kb ON kc.board_id = kb.id
     WHERE kc.id = ?`,
    [columnId]
  );
  
  if (columns.length === 0) {
    throw new Error('Kanban column not found');
  }
  
  const column = columns[0];
  
  // Check if user is a project owner or manager
  const members = await query(
    "SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role IN ('owner', 'manager')",
    [column.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have permission to delete this column');
  }
  
  // Check if this is the only column in the board
  const columnCount = await query(
    'SELECT COUNT(*) as count FROM kanban_columns WHERE board_id = ?',
    [column.board_id]
  );
  
  if (columnCount[0].count === 1) {
    throw new Error('Cannot delete the only column in a board');
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Get all tasks in this column
    const kanbanTasks = await query(
      'SELECT * FROM kanban_tasks WHERE column_id = ?',
      [columnId]
    );
    
    // Delete the column
    await query(
      'DELETE FROM kanban_columns WHERE id = ?',
      [columnId]
    );
    
    // If there are tasks in this column, move them to the first column in the board
    if (kanbanTasks.length > 0) {
      // Find another column
      const otherColumns = await query(
        'SELECT * FROM kanban_columns WHERE board_id = ? AND id != ? ORDER BY position LIMIT 1',
        [column.board_id, columnId]
      );
      
      if (otherColumns.length > 0) {
        const targetColumnId = otherColumns[0].id;
        
        // Get highest position in target column
        const positions = await query(
          'SELECT MAX(position) as max_position FROM kanban_tasks WHERE column_id = ?',
          [targetColumnId]
        );
        
        let position = (positions[0].max_position || 0);
        
        // Add tasks to target column
        for (const kanbanTask of kanbanTasks) {
          position++;
          await query(
            'INSERT INTO kanban_tasks (column_id, task_id, position) VALUES (?, ?, ?)',
            [targetColumnId, kanbanTask.task_id, position]
          );
        }
      }
    }
    
    // Re-order remaining columns
    await query(
      'SET @pos = 0; UPDATE kanban_columns SET position = (@pos := @pos + 1) WHERE board_id = ? ORDER BY position',
      [column.board_id]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Kanban column deleted successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Reorder columns in a board
 */
const reorderKanbanColumns = async (boardId, userId, orderData) => {
  // Get board details to check project
  const boards = await query(
    'SELECT * FROM kanban_boards WHERE id = ?',
    [boardId]
  );
  
  if (boards.length === 0) {
    throw new Error('Kanban board not found');
  }
  
  const board = boards[0];
  
  // Check if user is a member of the project
  const members = await query(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [board.project_id, userId]
  );
  
  if (members.length === 0) {
    throw new Error('You do not have access to this board');
  }
  
  const { columnIds } = orderData;
  
  if (!columnIds || !Array.isArray(columnIds) || columnIds.length === 0) {
    throw new Error('Column IDs array is required');
  }
  
  // Verify that all columns belong to this board
  const boardColumns = await query(
    'SELECT id FROM kanban_columns WHERE board_id = ?',
    [boardId]
  );
  
  const boardColumnIds = boardColumns.map(col => col.id);
  
  // All provided columns must exist in the board
  const allColumnsExist = columnIds.every(id => boardColumnIds.includes(parseInt(id)));
  
  // All board columns must be included
  const allColumnsIncluded = boardColumnIds.length === columnIds.length;
  
  if (!allColumnsExist || !allColumnsIncluded) {
    throw new Error('Invalid column order. All columns must be included exactly once.');
  }
  
  // Update column positions
  await query('START TRANSACTION');
  
  try {
    for (let i = 0; i < columnIds.length; i++) {
      await query(
        'UPDATE kanban_columns SET position = ? WHERE id = ?',
        [i + 1, columnIds[i]]
      );
    }
    
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Columns reordered successfully'
    };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
};

/**
 * Move a task to a different column or position
 */
const moveKanbanTask = async (taskId, userId, moveData) => {
  // Get task details to check project
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
  
  const { columnId, position } = moveData;
  
  if (!columnId || position === undefined) {
    throw new Error('Column ID and position are required');
  }
  
  // Verify the column exists
  const columns = await query(
    `SELECT kc.*, kb.project_id
     FROM kanban_columns kc
     JOIN kanban_boards kb ON kc.board_id = kb.id
     WHERE kc.id = ?`,
    [columnId]
  );
  
  if (columns.length === 0) {
    throw new Error('Column not found');
  }
  
  const column = columns[0];
  
  // Check that the column belongs to the same project
  if (column.project_id !== task.project_id) {
    throw new Error('Column does not belong to the same project as the task');
  }
  
  // Check WIP limit
  if (column.wip_limit !== null) {
    const taskCount = await query(
      'SELECT COUNT(*) as count FROM kanban_tasks WHERE column_id = ?',
      [columnId]
    );
    
    // Get current kanban task to check if we're moving within the same column
    const currentKanbanTask = await query(
      'SELECT * FROM kanban_tasks WHERE task_id = ?',
      [taskId]
    );
    
    // Only check WIP limit if moving to a different column
    if (
      currentKanbanTask.length === 0 || 
      currentKanbanTask[0].column_id !== parseInt(columnId)
    ) {
      if (taskCount[0].count >= column.wip_limit) {
        throw new Error(`Cannot move task to this column. WIP limit of ${column.wip_limit} reached.`);
      }
    }
  }
  
  // Start a transaction
  await query('START TRANSACTION');
  
  try {
    // Get current task position if it exists
    const currentTask = await query(
      'SELECT * FROM kanban_tasks WHERE task_id = ?',
      [taskId]
    );
    
    // If task is already on a board, remove it
    if (currentTask.length > 0) {
      await query(
        'DELETE FROM kanban_tasks WHERE task_id = ?',
        [taskId]
      );
      
      // If removing from the same column as the target, adjust the position
      if (currentTask[0].column_id === parseInt(columnId)) {
        // If the task's current position is less than the target position,
        // decrement the target position by 1 because removing the task
        // will cause other tasks to shift up by 1
        if (currentTask[0].position < position) {
          position--;
        }
      }
    }
    
    // Make space for the task at the target position
    await query(
      'UPDATE kanban_tasks SET position = position + 1 WHERE column_id = ? AND position >= ?',
      [columnId, position]
    );
    
    // Insert the task at the target position
    await query(
      'INSERT INTO kanban_tasks (column_id, task_id, position) VALUES (?, ?, ?)',
      [columnId, taskId, position]
    );
    
    // Update task status based on column name
    const columnName = column.title.toLowerCase();
    let newStatus = null;
    
    if (columnName.includes('backlog')) newStatus = 'backlog';
    else if (columnName.includes('to do') || columnName.includes('todo')) newStatus = 'to_do';
    else if (columnName.includes('progress')) newStatus = 'in_progress';
    else if (columnName.includes('review')) newStatus = 'in_review';
    else if (columnName.includes('done') || columnName.includes('complete')) newStatus = 'done';
    
    if (newStatus && newStatus !== task.status) {
      await query(
        'UPDATE tasks SET status = ? WHERE id = ?',
        [newStatus, taskId]
      );
    }
    
    // Reindex task positions to ensure they are sequential
    await query(
      `SET @pos = 0; 
       UPDATE kanban_tasks 
       SET position = (@pos := @pos + 1) 
       WHERE column_id = ? 
       ORDER BY position`,
      [columnId]
    );
    
    // Commit the transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'Task moved successfully'
    };
  } catch (error) {
    // Rollback on error
    await query('ROLLBACK');
    throw error;
  }
};

module.exports = {
  getKanbanBoard,
  getProjectKanbanBoards,
  createKanbanBoard,
  updateKanbanBoard,
  deleteKanbanBoard,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  reorderKanbanColumns,
  moveKanbanTask
}; 