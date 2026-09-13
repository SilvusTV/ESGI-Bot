import { randomUUID } from 'crypto';

const AUTH_URL = 'https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app';
const API_URL = 'https://api.kordis.fr';
const LOGIN_TTL_MS = 15 * 60 * 1000;

type LoginSession = { discordUserId: string; expiresAt: number; attempts: number };

export class MyGesService {
  private accessToken: string | null = null;
  private sessions = new Map<string, LoginSession>();
  private invalidCallback?: (userId: string) => Promise<void>;
  private successCallback?: (userId: string) => Promise<void>;
  private invalidNotificationSent = false;

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
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.accessToken) throw new Error('MYGES_AUTH_REQUIRED');
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    if (response.status === 401 || response.status === 403) { this.accessToken = null; throw new Error('MYGES_AUTH_REQUIRED'); }
    if (!response.ok) throw new Error(`MyGES API ${response.status}`);
    return response.json() as Promise<T>;
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
