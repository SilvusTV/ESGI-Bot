import cron from 'node-cron';
import { ChannelType, type Client } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import { buildHomeworkEmbed } from '../homework';
import Logger from '../Logger';

let started = false;

export function startHomeworkReminder(client: Client): void {
  if (started) return;
  started = true;
  cron.schedule('0 10 * * 6', async () => {
    const config = new ConfigRepository();
    const until = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    if (config.getValue(CONFIG_KEYS.homeworkReminderEnabled) !== 'true') return;
    const channelId = config.getValue(CONFIG_KEYS.homeworkChannelId);
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) return;
      await channel.send({ embeds: [buildHomeworkEmbed(client, until)] });
    } catch (error) {
      Logger.error(`Rappel des devoirs impossible: ${String(error)}`);
    }
  }, { timezone: 'Europe/Paris' });
  Logger.info('Rappels de devoirs planifiés le samedi à 10h (Europe/Paris).');
}
