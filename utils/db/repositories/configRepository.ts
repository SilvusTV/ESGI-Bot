import { eq } from 'drizzle-orm';
import { getDb, type AppDb } from '../client';
import { config, type Config } from '../schema';

export const CONFIG_KEYS = {
  customCommandPrefix: 'customCommandPrefix',
  homeworkChannelId: 'homeworkChannelId',
  homeworkReminderEnabled: 'homeworkReminderEnabled',
  homeworkReminderCron: 'homeworkReminderCron',
  gesAccountUserId: 'gesAccountUserId',
  planningChannelId: 'planningChannelId',
  planningCron: 'planningCron',
  planningMessageId: 'planningMessageId',
  planningWeekStart: 'planningWeekStart',
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export class ConfigRepository {
  constructor(guildId: string, private readonly db: AppDb = getDb(guildId)) {}

  ensureDefaults(): void {
    this.db.insert(config).values([
      { key: CONFIG_KEYS.customCommandPrefix, value: '!' },
      { key: CONFIG_KEYS.homeworkReminderEnabled, value: 'false' },
      { key: CONFIG_KEYS.homeworkReminderCron, value: '0 10 * * 6' },
      { key: CONFIG_KEYS.planningCron, value: '0 18 * * 0' },
    ]).onConflictDoNothing({ target: config.key }).run();
  }

  find(key: ConfigKey): Config | undefined {
    return this.db.select().from(config).where(eq(config.key, key)).get();
  }

  getValue(key: ConfigKey): string | undefined { return this.find(key)?.value; }
  list(): Config[] { return this.db.select().from(config).all(); }

  upsert(key: ConfigKey, value: string): Config | undefined {
    this.db.insert(config).values({ key, value }).onConflictDoUpdate({
      target: config.key,
      set: { value, updatedAt: new Date().toISOString() },
    }).run();
    return this.find(key);
  }
}
