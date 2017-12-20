import * as childProcess from 'child_process';
import * as colors from 'colors/safe';
import { Tree } from 'jargs';
import * as path from 'path';
import { DEFAULT_ENV, DISAPPROVAL, WAT } from './constants';
import * as logger from './logger';
import { getEnvVariables, handleShebang, injectEnvVars, onClose } from './utils';

export const runCommand = (
  commandAndOptions: undefined | Array<string | undefined> = [],
  env: string,
  rest: undefined | Array<string | undefined> = []
) => {
  const [command, ...commandOptions] = commandAndOptions;

  if (typeof command === 'undefined') {
    logger.log('No command supplied');
    return process.exit(1);
  }

  if (command === 'wtf') {
    logger.log(colors.red(WAT + 'Wat are you doing? ' + DISAPPROVAL));
    return process.exit(1);
  }

  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');
  const envVariables = getEnvVariables(envPath);

  const environment: {[i: string]: string} = {
    ...envVariables,
    ...process.env,
    PYTHONUNBUFFERED: 'true',
  };

  const resolvedCommand = handleShebang(command);
  const resolvedCommandOptions = injectEnvVars([...commandOptions as string[], ...rest as string[]], environment);

  const subProcess = childProcess.spawn(
    resolvedCommand,
    resolvedCommandOptions,
    {
      cwd: process.cwd(),
      shell: true,
      env: environment,
      stdio: 'inherit',
    }
  );

  logger.log(colors.green(`Running ${resolvedCommand} ${resolvedCommandOptions.join(' ')}`));
  logger.log(colors.green(`PID: ${subProcess.pid}, Parent PID: ${process.pid}\n`));

  subProcess.on('close', (code) => onClose('', code));
};

const run = (tree: Tree) => {
  let { command } = tree.args;
  let { env } = tree.kwargs;
  let { rest } = tree;
  command = Array.isArray(command) ? command : [];
  rest = Array.isArray(rest) ? rest : [];
  env = typeof env === 'string' ? env : DEFAULT_ENV;

  runCommand(command as (string[] | undefined), env, rest as (string[] | undefined));
};

export default run;
