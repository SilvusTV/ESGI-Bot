import { eq } from 'drizzle-orm';
import { getDb, type AppDb } from '../client';
import { config, type Config } from '../schema';

export const CONFIG_KEYS = {
  customCommandPrefix: 'customCommandPrefix',
  homeworkChannelId: 'homeworkChannelId',
  homeworkReminderEnabled: 'homeworkReminderEnabled',
  gesAccountUserId: 'gesAccountUserId',
  planningChannelId: 'planningChannelId',
  planningMessageId: 'planningMessageId',
  planningWeekStart: 'planningWeekStart',
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export class ConfigRepository {
  constructor(private readonly db: AppDb = getDb()) {}

  ensureDefaults(): void {
    this.db.insert(config).values([
      { key: CONFIG_KEYS.customCommandPrefix, value: '!' },
      { key: CONFIG_KEYS.homeworkReminderEnabled, value: 'false' },
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
