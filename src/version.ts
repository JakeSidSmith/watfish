import { Tree } from 'jargs';
import * as logger from './logger';
const json = require('../package.json'); // tslint:disable-line:no-var-requires

const version = (tree: Tree) => {
  if (tree.flags.version) {
    logger.log(json.version);
  }
};

export default version;
