/**
 * User Profile Service
 * 
 * Handles user profile management for all user types (entrepreneurs, freelancers, team members)
 */
const { query } = require('../config/db');

/**
 * Get a user's basic profile
 */
const getUserProfile = async (userId) => {
  // Get user data from our database
  const users = await query(
    `SELECT u.*, r.name as role 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.id = ?`,
    [userId]
  );
  
  if (!users.length) {
    throw new Error('User not found');
  }
  
  const user = users[0];
  
  // Build profile object
  const profile = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    role: user.role,
    phone: user.phone || null,
    profilePicture: user.profile_picture || null,
    emailVerified: user.email_verified === 1,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
  
  return profile;
};

/**
 * Get a user's extended profile based on their role
 */
const getExtendedProfile = async (userId) => {
  // Get basic profile first
  const profile = await getUserProfile(userId);
  
  // Add role-specific profile information
  if (profile.role === 'entrepreneur') {
    const entrepreneurProfiles = await query(
      'SELECT * FROM entrepreneur_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (entrepreneurProfiles.length) {
      profile.entrepreneurProfile = entrepreneurProfiles[0];
    }
  } else if (profile.role === 'freelancer') {
    const freelancerProfiles = await query(
      'SELECT * FROM freelancer_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (freelancerProfiles.length) {
      profile.freelancerProfile = freelancerProfiles[0];
    }
  }
  
  // Get skills
  const skills = await query(
    `SELECT s.id, s.name, s.category, us.proficiency_level 
     FROM user_skills us 
     JOIN skills s ON us.skill_id = s.id 
     WHERE us.user_id = ?`,
    [userId]
  );
  
  profile.skills = skills;
  
  // Get portfolio items
  const portfolioItems = await query(
    'SELECT * FROM portfolio_items WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  
  profile.portfolio = portfolioItems;
  
  return profile;
};

/**
 * Update a user's basic profile
 */
const updateBasicProfile = async (userId, profileData) => {
  const { firstName, lastName, phone, profilePicture } = profileData;
  
  // Update the user record
  await query(
    'UPDATE users SET first_name = ?, last_name = ?, phone = ?, profile_picture = ?, updated_at = NOW() WHERE id = ?',
    [firstName, lastName, phone, profilePicture, userId]
  );
  
  return { success: true, message: 'Profile updated successfully' };
};

/**
 * Update a entrepreneur's extended profile
 */
const updateEntrepreneurProfile = async (userId, profileData) => {
  const { 
    companyName, 
    industry, 
    companySize, 
    foundingDate, 
    website, 
    bio 
  } = profileData;
  
  // Check if profile exists
  const profiles = await query(
    'SELECT id FROM entrepreneur_profiles WHERE user_id = ?',
    [userId]
  );
  
  if (profiles.length) {
    // Update existing profile
    await query(
      `UPDATE entrepreneur_profiles 
       SET company_name = ?, industry = ?, company_size = ?, 
           founding_date = ?, website = ?, bio = ? 
       WHERE user_id = ?`,
      [companyName, industry, companySize, foundingDate, website, bio, userId]
    );
  } else {
    // Create new profile
    await query(
      `INSERT INTO entrepreneur_profiles 
        (user_id, company_name, industry, company_size, founding_date, website, bio) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, companyName, industry, companySize, foundingDate, website, bio]
    );
  }
  
  return { success: true, message: 'Entrepreneur profile updated successfully' };
};

/**
 * Update a freelancer's extended profile
 */
const updateFreelancerProfile = async (userId, profileData) => {
  const { 
    headline, 
    bio, 
    hourlyRate, 
    availability,
    yearsOfExperience
  } = profileData;
  
  // Check if profile exists
  const profiles = await query(
    'SELECT id FROM freelancer_profiles WHERE user_id = ?',
    [userId]
  );
  
  if (profiles.length) {
    // Update existing profile
    await query(
      `UPDATE freelancer_profiles 
       SET headline = ?, bio = ?, hourly_rate = ?, 
           availability = ?, years_of_experience = ? 
       WHERE user_id = ?`,
      [headline, bio, hourlyRate, availability, yearsOfExperience, userId]
    );
  } else {
    // Create new profile
    await query(
      `INSERT INTO freelancer_profiles 
        (user_id, headline, bio, hourly_rate, availability, years_of_experience) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, headline, bio, hourlyRate, availability, yearsOfExperience]
    );
  }
  
  return { success: true, message: 'Freelancer profile updated successfully' };
};

