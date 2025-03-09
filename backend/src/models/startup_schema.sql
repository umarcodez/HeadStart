-- Database schema for Startup Initiation features
-- Run these queries in MySQL Workbench to set up your database structure

-- Business Name Suggestions
CREATE TABLE IF NOT EXISTS business_name_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  industry VARCHAR(100),
  keywords TEXT,
  generated_names JSON,  -- Store array of name suggestions
  selected_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tagline Suggestions
CREATE TABLE IF NOT EXISTS tagline_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  business_name VARCHAR(255),
  keywords TEXT,
  generated_taglines JSON,  -- Store array of tagline suggestions
  selected_tagline VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Domain Availability Results
CREATE TABLE IF NOT EXISTS domain_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  available BOOLEAN,
  tld VARCHAR(20),
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (domain_name)
);

-- Video Tutorials
CREATE TABLE IF NOT EXISTS video_tutorials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  duration INT,  -- Duration in seconds
  thumbnail_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Tutorial Progress
CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  tutorial_id INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_position INT DEFAULT 0,  -- Position in seconds
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tutorial_id) REFERENCES video_tutorials(id) ON DELETE CASCADE,
  UNIQUE KEY user_tutorial_unique (user_id, tutorial_id)
); 