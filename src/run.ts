import { Tree } from 'jargs';
import * as logger from './logger';

export const runCommand = (command: string) => {
  logger.log(command);
};

const run = (tree: Tree) => {
  const { command = '' } = tree.args;
  runCommand(command);
};

export default run;
