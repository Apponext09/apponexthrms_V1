const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: 'root123', database: 'health'
  });

  await conn.query(
    "UPDATE payroll_slabs " +
    "SET departments = IF(departments IS NULL OR departments = '[]' OR departments = '', '[\"All Departments\"]', departments), " +
    "    grades      = IF(grades IS NULL OR grades = '[]' OR grades = '', '[\"All Pay Grades\"]', grades), " +
    "    locations   = IF(locations IS NULL OR locations = '[]' OR locations = '', '[\"All Locations\"]', locations) " +
    "WHERE organization_id = 8"
  );

  console.log('✅ Updated payroll_slabs filters in DB.');

  const [slabs] = await conn.query(
    'SELECT id, name, departments, grades, locations FROM payroll_slabs WHERE organization_id = 8'
  );
  console.log('\n--- SLABS NOW IN DB ---');
  console.log(JSON.stringify(slabs, null, 2));

  await conn.end();
}

main().catch(function(e) {
  console.error('ERROR:', e.message);
  process.exit(1);
});
