import mysql from 'mysql2/promise';

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Aqil@123',
    database: 'apponexthrms',
  });

  try {
    const conn = await pool.getConnection();

    const sql = `CREATE TABLE IF NOT EXISTS \`interview_schedules\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL UNIQUE,
      \`organization_id\` BIGINT UNSIGNED NOT NULL,
      \`applicant_id\` BIGINT UNSIGNED NOT NULL,
      \`job_opening_id\` BIGINT UNSIGNED NOT NULL,
      \`interview_type\` ENUM('phone_screen', 'technical', 'hr', 'manager', 'final') NOT NULL,
      \`round_number\` INT DEFAULT 1,
      \`interviewer_id\` BIGINT UNSIGNED,
      \`interview_date\` DATETIME,
      \`duration_minutes\` INT,
      \`feedback\` LONGTEXT,
      \`rating\` DECIMAL(3,2),
      \`status\` ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
      \`created_by\` BIGINT UNSIGNED NOT NULL,
      \`updated_by\` BIGINT UNSIGNED,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL,
      INDEX (\`organization_id\`),
      INDEX (\`applicant_id\`),
      INDEX (\`status\`),
      INDEX (\`interview_date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

    await conn.query(sql);
    console.log('✓ interview_schedules table created');

    conn.release();
    await pool.end();
  } catch (e) { console.error('✗', e.message); }
})();
