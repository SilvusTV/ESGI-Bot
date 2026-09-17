import cron from 'node-cron';
import { ChannelType, DiscordAPIError, type Client } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import { myGesService } from '../ges/MyGesService';
import { buildWeeklyPlanning, weekStart } from '../ges/planning';
import Logger from '../Logger';

let started = false;

export async function publishWeeklyPlanning(client: Client, monday: string): Promise<'sent' | 'updated'> {
  const config = new ConfigRepository();
  const channelId = config.getValue(CONFIG_KEYS.planningChannelId);
  if (!channelId) throw new Error('PLANNING_CHANNEL_REQUIRED');
  const channel = await client.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) throw new Error('PLANNING_CHANNEL_UNAVAILABLE');

  const embeds = await buildWeeklyPlanning(client, monday);
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

export function startPlanningReminder(client: Client): void {
  if (started) return;
  started = true;
  cron.schedule('0 18 * * 0', async () => {
    try {
      await publishWeeklyPlanning(client, weekStart(new Date(), true));
    } catch (error) {
      Logger.error(`Envoi du planning impossible: ${String(error)}`);
      if ((error as Error).message === 'MYGES_AUTH_REQUIRED') {
        const config = new ConfigRepository();
        const userId = config.getValue(CONFIG_KEYS.gesAccountUserId);
        if (userId) await myGesService.validateOrNotify(userId).catch(() => undefined);
      }
    }
  }, { timezone: 'Europe/Paris' });
  Logger.info('Planning hebdomadaire planifié le dimanche à 18h (Europe/Paris).');
}
