import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { defaultTeacherEmail, myGesService } from '../../utils/ges/MyGesService';
import { EMBED_COLOR, matchingChoices } from '../../utils/homework';

const teacherOption = { name: 'intervenant', description: 'Intervenant concerné', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };

export = {
  name: 'intervenant', category: 'admin', ownerOnly: false,
  usage: 'intervenant ajouter|modifier|supprimer|liste', examples: ['intervenant ajouter', 'intervenant modifier'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Gérer les intervenants à partir de l’annuaire MyGES.',
  options: [
    { name: 'ajouter', description: 'Ajouter un intervenant proposé par MyGES', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'prof_myges', description: 'Intervenant MyGES à ajouter', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true },
      { name: 'email', description: 'Adresse e-mail (générée automatiquement si absente)', type: ApplicationCommandOptionType.String, required: false },
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
    const focused = interaction.options.getFocused(true); const repo = new AcademicRepository();
    if (focused.name === 'prof_myges') {
      const existing = new Set(repo.listTeachers().map((item) => item.gesTeacherId).filter((id): id is number => id !== null));
      const available = (await myGesService.getTeachers()).filter((item) => !existing.has(item.teacherId));
      return interaction.respond(matchingChoices(available.map(item => ({ ...item, id: item.teacherId })), item => `${item.firstName} ${item.lastName}`, focused.value));
    }
    return interaction.respond(matchingChoices(repo.listTeachers(), item => `${item.firstName} ${item.lastName}`, focused.value));
  },
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new AcademicRepository(); const action = interaction.options.getSubcommand();
    if (action === 'ajouter') {
      const gesTeacherId = interaction.options.getInteger('prof_myges', true);
      if (repo.listTeachers().some(item => item.gesTeacherId === gesTeacherId)) return interaction.reply({ content: 'Cet intervenant a déjà été ajouté.', ephemeral: true });
      let remote;
      try { remote = (await myGesService.getTeachers()).find(item => item.teacherId === gesTeacherId); }
      catch { return interaction.reply({ content: 'MyGES n’est pas connecté. Utilise `/gesaccount reconnecter`.', ephemeral: true }); }
      if (!remote) return interaction.reply({ content: 'Intervenant MyGES introuvable. Relance l’autocomplétion.', ephemeral: true });
      const email = interaction.options.getString('email')?.trim() || defaultTeacherEmail(remote.firstName, remote.lastName);
      if (!/^\S+@\S+\.\S+$/.test(email)) return interaction.reply({ content: 'Adresse e-mail invalide.', ephemeral: true });
      const row = repo.addTeacher(remote.teacherId, remote.firstName, remote.lastName, email);
      return interaction.reply({ content: `Intervenant ajouté : **${row.firstName} ${row.lastName}** — \`${row.email}\`.`, ephemeral: true });
    }
    if (action === 'liste') {
      const rows = repo.listTeachers();
      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Intervenants').setDescription(rows.length ? rows.map(item => `**${item.firstName} ${item.lastName}** — \`${item.email}\``).join('\n') : 'Aucun intervenant enregistré.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const id = interaction.options.getInteger('intervenant', true);
    if (!repo.getTeacher(id)) return interaction.reply({ content: 'Intervenant introuvable.', ephemeral: true });
    if (action === 'supprimer') { repo.deleteTeacher(id); return interaction.reply({ content: 'Intervenant supprimé.', ephemeral: true }); }
    const values = { firstName: interaction.options.getString('prenom')?.trim() || undefined, lastName: interaction.options.getString('nom')?.trim() || undefined, email: interaction.options.getString('email')?.trim() || undefined };
    if (!Object.values(values).some(Boolean)) return interaction.reply({ content: 'Indique au moins une valeur à modifier.', ephemeral: true });
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) return interaction.reply({ content: 'Adresse e-mail invalide.', ephemeral: true });
    repo.updateTeacher(id, values); return interaction.reply({ content: 'Intervenant mis à jour.', ephemeral: true });
  },
};
