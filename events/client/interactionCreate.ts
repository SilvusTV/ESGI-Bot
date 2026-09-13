export = {
  name: 'interactionCreate',
  once: false,
  async execute(client: any, interaction: any) {
    if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd?.autocomplete) return interaction.respond([]);
      try { await cmd.autocomplete(client, interaction); } catch { await interaction.respond([]).catch(() => undefined); }
    } else if (interaction.isCommand() || interaction.isContextMenuCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return interaction.reply("Cette commande n'existe pas !");

      // @ts-ignore ownerID may be defined globally elsewhere
      if (cmd.ownerOnly) {
        // @ts-ignore
        if (interaction.user.id !== ownerID)
          return interaction.reply("La seule personne pouvant taper cette commande est l'owner du bot!");
      }

      try {
        await cmd.runInteraction(client, interaction);
      } catch (error) {
        console.error(`Erreur commande /${interaction.commandName}`, error);
        const payload = { content: 'Une erreur est survenue pendant cette commande.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
        else await interaction.reply(payload);
      }
    } else if (interaction.isStringSelectMenu()) {
      const selectMenu = client.selects.get(interaction.customId);
      if (!selectMenu) return interaction.reply("ce menu n'existe pas.");
      await selectMenu.runInteraction(client, interaction);
    }
  },
};
