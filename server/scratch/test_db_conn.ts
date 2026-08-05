import mysql from 'mysql2/promise';

const passwords = ['', 'root', 'root123', 'Narendra@1419', 'password', 'mysql'];

(async () => {
  for (const pwd of passwords) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pwd,
      });
      const [rows] = await conn.query('SELECT 1 as ok');
      console.log(`✅ Password "${pwd}" works! Result:`, rows);
      
      // List databases
      const [dbs] = await conn.query('SHOW DATABASES');
      console.log('Databases:', dbs);
      
      await conn.end();
      break;
    } catch (err) {
      console.log(`❌ Password "${pwd}" failed: ${err.message}`);
    }
  }
})();
