import { getKnex } from '../db/knex';

async function checkOrgSettings() {
  const db = getKnex();
  try {
    const settings = await db('organization_settings').select('*');
    console.log(settings.map((s: any) => ({ key: s.setting_key, value: s.setting_value })));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkOrgSettings();
