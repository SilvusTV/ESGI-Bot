import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export = {
  name: 'uptime',
  category: 'utils',
  ownerOnly: false,
  usage: 'uptime',
  examples: ['uptime'],
  defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  description: 'Connaitre le temps de fonctionnement du bot.',
  runInteraction(client: any, interaction: any) {
    const readyTsSeconds = Math.floor(((client.readyTimestamp ?? Date.now()) as number) / 1000);

    const embed = new EmbedBuilder()
      .setTitle("⏲ Je suis allumé depuis...!")
      .setThumbnail(client.user.displayAvatarURL())
      .setColor('#735B8B')
      .addFields([
        { name: 'Date de Démarage', value: `<t:${readyTsSeconds}:f>`, inline: true },
        { name: 'Depuis', value: `<t:${readyTsSeconds}:R>`, inline: true },
      ])
      .setTimestamp()
      .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

    interaction.reply({ embeds: [embed] });
  },
};
