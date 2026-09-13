import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { buildHomeworkEmbed, matchingChoices, parseFrenchDate } from '../../utils/homework';

const subjectOption = { name: 'matiere', description: 'Matière concernée', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };

export = {
  name: 'devoir', category: 'utils', ownerOnly: false,
  usage: 'devoir ajouter|liste|supprimer', examples: ['devoir liste'],
  defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  description: 'Consulter et gérer les devoirs du serveur.',
  options: [
    { name: 'liste', description: 'Afficher les devoirs à venir', type: ApplicationCommandOptionType.Subcommand },
    { name: 'ajouter', description: 'Ajouter un devoir', type: ApplicationCommandOptionType.Subcommand, options: [subjectOption,
      { name: 'date', description: 'Date au format JJ/MM/AAAA', type: ApplicationCommandOptionType.String, required: true },
      { name: 'type', description: 'Type de devoir', type: ApplicationCommandOptionType.String, required: true, choices: [
        { name: 'DM', value: 'DM' }, { name: 'Contrôle / Révision', value: 'Contrôle / Révision' }, { name: 'Devoir', value: 'Devoir' }, { name: 'Oral', value: 'Oral' },
      ] },
      { name: 'heure', description: 'Heure au format HH:mm', type: ApplicationCommandOptionType.String },
      { name: 'description', description: 'Consignes ou précisions', type: ApplicationCommandOptionType.String },
      { name: 'ressource', description: 'Lien vers une ressource', type: ApplicationCommandOptionType.String },
    ] },
    { name: 'supprimer', description: 'Supprimer un devoir', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'devoir', description: 'Devoir concerné', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true },
    ] },
  ],
  async autocomplete(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.respond([]);
    const repo = new AcademicRepository(); const focused = interaction.options.getFocused(true);
    const choices = focused.name === 'matiere'
      ? matchingChoices(repo.listSubjects(), x => x.name, focused.value)
      : matchingChoices(repo.listUpcomingHomework(), x => `${x.subjectName} — ${x.type} (${new Date(x.dueAt * 1000).toLocaleDateString('fr-FR')})`, focused.value);
    return interaction.respond(choices);
  },
  async runInteraction(client: any, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new AcademicRepository(); const action = interaction.options.getSubcommand();
    if (action === 'liste') return interaction.reply({ embeds: [buildHomeworkEmbed(client)] });
    if (action === 'supprimer') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: 'La permission Gérer les salons est requise.', ephemeral: true });
      const changes = repo.deleteHomework(interaction.options.getInteger('devoir', true));
      return interaction.reply({ content: changes ? 'Devoir supprimé.' : 'Devoir introuvable.', ephemeral: true });
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: 'La permission Gérer les salons est requise.', ephemeral: true });
    const subjectId = interaction.options.getInteger('matiere', true);
    if (!repo.getSubject(subjectId)) return interaction.reply({ content: 'Matière introuvable.', ephemeral: true });
    const dueAt = parseFrenchDate(interaction.options.getString('date', true), interaction.options.getString('heure') || '00:00');
    if (!dueAt || dueAt <= Date.now() / 1000) return interaction.reply({ content: 'Date invalide ou déjà passée. Utilise JJ/MM/AAAA et éventuellement HH:mm.', ephemeral: true });
    const resourceUrl = interaction.options.getString('ressource')?.trim();
    if (resourceUrl) { try { new URL(resourceUrl); } catch { return interaction.reply({ content: 'Le lien de ressource est invalide.', ephemeral: true }); } }
    repo.addHomework({ subjectId, type: interaction.options.getString('type', true), description: interaction.options.getString('description')?.trim(), resourceUrl, dueAt, createdBy: interaction.user.id });
    return interaction.reply({ content: `Devoir ajouté pour <t:${dueAt}:f> (<t:${dueAt}:R>).`, ephemeral: true });
  },
};
