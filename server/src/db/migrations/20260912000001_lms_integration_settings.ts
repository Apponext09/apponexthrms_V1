import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('lms_integration_settings');
  if (!hasTable) {
    await knex.schema.createTable('lms_integration_settings', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();

      // Platform identifier: 'udemy' | 'coursera' | 'linkedin'
      table.string('platform', 50).notNullable();

      // Master toggle — false by default so manual flow is the default
      table.boolean('is_enabled').defaultTo(false);

      // Encrypted JSON blob: { apiKey, clientId, clientSecret, orgSubdomain, ... }
      // Shape is platform-specific; server never sends raw credentials to client
      table.text('config_json').nullable();

      // Populated after a successful sync run
      table.timestamp('last_synced_at').nullable();

      table.timestamps(true, true);

      // One row per company+platform (short name to stay under MySQL's 64-char limit)
      table.unique(['organization_id', 'company_id', 'platform'], { indexName: 'lis_org_company_platform_uidx' });

      table.index(['organization_id']);
      table.index(['company_id']);
      table.index(['platform']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('lms_integration_settings');
}
