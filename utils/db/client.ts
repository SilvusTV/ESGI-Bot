import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { resolveDbPath } from './path';
import * as schema from './schema';

export type AppDb = BetterSQLite3Database<typeof schema>;

let sqlite: Database.Database | null = null;
let db: AppDb | null = null;

// Singleton DB pour éviter plusieurs connexions SQLite dans le même process.
export function getDb(): AppDb {
  if (db) {
    return db;
  }

  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  db = drizzle(sqlite, { schema });

  return db;
}

export function closeDb(): void {
  if (!sqlite) {
    return;
  }

  sqlite.close();
  sqlite = null;
  db = null;
}

export { schema };

