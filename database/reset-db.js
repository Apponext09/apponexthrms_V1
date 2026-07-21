const knex = require("knex");

async function resetDatabase() {
  const db = knex({
    client: "mysql2",
    connection: {
      host: "localhost",
      user: "root",
      password: "Aqil@123",
      database: "apponexthrms",
    },
  });

  try {
    console.log("Fetching all tables...");
    const [tables] = await db.raw(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'apponexthrms'`
    );

    console.log(`Found ${tables.length} tables to drop`);

    await db.raw(`SET FOREIGN_KEY_CHECKS = 0`);

    for (const table of tables) {
      if (table.TABLE_NAME !== 'knex_migrations' && table.TABLE_NAME !== 'knex_migrations_lock') {
        try {
          await db.raw('DROP TABLE ?? ', [table.TABLE_NAME]);
          console.log(`Dropped: ${table.TABLE_NAME}`);
        } catch (err) {
          console.error(`Error dropping ${table.TABLE_NAME}:`, err.message);
        }
      }
    }

    await db.raw(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("Database tables reset complete!");
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error.message);
    process.exit(1);
  }
}

resetDatabase();
