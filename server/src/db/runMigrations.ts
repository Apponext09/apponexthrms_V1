import knex from "knex";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

config({ path: path.join(__dirname, "..", "..", ".env") });
config({ path: path.join(__dirname, "..", "..", "..", ".env") });

const db = knex({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  },
  migrations: {
    directory: path.join(__dirname, "migrations"),
    extension: "ts",
    loadExtensions: [".ts"],
    disableMigrationsListValidation: true,
  },
});

async function main() {
  try {
    const [batchNo, log] = await db.migrate.latest();
    if (log.length === 0) {
      console.log("✅ Database schema is up to date.");
    } else {
      console.log("✅ Batch " + batchNo + " ran " + log.length + " migration(s):");
      log.forEach((file: string) => console.log("   - " + path.basename(file)));
    }
    await db.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

main();
