import { getKnex } from '../db/knex';

export async function setupLetterManagementTables() {
  const knex = getKnex();
  console.log('🚀 Checking Letter Management database tables...');

  try {
    // ──────────────────────────────────────────────────────────
    // 1. letter_templates — Master templates for all letter types
    // ──────────────────────────────────────────────────────────
    const hasTemplates = await knex.schema.hasTable('letter_templates');
    if (!hasTemplates) {
      console.log('⏳ Creating letter_templates table...');
      await knex.schema.createTable('letter_templates', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('company_id').unsigned().nullable();

        table.string('template_name', 255).notNullable();
        table.string('template_code', 100).notNullable();

        table.enum('letter_category', ['hiring', 'onboarding', 'employment', 'exit']).notNullable();
        table.enum('letter_type', [
          'interview_call', 'intent_to_offer', 'offer_letter',
          'appointment', 'nda', 'code_of_conduct',
          'confirmation', 'increment', 'promotion', 'warning',
          'resignation_acceptance', 'relieving', 'experience',
          'custom'
        ]).notNullable();

        table.string('subject', 500).nullable();

        // Company branding
        table.text('header_html', 'longtext').nullable();
        table.text('footer_html', 'longtext').nullable();
        table.text('logo_url', 'longtext').nullable();
        table.string('company_name_override', 255).nullable();
        table.text('company_address_override').nullable();
        table.string('signatory_name', 255).nullable();
        table.string('signatory_designation', 255).nullable();

        // Template content
        table.text('body_content', 'longtext').notNullable();
        table.text('terms_and_conditions', 'longtext').nullable();
        table.text('custom_clause', 'longtext').nullable();

        // Merge codes tracking
        table.json('merge_codes_used').nullable();

        // Flags
        table.boolean('is_default').defaultTo(false);
        table.boolean('is_active').defaultTo(true);
        table.boolean('bgv_mandatory').defaultTo(false);
        table.boolean('nda_mandatory').defaultTo(false);
        table.boolean('non_compete').defaultTo(false);
        table.boolean('relieving_letter_required').defaultTo(false);

        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();

        // Indexes
        table.index('organization_id');
        table.index('company_id');
        table.index('letter_type');
        table.index('letter_category');
        table.index('is_active');
      });
      console.log('✅ letter_templates table created!');
    } else {
      console.log('ℹ️ letter_templates table already exists.');
    }

    // ──────────────────────────────────────────────────────────
    // 2. generated_letters — Actual generated/sent letters
    // ──────────────────────────────────────────────────────────
    const hasLetters = await knex.schema.hasTable('generated_letters');
    if (!hasLetters) {
      console.log('⏳ Creating generated_letters table...');
      await knex.schema.createTable('generated_letters', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('company_id').unsigned().nullable();

        table.bigInteger('letter_template_id').unsigned().nullable();
        table.string('letter_code', 50).notNullable(); // e.g., LTR-2026-0001

        table.enum('letter_type', [
          'interview_call', 'intent_to_offer', 'offer_letter',
          'appointment', 'nda', 'code_of_conduct',
          'confirmation', 'increment', 'promotion', 'warning',
          'resignation_acceptance', 'relieving', 'experience',
          'custom'
        ]).notNullable();

        table.string('letter_category', 50).nullable();

        // Recipient — either employee or candidate
        table.bigInteger('employee_id').unsigned().nullable();
        table.bigInteger('candidate_id').unsigned().nullable();
        table.string('recipient_name', 255).notNullable();
        table.string('recipient_email', 255).nullable();

        table.string('subject', 500).nullable();

        // Rendered content
        table.text('rendered_html', 'longtext').notNullable();
        table.text('rendered_pdf_url', 'longtext').nullable();

        // Snapshot of merge data used
        table.json('merge_data').nullable();

        // Status tracking
        table.enum('status', ['draft', 'sent', 'acknowledged', 'signed', 'revoked']).defaultTo('draft');
        table.timestamp('sent_at').nullable();
        table.timestamp('acknowledged_at').nullable();
        table.timestamp('signed_at').nullable();
        table.timestamp('revoked_at').nullable();

        // Digital signature
        table.text('digital_signature_url', 'longtext').nullable();
        table.text('acknowledgment_note').nullable();

        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();

        // Indexes
        table.index('organization_id');
        table.index('employee_id');
        table.index('candidate_id');
        table.index('letter_type');
        table.index('status');
        table.index('letter_template_id');
      });
      console.log('✅ generated_letters table created!');
    } else {
      console.log('ℹ️ generated_letters table already exists.');
    }

    console.log('🎉 All Letter Management tables ready!');
  } catch (error: any) {
    console.error('❌ Error setting up Letter Management tables:', error);
  } finally {
    process.exit(0);
  }
}

setupLetterManagementTables();
