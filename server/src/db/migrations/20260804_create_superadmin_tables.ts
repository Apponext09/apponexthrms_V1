import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create super_admins table
  const hasSuperAdmins = await knex.schema.hasTable('super_admins');
  if (!hasSuperAdmins) {
    await knex.schema.createTable('super_admins', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('user_id').unsigned().nullable();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('first_name', 100).notNullable().defaultTo('Super');
      table.string('last_name', 100).notNullable().defaultTo('Admin');
      table.string('phone', 20).nullable();
      table.text('avatar_url').nullable();
      table
        .enum('access_level', ['owner', 'superadmin', 'auditor'])
        .defaultTo('superadmin');
      table
        .enum('status', ['active', 'inactive', 'suspended'])
        .defaultTo('active');
      table.timestamp('last_login_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      // Foreign key to users table (soft reference — SET NULL on delete)
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');

      table.index(['email']);
      table.index(['status']);
    });
    console.log('✅ Created table: super_admins');
  } else {
    console.log('ℹ️  Table super_admins already exists — skipping creation');
  }

  // 2. Create admin_organizations table
  const hasAdminOrgs = await knex.schema.hasTable('admin_organizations');
  if (!hasAdminOrgs) {
    await knex.schema.createTable('admin_organizations', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('super_admin_id').unsigned().nullable();
      table.bigInteger('user_id').unsigned().nullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table
        .enum('admin_role', [
          'super_admin',
          'organization_admin',
          'billing_admin',
          'audit_admin',
        ])
        .defaultTo('organization_admin');
      table.json('permissions').nullable();
      table
        .enum('status', ['active', 'inactive', 'revoked'])
        .defaultTo('active');
      table.bigInteger('assigned_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Foreign keys
      table
        .foreign('super_admin_id')
        .references('id')
        .inTable('super_admins')
        .onDelete('CASCADE');
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .foreign('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE');

      table.index(['super_admin_id']);
      table.index(['organization_id']);
      table.index(['user_id']);
    });
    console.log('✅ Created table: admin_organizations');
  } else {
    console.log(
      'ℹ️  Table admin_organizations already exists — skipping creation'
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_organizations');
  await knex.schema.dropTableIfExists('super_admins');
}
