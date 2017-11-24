import { Tree } from 'jargs';
const json = require('../package.json'); // tslint:disable-line:no-var-requires

const version = (tree: Tree) => {
  if (tree.flags.version) {
    process.stderr.write(json.version + '\n');
  }
};

export default version;
