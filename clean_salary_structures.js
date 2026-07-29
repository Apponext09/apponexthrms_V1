const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function cleanStructures() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('Connected to MySQL database apponexthrms');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE salary_structure_components;');
    await connection.query('TRUNCATE TABLE employee_salary_structures;');
    await connection.query('TRUNCATE TABLE salary_structures;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('SUCCESS: All salary structures cleanly deleted from database!');
    await connection.end();
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}

cleanStructures();
