import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const connection = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connection) throw new Error("Set DIRECT_URL or DATABASE_URL before applying migrations.");
  const sql = neon(connection);
  await sql`CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const directory = join(process.cwd(), "backend", "migrations");
  const files = (await readdir(directory)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/.test(file)).sort();

  for (const file of files) {
    const [existing] = await sql`SELECT name FROM app_migrations WHERE name = ${file}`;
    if (existing) {
      console.info(`Already applied: ${file}`);
      continue;
    }
    const source = await readFile(join(directory, file), "utf8");
    const statements = source.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
    try {
      await sql.transaction([...statements.map((statement) => sql.query(statement)), sql`INSERT INTO app_migrations (name) VALUES (${file})`]);
      console.info(`Applied: ${file}`);
    } catch (error) {
      console.error(`Migration failed: ${file}`, error);
      throw error;
    }
  }
}

void main().catch((error: unknown) => {
  console.error("Database migration failed", error);
  process.exitCode = 1;
});
