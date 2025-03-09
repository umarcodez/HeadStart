const { query } = require('../config/db');
const { generateBusinessNames } = require('../services/businessNameService');
const { generateTaglines } = require('../services/taglineService');
const { 
  checkDomainAvailability, 
  generateDomainSuggestions 
} = require('../services/domainService');
const {
  getAllTutorials,
  getTutorialsByCategory: getTutorialsByCategoryService,
  getTutorialById,
  getUserProgress,
  updateUserProgress,
  getRecommendedTutorials,
  initializeTutorials
} = require('../services/tutorialService');

/**
 * Generate business name suggestions
 */
const generateBusinessNameSuggestions = async (req, res) => {
  try {
    const { industry, keywords } = req.body;
    
    // Validate input
    if (!industry || !keywords) {
      return res.status(400).json({
        success: false,
        message: 'Industry and keywords are required'
      });
    }
    
    // Generate business names using the service
    const names = await generateBusinessNames(industry, keywords);
    
    // Save to database
    const result = await query(
      'INSERT INTO business_name_suggestions (user_id, industry, keywords, generated_names) VALUES (?, ?, ?, ?)',
      [req.user.uid, industry, keywords, JSON.stringify(names)]
    );
    
    res.status(200).json({
      success: true,
      suggestionId: result.insertId,
      names
    });
  } catch (error) {
    console.error('Error generating business names:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating business name suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get previous business name suggestions for a user
 */
const getPreviousBusinessNames = async (req, res) => {
  try {
    const suggestions = await query(
      'SELECT id, industry, keywords, generated_names, selected_name, created_at FROM business_name_suggestions WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.uid]
    );
    
    // Parse the JSON strings
    suggestions.forEach(suggestion => {
      if (suggestion.generated_names) {
        suggestion.generated_names = JSON.parse(suggestion.generated_names);
      }
    });
    
    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error fetching business names:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching business name suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Save selected business name
 */
const saveSelectedBusinessName = async (req, res) => {
  try {
    const { suggestionId, selectedName } = req.body;
    
    // Validate input
    if (!suggestionId || !selectedName) {
      return res.status(400).json({
        success: false,
        message: 'Suggestion ID and selected name are required'
      });
    }
    
    // Check if the suggestion belongs to the user
    const suggestions = await query(
      'SELECT id FROM business_name_suggestions WHERE id = ? AND user_id = ?',
      [suggestionId, req.user.uid]
    );
    
    if (!suggestions.length) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found or does not belong to you'
      });
    }
    
    // Update the selected name
    await query(
      'UPDATE business_name_suggestions SET selected_name = ? WHERE id = ?',
      [selectedName, suggestionId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Selected business name saved successfully'
    });
  } catch (error) {
    console.error('Error saving selected business name:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving selected business name',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate tagline suggestions
 */
const generateTaglineSuggestions = async (req, res) => {
  try {
    const { businessName, keywords } = req.body;
    
    // Validate input
    if (!businessName || !keywords) {
      return res.status(400).json({
        success: false,
        message: 'Business name and keywords are required'
      });
    }
    
    // Generate taglines using the service
    const taglines = await generateTaglines(businessName, keywords);
    
    // Save to database
    const result = await query(
      'INSERT INTO tagline_suggestions (user_id, business_name, keywords, generated_taglines) VALUES (?, ?, ?, ?)',
      [req.user.uid, businessName, keywords, JSON.stringify(taglines)]
    );
    
    res.status(200).json({
      success: true,
      suggestionId: result.insertId,
      taglines
    });
  } catch (error) {
    console.error('Error generating taglines:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating tagline suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get previous tagline suggestions for a user
 */
const getPreviousTaglines = async (req, res) => {
  try {
    const suggestions = await query(
      'SELECT id, business_name, keywords, generated_taglines, selected_tagline, created_at FROM tagline_suggestions WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.uid]
    );
    
    // Parse the JSON strings
    suggestions.forEach(suggestion => {
      if (suggestion.generated_taglines) {
        suggestion.generated_taglines = JSON.parse(suggestion.generated_taglines);
      }
    });
    
    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error fetching taglines:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tagline suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Save selected tagline
 */
const saveSelectedTagline = async (req, res) => {
  try {
    const { suggestionId, selectedTagline } = req.body;
    
    // Validate input
    if (!suggestionId || !selectedTagline) {
      return res.status(400).json({
        success: false,
        message: 'Suggestion ID and selected tagline are required'
      });
    }
    
    // Check if the suggestion belongs to the user
    const suggestions = await query(
      'SELECT id FROM tagline_suggestions WHERE id = ? AND user_id = ?',
      [suggestionId, req.user.uid]
    );
    
    if (!suggestions.length) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found or does not belong to you'
      });
    }
    
    // Update the selected tagline
    await query(
      'UPDATE tagline_suggestions SET selected_tagline = ? WHERE id = ?',
      [selectedTagline, suggestionId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Selected tagline saved successfully'
    });
  } catch (error) {
    console.error('Error saving selected tagline:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving selected tagline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check domain availability
 */
const checkDomain = async (req, res) => {
  try {
    const { domain } = req.body;
    
    // Validate input
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required'
      });
    }
    
    // Check domain availability using the service
    const result = await checkDomainAvailability(domain);
    
    // Save to database
    await query(
      'INSERT INTO domain_availability (user_id, domain_name, available, tld) VALUES (?, ?, ?, ?)',
      [req.user.uid, result.domain, result.available, result.tld]
    );
    
    res.status(200).json({
      success: true,
      domain: result.domain,
      available: result.available,
      tld: result.tld
    });
  } catch (error) {
    console.error('Error checking domain:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking domain availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get domain suggestions
 */
const getDomainSuggestions = async (req, res) => {
  try {
    const { businessName } = req.body;
    
    // Validate input
    if (!businessName) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }
    
    // Generate domain suggestions using the service
    const suggestions = await generateDomainSuggestions(businessName);
    
    // Save results to database
    for (const suggestion of suggestions) {
      await query(
        'INSERT INTO domain_availability (user_id, domain_name, available, tld) VALUES (?, ?, ?, ?)',
        [req.user.uid, suggestion.domain, suggestion.available, suggestion.tld]
      );
    }
    
    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error generating domain suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating domain suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get domain availability history
 */
const getDomainHistory = async (req, res) => {
  try {
    const history = await query(
      'SELECT domain_name, available, tld, checked_at FROM domain_availability WHERE user_id = ? ORDER BY checked_at DESC',
      [req.user.uid]
    );
    
    res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching domain history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching domain availability history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all video tutorials
 */
const getTutorials = async (req, res) => {
  try {
    // Make sure we have sample tutorials
    await initializeTutorials();
    
    const tutorials = await getAllTutorials();
    
    res.status(200).json({
      success: true,
      tutorials
    });
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching video tutorials',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get tutorials by category
 */
const getTutorialsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }
    
    // Make sure we have sample tutorials
    await initializeTutorials();
    
    const tutorials = await getTutorialsByCategoryService(category);
    
    res.status(200).json({
      success: true,
      category,
      tutorials
    });
  } catch (error) {
    console.error('Error fetching tutorials by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching video tutorials',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get tutorial by ID with user progress
 */
const getTutorialWithProgress = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Tutorial ID is required'
      });
    }
    
    // Get tutorial details
    const tutorial = await getTutorialById(id);
    
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Get user's progress on this tutorial
    const progress = await getUserProgress(req.user.uid, id);
    
    res.status(200).json({
      success: true,
      tutorial,
      progress
    });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tutorial details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update tutorial progress
 */
const updateTutorialProgress = async (req, res) => {
  try {
    const { tutorialId, position, completed } = req.body;
    
    if (!tutorialId || position === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Tutorial ID and position are required'
      });
    }
    
    // Update progress
    const result = await updateUserProgress(
      req.user.uid, 
      tutorialId, 
      position, 
      completed || false
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating tutorial progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tutorial progress',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get recommended tutorials for the user
 */
const getRecommendedTutorialsForUser = async (req, res) => {
  try {
    // Make sure we have sample tutorials
    await initializeTutorials();
    
    // Get recommendations based on user's role and progress
    const recommendations = await getRecommendedTutorials(req.user.uid);
    
    res.status(200).json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error fetching recommended tutorials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommended tutorials',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateBusinessNameSuggestions,
  getPreviousBusinessNames,
  saveSelectedBusinessName,
  generateTaglineSuggestions,
  getPreviousTaglines,
  saveSelectedTagline,
  checkDomain,
  getDomainSuggestions,
  getDomainHistory,
  getTutorials,
  getTutorialsByCategory,
  getTutorialWithProgress,
  updateTutorialProgress,
  getRecommendedTutorialsForUser
}; 