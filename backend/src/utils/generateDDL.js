const { query } = require('../config/db');

async function generateDDL() {
  try {
    // Get all tables
    const tables = await query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    console.log('-- Database DDL Script\n');
    
    // For each table, get its CREATE TABLE statement
    for (const tableName of tableNames) {
      const [createTable] = await query(`SHOW CREATE TABLE ${tableName}`);
      console.log(`${createTable['Create Table']};\n`);
    }
    
    // Get all triggers
    const triggers = await query(`
      SELECT 
        TRIGGER_NAME,
        ACTION_TIMING,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_STATEMENT
      FROM 
        INFORMATION_SCHEMA.TRIGGERS 
      WHERE 
        TRIGGER_SCHEMA = DATABASE()
    `);
    
    if (triggers.length > 0) {
      console.log('\n-- Triggers');
      triggers.forEach(trigger => {
        console.log(`
DELIMITER //
CREATE TRIGGER ${trigger.TRIGGER_NAME} 
${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} ON ${trigger.EVENT_OBJECT_TABLE}
FOR EACH ROW
BEGIN
${trigger.ACTION_STATEMENT}
END //
DELIMITER ;
`);
      });
    }
    
    // Get all views
    const views = await query(`
      SELECT 
        TABLE_NAME,
        VIEW_DEFINITION
      FROM 
        INFORMATION_SCHEMA.VIEWS 
      WHERE 
        TABLE_SCHEMA = DATABASE()
    `);
    
    if (views.length > 0) {
      console.log('\n-- Views');
      views.forEach(view => {
        console.log(`CREATE OR REPLACE VIEW ${view.TABLE_NAME} AS\n${view.VIEW_DEFINITION};\n`);
      });
    }
    
    // Get all stored procedures
    const procedures = await query(`
      SELECT 
        ROUTINE_NAME,
        ROUTINE_DEFINITION
      FROM 
        INFORMATION_SCHEMA.ROUTINES 
      WHERE 
        ROUTINE_SCHEMA = DATABASE() 
        AND ROUTINE_TYPE = 'PROCEDURE'
    `);
    
    if (procedures.length > 0) {
      console.log('\n-- Stored Procedures');
      procedures.forEach(proc => {
        console.log(`
DELIMITER //
CREATE PROCEDURE ${proc.ROUTINE_NAME}()
BEGIN
${proc.ROUTINE_DEFINITION}
END //
DELIMITER ;
`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating DDL:', error);
    process.exit(1);
  }
}

generateDDL(); 