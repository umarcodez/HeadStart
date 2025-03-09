const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Legal Resources
const getLegalResources = async (category = null) => {
    let sql = 'SELECT * FROM legal_resources WHERE is_active = TRUE';
    const params = [];
    
    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }
    
    return await query(sql, params);
};

const getLegalResourceById = async (id) => {
    const [resource] = await query('SELECT * FROM legal_resources WHERE id = ? AND is_active = TRUE', [id]);
    if (!resource) throw new NotFoundError('Legal resource not found');
    return resource;
};

const createLegalResource = async (data) => {
    const { title, category, content, summary, tags } = data;
    const id = uuidv4();
    
    await query(
        'INSERT INTO legal_resources (id, title, category, content, summary, tags) VALUES (?, ?, ?, ?, ?, ?)',
        [id, title, category, content, summary, JSON.stringify(tags)]
    );
    
    return getLegalResourceById(id);
};

// Document Templates
const getDocumentTemplates = async (category = null) => {
    let sql = 'SELECT * FROM document_templates WHERE is_active = TRUE';
    const params = [];
    
    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }
    
    return await query(sql, params);
};

const getDocumentTemplateById = async (id) => {
    const [template] = await query('SELECT * FROM document_templates WHERE id = ? AND is_active = TRUE', [id]);
    if (!template) throw new NotFoundError('Document template not found');
    return template;
};

const generateDocument = async (templateId, userId, variables) => {
    const template = await getDocumentTemplateById(templateId);
    let filledContent = template.content;
    
    // Replace variables in template
    const templateVars = JSON.parse(template.variables);
    for (const [key, value] of Object.entries(variables)) {
        if (!templateVars.includes(key)) {
            throw new ValidationError(`Invalid variable: ${key}`);
        }
        filledContent = filledContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    // Save the generated document
    const id = uuidv4();
    await query(
        'INSERT INTO document_template_usage (id, user_id, template_id, filled_content) VALUES (?, ?, ?, ?)',
        [id, userId, templateId, filledContent]
    );
    
    return {
        id,
        content: filledContent,
        templateTitle: template.title
    };
};

// Compliance Management
const getComplianceCategories = async () => {
    return await query('SELECT * FROM compliance_categories');
};

const getComplianceItems = async (categoryId = null) => {
    let sql = 'SELECT * FROM compliance_items';
    const params = [];
    
    if (categoryId) {
        sql += ' WHERE category_id = ?';
        params.push(categoryId);
    }
    
    return await query(sql, params);
};

const getUserComplianceProgress = async (userId) => {
    return await query(`
        SELECT 
            ucp.*,
            ci.title as item_title,
            ci.description as item_description,
            cc.name as category_name
        FROM user_compliance_progress ucp
        JOIN compliance_items ci ON ucp.compliance_item_id = ci.id
        JOIN compliance_categories cc ON ci.category_id = cc.id
        WHERE ucp.user_id = ?
    `, [userId]);
};

const updateComplianceProgress = async (userId, itemId, data) => {
    const { status, notes, attachments } = data;
    
    // Verify compliance item exists
    const [item] = await query('SELECT * FROM compliance_items WHERE id = ?', [itemId]);
    if (!item) throw new NotFoundError('Compliance item not found');
    
    // Check if progress entry exists
    const [existing] = await query(
        'SELECT * FROM user_compliance_progress WHERE user_id = ? AND compliance_item_id = ?',
        [userId, itemId]
    );
    
    if (existing) {
        // Update existing progress
        await query(
            `UPDATE user_compliance_progress 
             SET status = ?, notes = ?, attachments = ?, completion_date = ?
             WHERE user_id = ? AND compliance_item_id = ?`,
            [
                status,
                notes,
                JSON.stringify(attachments),
                status === 'completed' ? new Date() : null,
                userId,
                itemId
            ]
        );
    } else {
        // Create new progress entry
        const id = uuidv4();
        await query(
            `INSERT INTO user_compliance_progress 
             (id, user_id, compliance_item_id, status, notes, attachments, completion_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                userId,
                itemId,
                status,
                notes,
                JSON.stringify(attachments),
                status === 'completed' ? new Date() : null
            ]
        );
    }
    
    return getUserComplianceProgress(userId);
};

module.exports = {
    // Legal Resources
    getLegalResources,
    getLegalResourceById,
    createLegalResource,
    
    // Document Templates
    getDocumentTemplates,
    getDocumentTemplateById,
    generateDocument,
    
    // Compliance Management
    getComplianceCategories,
    getComplianceItems,
    getUserComplianceProgress,
    updateComplianceProgress
}; 