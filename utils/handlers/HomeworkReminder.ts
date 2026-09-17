import cron from 'node-cron';
import { ChannelType, type Client } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import { buildHomeworkEmbed } from '../homework';
import Logger from '../Logger';
import { parseWeeklyCron, SCHEDULE_TIMEZONE } from './schedule';

const tasks = new Map<string, { expression: string; task: ReturnType<typeof cron.schedule> }>();

export function refreshHomeworkReminder(client: Client, guildId: string): void {
  const config = new ConfigRepository(guildId);
  const schedule = parseWeeklyCron(config.getValue(CONFIG_KEYS.homeworkReminderCron) || '0 10 * * 6');
  if (!schedule) { Logger.error(`Cron des devoirs invalide pour ${guildId}.`); return; }
  if (tasks.get(guildId)?.expression === schedule.expression) return;
  const task = cron.schedule(schedule.expression, async () => {
    if (!client.guilds.cache.has(guildId)) return;
    const until = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const current = new ConfigRepository(guildId);
    if (current.getValue(CONFIG_KEYS.homeworkReminderEnabled) !== 'true') return;
    const channelId = current.getValue(CONFIG_KEYS.homeworkChannelId);
    if (!channelId) return;
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== ChannelType.GuildText || channel.guildId !== guildId) return;
      await channel.send({ embeds: [buildHomeworkEmbed(client, guildId, until)] });
    } catch (error) {
      Logger.error(`Rappel des devoirs ${guildId} impossible: ${String(error)}`);
    }
  }, { timezone: SCHEDULE_TIMEZONE });
  tasks.get(guildId)?.task.stop();
  tasks.set(guildId, { expression: schedule.expression, task });
  Logger.info(`Rappel des devoirs ${guildId} planifié ${schedule.label}.`);
}

export function startHomeworkReminder(client: Client): void {
  for (const guild of client.guilds.cache.values()) refreshHomeworkReminder(client, guild.id);
}
