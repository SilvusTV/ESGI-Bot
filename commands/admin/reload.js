const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'reload',
    category: 'moderation',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    ownerOnly: false,
    usage: 'reload',
    examples: 'reload',
    description: 'Ajouter de la configuration à la base de donée.',
    async runInteraction(client, interaction){
        const embedResponse = {
            color: 0x735B8B,
            description: `Le bot à bien été relancé`
        }
        await interaction.reply({ embeds: [embedResponse], ephemeral: true })
        return process.exit();
    }
};