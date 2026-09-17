import { randomUUID } from 'crypto';
import Logger from '../Logger';

const AUTH_URL = 'https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app';
const API_URL = 'https://api.kordis.fr';
const LOGIN_TTL_MS = 15 * 60 * 1000;

type LoginSession = { discordUserId: string; expiresAt: number; attempts: number };
export type MyGesTeacher = { teacherId: number; firstName: string; lastName: string };
export type MyGesCourse = { name: string; teacherId: number; startAt: number; endAt: number | null };
type MyGesTeachersResponse = { result?: Array<Record<string, unknown>> };
type MyGesAgendaResponse = { result?: Array<Record<string, unknown>> };
type MyGesYearsResponse = { result?: unknown[] };

export class MyGesService {
  private accessToken: string | null = null;
  private sessions = new Map<string, LoginSession>();
  private invalidCallback?: (userId: string) => Promise<void>;
  private successCallback?: (userId: string) => Promise<void>;
  private invalidNotificationSent = false;
  private teachersCache: { years: string; expiresAt: number; values: MyGesTeacher[] } | null = null;
  private coursesCache: { expiresAt: number; values: MyGesCourse[] } | null = null;

  setCallbacks(callbacks: { onInvalid: (userId: string) => Promise<void>; onSuccess: (userId: string) => Promise<void> }): void {
    this.invalidCallback = callbacks.onInvalid;
    this.successCallback = callbacks.onSuccess;
  }

  hasToken(): boolean { return this.accessToken !== null; }

  createLoginSession(discordUserId: string): string {
    this.cleanupSessions();
    const id = randomUUID();
    this.sessions.set(id, { discordUserId, expiresAt: Date.now() + LOGIN_TTL_MS, attempts: 0 });
    return id;
  }

  consumeLoginSession(id: string): LoginSession | null {
    const session = this.sessions.get(id);
    this.sessions.delete(id);
    if (!session || session.expiresAt < Date.now()) return null;
    return session;
  }

