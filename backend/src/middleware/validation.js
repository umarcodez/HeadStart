/**
 * Request Validation Middleware
 */

/**
 * Validates a request body against a schema
 * @param {Object} schema - The validation schema
 * @param {Object} data - The data to validate
 * @throws {Error} If validation fails
 */
const validateRequest = (schema, data) => {
  const errors = [];

  // Check each field in the schema
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip further validation if field is not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        } else {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters long`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters long`);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} has an invalid format`);
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a number`);
        } else {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`${field} must be at most ${rules.max}`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`);
        } else {
          if (rules.minLength !== undefined && value.length < rules.minLength) {
            errors.push(`${field} must have at least ${rules.minLength} items`);
          }
          if (rules.maxLength !== undefined && value.length > rules.maxLength) {
            errors.push(`${field} must have at most ${rules.maxLength} items`);
          }
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push(`${field} must be an object`);
        }
        break;

      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`${field} must be a valid date`);
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailRegex.test(value)) {
          errors.push(`${field} must be a valid email address`);
        }
        break;
    }

    // Custom validation
    if (rules.validate) {
      try {
        rules.validate(value);
      } catch (error) {
        errors.push(`${field}: ${error.message}`);
      }
    }
  }

  // If there are validation errors, throw an error
  if (errors.length > 0) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = errors;
    throw error;
  }
};

module.exports = {
  validateRequest
}; 