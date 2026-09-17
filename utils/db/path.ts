import path from 'path';

export function resolveDbPath(guildId?: string): string {
  const loc = process.env.DB_LOCATION || './DB/bot.db';
  const base = path.isAbsolute(loc) ? loc : path.resolve(process.cwd(), loc);
  if (!guildId) return base;
  if (!/^\d{17,20}$/.test(guildId)) throw new Error('Invalid Discord guild ID');
  return path.join(path.dirname(base), 'guilds', `${guildId}.db`);
}

export function getSchemaPath(): string {
  return path.resolve(process.cwd(), 'DB', 'schema.sql');
}

