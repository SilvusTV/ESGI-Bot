import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getSchemaPath, resolveDbPath } from './path';
import * as schema from './schema';

export type AppDb = BetterSQLite3Database<typeof schema>;

const connections = new Map<string, { sqlite: Database.Database; db: AppDb }>();

// Une connexion et un fichier SQLite par serveur Discord.
export function getDb(guildId: string): AppDb {
  const existing = connections.get(guildId);
  if (existing) return existing.db;
  const dbPath = resolveDbPath(guildId);
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(fs.readFileSync(getSchemaPath(), 'utf8'));
  const db = drizzle(sqlite, { schema });
  connections.set(guildId, { sqlite, db });
  return db;
}

export function closeDb(): void {
  for (const { sqlite } of connections.values()) sqlite.close();
  connections.clear();
}

// Copy the former single-server database once, before opening its new connection.
export async function migrateLegacyDatabase(guildIds: string[]): Promise<void> {
  const legacyPath = resolveDbPath();
  if (!fs.existsSync(legacyPath)) return;
  const configured = process.env.LEGACY_GUILD_ID;
  const targetId = configured || (guildIds.length === 1 ? guildIds[0] : undefined);
  if (!targetId) throw new Error('Legacy database found: set LEGACY_GUILD_ID to the original server ID before starting the bot.');
  if (!guildIds.includes(targetId)) throw new Error('LEGACY_GUILD_ID is not a server connected to this bot.');
  const targetPath = resolveDbPath(targetId);
  if (fs.existsSync(targetPath)) return;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const source = new Database(legacyPath, { readonly: true, fileMustExist: true });
  try { await source.backup(targetPath); }
  finally { source.close(); }
}

export { schema };

