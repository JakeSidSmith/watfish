import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as procfile from 'procfile';
import { UTF8 } from './constants';

let options: Tree;

export const readFileCallback = (error: NodeJS.ErrnoException, data: string) => {
  console.log('CLBCK');

  if (error) {
    process.stderr.write(error.message);
    return process.exit(1);
  }

  const { processes } = options.args;
  const procfileConfig = procfile.parse(data);

  for (const key in procfileConfig) {
    if (!processes || processes === key) {
      const item = procfileConfig[key];
      console.log(item.command, item.options);
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