/**
 * Add or update user skills
 */
const updateUserSkills = async (userId, skills) => {
  // skills should be an array of { skillId, proficiencyLevel } objects
  
  for (const skill of skills) {
    // Check if skill exists
    const existingSkills = await query(
      'SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ?',
      [userId, skill.skillId]
    );
    
    if (existingSkills.length) {
      // Update existing skill
      await query(
        'UPDATE user_skills SET proficiency_level = ? WHERE user_id = ? AND skill_id = ?',
        [skill.proficiencyLevel, userId, skill.skillId]
      );
    } else {
      // Add new skill
      await query(
        'INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES (?, ?, ?)',
        [userId, skill.skillId, skill.proficiencyLevel]
      );
    }
  }
  
  return { success: true, message: 'Skills updated successfully' };
};

/**
 * Remove a user skill
 */
const removeUserSkill = async (userId, skillId) => {
  await query(
    'DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?',
    [userId, skillId]
  );
  
  return { success: true, message: 'Skill removed successfully' };
};

/**
 * Add a portfolio item
 */
const addPortfolioItem = async (userId, portfolioData) => {
  const {
    title,
    description,
    imageUrl,
    projectUrl,
    startDate,
    endDate
  } = portfolioData;
  
  await query(
    `INSERT INTO portfolio_items 
      (user_id, title, description, image_url, project_url, start_date, end_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, description, imageUrl, projectUrl, startDate, endDate]
  );
  
  return { success: true, message: 'Portfolio item added successfully' };
};

/**
 * Update a portfolio item
 */
const updatePortfolioItem = async (userId, itemId, portfolioData) => {
  const {
    title,
    description,
    imageUrl,
    projectUrl,
    startDate,
    endDate
  } = portfolioData;
  
  // Check if item exists and belongs to user
  const items = await query(
    'SELECT id FROM portfolio_items WHERE id = ? AND user_id = ?',
    [itemId, userId]
  );
  
  if (!items.length) {
    throw new Error('Portfolio item not found or does not belong to you');
  }
  
  await query(
    `UPDATE portfolio_items 
     SET title = ?, description = ?, image_url = ?, 
         project_url = ?, start_date = ?, end_date = ? 
     WHERE id = ?`,
    [title, description, imageUrl, projectUrl, startDate, endDate, itemId]
  );
  
  return { success: true, message: 'Portfolio item updated successfully' };
};

/**
 * Delete a portfolio item
 */
const deletePortfolioItem = async (userId, itemId) => {
  // Check if item exists and belongs to user
  const items = await query(
    'SELECT id FROM portfolio_items WHERE id = ? AND user_id = ?',
    [itemId, userId]
  );
  
  if (!items.length) {
    throw new Error('Portfolio item not found or does not belong to you');
  }
  
  await query(
    'DELETE FROM portfolio_items WHERE id = ?',
    [itemId]
  );
  
  return { success: true, message: 'Portfolio item deleted successfully' };
};

/**
 * Search for users by skills
 */
const searchUsersBySkills = async (skillIds, role = null) => {
  let query = `
    SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.profile_picture, 
           r.name as role, COUNT(DISTINCT us.skill_id) as matching_skills
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN user_skills us ON u.id = us.user_id
    WHERE us.skill_id IN (?)
  `;
  
  const params = [skillIds];
  
  if (role) {
    query += ' AND r.name = ?';
    params.push(role);
  }
  
  query += ' GROUP BY u.id ORDER BY matching_skills DESC, u.first_name, u.last_name';
  
  const users = await query(query, params);
  
  return users;
};

module.exports = {
  getUserProfile,
  getExtendedProfile,
  updateBasicProfile,
  updateEntrepreneurProfile,
  updateFreelancerProfile,
  updateUserSkills,
  removeUserSkill,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  searchUsersBySkills
}; 