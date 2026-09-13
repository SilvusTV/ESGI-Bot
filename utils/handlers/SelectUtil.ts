import { promisify } from 'util';
import { glob } from 'glob';
import Logger from '../Logger';

const pGlob = promisify(glob);

export default async function SelectUtil(client: any): Promise<void> {
  const isDist = __dirname.includes('dist');
  const base = isDist ? 'dist' : '.';
  const ext = isDist ? 'js' : 'ts';
  const pattern = `${process.cwd()}/${base}/selects/*/*.${ext}`;

  for (const selectMenuFile of await pGlob(pattern)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const selectMenu = require(selectMenuFile);
    if (!selectMenu.name) {
      Logger.warn(
        `Select menu non-fonctionnel: ajouter un nom à votre menu ↓\nFichier → ${selectMenuFile}`,
      );
      continue;
    }
    client.selects.set(selectMenu.name, selectMenu);
  }
}
