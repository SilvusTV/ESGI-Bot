import { Client, Collection, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import CommandUtil from './utils/handlers/CommandUtil';
import EventUtil from './utils/handlers/EventUtil';
import SelectUtil from './utils/handlers/SelectUtil';
import { closeDb, ensureDatabaseInitialized } from './utils/db';
import { startWebServer } from './utils/ges/webServer';

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

async function bootstrap(): Promise<void> {
  if (!process.env.DISCORD_TOKEN) throw new Error('La variable DISCORD_TOKEN est obligatoire.');
  await ensureDatabaseInitialized();
  startWebServer();
  await Promise.all([CommandUtil(client), EventUtil(client), SelectUtil(client)]);
  await client.login(process.env.DISCORD_TOKEN);
}

void bootstrap().catch((error) => {
  console.error('Impossible de démarrer le bot:', error);
  process.exitCode = 1;
});
