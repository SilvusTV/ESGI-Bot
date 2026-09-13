import { PermissionFlagsBits } from 'discord.js';

export = {
  name: 'ping',
  category: 'utils',
  ownerOnly: false,
  usage: 'ping',
  examples: ['ping'],
  defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  description: 'Connaitre la latence du bot.',
  async runInteraction(client: any, interaction: any) {
    const tryPong = await interaction.reply({ content: 'Attention, pong imminent...', fetchReply: true });
    const embedQuestion = {
      color: 0x735b8b,
      title: '🏓 Pong!',
      url: 'https://www.speedtest.net/run',
      fields: [
        {
          name: 'Latence API',
          value: `\`\`\`${client.ws.ping}ms\`\`\``,
          inline: true,
        },
        {
          name: 'Latence BOT',
          value: `\`\`\`${tryPong.createdTimestamp - interaction.createdTimestamp}ms\`\`\``,
          inline: true,
        },
      ],
      timestamp: new Date(),
      footer: {
        text: interaction.user.tag,
        icon_url: interaction.user.displayAvatarURL(),
      },
    } as any;

    interaction.editReply({ content: null, embeds: [embedQuestion] });
  },
};
