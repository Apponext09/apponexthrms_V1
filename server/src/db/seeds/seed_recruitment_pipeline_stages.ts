/**
 * Seed: Default Recruitment Pipeline Stages
 * 
 * Run once per organization to create the standard recruitment pipeline.
 * Usage: npx ts-node server/src/db/seeds/seed_recruitment_pipeline_stages.ts
 */

import { getKnex } from '../knex';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_STAGES = [
  { stage_name: 'Applied', stage_order: 1, stage_color: '#6366f1', is_default: true },
  { stage_name: 'Screening', stage_order: 2, stage_color: '#f59e0b', is_default: true },
  { stage_name: 'Interview', stage_order: 3, stage_color: '#3b82f6', is_default: true },
  { stage_name: 'Technical Round', stage_order: 4, stage_color: '#8b5cf6', is_default: true },
  { stage_name: 'HR Round', stage_order: 5, stage_color: '#ec4899', is_default: true },
  { stage_name: 'Offered', stage_order: 6, stage_color: '#10b981', is_default: true },
  { stage_name: 'Hired', stage_order: 7, stage_color: '#22c55e', is_default: true },
  { stage_name: 'Rejected', stage_order: 8, stage_color: '#ef4444', is_default: true },
  { stage_name: 'On Hold', stage_order: 9, stage_color: '#94a3b8', is_default: true },
];

async function seedPipelineStages() {
  const db = getKnex();

  try {
    // Check if pipeline_stages table exists
    const hasTable = await db.schema.hasTable('pipeline_stages');
    if (!hasTable) {
      console.error('❌ Table pipeline_stages does not exist. Run migrations first.');
      process.exit(1);
    }

    // Get all organizations
    const organizations = await db('organizations').select('id');

    if (organizations.length === 0) {
      console.log('⚠️ No organizations found. Skipping pipeline stages seed.');
      process.exit(0);
    }

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let totalInserted = 0;

    for (const org of organizations) {
      // Check if stages already exist for this org
      const existingCount = await db('pipeline_stages')
        .where('organization_id', org.id)
        .count('id as count')
        .first();

      if (existingCount && Number(existingCount.count) > 0) {
        console.log(`ℹ️ Organization ${org.id} already has ${existingCount.count} pipeline stages. Skipping.`);
        continue;
      }

      // Insert default stages
      const inserts = DEFAULT_STAGES.map((stage) => ({
        uuid: uuidv4(),
        organization_id: org.id,
        ...stage,
        status: 'active',
        created_at: mysqlNow,
        updated_at: mysqlNow,
      }));

      await db('pipeline_stages').insert(inserts);
      totalInserted += inserts.length;
      console.log(`✅ Inserted ${inserts.length} pipeline stages for Organization ${org.id}`);
    }

    console.log(`\n🎉 Done! Total stages inserted: ${totalInserted}`);
  } catch (error: any) {
    console.error('❌ Error seeding pipeline stages:', error.message);
  } finally {
    await db.destroy();
  }
}

seedPipelineStages();
