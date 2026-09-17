import { EmbedBuilder, type Client } from 'discord.js';
import { myGesService } from './MyGesService';

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

export async function buildThursdayFridayPlanning(client: Client, reference = new Date()): Promise<EmbedBuilder> {
  const today = parisDateKey(reference); const thursday = addDays(today, 1); const friday = addDays(today, 2);
  const events = await myGesService.getAgenda(parisMidnight(thursday), parisMidnight(addDays(friday, 1)));
  const embed = new EmbedBuilder().setColor(0x735b8b).setTitle('📅 Planning de jeudi et vendredi').setTimestamp();
  if (client.user) embed.setFooter({ text: client.user.tag, iconURL: client.user.displayAvatarURL() });
  for (const day of [thursday, friday]) {
    const lines = events.map((event) => {
      const start = eventDate(event.start_date); const end = eventDate(event.end_date);
      if (!start || parisDateKey(start) !== day) return null;
      const room = Array.isArray(event.rooms) && event.rooms[0] && typeof event.rooms[0] === 'object' ? event.rooms[0] as Record<string, unknown> : null;
      const discipline = event.discipline && typeof event.discipline === 'object' ? event.discipline as Record<string, unknown> : null;
      const when = `<t:${Math.floor(start.getTime() / 1000)}:t>${end ? `–<t:${Math.floor(end.getTime() / 1000)}:t>` : ''}`;
      const location = room ? [text(room.name), text(room.campus)].filter(Boolean).join(' · ') : '';
      const details = [location, text(event.modality), discipline ? text(discipline.teacher) : ''].filter(Boolean).join(' — ');
      return `**${when} · ${text(event.name) || text(event.type) || 'Cours'}**${details ? `\n${details}` : ''}`;
    }).filter((line): line is string => Boolean(line));
    const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PARIS }).format(parisMidnight(day));
    embed.addFields({ name: label.charAt(0).toUpperCase() + label.slice(1), value: (lines.join('\n\n') || 'Aucun cours prévu.').slice(0, 1024) });
  }
  return embed;
}
