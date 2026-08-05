const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'localhost',user:'hrms_user',password:'Admin@123',database:'apponexthrms'});
  const [rows] = await conn.query('DESCRIBE designations');
  console.log(rows.find(r => r.Field === 'department_id'));
  await conn.end();
}
run();
