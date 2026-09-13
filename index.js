const {Client, Collection, GatewayIntentBits} = require('discord.js');
const dotenv = require('dotenv');
const CommandUtil = require('./utils/handlers/CommandUtil.js');
const EventUtil = require('./utils/handlers/EventUtil.js');
const SelectUtil = require('./utils/handlers/SelectUtil.js');
dotenv.config();
// Remplace l'entier magique des intents par des bits nommés
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // intent privilégié: assurez-vous qu'il est activé dans le portail Discord
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
  ],
});
client.commands = new Collection();
['selects'].forEach(x => client[x] = new Collection());
[CommandUtil, EventUtil, SelectUtil].forEach(handler => handler(client));
process.on('exit', code => {
  console.log(`le processus s'est arrêté avec le code ${code}!`);
});
process.on('uncaughtException', (err, origin) => {
  console.log(`UNCAUGHT_EXCEPTION: ${err}`, `Origine:${origin}`);
});
process.on('unhandledRejection', (reason, promise) => {
  console.log(`UNHANDLED_REJECTION: ${reason}\n------\n`, promise);
});
process.on('warning', (...args) => console.log(...args));
client.login(process.env.DISCORD_TOKEN);