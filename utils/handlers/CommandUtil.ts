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

  (await pGlob(pattern)).map(async (cmdFile) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cmd = require(cmdFile);

    if (!cmd.name) return Logger.warn(`no command name : ${cmdFile}`);

    if (!cmd.description && cmd.type !== ApplicationCommandType.User)
      return Logger.warn(`no command description : ${cmdFile}`);

    if (!cmd.category) return Logger.warn(`no command category : ${cmdFile}`);

    /*if(!cmd.defaultMemberPermissions) return Logger.warn(`no command permissions : ${cmdFile}`)*/

    if (cmd.ownerOnly === undefined) return Logger.warn(`no command ownerOnly : ${cmdFile}`);

    if (!cmd.usage) return Logger.warn(`no command usage : ${cmdFile}`);

    if (!cmd.examples) return Logger.warn(`no command examples : ${cmdFile}`);

    client.commands.set(cmd.name, cmd);
    Logger.command(`/${cmd.name} loaded`);
  });
}
