import { Tree } from 'jargs';
import * as logger from './logger';
import { runCommand } from './run';
const json = require('../package.json'); // tslint:disable-line:no-var-requires

const version = (tree: Tree) => {
  const { env } = tree.kwargs;

  if (tree.flags.version) {
    logger.log(json.version);
  } else if (tree.args.command) {
    runCommand(tree.args.command as any, typeof env === 'string' ? env : undefined);
  }
};

export default version;
