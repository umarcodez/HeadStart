/**
 * Business Plan Service
 * 
 * Handles business plan creation, retrieval, and management
 */
const { query } = require('../config/db');

/**
 * Get all business plan templates
 */
const getBusinessPlanTemplates = async () => {
  const templates = await query(
    'SELECT id, name, description, created_at FROM business_plan_templates'
  );
  
  return templates;
};

/**
 * Get template details with sections
 */
const getTemplateDetails = async (templateId) => {
  // Get template details
  const templates = await query(
    'SELECT id, name, description, created_at FROM business_plan_templates WHERE id = ?',
    [templateId]
  );
  
  if (!templates.length) {
    throw new Error('Template not found');
  }
  
  const template = templates[0];
  
  // Get template sections
  const sections = await query(
    `SELECT id, section_type, title, description, content_template, sort_order 
     FROM business_plan_template_sections 
     WHERE template_id = ? 
     ORDER BY sort_order, id`,
    [templateId]
  );
  
  template.sections = sections;
  
  return template;
};

/**
 * Create a new business plan from template
 */
const createBusinessPlan = async (userId, planData) => {
  const { title, templateId } = planData;
  
  if (!title) {
    throw new Error('Plan title is required');
  }
  
  // Create business plan
  const result = await query(
    'INSERT INTO business_plans (user_id, title, status) VALUES (?, ?, "draft")',
    [userId, title]
  );
  
  const planId = result.insertId;
  
  // If template provided, copy sections from template
  if (templateId) {
    const templateSections = await query(
      `SELECT section_type, title, description, content_template, sort_order 
       FROM business_plan_template_sections 
       WHERE template_id = ? 
       ORDER BY sort_order, id`,
      [templateId]
    );
    
    for (const section of templateSections) {
      await query(
        `INSERT INTO business_plan_sections 
          (plan_id, section_type, title, content, sort_order) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          planId, 
          section.section_type, 
          section.title, 
          section.content_template || '', 
          section.sort_order
        ]
      );
    }
  }
  
  return {
    planId,
    title,
    status: 'draft',
    message: 'Business plan created successfully'
  };
};

/**
 * Get user's business plans
 */
const getUserBusinessPlans = async (userId) => {
  const plans = await query(
    `SELECT id, title, status, last_updated, created_at 
     FROM business_plans 
     WHERE user_id = ? 
     ORDER BY last_updated DESC`,
    [userId]
  );
  
  return plans;
};

/**
 * Get business plan details
 */
const getBusinessPlanDetails = async (planId, userId) => {
  // Get plan details
  const plans = await query(
    `SELECT id, title, status, last_updated, created_at 
     FROM business_plans 
     WHERE id = ? AND user_id = ?`,
    [planId, userId]
  );
  
  if (!plans.length) {
    throw new Error('Business plan not found or you do not have permission to access it');
  }
  
  const plan = plans[0];
  
  // Get plan sections
  const sections = await query(
    `SELECT id, section_type, title, content, sort_order, updated_at 
     FROM business_plan_sections 
     WHERE plan_id = ? 
     ORDER BY sort_order, id`,
    [planId]
  );
  
  plan.sections = sections;
  
  return plan;
};

/**
 * Update business plan details
 */
const updateBusinessPlan = async (planId, userId, planData) => {
  const { title, status } = planData;
  
  // Check if plan exists and belongs to user
  const plans = await query(
    'SELECT id FROM business_plans WHERE id = ? AND user_id = ?',
    [planId, userId]
  );
  
  if (!plans.length) {
    throw new Error('Business plan not found or you do not have permission to update it');
  }
  
  // Update plan
  await query(
    'UPDATE business_plans SET title = ?, status = ? WHERE id = ?',
    [title, status, planId]
  );
  
  return {
    success: true,
    message: 'Business plan updated successfully'
  };
};

/**
 * Update business plan section
 */
const updateBusinessPlanSection = async (sectionId, userId, sectionData) => {
  const { title, content } = sectionData;
  
  // Check if section exists and belongs to user's plan
  const sections = await query(
    `SELECT bs.id 
     FROM business_plan_sections bs
     JOIN business_plans bp ON bs.plan_id = bp.id
     WHERE bs.id = ? AND bp.user_id = ?`,
    [sectionId, userId]
  );
  
  if (!sections.length) {
    throw new Error('Section not found or you do not have permission to update it');
  }
  
  // Update section
  await query(
    'UPDATE business_plan_sections SET title = ?, content = ? WHERE id = ?',
    [title, content, sectionId]
  );
  
  return {
    success: true,
    message: 'Section updated successfully'
  };
};

/**
 * Add new section to business plan
 */
const addBusinessPlanSection = async (planId, userId, sectionData) => {
  const { sectionType, title, content, sortOrder } = sectionData;
  
  // Check if plan exists and belongs to user
  const plans = await query(
    'SELECT id FROM business_plans WHERE id = ? AND user_id = ?',
    [planId, userId]
  );
  
  if (!plans.length) {
    throw new Error('Business plan not found or you do not have permission to update it');
  }
  
  // Add section
  const result = await query(
    `INSERT INTO business_plan_sections 
      (plan_id, section_type, title, content, sort_order) 
     VALUES (?, ?, ?, ?, ?)`,
    [planId, sectionType, title, content, sortOrder || 0]
  );
  
  return {
    success: true,
    message: 'Section added successfully',
    sectionId: result.insertId
  };
};

/**
 * Delete business plan section
 */
const deleteBusinessPlanSection = async (sectionId, userId) => {
  // Check if section exists and belongs to user's plan
  const sections = await query(
    `SELECT bs.id 
     FROM business_plan_sections bs
     JOIN business_plans bp ON bs.plan_id = bp.id
     WHERE bs.id = ? AND bp.user_id = ?`,
    [sectionId, userId]
  );
  
  if (!sections.length) {
    throw new Error('Section not found or you do not have permission to delete it');
  }
  
  // Delete section
  await query(
    'DELETE FROM business_plan_sections WHERE id = ?',
    [sectionId]
  );
  
  return {
    success: true,
    message: 'Section deleted successfully'
  };
};

/**
 * Delete business plan
 */
const deleteBusinessPlan = async (planId, userId) => {
  // Check if plan exists and belongs to user
  const plans = await query(
    'SELECT id FROM business_plans WHERE id = ? AND user_id = ?',
    [planId, userId]
  );
  
  if (!plans.length) {
    throw new Error('Business plan not found or you do not have permission to delete it');
  }
  
  // Delete plan
  await query(
    'DELETE FROM business_plans WHERE id = ?',
    [planId]
  );
  
  return {
    success: true,
    message: 'Business plan deleted successfully'
  };
};

module.exports = {
  getBusinessPlanTemplates,
  getTemplateDetails,
  createBusinessPlan,
  getUserBusinessPlans,
  getBusinessPlanDetails,
  updateBusinessPlan,
  updateBusinessPlanSection,
  addBusinessPlanSection,
  deleteBusinessPlanSection,
  deleteBusinessPlan
}; 