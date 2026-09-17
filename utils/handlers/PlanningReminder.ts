import cron from 'node-cron';
import { ChannelType, DiscordAPIError, type Client } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import { getMyGesService } from '../ges/MyGesService';
import { buildWeeklyPlanning, weekStart } from '../ges/planning';
import Logger from '../Logger';
import { parseWeeklyCron, SCHEDULE_TIMEZONE } from './schedule';

const tasks = new Map<string, { expression: string; task: ReturnType<typeof cron.schedule> }>();

export async function publishWeeklyPlanning(client: Client, guildId: string, monday: string): Promise<'sent' | 'updated'> {
  const config = new ConfigRepository(guildId);
  const channelId = config.getValue(CONFIG_KEYS.planningChannelId);
  if (!channelId) throw new Error('PLANNING_CHANNEL_REQUIRED');
  const channel = await client.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== guildId) throw new Error('PLANNING_CHANNEL_UNAVAILABLE');

  const embeds = await buildWeeklyPlanning(client, guildId, monday);
  const previousId = config.getValue(CONFIG_KEYS.planningMessageId);
  if (previousId && config.getValue(CONFIG_KEYS.planningWeekStart) === monday) {
    try {
      const message = await channel.messages.fetch(previousId);
      await message.edit({ embeds });
      return 'updated';
    } catch (error) {
      if (!(error instanceof DiscordAPIError && error.code === 10008)) throw error;
    }
  }

  const message = await channel.send({ embeds });
  config.upsert(CONFIG_KEYS.planningMessageId, message.id);
  config.upsert(CONFIG_KEYS.planningWeekStart, monday);
  return 'sent';
}

export function refreshPlanningReminder(client: Client, guildId: string): void {
  const config = new ConfigRepository(guildId);
  const schedule = parseWeeklyCron(config.getValue(CONFIG_KEYS.planningCron) || '0 18 * * 0');
  if (!schedule) { Logger.error(`Cron du planning invalide pour ${guildId}.`); return; }
  if (tasks.get(guildId)?.expression === schedule.expression) return;
  const task = cron.schedule(schedule.expression, async () => {
    if (!client.guilds.cache.has(guildId)) return;
    if (!new ConfigRepository(guildId).getValue(CONFIG_KEYS.planningChannelId)) return;
    try {
      await publishWeeklyPlanning(client, guildId, weekStart(new Date(), true));
    } catch (error) {
      Logger.error(`Envoi du planning ${guildId} impossible: ${String(error)}`);
      if ((error as Error).message === 'MYGES_AUTH_REQUIRED') {
        const userId = new ConfigRepository(guildId).getValue(CONFIG_KEYS.gesAccountUserId);
        if (userId) await getMyGesService(guildId).validateOrNotify(userId).catch(() => undefined);
      }
    }
  }, { timezone: SCHEDULE_TIMEZONE });
  tasks.get(guildId)?.task.stop();
  tasks.set(guildId, { expression: schedule.expression, task });
  Logger.info(`Planning ${guildId} planifié ${schedule.label}.`);
}

export function startPlanningReminder(client: Client): void {
  for (const guild of client.guilds.cache.values()) refreshPlanningReminder(client, guild.id);
}
