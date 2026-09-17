import type { Client, User } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../db';
import Logger from '../Logger';
import { createGuildLoginSession, getMyGesService } from './MyGesService';
import { publicLoginUrl } from './webServer';

let validationTimer: NodeJS.Timeout | null = null;

export async function sendGesLoginRequest(user: User, guildId: string): Promise<void> {
  const sessionId = createGuildLoginSession(guildId, user.id);
  await user.send({ content: `La connexion MyGES du bot est absente ou a expiré. Reconnecte le compte avec ce lien à usage unique (valable 15 minutes) :\n${publicLoginUrl(sessionId)}\n\nNe transfère pas ce lien.` });
}

export async function initializeGesAccountManager(client: Client): Promise<void> {
  const validate = async () => {
    for (const guild of client.guilds.cache.values()) {
      const guildId = guild.id;
      const userId = new ConfigRepository(guildId).getValue(CONFIG_KEYS.gesAccountUserId);
      if (!userId) continue;
      const service = getMyGesService(guildId);
      service.setCallbacks({
        onInvalid: async (id) => { const user = await client.users.fetch(id); await sendGesLoginRequest(user, guildId); },
        onSuccess: async (id) => { const user = await client.users.fetch(id); await user.send(`✅ La connexion MyGES a réussi pour ${guild.name}.`); },
      });
      try { await service.validateOrNotify(userId); } catch (error) { Logger.error(`Notification MyGES ${guildId} impossible: ${String(error)}`); }
    }
  };
  await validate();
  if (!validationTimer) validationTimer = setInterval(() => void validate(), 15 * 60 * 1000);
}
