import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { ConfigRepository, CONFIG_KEYS } from '../../utils/db';

const allowedKeys = Object.values(CONFIG_KEYS);

export = {
  name: 'config',
  category: 'admin',
  ownerOnly: false,
  usage: 'config set [key] [value]',
  examples: ['config set customCommandPrefix !', 'config get customCommandPrefix'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Lire ou modifier la configuration de la guilde.',
  options: [
    {
      name: 'action',
      description: 'Action à exécuter',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'set', value: 'set' },
        { name: 'get', value: 'get' },
        { name: 'list', value: 'list' },
      ],
    },
    {
      name: 'key',
      description: 'Clé de configuration',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [{ name: 'customCommandPrefix', value: CONFIG_KEYS.customCommandPrefix }],
    },
    {
      name: 'value',
      description: 'Nouvelle valeur',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  async runInteraction(client: any, interaction: any) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
    }

    const configRepository = new ConfigRepository();
    configRepository.ensureDefaultGuildConfig(interaction.guildId);

    const action = interaction.options.getString('action', true);
    const key = interaction.options.getString('key');
    const value = interaction.options.getString('value');

    if (action === 'list') {
      const rows = configRepository.listByGuild(interaction.guildId);
      const formatted = rows.map((row) => `- \`${row.key}\` = \`${row.value}\``).join('\n');
      return interaction.reply({ content: formatted || 'Aucune config trouvée.', ephemeral: true });
    }

    if (!key || !allowedKeys.includes(key)) {
      return interaction.reply({
        content: `La clé est obligatoire. Clés disponibles: ${allowedKeys.map((k) => `\`${k}\``).join(', ')}`,
        ephemeral: true,
      });
    }
    const validatedKey = key as (typeof allowedKeys)[number];

    if (action === 'get') {
      const row = configRepository.find(interaction.guildId, validatedKey);
      return interaction.reply({
        content: row ? `\`${row.key}\` = \`${row.value}\`` : 'Aucune valeur trouvée.',
        ephemeral: true,
      });
    }

    if (action === 'set') {
      if (!value || !value.trim().length) {
        return interaction.reply({ content: 'La valeur est obligatoire pour `set`.', ephemeral: true });
      }

      if (validatedKey === CONFIG_KEYS.customCommandPrefix && value.trim().length > 5) {
        return interaction.reply({
          content: 'Le prefix doit faire 1 à 5 caractères pour rester lisible.',
          ephemeral: true,
        });
      }

      const updated = configRepository.upsert(interaction.guildId, validatedKey, value.trim());
      return interaction.reply({
        content: `Config mise à jour: \`${updated?.key}\` = \`${updated?.value}\``,
        ephemeral: true,
      });
    }

    return interaction.reply({ content: "Action inconnue. Utilise `set`, `get` ou `list`.", ephemeral: true });
  },
};
