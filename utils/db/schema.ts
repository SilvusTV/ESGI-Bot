import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const config = sqliteTable(
  'config',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    guildKeyUnique: uniqueIndex('config_guild_key_unique').on(table.guildId, table.key),
  }),
);

export const customCommand = sqliteTable(
  'customCommand',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id').notNull(),
    title: text('title').notNull(),
    command: text('command').notNull(),
    description: text('description').notNull(),
    response: text('response').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    guildCommandUnique: uniqueIndex('customCommand_guild_command_unique').on(table.guildId, table.command),
  }),
);

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type CustomCommand = typeof customCommand.$inferSelect;
export type NewCustomCommand = typeof customCommand.$inferInsert;
