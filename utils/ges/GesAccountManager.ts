import type { Client, User } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import Logger from '../Logger';
import { myGesService } from './MyGesService';
import { publicLoginUrl } from './webServer';

let validationTimer: NodeJS.Timeout | null = null;

export async function sendGesLoginRequest(user: User): Promise<void> {
  const sessionId = myGesService.createLoginSession(user.id);
  await user.send({ content: `La connexion MyGES du bot est absente ou a expiré. Reconnecte le compte avec ce lien à usage unique (valable 15 minutes) :\n${publicLoginUrl(sessionId)}\n\nNe transfère pas ce lien.` });
}

export async function initializeGesAccountManager(client: Client): Promise<void> {
  myGesService.setCallbacks({
    onInvalid: async (userId) => { const user = await client.users.fetch(userId); await sendGesLoginRequest(user); },
    onSuccess: async (userId) => { const user = await client.users.fetch(userId); await user.send('✅ La connexion MyGES a réussi. Le bot peut de nouveau accéder aux services MyGES.'); },
  });
  const validate = async () => {
    const userId = new ConfigRepository().getValue(CONFIG_KEYS.gesAccountUserId);
    if (!userId) return;
    try { await myGesService.validateOrNotify(userId); } catch (error) { Logger.error(`Notification MyGES impossible: ${String(error)}`); }
  };
  await validate();
  if (!validationTimer) validationTimer = setInterval(() => void validate(), 15 * 60 * 1000);
}
