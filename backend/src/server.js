const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to HeadStart API');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/startup', require('./routes/startupRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));
app.use('/api/contracts', require('./routes/contractRoutes'));
app.use('/api/budget', require('./routes/budgetRoutes'));
app.use('/api/business-plan', require('./routes/businessPlanRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
// Add more routes as we implement them...

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
