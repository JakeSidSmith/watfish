import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import { DataOrError, DEFAULT_ENV } from './constants';
import * as logger from './logger';
import { getEnvVariables, handleShebang } from './utils';

const color = 'white';

const onDataOrError = (dataOrError: DataOrError) => {
  const messages = (dataOrError instanceof Error ? dataOrError.message : dataOrError)
    .toString().split('\n');

  messages.forEach((message) => {
    logger.log(message);
  });
};

const onClose = (code: number) => {
  logger.log(`Process exited with code ${code}`);
};

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

  subProcess.stdout.on('data', onDataOrError);
  subProcess.stdout.on('error', onDataOrError);
  subProcess.stderr.on('data', onDataOrError);
  subProcess.stderr.on('error', onDataOrError);

  subProcess.on('close', onClose);
};

const run = (tree: Tree) => {
  const { command = '' } = tree.args;
  const { env } = tree.kwargs;

  runCommand(command, env);
};

export default run;
