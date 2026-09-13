import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const config = sqliteTable(
  'config',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    keyUnique: uniqueIndex('config_key_unique').on(table.key),
  }),
);

export const customCommand = sqliteTable(
  'customCommand',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    command: text('command').notNull(),
    description: text('description').notNull(),
    response: text('response').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    commandUnique: uniqueIndex('customCommand_command_unique').on(table.command),
  }),
);

export const teacher = sqliteTable(
  'teacher',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
);

export const subject = sqliteTable(
  'subject',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    teacherId: integer('teacher_id').references(() => teacher.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    nameUnique: uniqueIndex('subject_name_unique').on(table.name),
  }),
);

export const homework = sqliteTable(
  'homework',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    subjectId: integer('subject_id').notNull().references(() => subject.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    description: text('description'),
    resourceUrl: text('resource_url'),
    dueAt: integer('due_at').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => ({
    dueIndex: index('homework_due_idx').on(table.dueAt),
  }),
);

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type CustomCommand = typeof customCommand.$inferSelect;
export type NewCustomCommand = typeof customCommand.$inferInsert;
export type Teacher = typeof teacher.$inferSelect;
export type Subject = typeof subject.$inferSelect;
export type Homework = typeof homework.$inferSelect;
