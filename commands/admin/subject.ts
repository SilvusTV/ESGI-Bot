import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { AcademicRepository } from '../../utils/db';
import { defaultTeacherEmail, getMyGesService, type MyGesCourse } from '../../utils/ges/MyGesService';
import { EMBED_COLOR, matchingChoices } from '../../utils/homework';

const subjectOption = { name: 'matiere', description: 'Matière concernée', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };
const teacherOption = { name: 'intervenant', description: 'Intervenant associé', type: ApplicationCommandOptionType.Integer, required: true, autocomplete: true };
const courseKey = (course: MyGesCourse) => `${course.teacherId}|${course.name}`.slice(0, 100);

export = {
  name: 'matiere', category: 'admin', ownerOnly: false,
  usage: 'matiere ajouter|ajouter_manuellement|modifier|supprimer|liste', examples: ['matiere ajouter', 'matiere liste'],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  description: 'Gérer les matières à partir du planning MyGES.',
  options: [
    { name: 'ajouter', description: 'Ajouter une matière détectée dans MyGES', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'cours_myges', description: 'Cours MyGES à transformer en matière', type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
    ] },
    { name: 'ajouter_manuellement', description: 'Ajouter une matière absente de MyGES', type: ApplicationCommandOptionType.Subcommand, options: [
      { name: 'nom', description: 'Nom de la matière', type: ApplicationCommandOptionType.String, required: true }, teacherOption,
    ] },
    { name: 'modifier', description: 'Modifier une matière', type: ApplicationCommandOptionType.Subcommand, options: [subjectOption,
      { name: 'nom', description: 'Nouveau nom', type: ApplicationCommandOptionType.String }, { ...teacherOption, required: false },
    ] },
    { name: 'supprimer', description: 'Supprimer une matière et ses devoirs', type: ApplicationCommandOptionType.Subcommand, options: [subjectOption] },
    { name: 'liste', description: 'Lister les matières', type: ApplicationCommandOptionType.Subcommand },
  ],
  async autocomplete(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.respond([]);
    const repo = new AcademicRepository(interaction.guildId); const focused = interaction.options.getFocused(true);
    if (focused.name === 'cours_myges') {
      const existingNames = new Set(repo.listSubjects().map(item => item.name.toLocaleLowerCase('fr')));
      const seen = new Set<string>();
      const courses = (await getMyGesService(interaction.guildId).getUpcomingCourses()).filter((course) => {
        const key = courseKey(course); if (seen.has(key) || existingNames.has(course.name.toLocaleLowerCase('fr'))) return false;
        seen.add(key); return true;
      });
      const query = String(focused.value).toLocaleLowerCase('fr');
      return interaction.respond(courses.filter(course => course.name.toLocaleLowerCase('fr').includes(query)).slice(0, 25)
        .map(course => ({ name: course.name.slice(0, 100), value: courseKey(course) })));
    }
    const choices = focused.name === 'intervenant' ? matchingChoices(repo.listTeachers(), item => `${item.firstName} ${item.lastName}`, focused.value) : matchingChoices(repo.listSubjects(), item => item.name, focused.value);
    return interaction.respond(choices);
  },
  async runInteraction(_client: unknown, interaction: any) {
    if (!interaction.guildId) return interaction.reply({ content: 'Commande disponible uniquement sur un serveur.', ephemeral: true });
    const repo = new AcademicRepository(interaction.guildId); const action = interaction.options.getSubcommand();
    if (action === 'liste') {
      const rows = repo.listSubjects(); const description = rows.map(item => `**${item.name}**${item.teacherLastName ? ` — ${item.teacherFirstName} ${item.teacherLastName}` : ''}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Matières').setDescription(description || 'Aucune matière enregistrée.')], ephemeral: true });
    }
    if (action === 'ajouter') {
      let courses; try { courses = await getMyGesService(interaction.guildId).getUpcomingCourses(); } catch { return interaction.reply({ content: 'MyGES n’est pas connecté. Utilise `/gesaccount reconnecter`.', ephemeral: true }); }
      const selected = courses.find(course => courseKey(course) === interaction.options.getString('cours_myges', true));
      if (!selected) return interaction.reply({ content: 'Cours MyGES introuvable. Relance l’autocomplétion.', ephemeral: true });
      if (repo.listSubjects().some(item => item.name.toLocaleLowerCase('fr') === selected.name.toLocaleLowerCase('fr'))) return interaction.reply({ content: 'Cette matière existe déjà.', ephemeral: true });
      let localTeacher = repo.listTeachers().find(item => item.gesTeacherId === selected.teacherId);
      if (!localTeacher) {
        const remoteTeacher = (await getMyGesService(interaction.guildId).getTeachers()).find(item => item.teacherId === selected.teacherId);
        if (!remoteTeacher) return interaction.reply({ content: 'Le professeur associé est introuvable dans l’annuaire MyGES.', ephemeral: true });
        localTeacher = repo.addTeacher(remoteTeacher.teacherId, remoteTeacher.firstName, remoteTeacher.lastName, defaultTeacherEmail(remoteTeacher.firstName, remoteTeacher.lastName));
      }
      const row = repo.addSubject(selected.name, localTeacher.id);
      return interaction.reply({ content: `Matière **${row.name}** ajoutée et associée à **${localTeacher.firstName} ${localTeacher.lastName}**.`, ephemeral: true });
    }
    if (action === 'ajouter_manuellement') {
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
