-- Event Management and Communication Schema
-- This schema defines tables for events, notifications, messaging, and discussion forums

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  creator_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  location_url VARCHAR(255), -- For virtual events or maps link
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(255), -- For recurring events (e.g., 'DAILY', 'WEEKLY:3', 'MONTHLY:2,15')
  recurrence_end_date DATE, -- When the recurrence ends
  color VARCHAR(20) DEFAULT '#3788d8', -- For calendar display
  is_private BOOLEAN DEFAULT FALSE, -- Whether the event is private to the creator
  status ENUM('scheduled', 'cancelled', 'completed') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Event Participants Table
CREATE TABLE IF NOT EXISTS event_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'tentative') DEFAULT 'pending',
  notify BOOLEAN DEFAULT TRUE, -- Whether to send reminders
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_event_participant (event_id, user_id)
);

-- Event Reminders Table
CREATE TABLE IF NOT EXISTS event_reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reminder_time DATETIME NOT NULL,
  reminded BOOLEAN DEFAULT FALSE, -- Whether the reminder has been sent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Event Categories Table
CREATE TABLE IF NOT EXISTS event_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default event categories
INSERT INTO event_categories (name, color) VALUES
('Meeting', '#3788d8'),
('Workshop', '#9c27b0'),
('Deadline', '#f44336'),
('Holiday', '#4caf50'),
('Personal', '#ff9800');

-- Event-Category Relationship
CREATE TABLE IF NOT EXISTS event_category_relationship (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  category_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_event_category (event_id, category_id)
);

-- Event Attachments Table
CREATE TABLE IF NOT EXISTS event_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification Types Table (for system-defined notification types)
CREATE TABLE IF NOT EXISTS notification_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  template_subject VARCHAR(255), -- Template for notification subject
  template_body TEXT, -- Template for notification body
  importance ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default notification types
INSERT INTO notification_types (name, description, template_subject, template_body, importance) VALUES
('event_invitation', 'Invitation to an event', 'You have been invited to: {{event_title}}', 'Hello {{user_name}}, you have been invited to {{event_title}} on {{event_date}} by {{creator_name}}.', 'medium'),
('event_reminder', 'Reminder for an upcoming event', 'Reminder: {{event_title}} is coming up', 'Hello {{user_name}}, this is a reminder that {{event_title}} is scheduled for {{event_date}}.', 'medium'),
('event_update', 'Event details have been updated', 'Event updated: {{event_title}}', 'Hello {{user_name}}, the event {{event_title}} has been updated. Please check the new details.', 'medium'),
('event_cancelled', 'Event has been cancelled', 'Event cancelled: {{event_title}}', 'Hello {{user_name}}, the event {{event_title}} scheduled for {{event_date}} has been cancelled.', 'high'),
('task_assigned', 'A task has been assigned', 'New task assigned: {{task_title}}', 'Hello {{user_name}}, you have been assigned a new task: {{task_title}}.', 'high'),
('task_due_soon', 'A task is due soon', 'Task due soon: {{task_title}}', 'Hello {{user_name}}, your task {{task_title}} is due on {{task_due_date}}.', 'high'),
('task_updated', 'Task details have been updated', 'Task updated: {{task_title}}', 'Hello {{user_name}}, the task {{task_title}} has been updated.', 'medium'),
('task_completed', 'A task has been marked as completed', 'Task completed: {{task_title}}', 'Hello {{user_name}}, the task {{task_title}} has been marked as completed.', 'low'),
('project_invitation', 'Invitation to join a project', 'You have been invited to project: {{project_title}}', 'Hello {{user_name}}, you have been invited to join the project {{project_title}} by {{inviter_name}}.', 'high'),
('project_update', 'Project details have been updated', 'Project updated: {{project_title}}', 'Hello {{user_name}}, the project {{project_title}} has been updated. Please check the new details.', 'medium'),
('comment_mention', 'You have been mentioned in a comment', 'You were mentioned in: {{context}}', 'Hello {{user_name}}, you were mentioned in a comment by {{commenter_name}}: "{{comment_text}}"', 'medium'),
('new_message', 'You have received a new message', 'New message from {{sender_name}}', 'Hello {{user_name}}, you have received a new message from {{sender_name}}.', 'medium');

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  type_id INT NOT NULL,
  reference_id INT, -- ID of the related entity (event, task, etc.)
  reference_type VARCHAR(50), -- Type of the related entity (event, task, etc.)
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (type_id) REFERENCES notification_types(id)
);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  notification_type_id INT NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_type_id) REFERENCES notification_types(id),
  UNIQUE KEY unique_user_notification_type (user_id, notification_type_id)
);

