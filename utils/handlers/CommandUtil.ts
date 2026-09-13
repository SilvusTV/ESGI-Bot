import { ApplicationCommandType } from 'discord.js';
import { promisify } from 'util';
import { glob } from 'glob';
import Logger from '../Logger';

const pGlob = promisify(glob);

export default async function CommandUtil(client: any): Promise<void> {
  // Use TS in dev, JS in dist to avoid duplicate loading
  const isDist = __dirname.includes('dist');
  const base = isDist ? 'dist' : '.';
  const ext = isDist ? 'js' : 'ts';
  const pattern = `${process.cwd()}/${base}/commands/*/*.${ext}`;

  for (const cmdFile of await pGlob(pattern)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cmd = require(cmdFile);

    if (!cmd.name) { Logger.warn(`no command name : ${cmdFile}`); continue; }

    if (!cmd.description && cmd.type !== ApplicationCommandType.User) { Logger.warn(`no command description : ${cmdFile}`); continue; }

    if (!cmd.category) { Logger.warn(`no command category : ${cmdFile}`); continue; }

    /*if(!cmd.defaultMemberPermissions) return Logger.warn(`no command permissions : ${cmdFile}`)*/

    if (cmd.ownerOnly === undefined) { Logger.warn(`no command ownerOnly : ${cmdFile}`); continue; }

    if (!cmd.usage) { Logger.warn(`no command usage : ${cmdFile}`); continue; }

    if (!cmd.examples) { Logger.warn(`no command examples : ${cmdFile}`); continue; }

    if (client.commands.has(cmd.name)) { Logger.warn(`duplicate command name: ${cmd.name}`); continue; }
    client.commands.set(cmd.name, cmd);
    Logger.command(`/${cmd.name} loaded`);
  }
}
