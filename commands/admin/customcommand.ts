import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { CustomCommandRepository } from '../../utils/db';

export = {
  name: 'customcommand',
  category: 'admin',
  ownerOnly: false,
  usage: 'customcommand [create|list|update|delete]',
  examples: [
    'customcommand create',
    'customcommand list',
    'customcommand update',
    'customcommand delete',
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Gérer les commandes custom du serveur.',
  options: [
    {
      name: 'create',
      description: 'Créer une commande custom',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title',
          description: 'Titre lisible',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'command',
          description: 'Commande préfixe (sans le prefix, ex: regles)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'description',
          description: 'Description interne',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'response',
          description: 'Réponse envoyée par le bot',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'list',
      description: 'Lister les commandes custom',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'update',
      description: 'Modifier une commande custom existante',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'command',
          description: 'Commande cible',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'title',
          description: 'Nouveau titre',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'description',
          description: 'Nouvelle description',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'response',
          description: 'Nouvelle réponse',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'active',
          description: 'Activer/Désactiver la commande',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: 'delete',
      description: 'Supprimer une commande custom',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'command',
          description: 'Commande à supprimer',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  async runInteraction(client: any, interaction: any) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
    }

    const repository = new CustomCommandRepository();
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'create') {
      const title = interaction.options.getString('title', true).trim();
      const command = interaction.options.getString('command', true).trim();
      const description = interaction.options.getString('description', true).trim();
      const response = interaction.options.getString('response', true);

      if (!/^[a-zA-Z0-9_-]{1,32}$/.test(command)) {
        return interaction.reply({
          content: 'Le nom de commande doit contenir uniquement lettres/chiffres/_/- (32 max).',
          ephemeral: true,
        });
      }

      const exists = repository.findByCommand(interaction.guildId, command);
      if (exists) {
        return interaction.reply({ content: 'Cette commande existe déjà.', ephemeral: true });
      }

      const created = repository.create({
        guildId: interaction.guildId,
        title,
        command,
        description,
        response,
      });

      return interaction.reply({
        content: `Commande créée: \`${created?.command}\` (${created?.title})`,
        ephemeral: true,
      });
    }

    if (subcommand === 'list') {
      const rows = repository.listByGuild(interaction.guildId);
      if (!rows.length) {
        return interaction.reply({ content: 'Aucune commande custom pour ce serveur.', ephemeral: true });
      }

      const content = rows
        .slice(0, 25)
        .map((row) => `- \`${row.command}\` | ${row.title} | active: ${row.isActive ? 'oui' : 'non'}`)
        .join('\n');

      return interaction.reply({ content, ephemeral: true });
    }

    if (subcommand === 'update') {
      const command = interaction.options.getString('command', true);
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const response = interaction.options.getString('response');
      const isActive = interaction.options.getBoolean('active');

      if (!title && !description && !response && isActive === null) {
        return interaction.reply({
          content: 'Aucune modification fournie. Donne au moins un champ à mettre à jour.',
          ephemeral: true,
        });
      }

      const changes = repository.update(interaction.guildId, command, {
        title: title || undefined,
        description: description || undefined,
        response: response || undefined,
        isActive: isActive === null ? undefined : isActive,
      });

      if (!changes) {
        return interaction.reply({ content: 'Commande introuvable.', ephemeral: true });
      }

      return interaction.reply({ content: 'Commande custom mise à jour.', ephemeral: true });
    }

    if (subcommand === 'delete') {
      const command = interaction.options.getString('command', true);
      const changes = repository.delete(interaction.guildId, command);
      if (!changes) {
        return interaction.reply({ content: 'Commande introuvable.', ephemeral: true });
      }

      return interaction.reply({ content: 'Commande custom supprimée.', ephemeral: true });
    }

    return interaction.reply({ content: 'Sous-commande invalide.', ephemeral: true });
  },
};

