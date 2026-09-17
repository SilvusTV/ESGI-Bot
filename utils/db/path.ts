import path from 'path';

export function resolveDbPath(): string {
  const loc = process.env.DB_LOCATION || './DB/bot.db';
  return path.isAbsolute(loc) ? loc : path.resolve(process.cwd(), loc);
}

export function getSchemaPath(): string {
  return path.resolve(process.cwd(), 'DB', 'schema.sql');
}

