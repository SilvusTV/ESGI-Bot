import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { EMBED_COLOR, matchingChoices } from '../../utils/homework';

const teacherOption = { name: 'intervenant', description: 'Intervenant concerné', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };

export = {
  name: 'intervenant', category: 'admin', ownerOnly: false,
  usage: 'intervenant ajouter|modifier|supprimer|liste', examples: ['intervenant liste'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Gérer les intervenants du serveur.',
  options: [
    { name: 'ajouter', description: 'Ajouter un intervenant', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'prenom', description: 'Prénom', type: ApplicationCommandOptionType.String, required: true },
      { name: 'nom', description: 'Nom', type: ApplicationCommandOptionType.String, required: true },
      { name: 'email', description: 'Adresse e-mail', type: ApplicationCommandOptionType.String, required: true },
    ] },
    { name: 'modifier', description: 'Modifier un intervenant', type: ApplicationCommandOptionType.Subcommand, options: [teacherOption,
      { name: 'prenom', description: 'Nouveau prénom', type: ApplicationCommandOptionType.String },
      { name: 'nom', description: 'Nouveau nom', type: ApplicationCommandOptionType.String },
      { name: 'email', description: 'Nouvelle adresse e-mail', type: ApplicationCommandOptionType.String },
    ] },
    { name: 'supprimer', description: 'Supprimer un intervenant', type: ApplicationCommandOptionType.Subcommand, options: [teacherOption] },
    { name: 'liste', description: 'Lister les intervenants', type: ApplicationCommandOptionType.Subcommand },
  ],
  async autocomplete(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.respond([]);
    const focused = interaction.options.getFocused();
    const rows = new AcademicRepository().listTeachers();
    return interaction.respond(matchingChoices(rows, (x) => `${x.firstName} ${x.lastName}`, focused));
  },
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new AcademicRepository(); const action = interaction.options.getSubcommand();
    if (action === 'ajouter') {
      const email = interaction.options.getString('email', true).trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return interaction.reply({ content: 'Adresse e-mail invalide.', ephemeral: true });
      const row = repo.addTeacher(interaction.options.getString('prenom', true).trim(), interaction.options.getString('nom', true).trim(), email);
      return interaction.reply({ content: `Intervenant ajouté : **${row.firstName} ${row.lastName}**.`, ephemeral: true });
    }
    if (action === 'liste') {
      const rows = repo.listTeachers();
      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Intervenants').setDescription(rows.length ? rows.map(x => `**${x.firstName} ${x.lastName}** — \`${x.email}\``).join('\n') : 'Aucun intervenant enregistré.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const id = interaction.options.getInteger('intervenant', true);
    if (!repo.getTeacher(id)) return interaction.reply({ content: 'Intervenant introuvable.', ephemeral: true });
    if (action === 'supprimer') { repo.deleteTeacher(id); return interaction.reply({ content: 'Intervenant supprimé.', ephemeral: true }); }
    const values = { firstName: interaction.options.getString('prenom')?.trim() || undefined, lastName: interaction.options.getString('nom')?.trim() || undefined, email: interaction.options.getString('email')?.trim() || undefined };
    if (!Object.values(values).some(Boolean)) return interaction.reply({ content: 'Indique au moins une valeur à modifier.', ephemeral: true });
    repo.updateTeacher(id, values); return interaction.reply({ content: 'Intervenant mis à jour.', ephemeral: true });
  },
};
