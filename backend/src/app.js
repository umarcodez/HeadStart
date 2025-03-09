const legalRoutes = require('./routes/legalRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const eventRoutes = require('./routes/eventRoutes');

// Register routes
app.use('/api/legal', legalRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/events', eventRoutes); 