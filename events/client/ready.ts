import { ActivityType } from 'discord.js';
import Logger from '../../utils/Logger';
import { ConfigRepository, migrateLegacyDatabase } from '../../utils/db';
import { startHomeworkReminder } from '../../utils/handlers/HomeworkReminder';
import { initializeGesAccountManager } from '../../utils/ges/GesAccountManager';
import { startPlanningReminder } from '../../utils/handlers/PlanningReminder';

export = {
  name: 'clientReady',
  once: true,
  async execute(client: any) {
    const guildsCount = await client.guilds.fetch();
    await migrateLegacyDatabase([...guildsCount.keys()]);
    for (const guild of guildsCount.values()) new ConfigRepository(guild.id).ensureDefaults();
    startHomeworkReminder(client);
    startPlanningReminder(client);
    await initializeGesAccountManager(client);

    client.user.setPresence({ activities: [{ name: 'You', type: ActivityType.Watching }], status: 'online' });

    await client.application.commands.set(client.commands.map((cmd: any) => cmd));
    Logger.client(
      `Bot prêt sur ${guildsCount.size} serveur(s)\n\n--------\n${process.env.DISCORD_BOT_NAME} ©2025\n--------\nAuteur:\n-Silvus\n--------\n`,
    );
  },
};
