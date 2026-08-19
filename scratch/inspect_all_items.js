const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function inspectAll() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    console.log('=== ALL SLABS ===');
    const [slabs] = await connection.query(`SELECT id, name, min_ctc, max_ctc, selected_component_ids, is_active FROM payroll_slabs`);
    for (const s of slabs) {
      console.log(`[Slab ID ${s.id}] Name: "${s.name}", Active: ${s.is_active}, CTC: ₹${Number(s.min_ctc)} - ₹${Number(s.max_ctc)}, Comps: ${s.selected_component_ids}`);
    }

    console.log('\n=== ALL COMPONENTS ===');
    const [comps] = await connection.query(`SELECT id, name, group_id, component_type, formula, is_active FROM payroll_components`);
    for (const c of comps) {
      console.log(`[Component ID ${c.id}] Name: "${c.name}", Type: ${c.component_type}, Formula: "${c.formula || ''}", Active: ${c.is_active}`);
    }
  } finally {
    await connection.end();
  }
}

inspectAll();
