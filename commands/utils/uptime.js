const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'uptime',
    category: 'utils',
    ownerOnly: false,
    usage: 'uptime',
    examples: ['uptime'],
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
    description: 'Connaitre le temps de fonctionnement du bot.',
    runInteraction(client, interaction){
        const embed = new EmbedBuilder()
            .setTitle('⏲ Je suis allumé depuis...!')
            .setThumbnail(client.user.displayAvatarURL())
            .setColor('#735B8B')
            .addFields([
                {name: 'Date de Démarage', value: `<t:${parseInt(client.readyTimestamp / 1000)}:f>`, inline: true},
                {name: 'Depuis', value: `<t:${parseInt(client.readyTimestamp / 1000)}:R>`, inline: true}],
            )
            .setTimestamp()
            .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL()});

        interaction.reply({embeds: [embed]})
    }
};