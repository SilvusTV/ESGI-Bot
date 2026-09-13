import { and, eq } from 'drizzle-orm';
import { getDb, type AppDb } from '../client';
import { config, type Config } from '../schema';

export const CONFIG_KEYS = {
  customCommandPrefix: 'customCommandPrefix',
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export class ConfigRepository {
  constructor(private readonly db: AppDb = getDb()) {}

  ensureDefaultGuildConfig(guildId: string): void {
    this.db
      .insert(config)
      .values({
        guildId,
        key: CONFIG_KEYS.customCommandPrefix,
        value: '!',
      })
      .onConflictDoNothing({ target: [config.guildId, config.key] })
      .run();
  }

  find(guildId: string, key: ConfigKey): Config | undefined {
    return this.db.select().from(config).where(and(eq(config.guildId, guildId), eq(config.key, key))).get();
  }

  getValue(guildId: string, key: ConfigKey): string | undefined {
    return this.find(guildId, key)?.value;
  }

  listByGuild(guildId: string): Config[] {
    return this.db.select().from(config).where(eq(config.guildId, guildId)).all();
  }

  upsert(guildId: string, key: ConfigKey, value: string): Config | undefined {
    this.db
      .insert(config)
      .values({
        guildId,
        key,
        value,
      })
      .onConflictDoUpdate({
        target: [config.guildId, config.key],
        set: {
          value,
          updatedAt: new Date().toISOString(),
        },
      })
      .run();

    return this.find(guildId, key);
  }
}

