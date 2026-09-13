import { Client, Collection, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import CommandUtil from './utils/handlers/CommandUtil';
import EventUtil from './utils/handlers/EventUtil';
import SelectUtil from './utils/handlers/SelectUtil';
import { closeDb } from './utils/db';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Extend client with custom collections (minimal typing)
(client as any).commands = new Collection();
['selects'].forEach((x) => ((client as any)[x] = new Collection()));

[CommandUtil, EventUtil, SelectUtil].forEach((handler: (c: Client) => unknown) => handler(client));

process.on('exit', (code) => {
  closeDb();
  console.log(`le processus s'est arrêté avec le code ${code}!`);
});
process.on('uncaughtException', (err, origin) => {
  console.log(`UNCAUGHT_EXCEPTION: ${err}`, `Origine:${origin}`);
});
process.on('unhandledRejection', (reason, promise) => {
  console.log(`UNHANDLED_REJECTION: ${reason}\n------\n`, promise);
});
process.on('warning', (...args) => console.log(...args));

client.login(process.env.DISCORD_TOKEN as string);
