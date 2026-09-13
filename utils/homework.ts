import { EmbedBuilder, type Client } from 'discord.js';
import { AcademicRepository } from './db';

export const EMBED_COLOR = 0x735b8b;

export function parseFrenchDate(value: string, time = '00:00'): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match || !timeMatch) return null;
  const [, day, month, year] = match.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || hour > 23 || minute > 59) return null;
  return Math.floor(date.getTime() / 1000);
}

export function buildHomeworkEmbed(client: Client, until?: number): EmbedBuilder {
  const rows = new AcademicRepository().listUpcomingHomework(until);
  const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Devoirs à venir').setTimestamp();
  if (client.user) embed.setFooter({ text: client.user.tag, iconURL: client.user.displayAvatarURL() });
  if (!rows.length) return embed.setDescription('Aucun devoir en vue.');
  for (const item of rows.slice(0, 25)) {
    const details = [
      `**${item.type}** — <t:${item.dueAt}:f> (<t:${item.dueAt}:R>)`,
      item.description || null,
      item.resourceUrl ? `[Ressource associée](${item.resourceUrl})` : null,
    ].filter(Boolean).join('\n');
    embed.addFields({ name: item.subjectName, value: details.slice(0, 1024) });
  }
  return embed;
}

export function matchingChoices<T extends { id: number }>(items: T[], label: (item: T) => string, query: string) {
  const normalized = query.toLocaleLowerCase('fr');
  return items.filter((item) => label(item).toLocaleLowerCase('fr').includes(normalized)).slice(0, 25)
    .map((item) => ({ name: label(item).slice(0, 100), value: item.id }));
}
