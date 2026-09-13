import { ActivityType } from 'discord.js';
import Logger from '../../utils/Logger';
import { ConfigRepository, ensureDatabaseInitialized } from '../../utils/db';

export = {
  name: 'clientReady',
  once: true,
  async execute(client: any) {
    // Ensure DB exists and is initialized from schema if missing
    await ensureDatabaseInitialized();
    const configRepository = new ConfigRepository();
    const guildsCount = await client.guilds.fetch();

    guildsCount.forEach((guild: any) => {
      configRepository.ensureDefaultGuildConfig(guild.id);
    });

    client.user.setPresence({ activities: [{ name: 'You', type: ActivityType.Watching }], status: 'online' });

    await client.application.commands.set(client.commands.map((cmd: any) => cmd));
    Logger.client(
      `Bot ready on ${guildsCount.size} servers\n\n--------\n${process.env.DISCORD_BOT_NAME} ©2025\n--------\nAuthor:\n-Silvus\n--------\n`,
    );
  },
};
