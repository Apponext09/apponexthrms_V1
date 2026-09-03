/**
 * seed_intern_consultant_roles.ts
 *
 * One-time script to ensure that `intern` and `consultant` system roles
 * exist in the `roles` table. Safe to run multiple times — uses INSERT
 * IGNORE / on-conflict logic via Knex.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json src/scripts/seed_intern_consultant_roles.ts
 */

import { getKnex } from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

const NEW_ROLES = [
  {
    name: 'Intern',
    code: 'intern',
    description: 'Internship role — limited self-service portal (/intern/*). No payroll deductions (PF/ESI/PT exempt).',
  },
  {
    name: 'Consultant',
    code: 'consultant',
    description: 'External consultant role — self-service portal (/consultant/*) with expense and timesheet access.',
  },
];

async function main() {
  const db = getKnex();

  console.log('🌱  Seeding intern & consultant roles...\n');

  for (const role of NEW_ROLES) {
    // Check if role already exists (any org or platform-level)
    const existing = await db('roles')
      .whereNull('organization_id')  // platform / system roles have null org
      .where('code', role.code)
      .first();

    if (existing) {
      console.log(`  ✅  Role '${role.code}' already exists (id=${existing.id}) — skipping.`);
      continue;
    }

    const [id] = await db('roles').insert({
      uuid: uuidv4(),
      organization_id: null,   // null = platform-level / available to all orgs
      name: role.name,
      code: role.code,
      description: role.description,
      is_system: true,
      is_platform_role: true,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`  ➕  Created role '${role.code}' with id=${id}`);
  }

  console.log('\n✔  Done.');
  await db.destroy();
}

main().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
