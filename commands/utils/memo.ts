import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { EMBED_COLOR, matchingChoices } from '../../utils/homework';

export = {
  name: 'memo', category: 'utils', ownerOnly: false, usage: 'memo [intervenant]', examples: ['memo', 'memo intervenant'],
  defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  description: 'Afficher les coordonnées et matières d’un intervenant.',
  options: [{ name: 'intervenant', description: 'Afficher uniquement cet intervenant', type: ApplicationCommandOptionType.Integer, required: false, autocomplete: true }],
  async autocomplete(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.respond([]);
    const focused = interaction.options.getFocused(); const rows = new AcademicRepository(interaction.guildId).listTeachers();
    return interaction.respond(matchingChoices(rows, item => `${item.firstName} ${item.lastName}`, focused));
  },
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new AcademicRepository(interaction.guildId); const teacherId = interaction.options.getInteger('intervenant');
    if (teacherId !== null) {
      const selected = repo.getTeacher(teacherId);
      if (!selected) return interaction.reply({ content: 'Intervenant introuvable.', ephemeral: true });
      const subjects = repo.listSubjects().filter(item => item.teacherId === teacherId).map(item => item.name);
      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(`${selected.firstName} ${selected.lastName}`)
        .setURL('https://myges.fr/student/student-teacher-directory')
        .setDescription(`**E-mail**\n\`${selected.email}\`\n\n**Matières**\n${subjects.length ? subjects.join('\n') : 'Aucune matière associée.'}`);
      return interaction.reply({ embeds: [embed] });
    }
    const teachers = repo.listTeachers();
    const subjects = repo.listSubjects();
    const entries = teachers.map(item => {
      const names = subjects.filter(subject => subject.teacherId === item.id).map(subject => subject.name);
      return `**${item.firstName} ${item.lastName}**\n\`${item.email}\`\n${names.length ? names.join(', ') : 'Aucune matière associée.'}`;
    });
    if (!entries.length) return interaction.reply({ content: 'Aucun intervenant enregistré.' });

    const pages: string[] = [];
    let page = '';
    for (const entry of entries) {
      if (page && page.length + entry.length + 2 > 4000) {
        pages.push(page);
        page = '';
      }
      page += `${page ? '\n\n' : ''}${entry}`;
    }
    if (page) pages.push(page);
    for (const [index, description] of pages.entries()) {
      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(`Mémo des intervenants${pages.length > 1 ? ` (${index + 1}/${pages.length})` : ''}`)
        .setURL('https://myges.fr/student/student-teacher-directory').setDescription(description.slice(0, 4096));
      if (index === 0) await interaction.reply({ embeds: [embed] });
      else await interaction.followUp({ embeds: [embed] });
    }
  },
};
