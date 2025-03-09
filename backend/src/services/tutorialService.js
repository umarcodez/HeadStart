/**
 * Video Tutorial Service
 * 
 * Manages video tutorials for entrepreneurs and freelancers
 */
const { query } = require('../config/db');

// Get all tutorial categories
const getCategories = async () => {
  const result = await query(
    'SELECT DISTINCT category FROM video_tutorials ORDER BY category ASC'
  );
  return result.map(row => row.category);
};

// Get tutorials by category
const getTutorialsByCategory = async (category) => {
  const tutorials = await query(
    'SELECT id, title, description, video_url, category, duration, thumbnail_url FROM video_tutorials WHERE category = ? ORDER BY title ASC',
    [category]
  );
  return tutorials;
};

// Get all tutorials
const getAllTutorials = async () => {
  const tutorials = await query(
    'SELECT id, title, description, video_url, category, duration, thumbnail_url FROM video_tutorials ORDER BY category, title ASC'
  );
  return tutorials;
};

// Get tutorial by ID
const getTutorialById = async (id) => {
  const tutorials = await query(
    'SELECT id, title, description, video_url, category, duration, thumbnail_url FROM video_tutorials WHERE id = ?',
    [id]
  );
  return tutorials.length ? tutorials[0] : null;
};

// Get user progress for a tutorial
const getUserProgress = async (userId, tutorialId) => {
  const progress = await query(
    'SELECT completed, last_watched_position, completed_at FROM user_tutorial_progress WHERE user_id = ? AND tutorial_id = ?',
    [userId, tutorialId]
  );
  return progress.length ? progress[0] : { completed: false, last_watched_position: 0, completed_at: null };
};

// Update user progress
const updateUserProgress = async (userId, tutorialId, position, completed) => {
  // Check if entry exists
  const existing = await query(
    'SELECT id FROM user_tutorial_progress WHERE user_id = ? AND tutorial_id = ?',
    [userId, tutorialId]
  );
  
  const completedAt = completed ? new Date() : null;
  
  if (existing.length) {
    // Update existing progress
    await query(
      'UPDATE user_tutorial_progress SET last_watched_position = ?, completed = ?, completed_at = ?, updated_at = NOW() WHERE user_id = ? AND tutorial_id = ?',
      [position, completed, completedAt, userId, tutorialId]
    );
  } else {
    // Create new progress entry
    await query(
      'INSERT INTO user_tutorial_progress (user_id, tutorial_id, last_watched_position, completed, completed_at) VALUES (?, ?, ?, ?, ?)',
      [userId, tutorialId, position, completed, completedAt]
    );
  }
  
  return { 
    success: true, 
    message: 'Progress updated successfully' 
  };
};

// Get recommended tutorials for a user based on their role and progress
const getRecommendedTutorials = async (userId) => {
  // Get user's role
  const userRole = await query(
    'SELECT r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [userId]
  );
  
  if (!userRole.length) {
    return [];
  }
  
  const role = userRole[0].role;
  
  // Get relevant categories based on role
  let categories = [];
  if (role === 'entrepreneur') {
    categories = ['Business Planning', 'Marketing', 'Finance', 'Leadership'];
  } else if (role === 'freelancer') {
    categories = ['Freelancing', 'Client Management', 'Portfolio Building', 'Skill Development'];
  } else {
    categories = ['Team Collaboration', 'Project Management', 'Communication'];
  }
  
  // Get tutorials in those categories that the user hasn't completed yet
  const recommendations = await query(`
    SELECT t.id, t.title, t.description, t.video_url, t.category, t.duration, t.thumbnail_url
    FROM video_tutorials t
    LEFT JOIN user_tutorial_progress p ON t.id = p.tutorial_id AND p.user_id = ?
    WHERE t.category IN (?) AND (p.completed IS NULL OR p.completed = 0)
    ORDER BY t.category, t.title
    LIMIT 5
  `, [userId, categories]);
  
  return recommendations;
};

// Sample tutorials to populate the database
const sampleTutorials = [
  {
    title: 'How to Create a Business Plan',
    description: 'Learn the fundamentals of creating an effective business plan for your startup.',
    video_url: 'https://www.youtube.com/watch?v=Fqch5OrUPvA',
    category: 'Business Planning',
    duration: 1823,
    thumbnail_url: 'https://img.youtube.com/vi/Fqch5OrUPvA/maxresdefault.jpg'
  },
  {
    title: 'Financial Modeling for Startups',
    description: 'Create financial projections and models for your new business.',
    video_url: 'https://www.youtube.com/watch?v=VJ_tu8Z4F3k',
    category: 'Finance',
    duration: 2465,
    thumbnail_url: 'https://img.youtube.com/vi/VJ_tu8Z4F3k/maxresdefault.jpg'
  },
  {
    title: 'Finding Your First Clients as a Freelancer',
    description: 'Strategies for landing your first freelance clients and building your portfolio.',
    video_url: 'https://www.youtube.com/watch?v=6VdjBbU_ORI',
    category: 'Freelancing',
    duration: 1254,
    thumbnail_url: 'https://img.youtube.com/vi/6VdjBbU_ORI/maxresdefault.jpg'
  },
  {
    title: 'Effective Team Management',
    description: 'Learn how to build and manage high-performing teams.',
    video_url: 'https://www.youtube.com/watch?v=qF5-HvIfiCM',
    category: 'Team Collaboration',
    duration: 1876,
    thumbnail_url: 'https://img.youtube.com/vi/qF5-HvIfiCM/maxresdefault.jpg'
  },
  {
    title: 'Digital Marketing Essentials',
    description: 'Master the basics of digital marketing for your business.',
    video_url: 'https://www.youtube.com/watch?v=hZLMv5aexto',
    category: 'Marketing',
    duration: 2189,
    thumbnail_url: 'https://img.youtube.com/vi/hZLMv5aexto/maxresdefault.jpg'
  }
];

// Initialize tutorials (add sample tutorials to the database)
const initializeTutorials = async () => {
  // Check if tutorials exist
  const existing = await query('SELECT COUNT(*) as count FROM video_tutorials');
  
  if (existing[0].count === 0) {
    // Add sample tutorials
    for (const tutorial of sampleTutorials) {
      await query(
        'INSERT INTO video_tutorials (title, description, video_url, category, duration, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?)',
        [
          tutorial.title,
          tutorial.description,
          tutorial.video_url,
          tutorial.category,
          tutorial.duration,
          tutorial.thumbnail_url
        ]
      );
    }
    return { success: true, message: 'Sample tutorials added successfully' };
  }
  
  return { success: true, message: 'Tutorials already exist' };
};

module.exports = {
  getCategories,
  getTutorialsByCategory,
  getAllTutorials,
  getTutorialById,
  getUserProgress,
  updateUserProgress,
  getRecommendedTutorials,
  initializeTutorials
}; 