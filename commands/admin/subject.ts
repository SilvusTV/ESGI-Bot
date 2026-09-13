import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { EMBED_COLOR, matchingChoices } from '../../utils/homework';

const subjectOption = { name: 'matiere', description: 'Matière concernée', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };
const teacherOption = { name: 'intervenant', description: 'Intervenant associé', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };

export = {
  name: 'matiere', category: 'admin', ownerOnly: false,
  usage: 'matiere ajouter|modifier|supprimer|liste', examples: ['matiere liste'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Gérer les matières du serveur.',
  options: [
    { name: 'ajouter', description: 'Ajouter une matière', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'nom', description: 'Nom de la matière', type: ApplicationCommandOptionType.String, required: true }, teacherOption,
    ] },
    { name: 'modifier', description: 'Modifier une matière', type: ApplicationCommandOptionType.Subcommand, options: [subjectOption,
      { name: 'nom', description: 'Nouveau nom', type: ApplicationCommandOptionType.String },
      { ...teacherOption, required: false },
    ] },
    { name: 'supprimer', description: 'Supprimer une matière et ses devoirs', type: ApplicationCommandOptionType.Subcommand, options: [subjectOption] },
    { name: 'liste', description: 'Lister les matières', type: ApplicationCommandOptionType.Subcommand },
  ],
  async autocomplete(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.respond([]);
    const repo = new AcademicRepository(); const focused = interaction.options.getFocused(true);
    const choices = focused.name === 'intervenant'
      ? matchingChoices(repo.listTeachers(), x => `${x.firstName} ${x.lastName}`, focused.value)
      : matchingChoices(repo.listSubjects(), x => x.name, focused.value);
    return interaction.respond(choices);
  },
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new AcademicRepository(); const action = interaction.options.getSubcommand();
    if (action === 'liste') {
      const rows = repo.listSubjects();
      const description = rows.map(x => `**${x.name}**${x.teacherLastName ? ` — ${x.teacherFirstName} ${x.teacherLastName}` : ''}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Matières').setDescription(description || 'Aucune matière enregistrée.')], ephemeral: true });
    }
    if (action === 'ajouter') {
      const teacherId = interaction.options.getInteger('intervenant', true);
      if (!repo.getTeacher(teacherId)) return interaction.reply({ content: 'Intervenant introuvable.', ephemeral: true });
      const row = repo.addSubject(interaction.options.getString('nom', true).trim(), teacherId);
      return interaction.reply({ content: `Matière ajoutée : **${row.name}**.`, ephemeral: true });
    }
    const id = interaction.options.getInteger('matiere', true);
    if (!repo.getSubject(id)) return interaction.reply({ content: 'Matière introuvable.', ephemeral: true });
    if (action === 'supprimer') { repo.deleteSubject(id); return interaction.reply({ content: 'Matière et devoirs associés supprimés.', ephemeral: true }); }
    const teacherId = interaction.options.getInteger('intervenant');
    if (teacherId !== null && !repo.getTeacher(teacherId)) return interaction.reply({ content: 'Intervenant introuvable.', ephemeral: true });
    const name = interaction.options.getString('nom')?.trim();
    if (!name && teacherId === null) return interaction.reply({ content: 'Indique au moins une valeur à modifier.', ephemeral: true });
    repo.updateSubject(id, { name: name || undefined, teacherId: teacherId ?? undefined });
    return interaction.reply({ content: 'Matière mise à jour.', ephemeral: true });
  },
};
