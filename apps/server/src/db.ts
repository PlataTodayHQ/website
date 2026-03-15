/**
 * Server-side database singleton.
 *
 * All server jobs share this single read-write connection instead of
 * each job opening/closing its own.
 */

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveDbPath(): string {
  return process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(__dirname, "../../../data/plata.db");
}

let _db: Database.Database | null = null;

export function getServerDb(dbPath?: string): Database.Database {
  if (_db) return _db;
  const p = dbPath ?? resolveDbPath();
  _db = new Database(p);
  _db.pragma("journal_mode = WAL");
  return _db;
}

export function closeServerDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
