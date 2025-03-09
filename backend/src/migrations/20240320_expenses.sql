-- Expenses Categories Table
CREATE TABLE expense_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    receipt_url VARCHAR(255),
    receipt_text TEXT,
    receipt_data JSON,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);

-- Insert default expense categories
INSERT INTO expense_categories (id, name, description) VALUES
(UUID(), 'Office Supplies', 'Expenses related to office materials and supplies'),
(UUID(), 'Travel', 'Business travel related expenses'),
(UUID(), 'Software', 'Software licenses and subscriptions'),
(UUID(), 'Hardware', 'Computer hardware and equipment'),
(UUID(), 'Marketing', 'Marketing and advertising expenses'),
(UUID(), 'Utilities', 'Office utilities and services'),
(UUID(), 'Professional Services', 'Legal, accounting, and consulting services'),
(UUID(), 'Others', 'Miscellaneous expenses'); 