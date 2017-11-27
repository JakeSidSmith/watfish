import * as childProcess from 'child_process';
import * as colors from 'colors';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import { DEFAULT_ENV } from './constants';
import * as logger from './logger';
import { getEnvVariables, handleShebang, onClose } from './utils';

const findCommand = (command: string): string => {
  const rootPath = path.join(process.cwd(), command);

  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  logger.log(colors.red(`Could not find command ${command} at ${rootPath}`));
  return process.exit(1);
};

export const runCommand = (command: string, env: string = DEFAULT_ENV) => {
  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');
  const envVariables = getEnvVariables(env, envPath);

  const environment: {[i: string]: string} = {
    ...envVariables,
    ...process.env,
    PORT: process.env.PORT || '',
  };

  const commandPath = findCommand(command);
  const resolvedCommand = handleShebang(commandPath);
  const commandOptions: never[] = [];

  const subProcess = childProcess.spawn(
    resolvedCommand,
    commandOptions, // TODO: Should pick these from the array or commands when multi is supported in jargs
    {
      cwd: process.cwd(),
      shell: true,
      env: environment,
      stdio: 'inherit',
    }
  );

  logger.log(colors.green(`Running ${command} ${commandOptions.join(' ')}`));
  logger.log(colors.green(`PID: ${subProcess.pid}, Parent PID: ${process.pid}\n`));

  subProcess.on('close', (code) => onClose('', code));
};

const run = (tree: Tree) => {
  const { command } = tree.args;
  const { env } = tree.kwargs;

  runCommand(typeof command === 'string' ? command : '', typeof env === 'string' ? env : undefined);
};

export default run;
