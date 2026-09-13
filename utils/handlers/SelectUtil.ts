import { promisify } from 'util';
import { glob } from 'glob';
import Logger from '../Logger';

const pGlob = promisify(glob);

export default async function SelectUtil(client: any): Promise<void> {
  // Support both TS (dev) and JS (dist or legacy) select menus
  const isDist = __dirname.includes('dist');
  const base = isDist ? 'dist' : '.';
  const pattern = `${process.cwd()}/${base}/selects/*/*.{ts,js}`;

  (await pGlob(pattern)).map(async (selectMenuFile) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const selectMenu = require(selectMenuFile);
    if (!selectMenu.name)
      return Logger.warn(
        `Select menu non-fonctionnel: ajouter un nom à votre menu ↓\nFichier → ${selectMenuFile}`,
      );
    client.selects.set(selectMenu.name, selectMenu);
  });
}
