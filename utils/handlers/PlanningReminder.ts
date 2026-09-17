import cron from 'node-cron';
import { ChannelType, type Client } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import { myGesService } from '../ges/MyGesService';
import { buildThursdayFridayPlanning } from '../ges/planning';
import Logger from '../Logger';

let started = false;

export function startPlanningReminder(client: Client): void {
  if (started) return;
  started = true;
  cron.schedule('0 18 * * 3', async () => {
    const config = new ConfigRepository(); const channelId = config.getValue(CONFIG_KEYS.planningChannelId);
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) return;
      await channel.send({ embeds: [await buildThursdayFridayPlanning(client)] });
    } catch (error) {
      Logger.error(`Envoi du planning impossible: ${String(error)}`);
      if ((error as Error).message === 'MYGES_AUTH_REQUIRED') {
        const userId = config.getValue(CONFIG_KEYS.gesAccountUserId);
        if (userId) await myGesService.validateOrNotify(userId).catch(() => undefined);
      }
    }
  }, { timezone: 'Europe/Paris' });
  Logger.info('Planning du jeudi et vendredi planifié le mercredi à 18h (Europe/Paris).');
}
