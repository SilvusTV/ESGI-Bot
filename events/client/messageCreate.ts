import { ConfigRepository, CONFIG_KEYS, CustomCommandRepository } from '../../utils/db';

export = {
  name: 'messageCreate',
  once: false,
  async execute(client: any, message: any) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const configRepository = new ConfigRepository();
    configRepository.ensureDefaultGuildConfig(message.guild.id);

    const prefix = configRepository.getValue(message.guild.id, CONFIG_KEYS.customCommandPrefix) || '!';
    if (!message.content.startsWith(prefix)) {
      return;
    }

    const raw = message.content.slice(prefix.length).trim();
    if (!raw.length) {
      return;
    }

    const commandName = raw.split(/\s+/)[0];
    const customCommandRepository = new CustomCommandRepository();
    const command = customCommandRepository.findByCommand(message.guild.id, commandName);

    if (!command || !command.isActive) {
      return;
    }

    await message.reply({ content: command.response });
  },
};

