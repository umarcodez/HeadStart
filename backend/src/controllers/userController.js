const { 
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
} = require('../services/userProfileService');

const { query } = require('../config/db');

/**
 * Get current user profile
 */
const getCurrentUserProfile = async (req, res) => {
  try {
    const profile = await getExtendedProfile(req.user.uid);
    
    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user profile by ID
 */
const getUserProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const profile = await getExtendedProfile(id);
    
    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user's basic profile
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, profilePicture } = req.body;
    
    // Validate input
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }
    
    // Update basic profile
    await updateBasicProfile(req.user.uid, {
      firstName,
      lastName,
      phone,
      profilePicture
    });
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update entrepreneur profile
 */
const updateEntrepreneurProfileDetails = async (req, res) => {
  try {
    const {
      companyName,
      industry,
      companySize,
      foundingDate,
      website,
      bio
    } = req.body;
    
    // Validate input
    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }
    
    // Update entrepreneur profile
    await updateEntrepreneurProfile(req.user.uid, {
      companyName,
      industry,
      companySize,
      foundingDate,
      website,
      bio
    });
    
    res.status(200).json({
      success: true,
      message: 'Entrepreneur profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating entrepreneur profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating entrepreneur profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update freelancer profile
 */
const updateFreelancerProfileDetails = async (req, res) => {
  try {
    const {
      headline,
      bio,
      hourlyRate,
      availability,
      yearsOfExperience
    } = req.body;
    
    // Validate input
    if (!headline) {
      return res.status(400).json({
        success: false,
        message: 'Headline is required'
      });
    }
    
    // Update freelancer profile
    await updateFreelancerProfile(req.user.uid, {
      headline,
      bio,
      hourlyRate,
      availability,
      yearsOfExperience
    });
    
    res.status(200).json({
      success: true,
      message: 'Freelancer profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating freelancer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating freelancer profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all skills
 */
const getAllSkills = async (req, res) => {
  try {
    const skills = await query(
      'SELECT id, name, category FROM skills ORDER BY category, name'
    );
    
    res.status(200).json({
      success: true,
      skills
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching skills',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user skills
 */
const updateUserSkillList = async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills array is required'
      });
    }
    
    // Update skills
    await updateUserSkills(req.user.uid, skills);
    
    res.status(200).json({
      success: true,
      message: 'Skills updated successfully'
    });
  } catch (error) {
    console.error('Error updating skills:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating skills',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove a skill from user
 */
const removeSkillFromUser = async (req, res) => {
  try {
    const { skillId } = req.params;
    
    if (!skillId) {
      return res.status(400).json({
        success: false,
        message: 'Skill ID is required'
      });
    }
    
    // Remove skill
    await removeUserSkill(req.user.uid, skillId);
    
    res.status(200).json({
      success: true,
      message: 'Skill removed successfully'
    });
  } catch (error) {
    console.error('Error removing skill:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing skill',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add portfolio item
 */
const addPortfolioItemToUser = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      projectUrl,
      startDate,
      endDate
    } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    // Add portfolio item
    await addPortfolioItem(req.user.uid, {
      title,
      description,
      imageUrl,
      projectUrl,
      startDate,
      endDate
    });
    
    res.status(201).json({
      success: true,
      message: 'Portfolio item added successfully'
    });
  } catch (error) {
    console.error('Error adding portfolio item:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding portfolio item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update portfolio item
 */
const updatePortfolioItemById = async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      title,
      description,
      imageUrl,
      projectUrl,
      startDate,
      endDate
    } = req.body;
    
    if (!itemId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and title are required'
      });
    }
    
    // Update portfolio item
    await updatePortfolioItem(req.user.uid, itemId, {
      title,
      description,
      imageUrl,
      projectUrl,
      startDate,
      endDate
    });
    
    res.status(200).json({
      success: true,
      message: 'Portfolio item updated successfully'
    });
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    
    if (error.message.includes('not found or does not belong to you')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating portfolio item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete portfolio item
 */
const deletePortfolioItemById = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }
    
    // Delete portfolio item
    await deletePortfolioItem(req.user.uid, itemId);
    
    res.status(200).json({
      success: true,
      message: 'Portfolio item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    
    if (error.message.includes('not found or does not belong to you')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting portfolio item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search users by skills
 */
const searchUsers = async (req, res) => {
  try {
    const { skills, role } = req.body;
    
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Skills array is required'
      });
    }
    
    // Search users
    const users = await searchUsersBySkills(skills, role);
    
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCurrentUserProfile,
  getUserProfileById,
  updateProfile,
  updateEntrepreneurProfileDetails,
  updateFreelancerProfileDetails,
  getAllSkills,
  updateUserSkillList,
  removeSkillFromUser,
  addPortfolioItemToUser,
  updatePortfolioItemById,
  deletePortfolioItemById,
  searchUsers
}; 