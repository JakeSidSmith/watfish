import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as procfile from 'procfile';
import { UTF8 } from './constants';

const DEFAULT_ENV = 'development';
const ENV_BIN = 'env/bin';
const MATCHES_SHEBANG = /#!( *\S+ +)?( *\S+ *)$/m;
const MATCHES_ENV_KEY_VALUE = /^(\w+)=(\S+)$/;

let options: Tree;

export type DataOrError = Buffer | Error | string;

const onDataOrError = (processName: string, env: string, dataOrError: DataOrError) => {
  const messages = (dataOrError instanceof Error ? dataOrError.message : dataOrError)
    .toString().split('\n');
  env = `${env === DEFAULT_ENV ? '' : `${env}:`}`;

  messages.forEach((message) => {
    process.stderr.write(
      `${env}${processName} > ${message}\n`
    );
  });
};

const onClose = (processName: string, env: string, code: number) => {
  env = `${env === DEFAULT_ENV ? '' : `${env}:`}`;

  process.stderr.write(
    `${env}${processName} > process exited with code ${code}\n`
  );
};

export const handleShebang = (filePath: string): string => {
  const content = fs.readFileSync(path.join(process.cwd(), filePath), UTF8);

  const shebang = MATCHES_SHEBANG.exec(content);

  if (shebang) {
    const command = shebang[2].trim();

    if (fs.existsSync(path.join(process.cwd(), ENV_BIN, command))) {
      return path.join(ENV_BIN, command);
    }

    return command;
  }

  return '';
};

export const getEnvVariables = (env: string) => {
  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const lines = fs.readFileSync(envPath, UTF8).split('\n');

  const envVariables: {[i: string]: string} = {};

  lines.forEach((line) => {
    const match = MATCHES_ENV_KEY_VALUE.exec(line);

    if (match) {
      envVariables[match[1]] = match[2];
    }
  });

  return envVariables;
};

export const readFileCallback = (error: NodeJS.ErrnoException, data: string) => {
  if (error) {
    process.stderr.write(error.message);
    return process.exit(1);
  }

  const { processes } = options.args;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfileConfig = procfile.parse(data);

  for (const key in procfileConfig) {
    if (!processes || processes === key) {
      const item = procfileConfig[key];

      const subProcess = childProcess.spawn(
        `${handleShebang(item.command)} ${item.command}`,
        item.options,
        {
          cwd: process.cwd(),
          shell: true,
          env: {
            ...getEnvVariables(env),
            ...process.env,
          },
        }
      );

      subProcess.stdout.on('data', (dataOrError) => onDataOrError(key, env, dataOrError));
      subProcess.stdout.on('error', (dataOrError) => onDataOrError(key, env, dataOrError));
      subProcess.stderr.on('data', (dataOrError) => onDataOrError(key, env, dataOrError));
      subProcess.stderr.on('error', (dataOrError) => onDataOrError(key, env, dataOrError));

      subProcess.on('close', (code) => onClose(key, env, code));
    }
  }
};

const start = (tree: Tree) => {
  options = tree;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfilePath = path.join(process.cwd(), 'etc/environments', env, 'procfile');

  fs.readFile(procfilePath, UTF8, readFileCallback);
};

export default start;
