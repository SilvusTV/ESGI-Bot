import { ConfigRepository } from '../../utils/db';

export = {
  name: 'guildCreate',
  once: false,
  async execute(client: any, guild: any) {
    const configRepository = new ConfigRepository();
    configRepository.ensureDefaultGuildConfig(guild.id);
  },
};

