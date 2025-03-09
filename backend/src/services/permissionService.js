/**
 * Permission Service
 * 
 * Handles role-based access control (RBAC) checking and management
 */
const { query } = require('../config/db');

/**
 * Check if a user has a specific permission
 */
const hasPermission = async (userId, permissionName, projectId = null) => {
  // First, check if the user has the permission based on their role
  const rolePermissions = await query(
    `SELECT 1
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN role_permissions rp ON r.id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = ? AND p.name = ?`,
    [userId, permissionName]
  );
  
  const hasRolePermission = rolePermissions.length > 0;
  
  // If checking for a specific project, check project-specific permissions
  if (projectId) {
    // Check if user is the project owner (owner has all permissions)
    const isOwner = await query(
      'SELECT 1 FROM projects WHERE id = ? AND owner_id = ?',
      [projectId, userId]
    );
    
    if (isOwner.length > 0) {
      return true;
    }
    
    // Check for project-specific permission override
    const projectPermissions = await query(
      `SELECT granted
       FROM project_user_permissions pup
       JOIN permissions p ON pup.permission_id = p.id
       WHERE pup.project_id = ? AND pup.user_id = ? AND p.name = ?`,
      [projectId, userId, permissionName]
    );
    
    // If there's a project-specific override, use that
    if (projectPermissions.length > 0) {
      return projectPermissions[0].granted === 1;
    }
  }
  
  // Otherwise, use the role-based permission
  return hasRolePermission;
};

/**
 * Get all permissions for a user
 */
const getUserPermissions = async (userId) => {
  // Get role-based permissions
  const permissions = await query(
    `SELECT p.id, p.name, p.description, 'role' as source, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN role_permissions rp ON r.id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = ?`,
    [userId]
  );
  
  return permissions;
};

/**
 * Get all project-specific permissions for a user
 */
const getUserProjectPermissions = async (userId, projectId) => {
  // Get project-specific permissions
  const projectPermissions = await query(
    `SELECT p.id, p.name, p.description, 'project' as source, pup.granted
     FROM project_user_permissions pup
     JOIN permissions p ON pup.permission_id = p.id
     WHERE pup.project_id = ? AND pup.user_id = ?`,
    [projectId, userId]
  );
  
  // Check if user is the project owner
  const isOwner = await query(
    'SELECT 1 FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, userId]
  );
  
  return {
    isOwner: isOwner.length > 0,
    projectPermissions
  };
};

/**
 * Grant a specific permission to a user for a project
 */
const grantProjectPermission = async (projectId, targetUserId, permissionName, granterId) => {
  // Check if granter is the project owner or has permission to grant permissions
  const hasAccess = await query(
    'SELECT 1 FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, granterId]
  );
  
  if (!hasAccess.length) {
    throw new Error('You do not have permission to modify project permissions');
  }
  
  // Get permission ID
  const permissions = await query(
    'SELECT id FROM permissions WHERE name = ?',
    [permissionName]
  );
  
  if (!permissions.length) {
    throw new Error(`Permission "${permissionName}" does not exist`);
  }
  
  const permissionId = permissions[0].id;
  
  // Check if permission mapping already exists
  const existingPermission = await query(
    'SELECT id FROM project_user_permissions WHERE project_id = ? AND user_id = ? AND permission_id = ?',
    [projectId, targetUserId, permissionId]
  );
  
  if (existingPermission.length) {
    // Update existing permission
    await query(
      'UPDATE project_user_permissions SET granted = true, updated_at = NOW() WHERE id = ?',
      [existingPermission[0].id]
    );
  } else {
    // Create new permission mapping
    await query(
      'INSERT INTO project_user_permissions (project_id, user_id, permission_id, granted) VALUES (?, ?, ?, true)',
      [projectId, targetUserId, permissionId]
    );
  }
  
  return {
    success: true,
    message: `Permission "${permissionName}" granted successfully`
  };
};

/**
 * Revoke a specific permission from a user for a project
 */
const revokeProjectPermission = async (projectId, targetUserId, permissionName, revokerId) => {
  // Check if revoker is the project owner or has permission to revoke permissions
  const hasAccess = await query(
    'SELECT 1 FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, revokerId]
  );
  
  if (!hasAccess.length) {
    throw new Error('You do not have permission to modify project permissions');
  }
  
  // Get permission ID
  const permissions = await query(
    'SELECT id FROM permissions WHERE name = ?',
    [permissionName]
  );
  
  if (!permissions.length) {
    throw new Error(`Permission "${permissionName}" does not exist`);
  }
  
  const permissionId = permissions[0].id;
  
  // Check if permission mapping exists
  const existingPermission = await query(
    'SELECT id FROM project_user_permissions WHERE project_id = ? AND user_id = ? AND permission_id = ?',
    [projectId, targetUserId, permissionId]
  );
  
  if (existingPermission.length) {
    // Update existing permission
    await query(
      'UPDATE project_user_permissions SET granted = false, updated_at = NOW() WHERE id = ?',
      [existingPermission[0].id]
    );
  } else {
    // Create new permission mapping with granted=false
    await query(
      'INSERT INTO project_user_permissions (project_id, user_id, permission_id, granted) VALUES (?, ?, ?, false)',
      [projectId, targetUserId, permissionId]
    );
  }
  
  return {
    success: true,
    message: `Permission "${permissionName}" revoked successfully`
  };
};

/**
 * Get all available permissions
 */
const getAllPermissions = async () => {
  const permissions = await query(
    'SELECT id, name, description FROM permissions'
  );
  
  return permissions;
};

/**
 * Get permissions by role
 */
const getRolePermissions = async (roleName) => {
  const permissions = await query(
    `SELECT p.id, p.name, p.description
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     JOIN roles r ON rp.role_id = r.id
     WHERE r.name = ?`,
    [roleName]
  );
  
  return permissions;
};

module.exports = {
  hasPermission,
  getUserPermissions,
  getUserProjectPermissions,
  grantProjectPermission,
  revokeProjectPermission,
  getAllPermissions,
  getRolePermissions
}; 