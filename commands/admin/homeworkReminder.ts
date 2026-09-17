import { ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../../utils/db';
import { buildHomeworkEmbed } from '../../utils/homework';

export = {
  name: 'rappeldevoir', category: 'admin', ownerOnly: false,
  usage: 'rappeldevoir configurer|envoyer', examples: ['rappeldevoir configurer'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Configurer ou envoyer le rappel hebdomadaire des devoirs.',
  options: [
    { name: 'configurer', description: 'Configurer le rappel automatique', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'active', description: 'Activer le rappel du samedi à 10h', type: ApplicationCommandOptionType.Boolean, required: true },
      { name: 'salon', description: 'Salon de destination', type: ApplicationCommandOptionType.Channel, channelTypes: [ChannelType.GuildText], required: false },
    ] },
    { name: 'envoyer', description: 'Envoyer immédiatement le rappel', type: ApplicationCommandOptionType.Subcommand },
  ],
  async runInteraction(client: any, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new ConfigRepository(interaction.guildId); repo.ensureDefaults();
    if (interaction.options.getSubcommand() === 'configurer') {
      const active = interaction.options.getBoolean('active', true);
      const channel = interaction.options.getChannel('salon');
      if (channel && channel.guildId !== interaction.guildId) return interaction.reply({ content: 'Choisis un salon de ce serveur.', ephemeral: true });
      const existing = repo.getValue(CONFIG_KEYS.homeworkChannelId);
      if (active && !channel && !existing) return interaction.reply({ content: 'Choisis un salon avant d’activer les rappels.', ephemeral: true });
      if (channel) repo.upsert(CONFIG_KEYS.homeworkChannelId, channel.id);
      repo.upsert(CONFIG_KEYS.homeworkReminderEnabled, String(active));
      return interaction.reply({ content: `Rappels ${active ? 'activés' : 'désactivés'}${channel ? ` dans ${channel}` : ''}.`, ephemeral: true });
    }
    const channelId = repo.getValue(CONFIG_KEYS.homeworkChannelId);
    if (!channelId) return interaction.reply({ content: 'Aucun salon de rappel configuré.', ephemeral: true });
    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Le salon configuré est introuvable.', ephemeral: true });
    const until = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await channel.send({ embeds: [buildHomeworkEmbed(client, interaction.guildId, until)] });
    return interaction.reply({ content: `Rappel envoyé dans <#${channelId}>.`, ephemeral: true });
  },
};
