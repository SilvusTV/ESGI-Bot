const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'clear',
    category: 'moderation',
    ownerOnly: false,
    usage: 'clear [amount] <@user>',
    examples: ['clear 50', 'clear 50 @Silvus_tv'],
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
    description: 'Supprimer un nombre de messages spécifié d\'un salon ou membre.',
    options:[
        {
            name: 'nombre',
            description: 'Nombre de messages à supprimer',
            type: ApplicationCommandOptionType.Number,
            required: true,
        },
        {
            name: 'user',
            description: 'Choisir un membre pour la suppression des messages',
            type: ApplicationCommandOptionType.User,
            required: false,
        }
    ],
    async runInteraction(client, interaction){
        // Check le nombre de messages a delete
        const amountToDelete = interaction.options.getNumber('nombre');
        if (amountToDelete > 100 || amountToDelete <= 0) return interaction.reply({ content: 'Le \`NOMBRE\` doit être inférieur à 100 et supérieur à 0.', ephemeral: true });

        // Messages spécifiques d'un membre
        const user = interaction.options.getMember('target');

        // Récupérer tous les messages du salon
        const messagesToDelete = await interaction.channel.messages.fetch();

        // Récupérer les messages d'un utilisateur si spécifié
        if (user) {
            let i = 0;
            const filteredTargetMessages = [];
            (await messagesToDelete).filter(msg => {
                if (msg.author.id === user.id && amountToDelete > i) {
                    filteredTargetMessages.push(msg), i++;
                }
            });

            await interaction.channel.bulkDelete(filteredTargetMessages, true).then(messages => {
                const embedTarget = {
                    color: 0x735B8B,
                    description: `${messages.size} messages de ${user} supprimé`
                }
                interaction.reply({ embeds: [embedTarget] })
                .then(setTimeout(() => interaction.deleteReply(), 10000));
            });
        // Sinon, on supprime les X derniers messages dans le salon
        } else {
            await interaction.channel.bulkDelete(amountToDelete, true).then(messages => {
                const embedNoTarget = {
                    color: 0x735B8B,
                    description: `${messages.size} messages supprimé`
                }
                interaction.reply({ embeds: [embedNoTarget] })
                .then(setTimeout(() => interaction.deleteReply(), 2000));
            });
        }
    }
};