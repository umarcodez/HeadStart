-- Database schema for Team Building features
-- Run these queries in MySQL Workbench to set up your database structure

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id VARCHAR(128) NOT NULL,
  budget DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project Skills (needed for the project)
CREATE TABLE IF NOT EXISTS project_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  skill_id INT NOT NULL,
  importance ENUM('required', 'preferred', 'nice_to_have') DEFAULT 'required',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE KEY project_skill_unique (project_id, skill_id)
);

-- Team Members (users assigned to projects)
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  role VARCHAR(100) NOT NULL,
  hourly_rate DECIMAL(10,2),
  status ENUM('invited', 'active', 'resigned', 'removed') DEFAULT 'invited',
  joined_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY project_user_unique (project_id, user_id)
);

-- Team Invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  inviter_id VARCHAR(128) NOT NULL,
  invitee_id VARCHAR(128) NOT NULL,
  role VARCHAR(100) NOT NULL,
  message TEXT,
  status ENUM('pending', 'accepted', 'declined', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id),
  FOREIGN KEY (invitee_id) REFERENCES users(id),
  UNIQUE KEY invitation_unique (project_id, invitee_id, status)
);

-- Portfolio Items (for freelancers and entrepreneurs)
CREATE TABLE IF NOT EXISTS portfolio_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  project_url VARCHAR(255),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contracts (between project owner and team member)
CREATE TABLE IF NOT EXISTS contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  freelancer_id VARCHAR(128) NOT NULL,
  client_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  contract_type ENUM('fixed_price', 'hourly', 'milestone') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  status ENUM('draft', 'sent', 'active', 'completed', 'cancelled', 'disputed') DEFAULT 'draft',
  terms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES users(id)
);

-- Contract Milestones
CREATE TABLE IF NOT EXISTS contract_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  status ENUM('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'paid') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  milestone_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES contract_milestones(id) ON DELETE SET NULL
);

-- Freelancer Reviews (ratings and feedback)
CREATE TABLE IF NOT EXISTS freelancer_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  freelancer_id VARCHAR(128) NOT NULL,
  reviewer_id VARCHAR(128) NOT NULL,
  project_id INT NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (freelancer_id) REFERENCES users(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review (freelancer_id, reviewer_id, project_id)
);

-- User Permissions (for role-based access control)
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES
('create_project', 'Can create new projects'),
('invite_team_members', 'Can invite users to join teams'),
('manage_contracts', 'Can create and manage contracts'),
('process_payments', 'Can process payments'),
('view_team_reports', 'Can view team reports and analytics'),
('edit_project', 'Can edit project details'),
('delete_project', 'Can delete projects'),
('manage_own_profile', 'Can manage own profile');

-- Role Permissions (many-to-many relationship between roles and permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY role_permission_unique (role_id, permission_id)
);

-- Assign default permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE (r.name = 'entrepreneur' AND p.name IN ('create_project', 'invite_team_members', 'manage_contracts', 'process_payments', 'view_team_reports', 'edit_project', 'delete_project', 'manage_own_profile'))
   OR (r.name = 'freelancer' AND p.name IN ('manage_own_profile'))
   OR (r.name = 'team_member' AND p.name IN ('manage_own_profile'))
   OR (r.name = 'admin' AND p.name IN ('create_project', 'invite_team_members', 'manage_contracts', 'process_payments', 'view_team_reports', 'edit_project', 'delete_project', 'manage_own_profile'));

-- Project-specific user permissions (overrides for specific users on specific projects)
CREATE TABLE IF NOT EXISTS project_user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  permission_id INT NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY project_user_permission_unique (project_id, user_id, permission_id)
); 