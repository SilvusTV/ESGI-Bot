const { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'wrongchan',
    category: 'moderation',
    ownerOnly: false,
    usage: 'wrongchan [User] [Channel]',
    examples: ['wrongchan @Silvus_tv #general'],
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    description: 'Rediriger une personne s\'étant trompé de salon textuel',
    options : [
        {
            name: "user",
            description: "Indiquer l'utilisateur à mentionner.",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "channel",
            description: "Vers quel salon textuel faut-il le rediriger ?",
            type: ApplicationCommandOptionType.Channel,
            required: true,
        },
    ],
    async runInteraction(client, interaction){
        const user = interaction.options.getUser('user');
        const channel = interaction.options.getChannel('channel');

        const embed = new EmbedBuilder()
        .setTitle(':warning: Attention')
        .setColor('#735B8B')
        .setDescription(`<@${interaction.user.id}> te fais remarquer que ton message n'est pas dans le bon salon textuel. Il faudrait plutôt l'envoyer dans ${channel} s'il te plait.`)
        .setTimestamp()
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL()})


            interaction.reply({ content: `<@${user.id}>`, embeds: [embed] });
    }
};