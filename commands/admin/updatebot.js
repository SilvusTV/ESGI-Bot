const { PermissionFlagsBits } = require('discord.js');
const child = require("child_process");

module.exports = {
    name: 'updatebot',
    category: 'moderation',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    ownerOnly: false,
    usage: 'updatebot',
    examples: 'updatebot',
    description: 'Mettre à jour le bot',
    async runInteraction(client, interaction){
        child.exec("git pull", (err, res) =>{
            if(err){
                interaction.reply({ content: `error response : ${res}`, ephemeral: true })
            }else{
                interaction.reply({ content: `\`\`\`${res.slice(0, 2000)}\`\`\``, ephemeral: true })
            }
        })

    }
};