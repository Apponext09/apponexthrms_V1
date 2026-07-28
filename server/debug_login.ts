import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

const email = 'superadmin@apponext.com';
const cleanEmail = email.toLowerCase();

console.log('\n=== Checking super_admins table ===');
try {
  const rows = await db('super_admins').select('id','email','password_hash').catch(e => { console.log('super_admins table error:', e.message); return []; });
  console.log('super_admins rows:', rows.length, rows.map(r => ({ id: r.id, email: r.email, hasHash: !!r.password_hash })));
} catch(e: any) { console.log('super_admins error:', e.message); }

console.log('\n=== Checking users table for superadmin email ===');
try {
  const rows = await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).select('id','email','role','password_hash','status');
  console.log('users rows:', rows.map(r => ({ id: r.id, email: r.email, role: r.role, status: r.status, hasHash: !!r.password_hash })));
} catch(e: any) { console.log('users query error:', e.message); }

console.log('\n=== Checking users table role column exists ===');
try {
  const cols = await db.raw(`SHOW COLUMNS FROM users`);
  const roleCol = cols[0].find((c: any) => c.Field === 'role');
  console.log('role column:', roleCol || 'NOT FOUND');
} catch(e: any) { console.log('column check error:', e.message); }

console.log('\n=== Checking organizations table ===');
try {
  const orgs = await db('organizations').select('id','name','email','password_hash').limit(3);
  console.log('orgs:', orgs.map(o => ({ id: o.id, name: o.name, email: o.email, hasHash: !!o.password_hash })));
} catch(e: any) { console.log('orgs error:', e.message); }

process.exit(0);
