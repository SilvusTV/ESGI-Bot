import { PermissionFlagsBits } from 'discord.js';
import { exec } from 'child_process';

export = {
  name: 'updatebot',
  category: 'moderation',
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  ownerOnly: false,
  usage: 'updatebot',
  examples: 'updatebot',
  description: 'Mettre à jour le bot',
  async runInteraction(client: any, interaction: any) {
    exec('git pull && npm install && npm run build', (err, res) => {
      if (err) {
        interaction.reply({ content: `error response : ${res}`, ephemeral: true });
      } else {
        interaction.reply({ content: `\`\`\`${(res || '').slice(0, 2000)}\`\`\``, ephemeral: true });
      }
    });
  },
};
