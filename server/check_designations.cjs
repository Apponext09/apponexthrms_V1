const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({host:'localhost',user:'hrms_user',password:'Admin@123',database:'apponexthrms'});
    const [rows] = await conn.query('SHOW TABLES LIKE "designations"');
    console.log('designations table exists:', rows.length > 0);
    if(rows.length > 0) {
      const [cols] = await conn.query('SHOW COLUMNS FROM designations');
      console.log('Columns:', cols.map(c => c.Field));
    }
    await conn.end();
  } catch (error) {
    console.error(error);
  }
}
run();
