import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { CONFIG_KEYS, ConfigRepository } from '../../utils/db';
import { sendGesLoginRequest } from '../../utils/ges/GesAccountManager';
import { myGesService } from '../../utils/ges/MyGesService';

export = {
  name: 'gesaccount', category: 'admin', ownerOnly: false,
  usage: 'gesaccount configurer|reconnecter|statut', examples: ['gesaccount configurer @utilisateur'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Gérer la personne responsable de la connexion MyGES.',
  options: [
    { name: 'configurer', description: 'Choisir la personne responsable du compte MyGES', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'utilisateur', description: 'Personne qui recevra le lien de reconnexion', type: ApplicationCommandOptionType.User, required: true },
    ] },
    { name: 'reconnecter', description: 'Renvoyer immédiatement un lien de connexion', type: ApplicationCommandOptionType.Subcommand },
    { name: 'statut', description: 'Afficher l’état de la connexion en mémoire', type: ApplicationCommandOptionType.Subcommand },
  ],
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new ConfigRepository(); const action = interaction.options.getSubcommand();
    if (action === 'statut') return interaction.reply({ content: myGesService.hasToken() ? '✅ Le compte MyGES est connecté.' : '⚠️ Aucun token MyGES valide en mémoire.', ephemeral: true });
    let user;
    if (action === 'configurer') {
      user = interaction.options.getUser('utilisateur', true);
      if (user.bot) return interaction.reply({ content: 'Choisis une personne, pas un bot.', ephemeral: true });
      repo.upsert(CONFIG_KEYS.gesAccountUserId, user.id);
    } else {
      const userId = repo.getValue(CONFIG_KEYS.gesAccountUserId);
      if (!userId) return interaction.reply({ content: 'Configure d’abord un responsable avec `/gesaccount configurer`.', ephemeral: true });
      user = await interaction.client.users.fetch(userId);
    }
    try { await sendGesLoginRequest(user); myGesService.markLoginRequested(); }
    catch { return interaction.reply({ content: 'Impossible d’envoyer un message privé. La personne doit autoriser les MP du serveur.', ephemeral: true }); }
    return interaction.reply({ content: `Lien de connexion envoyé en privé à ${user}.`, ephemeral: true });
  },
};
