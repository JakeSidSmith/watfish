import { Tree } from 'jargs';
import * as logger from './logger';
import { runCommand } from './run';
const json = require('../package.json'); // tslint:disable-line:no-var-requires

const version = (tree: Tree) => {
  let { env } = tree.kwargs;
  env = typeof env === 'string' ? env : undefined;

  if (tree.flags.version) {
    logger.log(json.version);
  } else if (tree.args.command) {
    runCommand(tree.args.command as any, env);
  }
};

export default version;
