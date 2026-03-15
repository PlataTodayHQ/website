import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./connection.js";
import { log } from "@plata-today/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../db/migrations");

export function runMigrations(dbPath: string): void {
  const db = openDatabase(dbPath);

  try {
    // Create migrations tracking table
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const applied = new Set(
      db
        .prepare("SELECT filename FROM _migrations")
        .all()
        .map((r: any) => r.filename),
    );

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      log.info("Applying migration", { file });

      db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
      })();

      log.info("Migration applied", { file });
    }
  } finally {
    db.close();
  }
}

// Allow running standalone: tsx src/db/migrate.ts
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(__dirname, "../../../../data/plata.db");
  log.info("Running migrations", { dbPath });
  runMigrations(dbPath);
  log.info("Migrations complete");
}
