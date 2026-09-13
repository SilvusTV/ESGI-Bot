import { PermissionFlagsBits } from 'discord.js';

export = {
  name: 'reload',
  category: 'moderation',
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  ownerOnly: false,
  usage: 'reload',
  examples: 'reload',
  description: 'Ajouter de la configuration à la base de donée.',
  async runInteraction(client: any, interaction: any) {
    const embedResponse = {
      color: 0x735b8b,
      description: `Le bot à bien été relancé`,
    };
    await interaction.reply({ embeds: [embedResponse], ephemeral: true });
    return process.exit();
  },
};
