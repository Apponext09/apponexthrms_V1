const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Narendra@1419',
    database: 'apponexthrms'
  });

  // Fix Sick Leave gender_applicable from 'male' to 'all'
  const [result] = await conn.query(
    "UPDATE leave_types SET gender_applicable = 'all' WHERE leave_code = 'SL' AND gender_applicable = 'male'"
  );

  console.log(`Fixed ${result.affectedRows} Sick Leave record(s) — gender_applicable set to 'all'`);

  // Also fix allocation_settings.gender if it has stale 'male' value for SL
  const [types] = await conn.query(
    "SELECT id, leave_code, allocation_settings FROM leave_types WHERE leave_code = 'SL'"
  );
  
  for (const t of types) {
    if (t.allocation_settings) {
      try {
        const alloc = JSON.parse(t.allocation_settings);
        if (alloc.gender && alloc.gender !== 'all') {
          alloc.gender = 'all';
          await conn.query(
            'UPDATE leave_types SET allocation_settings = ? WHERE id = ?',
            [JSON.stringify(alloc), t.id]
          );
          console.log(`Fixed allocation_settings.gender for leave type ID ${t.id} (${t.leave_code})`);
        }
      } catch (e) {}
    }
  }

  // Verify
  const [verify] = await conn.query(
    "SELECT id, leave_name, leave_code, gender_applicable FROM leave_types WHERE leave_code = 'SL'"
  );
  console.log('\nVerification:', verify);

  await conn.end();
})();
