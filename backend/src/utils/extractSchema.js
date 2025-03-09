const { query } = require('../config/db');

async function extractDatabaseSchema() {
  try {
    // Get all tables
    const tables = await query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    console.log('Database Schema:\n');
    
    // For each table, get its structure and foreign keys
    for (const tableName of tableNames) {
      // Get table structure
      console.log(`Table: ${tableName}`);
      console.log('----------------------------------------');
      
      const columns = await query(`SHOW COLUMNS FROM ${tableName}`);
      columns.forEach(column => {
        console.log(`${column.Field} ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''} ${column.Default ? `DEFAULT ${column.Default}` : ''} ${column.Extra}`);
      });
      
      // Get foreign keys
      const foreignKeys = await query(`
        SELECT 
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME 
        FROM 
          INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE 
          TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [tableName]
      );
      
      if (foreignKeys.length > 0) {
        console.log('\nForeign Keys:');
        foreignKeys.forEach(fk => {
          console.log(`${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
        });
      }
      
      // Get indexes
      const indexes = await query(`SHOW INDEX FROM ${tableName}`);
      const uniqueIndexes = indexes.filter(idx => idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY');
      
      if (uniqueIndexes.length > 0) {
        console.log('\nUnique Indexes:');
        uniqueIndexes.forEach(idx => {
          console.log(`${idx.Key_name}: ${idx.Column_name}`);
        });
      }
      
      console.log('\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error extracting schema:', error);
    process.exit(1);
  }
}

extractDatabaseSchema(); 