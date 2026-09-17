import { ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';
import { ConfigRepository, CONFIG_KEYS } from '../../utils/db';
import { refreshHomeworkReminder } from '../../utils/handlers/HomeworkReminder';
import { refreshPlanningReminder } from '../../utils/handlers/PlanningReminder';
import { parseWeeklyCron } from '../../utils/handlers/schedule';

const allowedKeys = [CONFIG_KEYS.customCommandPrefix, CONFIG_KEYS.homeworkChannelId,
  CONFIG_KEYS.homeworkReminderEnabled, CONFIG_KEYS.homeworkReminderCron,
  CONFIG_KEYS.planningChannelId, CONFIG_KEYS.planningCron] as const;
const cronHelp = 'Format hebdomadaire : `minute heure * * jour` (heure de Paris, jour 0=dimanche à 6=samedi). Exemple : `30 17 * * 5` = vendredi à 17h30.';
const scheduleLabel = (key: string, value: string) =>
  key === CONFIG_KEYS.homeworkReminderCron || key === CONFIG_KEYS.planningCron
    ? ` — ${parseWeeklyCron(value)?.label || 'horaire invalide'}` : '';

export = {
  name: 'config',
  category: 'admin',
  ownerOnly: false,
  usage: 'config set [key] [value]',
  examples: ['config set customCommandPrefix !', 'config get customCommandPrefix'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Lire ou modifier la configuration et les horaires hebdomadaires du serveur.',
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
        { name: 'Horaire des devoirs (cron hebdomadaire)', value: CONFIG_KEYS.homeworkReminderCron },
        { name: 'Salon du planning', value: CONFIG_KEYS.planningChannelId },
        { name: 'Horaire du planning (cron hebdomadaire)', value: CONFIG_KEYS.planningCron },
      ],
    },
    {
      name: 'value',
      description: 'Valeur ; horaire : minute heure * * jour (ex. 30 17 * * 5)',
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
      const formatted = rows.map((row) => `- \`${row.key}\` = \`${row.value}\`${scheduleLabel(row.key, row.value)}`).join('\n');
      return interaction.reply({ content: `${formatted || 'Aucune config trouvée.'}\n\n${cronHelp}`, ephemeral: true });
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
        content: row ? `\`${row.key}\` = \`${row.value}\`${scheduleLabel(row.key, row.value)}${validatedKey === CONFIG_KEYS.homeworkReminderCron || validatedKey === CONFIG_KEYS.planningCron ? `\n${cronHelp}` : ''}` : 'Aucune valeur trouvée.',
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

      const isCronKey = validatedKey === CONFIG_KEYS.homeworkReminderCron || validatedKey === CONFIG_KEYS.planningCron;
      const parsed = isCronKey ? parseWeeklyCron(effectiveValue) : null;
      if (isCronKey && !parsed) return interaction.reply({ content: `Horaire invalide. ${cronHelp}`, ephemeral: true });

      const updated = configRepository.upsert(validatedKey, parsed?.expression || effectiveValue);
      if (validatedKey === CONFIG_KEYS.homeworkReminderCron) refreshHomeworkReminder(client, interaction.guildId);
      if (validatedKey === CONFIG_KEYS.planningCron) refreshPlanningReminder(client, interaction.guildId);
      return interaction.reply({
        content: `Config mise à jour: \`${updated?.key}\` = \`${updated?.value}\`${parsed ? ` — ${parsed.label}` : ''}`,
        ephemeral: true,
      });
    }

    return interaction.reply({ content: "Action inconnue. Utilise `set`, `get` ou `list`.", ephemeral: true });
  },
};
