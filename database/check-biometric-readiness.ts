import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });

const connection = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  },
});

async function main() {
  const tableReady = await connection.schema.hasTable('employee_biometric_profiles');
  const employees = await connection('employees')
    .select(
      'id',
      'organization_id',
      'employee_code',
      'first_name',
      'last_name',
      connection.raw(
        'CASE WHEN avatar_url IS NULL THEN 0 ELSE CHAR_LENGTH(avatar_url) END AS avatar_length'
      )
    )
    .whereIn('email', ['harshumeshgawali@gmail.com', 'sam@gmail.com']);
  const profileCount = tableReady
    ? Number(
        (await connection('employee_biometric_profiles').count('* as count').first())
          ?.count || 0
      )
    : 0;

  console.table(employees);
  console.log({ tableReady, profileCount });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => connection.destroy());

