/**
 * Error Handler Utility
 */

/**
 * Handles errors and sends appropriate response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
const handleError = (res, error) => {
  console.error('Error:', error);

  // Default error response
  const response = {
    success: false,
    message: error.message || 'Internal Server Error'
  };

  // Add validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  // Set appropriate status code
  const status = error.status || 500;

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(status).json(response);
};

module.exports = {
  handleError
}; 