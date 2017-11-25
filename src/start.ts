import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as procfile from 'procfile';
import { UTF8 } from './constants';

const DEFAULT_ENV = 'development';

let options: Tree;

export type DataOrError = Buffer | Error | string;

const onDataOrError = (processName: string, env: string, dataOrError: DataOrError) => {
  const message = dataOrError instanceof Error ? dataOrError.message : dataOrError;
  env = `${env === DEFAULT_ENV ? '' : `${env}:`}`;

  process.stderr.write(
    `${env}${processName}: ${message}`
  );
};

const onClose = (processName: string, env: string, code: number) => {
  env = `${env === DEFAULT_ENV ? '' : `${env}:`}`;

  process.stderr.write(
    `${env}${processName}: child process exited with code ${code}`
  );
};

export const readFileCallback = (error: NodeJS.ErrnoException, data: string) => {
  if (error) {
    process.stderr.write(error.message);
    return process.exit(1);
  }

  const { processes } = options.args;
  const { verbose } = options.flags;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfileConfig = procfile.parse(data);

  for (const key in procfileConfig) {
    if (!processes || processes === key) {
      const item = procfileConfig[key];

      const subProcess = childProcess.spawn(item.command, item.options);

      subProcess.stdout.on('data', (dataOrError) => onDataOrError(key, env, dataOrError));
      subProcess.stderr.on('data', (dataOrError) => onDataOrError(key, env, dataOrError));
      subProcess.stdout.on('error', (dataOrError) => onDataOrError(key, env, dataOrError));
      subProcess.stderr.on('error', (dataOrError) => onDataOrError(key, env, dataOrError));

      subProcess.on('close', (code) => onClose(key, env, code));
    }
  }
};

const start = (tree: Tree) => {
  options = tree;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfilePath = path.join(process.cwd(), 'etc', 'environments', env, 'procfile');

  fs.readFile(procfilePath, UTF8, readFileCallback);
};

export default start;
