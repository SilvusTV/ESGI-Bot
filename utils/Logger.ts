import chalk from 'chalk';
import dayjs from 'dayjs';

const format = '{tstamp} {tag} {txt}\n';

function error(content: string) {
  write(content, 'black', 'bgRed', 'ERROR', true);
}

function warn(content: string) {
  write(content, 'black', 'bgYellow', 'WARN', false);
}

function typo(content: string) {
  write(content, 'black', 'bgCyan', 'TYPO', false);
}

function command(content: string) {
  write(content, 'black', 'bgMagenta', 'CMD', false);
}

function event(content: string) {
  write(content, 'black', 'bgGreen', 'EVENT', false);
}

function client(content: string) {
  write(content, 'black', 'bgBlue', 'CLIENT', false);
}

function info(content: string) {
  write(content, 'black', 'bgWhite', 'INFO', false);
}

function write(
  content: string,
  tagColor: keyof typeof chalk,
  bgTagColor: keyof typeof chalk,
  tag: string,
  isError = false,
) {
  const timestamp = `[${dayjs().format('DD/MM/YY HH:mm:ss')}]`;
  const logTag = `[${tag}]`;
  const stream = isError ? process.stderr : process.stdout;

  const item = format
    .replace('{tstamp}', chalk.gray(timestamp))
    .replace('{tag}', (chalk as any)[bgTagColor][tagColor](logTag))
    .replace('{txt}', chalk.white(content));

  stream.write(item);
}

export default { error, warn, typo, command, event, client, info };
