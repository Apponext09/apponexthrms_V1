const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({host:'localhost',user:'hrms_user',password:'Admin@123',database:'apponexthrms'});
    const [rows] = await conn.query('SHOW TABLES LIKE "designation_%"');
    console.log('Junction tables:', rows.map(r => Object.values(r)[0]));
    await conn.end();
  } catch (error) {
    console.error(error);
  }
}
run();
