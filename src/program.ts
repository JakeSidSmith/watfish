import { Tree } from 'jargs';
import * as logger from './logger';
import { runCommand } from './run';
const json = require('../package.json'); // tslint:disable-line:no-var-requires

const version = (tree: Tree) => {
  const { command = [] } = tree.args;
  let { env } = tree.kwargs;
  env = typeof env === 'string' ? env : undefined;

  if (tree.flags.version) {
    logger.log(json.version);
  } else if (command) {
    runCommand(command as any, env);
  }
};

export default version;
