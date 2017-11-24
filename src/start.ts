import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as procfile from 'procfile';
import { UTF8 } from './constants';

let options: Tree;

export type DataOrError = Buffer | Error | string;

const onDataOrError = (processName: string, dataOrError: DataOrError) => {
  const message = dataOrError instanceof Error ? dataOrError.message : dataOrError;

  process.stderr.write(`${processName}: stdout: ${message}`);
};

const onClose = (processName: string, code: number) => {
  process.stderr.write(`${processName}: child process exited with code ${code}`);
};

export const readFileCallback = (error: NodeJS.ErrnoException, data: string) => {
  if (error) {
    process.stderr.write(error.message);
    return process.exit(1);
  }

  const { processes } = options.args;
  const procfileConfig = procfile.parse(data);

  for (const key in procfileConfig) {
    if (!processes || processes === key) {
      const item = procfileConfig[key];

      const subProcess = childProcess.spawn(item.command, item.options);

      subProcess.stdout.on('data', (dataOrError) => onDataOrError(key, dataOrError));
      subProcess.stderr.on('data', (dataOrError) => onDataOrError(key, dataOrError));
      subProcess.stdout.on('error', (dataOrError) => onDataOrError(key, dataOrError));
      subProcess.stderr.on('error', (dataOrError) => onDataOrError(key, dataOrError));

      subProcess.on('close', (code) => onClose(key, code));
    }
  }
};

const start = (tree: Tree) => {
  options = tree;
  const { env = 'development' } = options.kwargs;

  const procfilePath = path.join(process.cwd(), 'etc', 'environments', env, 'procfile');

  fs.readFile(procfilePath, UTF8, readFileCallback);
};

export default start;
