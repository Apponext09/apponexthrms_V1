const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function findAttendanceTables() {
  try {
    const [tables] = await db.raw("SHOW TABLES LIKE '%attendance%'");
    console.log('Attendance Tables:', tables);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

findAttendanceTables();