  getLoginSession(id: string): LoginSession | null {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt < Date.now()) { this.sessions.delete(id); return null; }
    return session;
  }

  registerLoginFailure(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.attempts += 1;
    if (session.attempts >= 5) this.sessions.delete(id);
  }

  markLoginRequested(): void { this.invalidNotificationSent = true; }

  async authenticate(username: string, password: string): Promise<void> {
    const basic = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
    const response = await fetch(AUTH_URL, { method: 'GET', redirect: 'manual', headers: { Authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(15_000) });
    const location = response.headers.get('location');
    if (!location) throw new Error('Identifiants refusés ou réponse MyGES inattendue.');
    const fragment = location.includes('#') ? location.slice(location.indexOf('#') + 1) : '';
    const token = new URLSearchParams(fragment).get('access_token');
    if (!token) throw new Error('MyGES n’a pas retourné de jeton d’accès.');
    this.accessToken = token;
    try { await this.request('/me/profile'); } catch (error) { this.accessToken = null; throw error; }
    this.invalidNotificationSent = false;
    this.teachersCache = null;
    this.coursesCache = null;
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.accessToken) throw new Error('MYGES_AUTH_REQUIRED');
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    if (response.status === 401 || response.status === 403) { this.accessToken = null; throw new Error('MYGES_AUTH_REQUIRED'); }
    if (!response.ok) throw new Error(`MyGES API ${response.status}`);
    return response.json() as Promise<T>;
  }

  async getAvailableYears(): Promise<string[]> {
    if (process.env.MYGES_YEAR) return [process.env.MYGES_YEAR];
    try {
      const payload = await this.request<MyGesYearsResponse>('/me/years');
      const years = (payload.result || []).map(extractYear).filter((year): year is string => Boolean(year));
      if (years.length) return [...new Set(years)].sort().reverse();
    } catch (error) { Logger.warn(`Impossible de récupérer les années MyGES: ${String(error)}`); }
    const current = Number(currentAcademicYear());
    return [String(current), String(current - 1)];
  }

  async getTeachers(year?: string, forceRefresh = false): Promise<MyGesTeacher[]> {
    const years = year ? [year] : await this.getAvailableYears(); const cacheKey = years.join(',');
    if (!forceRefresh && this.teachersCache?.years === cacheKey && this.teachersCache.expiresAt > Date.now()) return this.teachersCache.values;
    const responses = await Promise.allSettled(years.map(async (academicYear) => ({ academicYear, payload: await this.request<MyGesTeachersResponse>(`/me/${encodeURIComponent(academicYear)}/teachers`) })));
    const raw: Array<Record<string, unknown>> = [];
    for (const response of responses) {
      if (response.status === 'rejected') { Logger.warn(`Annuaire MyGES inaccessible pour une année: ${String(response.reason)}`); continue; }
      const items = response.value.payload.result || [];
      if (items.length && raw.length === 0) Logger.info(`Format annuaire MyGES détecté: ${Object.keys(items[0]).sort().join(', ')}`);
      raw.push(...items);
    }
    const byId = new Map<number, MyGesTeacher>();
    for (const item of raw) {
      const teacherId = Number(item.teacher_id ?? item.teacherId ?? item.uid ?? item.id ?? item.puid);
      const firstName = String(item.firstname ?? item.first_name ?? item.firstName ?? '').trim();
      const lastName = String(item.lastname ?? item.last_name ?? item.lastName ?? '').trim();
      if (Number.isSafeInteger(teacherId) && teacherId > 0 && firstName && lastName) byId.set(teacherId, { teacherId, firstName, lastName });
    }
    const values = [...byId.values()].sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr'));
    Logger.info(`Annuaire MyGES: ${raw.length} entrée(s) reçue(s), ${values.length} intervenant(s) exploitable(s), années ${cacheKey}.`);
    this.teachersCache = { years: cacheKey, expiresAt: Date.now() + (values.length ? 5 * 60_000 : 30_000), values };
    return values;
  }

  async getAgenda(start: Date, end: Date): Promise<Array<Record<string, unknown>>> {
    const startMs = start.getTime(); const endMs = end.getTime();
    const payload = await this.request<MyGesAgendaResponse>(`/me/agenda?start=${startMs}&end=${endMs}`);
    return payload.result || [];
  }

  async getUpcomingCourses(days = 120): Promise<MyGesCourse[]> {
    if (this.coursesCache && this.coursesCache.expiresAt > Date.now()) return this.coursesCache.values;
    const start = new Date(); const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const events = await this.getAgenda(start, end);
    const values = events.map((event) => {
      const discipline = event.discipline && typeof event.discipline === 'object' ? event.discipline as Record<string, unknown> : {};
      return {
        name: String(event.name || discipline.name || '').trim(),
        teacherId: Number(event.teacher_id || discipline.teacher_id),
        startAt: apiTimestamp(event.start_date),
        endAt: apiTimestamp(event.end_date) || null,
      };
    }).filter((course) => course.name && Number.isSafeInteger(course.teacherId) && course.teacherId > 0 && course.startAt > Date.now());
    this.coursesCache = { expiresAt: Date.now() + 5 * 60 * 1000, values };
    return values;
  }

  async validateOrNotify(discordUserId: string): Promise<boolean> {
    try { await this.request('/me/profile'); return true; }
    catch (error) {
      if ((error as Error).message !== 'MYGES_AUTH_REQUIRED') return false;
      if (!this.invalidNotificationSent && this.invalidCallback) { await this.invalidCallback(discordUserId); this.invalidNotificationSent = true; }
      return false;
    }
  }

  async notifySuccess(discordUserId: string): Promise<void> { if (this.successCallback) await this.successCallback(discordUserId); }
  private cleanupSessions(): void { for (const [id, session] of this.sessions) { if (session.expiresAt < Date.now()) this.sessions.delete(id); } }
}

export const myGesService = new MyGesService();

export function currentAcademicYear(date = new Date()): string {
  if (process.env.MYGES_YEAR) return process.env.MYGES_YEAR;
  return String(date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1);
}

export function defaultTeacherEmail(firstName: string, lastName: string): string {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  return `${normalize(firstName).charAt(0)}${normalize(lastName)}@myges.fr`;
}

function apiTimestamp(value: unknown): number {
  if (typeof value === 'number') return value < 10_000_000_000 ? value * 1000 : value;
  if (typeof value === 'string') { const numeric = Number(value); if (Number.isFinite(numeric)) return apiTimestamp(numeric); const parsed = Date.parse(value); return Number.isNaN(parsed) ? 0 : parsed; }
  return 0;
}

function extractYear(value: unknown): string | null {
  const candidate = typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>).year ?? (value as Record<string, unknown>).value ?? (value as Record<string, unknown>).id
    : value;
  const match = String(candidate ?? '').match(/20\d{2}/);
  return match?.[0] || null;
}
