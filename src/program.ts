import { Tree } from 'jargs';
import { DEFAULT_ENV } from './constants';
import * as logger from './logger';
import { runCommand } from './run';
const json = require('../package.json'); // tslint:disable-line:no-var-requires

const program = (tree: Tree) => {
  let { command } = tree.args;
  let { env } = tree.kwargs;
  let { rest } = tree;
  command = Array.isArray(command) ? command : [];
  env = typeof env === 'string' ? env : DEFAULT_ENV;
  rest = Array.isArray(rest) ? rest : [];

  if (tree.flags.version) {
    logger.log(json.version);
  } else if (tree.name === 'watfish' && (!tree.command || tree.command.name !== 'run') && tree.args.command) {
    runCommand(command as (string[] | undefined), env, rest as (string[] | undefined));
  }
};

export default program;
