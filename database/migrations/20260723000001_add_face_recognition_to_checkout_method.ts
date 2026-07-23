import type { Knex } from 'knex';

/**
 * Extend check_out_method ENUM to include 'face_recognition'
 * (check_in_method already has it; check_out_method was missing it)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE attendance_records
    MODIFY COLUMN check_out_method
      ENUM('web', 'mobile', 'gps', 'qr', 'biometric', 'kiosk', 'face_recognition')
      NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE attendance_records
    MODIFY COLUMN check_out_method
      ENUM('web', 'mobile', 'gps', 'qr', 'biometric', 'kiosk')
      NULL
  `);
}
