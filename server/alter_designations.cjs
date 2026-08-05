const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({host:'localhost',user:'hrms_user',password:'Admin@123',database:'apponexthrms'});
    const columns = [
      'mapped_companies',
      'mapped_locations',
      'mapped_departments',
      'mapped_shifts',
      'mapped_grades'
    ];
    for (const col of columns) {
      try {
        await conn.query(`ALTER TABLE designations ADD COLUMN ${col} JSON NULL`);
        console.log(`Added column ${col}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${col} already exists`);
        } else {
          throw err;
        }
      }
    }
    await conn.end();
  } catch (error) {
    console.error(error);
  }
}
run();
