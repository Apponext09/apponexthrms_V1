import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NotificationTemplateSettingsRepository } from '../src/modules/settings/repositories/NotificationTemplateSettingsRepository';
import { GenericSettingsService } from '../src/modules/settings/services/GenericSettingsService';

async function main() {
  const repository = new NotificationTemplateSettingsRepository();
  const service = new GenericSettingsService(repository, 'NOTIFICATION_TEMPLATE', '');
  
  // mock context
  const ctx = {
    organizationId: 12,
    userId: 45
  };
  
  try {
    const result = await service.list(ctx as any, { page: 1, pageSize: 20, sortBy: 'created_at', sortOrder: 'desc' });
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

main();
