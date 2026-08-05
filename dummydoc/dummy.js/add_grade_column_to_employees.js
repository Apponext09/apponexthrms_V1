const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../../.env' });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('🔧 Checking and updating employees table for current_grade_id...');

    // Check if the column exists
    const [columns] = await conn.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'current_grade_id'`,
      [process.env.DB_NAME || 'apponexthrms']
    );

    if (columns.length === 0) {
      console.log('➕ current_grade_id column not found. Adding column...');
      
      await conn.execute(`
        ALTER TABLE employees 
        ADD COLUMN current_grade_id BIGINT UNSIGNED NULL AFTER current_department_id
      `);
      console.log('✅ current_grade_id column added!');

      // Add foreign key constraint
      try {
        await conn.execute(`
          ALTER TABLE employees
          ADD CONSTRAINT fk_emp_grade
          FOREIGN KEY (current_grade_id) REFERENCES grades(id) ON DELETE SET NULL
        `);
        console.log('✅ Foreign key constraint added to grades table!');
      } catch (fkError) {
        console.log('⚠️ Could not add foreign key (maybe it already exists or grades table is missing).');
      }

    } else {
      console.log('✅ current_grade_id column already exists!');
    }

    await conn.end();
    console.log('🎉 Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
})();
