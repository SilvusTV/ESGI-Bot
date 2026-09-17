import { EmbedBuilder, type Client } from 'discord.js';
import { getMyGesService } from './MyGesService';

const PARIS = 'Europe/Paris';

function parisDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

function parisMidnight(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const offsetName = new Intl.DateTimeFormat('en', { timeZone: PARIS, timeZoneName: 'longOffset' }).formatToParts(noon).find(part => part.type === 'timeZoneName')?.value || 'GMT+00:00';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offsetName);
  const offset = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return new Date(Date.UTC(year, month - 1, day) - offset * 60_000);
}

function eventDate(value: unknown): Date | null {
  if (typeof value === 'number') return new Date(value < 10_000_000_000 ? value * 1000 : value);
  if (typeof value === 'string' && value) {
    const numeric = Number(value); if (Number.isFinite(numeric)) return eventDate(numeric);
    const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function text(value: unknown): string { return typeof value === 'string' ? value : ''; }

export function weekStart(reference = new Date(), nextWeek = false): string {
  const today = parisDateKey(reference);
  const [year, month, day] = today.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(today, 1 - (weekday || 7) + (nextWeek ? 7 : 0));
}

export async function buildWeeklyPlanning(client: Client, guildId: string, monday: string): Promise<EmbedBuilder[]> {
  const events = await getMyGesService(guildId).getAgenda(parisMidnight(monday), parisMidnight(addDays(monday, 7)));
  const embeds: EmbedBuilder[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(monday, offset);
    const lines = events.filter(event => {
      const start = eventDate(event.start_date);
      return start !== null && parisDateKey(start) === day;
    }).sort((a, b) => (eventDate(a.start_date)?.getTime() || 0) - (eventDate(b.start_date)?.getTime() || 0)).map((event) => {
      const start = eventDate(event.start_date); const end = eventDate(event.end_date);
      if (!start) return null;
      const room = Array.isArray(event.rooms) && event.rooms[0] && typeof event.rooms[0] === 'object' ? event.rooms[0] as Record<string, unknown> : null;
      const discipline = event.discipline && typeof event.discipline === 'object' ? event.discipline as Record<string, unknown> : null;
      const when = `<t:${Math.floor(start.getTime() / 1000)}:t>${end ? `–<t:${Math.floor(end.getTime() / 1000)}:t>` : ''}`;
      const location = room ? [text(room.name), text(room.campus)].filter(Boolean).join(' · ') : '';
      const details = [location, text(event.modality), discipline ? text(discipline.teacher) : ''].filter(Boolean).join(' — ');
      return `**${when} · ${text(event.name) || text(event.type) || 'Cours'}**${details ? `\n${details}` : ''}`;
    }).filter((line): line is string => Boolean(line));
    if (!lines.length) continue;
    const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PARIS }).format(parisMidnight(day));
    const embed = new EmbedBuilder().setColor(0x735b8b)
      .setTitle(`📅 ${label.charAt(0).toUpperCase() + label.slice(1)}`)
      .setDescription(lines.join('\n\n').slice(0, 4096));
    embeds.push(embed);
  }
  if (!embeds.length) embeds.push(new EmbedBuilder().setColor(0x735b8b).setTitle('📅 Planning de la semaine').setDescription('Aucun cours prévu cette semaine.'));
  if (client.user) embeds[0].setFooter({ text: client.user.tag, iconURL: client.user.displayAvatarURL() });
  return embeds;
}
