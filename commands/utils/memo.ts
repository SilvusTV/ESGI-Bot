import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { EMBED_COLOR } from '../../utils/homework';

export = {
  name: 'memo', category: 'utils', ownerOnly: false, usage: 'memo', examples: ['memo'],
  defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  description: 'Afficher les matières et les coordonnées des intervenants.',
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const rows = new AcademicRepository().listSubjects();
    const content = rows.map(x => `**${x.name}**\n${x.teacherFirstName || 'Intervenant'} ${x.teacherLastName || 'non assigné'}${x.teacherEmail ? `\n\`${x.teacherEmail}\`` : ''}`).join('\n\n');
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Mémo des intervenants').setURL('https://myges.fr/student/student-teacher-directory').setDescription(content.slice(0, 4096) || 'Aucune matière enregistrée.');
    return interaction.reply({ embeds: [embed] });
  },
};
