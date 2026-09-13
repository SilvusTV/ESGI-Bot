const {ActivityType } = require("discord.js");
const Logger = require("../../utils/Logger");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        let guildsCount = await client.guilds.fetch();

        client.user.setPresence({ activities: [{ name: "You", type: ActivityType.Watching }], status: "online" });

        await client.application.commands.set(client.commands.map(cmd => cmd));
        Logger.client(`Bot ready on ${guildsCount.size} servers\n\n--------\n${process.env.DISCORD_BOT_NAME} ©2025\n--------\nAuthor:\n-Silvus\n--------\n`);
    },
};
