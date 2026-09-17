import { PermissionFlagsBits } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../../utils/db';
import { weekStart } from '../../utils/ges/planning';
import { publishWeeklyPlanning } from '../../utils/handlers/PlanningReminder';

export = {
  name: 'planning', category: 'admin', ownerOnly: false,
  usage: 'planning', examples: ['planning'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Publier ou actualiser le planning de la semaine en cours.',
  async runInteraction(client: any, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    if (!new ConfigRepository(interaction.guildId).getValue(CONFIG_KEYS.planningChannelId)) {
      return interaction.reply({ content: 'Configure d’abord le salon du planning avec `/config`.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await publishWeeklyPlanning(client, interaction.guildId, weekStart());
      return interaction.editReply(result === 'updated' ? 'Planning de la semaine actualisé.' : 'Planning de la semaine envoyé.');
    } catch (error) {
      const message = (error as Error).message === 'MYGES_AUTH_REQUIRED'
        ? 'Connexion MyGES requise pour récupérer le planning.'
        : 'Impossible d’envoyer le planning. Vérifie le salon et les permissions du bot.';
      return interaction.editReply(message);
    }
  },
};
