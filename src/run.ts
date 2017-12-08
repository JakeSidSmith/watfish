import * as childProcess from 'child_process';
import * as colors from 'colors/safe';
import { Tree } from 'jargs';
import * as path from 'path';
import { DEFAULT_ENV, NO } from './constants';
import * as logger from './logger';
import { getEnvVariables, handleShebang, injectEnvVars, onClose } from './utils';

export const runCommand = (
  commandAndOptions: string[],
  env: string = DEFAULT_ENV,
  rest: undefined | string | string[] = []
) => {
  const [command = '', ...commandOptions] = commandAndOptions;

  if (command === 'wtf') {
    logger.log(colors.red(NO));
    return process.exit(1);
  }

  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');
  const envVariables = getEnvVariables(env, envPath);

  const environment: {[i: string]: string} = {
    ...envVariables,
    ...process.env,
    PORT: process.env.PORT || '',
    PYTHONUNBUFFERED: 'true',
  };

  const resolvedCommand = handleShebang(command);
  const resolvedCommandOptions = injectEnvVars(commandOptions.concat(rest), environment);

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
  const { command = [] } = tree.args;
  let { env } = tree.kwargs;
  const { rest } = tree;
  env = typeof env === 'string' ? env : undefined;

  runCommand(command as any, env, rest as string[]);
};

export default run;
