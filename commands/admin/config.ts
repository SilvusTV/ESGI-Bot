import { ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';
import { ConfigRepository, CONFIG_KEYS } from '../../utils/db';

const allowedKeys = [CONFIG_KEYS.customCommandPrefix, CONFIG_KEYS.homeworkChannelId,
  CONFIG_KEYS.homeworkReminderEnabled, CONFIG_KEYS.planningChannelId] as const;

export = {
  name: 'config',
  category: 'admin',
  ownerOnly: false,
  usage: 'config set [key] [value]',
  examples: ['config set customCommandPrefix !', 'config get customCommandPrefix'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Lire ou modifier la configuration du bot.',
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
      choices: [
        { name: 'Préfixe des commandes personnalisées', value: CONFIG_KEYS.customCommandPrefix },
        { name: 'Salon des rappels de devoirs', value: CONFIG_KEYS.homeworkChannelId },
        { name: 'Rappels de devoirs activés', value: CONFIG_KEYS.homeworkReminderEnabled },
        { name: 'Salon du planning', value: CONFIG_KEYS.planningChannelId },
      ],
    },
    {
      name: 'value',
      description: 'Nouvelle valeur',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: 'channel',
      description: 'Salon à utiliser pour une configuration de salon',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText],
      required: false,
    },
  ],
  async runInteraction(client: any, interaction: any) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
    }

    const configRepository = new ConfigRepository(interaction.guildId);
    configRepository.ensureDefaults();

    const action = interaction.options.getString('action', true);
    const key = interaction.options.getString('key');
    const value = interaction.options.getString('value');
    const channel = interaction.options.getChannel('channel');

    if (action === 'list') {
      const rows = configRepository.list();
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
      const row = configRepository.find(validatedKey);
      return interaction.reply({
        content: row ? `\`${row.key}\` = \`${row.value}\`` : 'Aucune valeur trouvée.',
        ephemeral: true,
      });
    }

    if (action === 'set') {
      const isChannelKey = validatedKey === CONFIG_KEYS.planningChannelId || validatedKey === CONFIG_KEYS.homeworkChannelId;
      if (isChannelKey && channel?.guildId !== interaction.guildId) {
        return interaction.reply({ content: 'Choisis un salon de ce serveur.', ephemeral: true });
      }
      const effectiveValue = isChannelKey ? channel?.id : value?.trim();
      if (!effectiveValue) {
        if (isChannelKey) {
          return interaction.reply({ content: 'Choisis le salon avec l’option `channel`.', ephemeral: true });
        }
        return interaction.reply({ content: 'La valeur est obligatoire pour `set`.', ephemeral: true });
      }

      if (validatedKey === CONFIG_KEYS.customCommandPrefix && value.trim().length > 5) {
        return interaction.reply({
          content: 'Le prefix doit faire 1 à 5 caractères pour rester lisible.',
          ephemeral: true,
        });
      }

      if (validatedKey === CONFIG_KEYS.homeworkReminderEnabled && !['true', 'false'].includes(value.trim())) {
        return interaction.reply({ content: 'Cette valeur doit être `true` ou `false`.', ephemeral: true });
      }

      const updated = configRepository.upsert(validatedKey, effectiveValue);
      return interaction.reply({
        content: `Config mise à jour: \`${updated?.key}\` = \`${updated?.value}\``,
        ephemeral: true,
      });
    }

    return interaction.reply({ content: "Action inconnue. Utilise `set`, `get` ou `list`.", ephemeral: true });
  },
};