-- Chat Channels Table
CREATE TABLE IF NOT EXISTS chat_channels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  description TEXT,
  is_direct BOOLEAN DEFAULT FALSE, -- Whether it's a direct message channel
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Chat Channel Members Table
CREATE TABLE IF NOT EXISTS chat_channel_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  channel_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_message_id INT, -- ID of the last message read by this user
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_channel_member (channel_id, user_id)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  channel_id INT NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  parent_message_id INT, -- For threaded replies
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL
);

-- Chat Message Attachments Table
CREATE TABLE IF NOT EXISTS chat_message_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  thumbnail_path VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

-- Chat Message Reactions Table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reaction VARCHAR(50) NOT NULL, -- e.g., ':thumbsup:', ':heart:', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_message_reaction (message_id, user_id, reaction)
);

-- Discussion Forums Table
CREATE TABLE IF NOT EXISTS forums (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Forum Access Table (for private forums)
CREATE TABLE IF NOT EXISTS forum_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  forum_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_forum_user (forum_id, user_id)
);

-- Forum Categories Table
CREATE TABLE IF NOT EXISTS forum_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  forum_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3788d8',
  order_position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE
);

-- Forum Topics Table
CREATE TABLE IF NOT EXISTS forum_topics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  forum_id INT NOT NULL,
  category_id INT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Forum Posts Table (replies to topics)
CREATE TABLE IF NOT EXISTS forum_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  topic_id INT NOT NULL,
  content TEXT NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE, -- Whether this post is marked as the solution
  parent_post_id INT, -- For threaded replies
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_post_id) REFERENCES forum_posts(id) ON DELETE SET NULL
);

-- Forum Attachments Table
CREATE TABLE IF NOT EXISTS forum_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  topic_id INT,
  post_id INT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  CHECK ((topic_id IS NULL AND post_id IS NOT NULL) OR (topic_id IS NOT NULL AND post_id IS NULL))
);

-- Topic Subscriptions Table
CREATE TABLE IF NOT EXISTS topic_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  topic_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_topic_user (topic_id, user_id)
);

-- Mention Tracking Table (for @mentions)
CREATE TABLE IF NOT EXISTS mentions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL, -- User who is mentioned
  mentioned_by VARCHAR(255) NOT NULL, -- User who made the mention
  context_type ENUM('chat', 'forum', 'task', 'comment') NOT NULL, -- Where the mention occurred
  context_id INT NOT NULL, -- ID of the chat message, forum post, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- User Status Table (online, away, do not disturb, etc.)
CREATE TABLE IF NOT EXISTS user_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  status ENUM('online', 'away', 'busy', 'offline') DEFAULT 'offline',
  custom_status VARCHAR(100),
  last_active TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_status (user_id)
);

-- Create a general forum for all users
INSERT INTO forums (id, name, description, is_private, created_by) 
VALUES (1, 'General Discussion', 'Forum for general discussion of all topics', FALSE, 'system');

-- Create default categories for the general forum
INSERT INTO forum_categories (forum_id, name, description, color, order_position) VALUES
(1, 'Announcements', 'Official announcements and news', '#f44336', 1),
(1, 'General', 'General discussion topics', '#3788d8', 2),
(1, 'Help & Support', 'Get help with questions or issues', '#4caf50', 3),
(1, 'Ideas & Feedback', 'Share your ideas and feedback', '#ff9800', 4); 