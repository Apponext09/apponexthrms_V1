const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'localhost',user:'hrms_user',password:'Admin@123',database:'apponexthrms'});
  const [rows] = await conn.query('SELECT id, name, code, mapped_companies FROM designations');
  console.log('Designations in DB:', rows);
  await conn.end();
}
run();
