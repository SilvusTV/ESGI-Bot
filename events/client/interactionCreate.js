module.exports = {
    name: "interactionCreate",
    once: false,
    async execute(client, interaction) {
        if (interaction.isCommand() || interaction.isContextMenuCommand()) {
            const cmd = client.commands.get(interaction.commandName);
            if (!cmd) return interaction.reply("Cette commande n'existe pas !");

            if (cmd.ownerOnly) {
                if (interaction.user.id !== ownerID) return interaction.reply("La seule personne pouvant taper cette commande est l'owner du bot!");
            }

            cmd.runInteraction(client, interaction);
        }else if (interaction.isStringSelectMenu()){
            const selectMenu = client.selects.get(interaction.customId);
            if (!selectMenu) return interaction.reply('ce menu n\'existe pas.')
            selectMenu.runInteraction(client, interaction);
        }
    },
};
