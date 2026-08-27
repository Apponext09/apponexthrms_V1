require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to MySQL DB');

  // Basic Salary -> Derived: 50% of Gross
  await conn.query("UPDATE payroll_components SET component_type = 'Derived', formula = '50% of Gross' WHERE name LIKE '%Basic%'");
  
  // HRA -> Derived: 40% of Basic
  await conn.query("UPDATE payroll_components SET component_type = 'Derived', formula = '40% of Basic' WHERE name LIKE '%HRA%' OR name LIKE '%House Rent%'");
  
  // Special Allowance -> Derived: CTC - (Basic + HRA + Other)
  await conn.query("UPDATE payroll_components SET component_type = 'Derived', formula = 'CTC - (Basic + HRA + Other)' WHERE name LIKE '%Special%'");
  
  // Conveyance -> Value: 1600
  await conn.query("UPDATE payroll_components SET component_type = 'Value', amount = 1600.00 WHERE name LIKE '%Conveyance%'");
  
  // Medical -> Value: 1250
  await conn.query("UPDATE payroll_components SET component_type = 'Value', amount = 1250.00 WHERE name LIKE '%Medical%'");
  
  // EPF -> Derived: min(basic * 0.12, 1800)
  await conn.query("UPDATE payroll_components SET component_type = 'Derived', formula = 'min(basic * 0.12, 1800)' WHERE name LIKE '%Provident%' OR name LIKE '%EPF%'");
  
  // ESIC -> Formula: 0.75% of Gross (if Gross <= 21000)
  await conn.query("UPDATE payroll_components SET component_type = 'Formula', formula = '0.75% of Gross (if Gross <= 21000)' WHERE name LIKE '%State Insurance%' OR name LIKE '%ESIC%'");
  
  // PT -> Value: 200
  await conn.query("UPDATE payroll_components SET component_type = 'Value', amount = 200.00 WHERE name LIKE '%Professional Tax%' OR name LIKE '%PT%'");

  const [updated] = await conn.query('SELECT id, name, component_type, amount, formula FROM payroll_components');
  console.log('ALL COMPONENTS UPDATED:');
  console.table(updated);
  process.exit(0);
}

main().catch(err => {
  console.error('Error updating components:', err);
  process.exit(1);
});
