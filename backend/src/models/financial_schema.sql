-- Database schema for Business & Financial Planning features
-- Run these queries in MySQL Workbench to set up your database structure

-- Business Plans
CREATE TABLE IF NOT EXISTS business_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft', 'active', 'archived') DEFAULT 'draft',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Business Plan Sections
CREATE TABLE IF NOT EXISTS business_plan_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  section_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE CASCADE
);

-- Business Plan Templates
CREATE TABLE IF NOT EXISTS business_plan_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Plan Template Sections
CREATE TABLE IF NOT EXISTS business_plan_template_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  section_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_template TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES business_plan_templates(id) ON DELETE CASCADE
);

-- Insert default business plan templates
INSERT INTO business_plan_templates (name, description) VALUES 
('Standard Business Plan', 'A comprehensive business plan template suitable for most businesses'),
('Lean Startup Plan', 'A simplified business plan focused on core elements for startups'),
('E-commerce Business Plan', 'Tailored for online retail businesses');

-- Insert template sections for Standard Business Plan
INSERT INTO business_plan_template_sections 
(template_id, section_type, title, description, content_template, sort_order) VALUES
(1, 'executive_summary', 'Executive Summary', 'A brief overview of your business plan', 'Provide a concise summary of your business, including your mission, vision, goals, and the key elements of your business plan.', 1),
(1, 'company_description', 'Company Description', 'Description of what your company does', 'Describe your business in detail. What does your company do? What problems does it solve? What are your competitive advantages?', 2),
(1, 'market_analysis', 'Market Analysis', 'Research about your industry and target market', 'Analyze your target market, industry trends, and competition. Include market size, growth rate, and customer demographics.', 3),
(1, 'organization_management', 'Organization & Management', 'Structure of your company and management team', 'Describe your company structure, management team, and legal structure. Include the experience and qualifications of key team members.', 4),
(1, 'product_service_line', 'Product/Service Line', 'Description of your products or services', 'Describe your products or services in detail. What benefits do they provide? What is your product lifecycle and intellectual property status?', 5),
(1, 'marketing_sales', 'Marketing & Sales', 'Strategy for attracting and retaining customers', 'Outline your marketing and sales strategy. How will you attract and retain customers? What are your pricing strategies?', 6),
(1, 'financial_projections', 'Financial Projections', 'Financial forecast for the next 3-5 years', 'Provide financial projections for the next 3-5 years, including income statements, balance sheets, cash flow statements, and break-even analysis.', 7),
(1, 'funding_request', 'Funding Request', 'Details about your funding needs', 'Specify how much funding you need, how you will use the funds, and what future funding you may require.', 8),
(1, 'appendix', 'Appendix', 'Supporting documents and references', 'Include any additional information, such as resumes of key team members, permits, patents, etc.', 9);

-- Insert template sections for Lean Startup Plan
INSERT INTO business_plan_template_sections 
(template_id, section_type, title, description, content_template, sort_order) VALUES
(2, 'problem', 'Problem', 'The problem your business solves', 'Describe the problem your target customers face that your business will solve.', 1),
(2, 'solution', 'Solution', 'Your solution to the problem', 'Explain your product or service and how it solves the problem you identified.', 2),
(2, 'unique_value_proposition', 'Unique Value Proposition', 'What sets your solution apart', 'Define what makes your solution unique and why customers should choose you over competitors.', 3),
(2, 'customer_segments', 'Customer Segments', 'Your target customers', 'Identify your target customer segments and their characteristics.', 4),
(2, 'revenue_streams', 'Revenue Streams', 'How your business will make money', 'Outline how your business will generate revenue and your pricing model.', 5),
(2, 'key_metrics', 'Key Metrics', 'How you will measure success', 'Define the key metrics you will track to measure your business success.', 6),
(2, 'cost_structure', 'Cost Structure', 'Main costs in your business', 'List your fixed and variable costs and how they will change as you scale.', 7);

-- Financial Models
CREATE TABLE IF NOT EXISTS financial_models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  plan_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('revenue', 'expense', 'cash_flow', 'break_even', 'valuation', 'custom') NOT NULL,
  data JSON,
  assumptions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES business_plans(id) ON DELETE SET NULL
);

-- Budget Categories
CREATE TABLE IF NOT EXISTS budget_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type ENUM('income', 'expense') NOT NULL DEFAULT 'expense',
  color VARCHAR(7),
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default budget categories
INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Salary', 'Regular employment income', 'income', '#4CAF50', 'work'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Salary' AND type = 'income');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Investments', 'Income from investments', 'income', '#2196F3', 'trending_up'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Investments' AND type = 'income');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Rent/Mortgage', 'Housing expenses', 'expense', '#F44336', 'home'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Rent/Mortgage' AND type = 'expense');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Utilities', 'Electricity, water, internet, etc.', 'expense', '#FF9800', 'power'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Utilities' AND type = 'expense');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Food', 'Groceries and dining out', 'expense', '#9C27B0', 'restaurant'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Food' AND type = 'expense');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Transportation', 'Gas, public transit, car maintenance', 'expense', '#607D8B', 'directions_car'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Transportation' AND type = 'expense');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Entertainment', 'Movies, events, subscriptions', 'expense', '#E91E63', 'movie'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Entertainment' AND type = 'expense');

INSERT INTO budget_categories (user_id, name, description, type, color, icon) 
SELECT u.id, 'Healthcare', 'Medical expenses, insurance', 'expense', '#00BCD4', 'local_hospital'
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM budget_categories WHERE name = 'Healthcare' AND type = 'expense');

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Budget Items
CREATE TABLE IF NOT EXISTS budget_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  budget_id INT NOT NULL,
  category_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  category_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  receipt_image VARCHAR(255),
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
);

-- Income Records
CREATE TABLE IF NOT EXISTS income_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  category_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  income_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
);

-- Financial Goals
CREATE TABLE IF NOT EXISTS financial_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Financial Reports
CREATE TABLE IF NOT EXISTS financial_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  report_type ENUM('income_statement', 'cash_flow', 'balance_sheet', 'budget_variance', 'custom') NOT NULL,
  report_data JSON,
  parameters JSON,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); 