import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import { DataOrError, DEFAULT_ENV } from './constants';
import * as logger from './logger';
import { getEnvVariables, handleShebang, onClose, onDataOrError } from './utils';

const color = 'white';

const findCommand = (command: string): string => {
  const rootPath = path.join(process.cwd(), command);

  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  logger.log(`Could not find command ${command} at ${rootPath}`);
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
    }
  );

  logger.log(`Running ${command} ${commandOptions.join(' ')}`);
  logger.log(`PID: ${subProcess.pid}, Parent PID: ${process.pid}\n`);

  subProcess.stdout.on('data', (dataOrError) => onDataOrError('', dataOrError));
  subProcess.stdout.on('error', (dataOrError) => onDataOrError('', dataOrError));
  subProcess.stderr.on('data', (dataOrError) => onDataOrError('', dataOrError));
  subProcess.stderr.on('error', (dataOrError) => onDataOrError('', dataOrError));

  subProcess.on('close', (code) => onClose('', code));
};

const run = (tree: Tree) => {
  const { command = '' } = tree.args;
  const { env } = tree.kwargs;

  runCommand(command, env);
};

export default run;
