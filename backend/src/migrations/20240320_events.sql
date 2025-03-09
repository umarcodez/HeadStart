-- Drop existing tables if they exist
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS event_tag_mapping;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS event_tags;
DROP TABLE IF EXISTS event_categories;

-- Event Categories Table
CREATE TABLE event_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#000000',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Event Tags Table
CREATE TABLE event_tags (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    category_id VARCHAR(36),
    created_by VARCHAR(128) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'upcoming',
    max_participants INT,
    registration_deadline DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES event_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Event Tags Mapping Table
CREATE TABLE event_tag_mapping (
    event_id VARCHAR(36),
    tag_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, tag_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES event_tags(id) ON DELETE CASCADE
);

-- Event Participants Table
CREATE TABLE event_participants (
    event_id VARCHAR(36),
    user_id VARCHAR(128),
    status VARCHAR(20) DEFAULT 'registered',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default event categories
INSERT INTO event_categories (id, name, description, color) VALUES
(UUID(), 'Networking', 'Networking events and meetups', '#FF4444'),
(UUID(), 'Training', 'Training sessions and workshops', '#33B679'),
(UUID(), 'Investment', 'Investment opportunities and pitch events', '#7986CB'),
(UUID(), 'Conference', 'Industry conferences and seminars', '#8E24AA'),
(UUID(), 'Webinar', 'Online webinars and virtual events', '#0B8043'),
(UUID(), 'Team Building', 'Team building activities', '#E67C73'),
(UUID(), 'Other', 'Miscellaneous events', '#616161');

-- Insert common event tags
INSERT INTO event_tags (id, name) VALUES
(UUID(), 'startup'),
(UUID(), 'technology'),
(UUID(), 'business'),
(UUID(), 'finance'),
(UUID(), 'marketing'),
(UUID(), 'innovation'),
(UUID(), 'entrepreneurship'),
(UUID(), 'leadership'),
(UUID(), 'networking'),
(UUID(), 'workshop'),
(UUID(), 'virtual'),
(UUID(), 'in-person'); 