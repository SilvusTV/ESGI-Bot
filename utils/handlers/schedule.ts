import cron from 'node-cron';

export const SCHEDULE_TIMEZONE = 'Europe/Paris';
const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// These two reminders are weekly. Restrict the cron syntax to one day and time
// so a typo cannot send messages every minute.
export function parseWeeklyCron(value: string): { expression: string; label: string } | null {
  const match = /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+([0-7])$/.exec(value.trim());
  if (!match) return null;
  const minute = Number(match[1]);
  const hour = Number(match[2]);
  const day = Number(match[3]) % 7;
  if (minute > 59 || hour > 23) return null;
  const expression = `${minute} ${hour} * * ${day}`;
  if (!cron.validate(expression)) return null;
  return { expression, label: `${days[day]} à ${String(hour).padStart(2, '0')}h${String(minute).padStart(2, '0')} (${SCHEDULE_TIMEZONE})` };
}
