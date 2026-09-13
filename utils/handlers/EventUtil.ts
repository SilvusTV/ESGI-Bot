import { promisify } from 'util';
import { glob } from 'glob';

const pGlob = promisify(glob);

export default async function EventUtil(client: any): Promise<void> {
  const isDist = __dirname.includes('dist');
  const base = isDist ? 'dist' : '.';
  const ext = isDist ? 'js' : 'ts';
  const pattern = `${process.cwd()}/${base}/events/*/*.${ext}`;

  (await pGlob(pattern)).map(async (eventFile) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const event = require(eventFile);

    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(client, ...args));
    }
  });
}
