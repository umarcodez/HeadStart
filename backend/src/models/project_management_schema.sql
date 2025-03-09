-- Project Management Schema
-- This schema defines tables for project and task management features

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL, -- Owner of the project
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  progress DECIMAL(5,2) DEFAULT 0, -- Percentage of completion (0-100)
  budget DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project Members Table (for collaboration)
CREATE TABLE IF NOT EXISTS project_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('owner', 'manager', 'member', 'viewer') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_member (project_id, user_id)
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS project_milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status ENUM('not_started', 'in_progress', 'completed', 'delayed') DEFAULT 'not_started',
  completion_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT,
  milestone_id INT,
  creator_id VARCHAR(255) NOT NULL,
  assignee_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('backlog', 'to_do', 'in_progress', 'in_review', 'done', 'cancelled') DEFAULT 'to_do',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  estimated_hours DECIMAL(6,2),
  tags VARCHAR(255), -- Comma-separated list of tags
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE SET NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Subtasks Table
CREATE TABLE IF NOT EXISTS subtasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Task Dependencies Table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_dependency (task_id, depends_on_task_id)
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Time Tracking
CREATE TABLE IF NOT EXISTS time_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INT, -- Duration in seconds
  is_billable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Kanban Boards
CREATE TABLE IF NOT EXISTS kanban_boards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Kanban Columns (lists)
CREATE TABLE IF NOT EXISTS kanban_columns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  board_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INT NOT NULL, -- For ordering columns
  wip_limit INT, -- Work in progress limit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);

-- Kanban Tasks (maps tasks to kanban columns)
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  column_id INT NOT NULL,
  task_id INT NOT NULL,
  position INT NOT NULL, -- For ordering tasks within a column
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_position (column_id, position),
  UNIQUE KEY unique_task_mapping (task_id)
);

-- Project Templates
CREATE TABLE IF NOT EXISTS project_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Template Tasks
CREATE TABLE IF NOT EXISTS template_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_hours DECIMAL(6,2),
  relative_start_day INT, -- Day offset from project start
  relative_due_day INT,   -- Day offset from project start
  depends_on_task_id INT, -- Reference to another template_task
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES template_tasks(id) ON DELETE SET NULL
);

-- Initial Default Project Template
INSERT INTO project_templates (id, user_id, title, description, is_public) 
VALUES (1, 'system', 'Basic Project Template', 'A simple project template with essential tasks', TRUE);

-- Basic Template Tasks
INSERT INTO template_tasks (template_id, title, description, estimated_hours, relative_start_day, relative_due_day) 
VALUES 
(1, 'Project Planning', 'Define project scope, objectives, and requirements', 8, 0, 2),
(1, 'Research', 'Conduct market research and competitive analysis', 16, 3, 7),
(1, 'Design', 'Create detailed designs and mockups', 24, 8, 14),
(1, 'Development', 'Build the project according to specifications', 40, 15, 35),
(1, 'Testing', 'Perform quality assurance and user testing', 16, 36, 42),
(1, 'Deployment', 'Launch the completed project', 8, 43, 45),
(1, 'Review', 'Conduct post-launch review and gather feedback', 8, 46, 50); 