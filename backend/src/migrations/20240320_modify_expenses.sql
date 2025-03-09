-- First, create the expense_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default expense categories if table was just created
INSERT IGNORE INTO expense_categories (id, name, description) VALUES
(UUID(), 'Office Supplies', 'Expenses related to office materials and supplies'),
(UUID(), 'Travel', 'Business travel related expenses'),
(UUID(), 'Software', 'Software licenses and subscriptions'),
(UUID(), 'Hardware', 'Computer hardware and equipment'),
(UUID(), 'Marketing', 'Marketing and advertising expenses'),
(UUID(), 'Utilities', 'Office utilities and services'),
(UUID(), 'Professional Services', 'Legal, accounting, and consulting services'),
(UUID(), 'Others', 'Miscellaneous expenses');

-- Drop existing foreign key if it exists
SET @constraint_name = (
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'hs_database' 
    AND TABLE_NAME = 'expenses' 
    AND COLUMN_NAME = 'category_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
);

SET @drop_fk_sql = IF(
    @constraint_name IS NOT NULL,
    CONCAT('ALTER TABLE expenses DROP FOREIGN KEY ', @constraint_name),
    'SELECT 1'
);

PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create temporary table to store category mappings
CREATE TEMPORARY TABLE category_mapping (
    old_id INT PRIMARY KEY,
    new_id VARCHAR(36)
);

-- Get the 'Others' category ID
SET @others_id = (SELECT id FROM expense_categories WHERE name = 'Others' LIMIT 1);

-- Insert mappings for existing categories
INSERT INTO category_mapping (old_id, new_id)
SELECT DISTINCT category_id, @others_id
FROM expenses;

-- Update the category_id column to use UUID
ALTER TABLE expenses
    MODIFY COLUMN category_id VARCHAR(36);

-- Update expenses with new category IDs
UPDATE expenses e
JOIN category_mapping cm ON e.category_id = CAST(cm.old_id AS CHAR)
SET e.category_id = cm.new_id;

-- Add foreign key constraint
ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_category 
    FOREIGN KEY (category_id) 
    REFERENCES expense_categories(id); 