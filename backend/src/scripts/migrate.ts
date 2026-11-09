import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config } from "../config";
import { Database } from "../db";

async function migrate(): Promise<void> {
  const db = new Database(config.databaseUrl);
  const dir = resolve(process.cwd(), "migrations");

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const applied = await db.query<{ name: string }>(
        "SELECT name FROM schema_migrations WHERE name = $1",
        [file],
      );
      if (applied.length > 0) {
        console.log(`skip  ${file}`);
        continue;
      }

      const sql = await readFile(join(dir, file), "utf8");
      await db.transaction(async (client) => {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      });
      console.log(`apply ${file}`);
    }

    console.log("Migrasi selesai.");
  } finally {
    await db.close();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
