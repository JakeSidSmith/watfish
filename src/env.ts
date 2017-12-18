import * as fs from 'fs';
import { Tree } from 'jargs';
import { Config, ConfigProject, DEFAULT_ENV, UTF8 } from './constants';
import * as logger from './logger';
import {
  createStringFromConfig,
  delIn,
  getConfigPath,
  getIn,
  getProjectName,
  loadWtfJson,
  setIn,
  writeConfigCallback,
} from './utils';

const envCommand = (tree: Tree) => {
  let config: Config | undefined;
  let projectConfig: ConfigProject | undefined;

  const configPath = getConfigPath();
  const projectName = getProjectName();

  const { key, value } = tree.args;
  let { env } = tree.kwargs;
  env = typeof env === 'string' ? env : DEFAULT_ENV;

  if (!fs.existsSync(configPath)) {
    if (tree.command && tree.command.name === 'set') {
      logger.log(`No wtf.json found at ${configPath}. I\'ll create that for you`);
    } else {
      logger.log(`No wtf.json found at ${configPath} - run "wtf init" to begin setup`);
      process.exit(1);
    }
  } else {
    config = loadWtfJson(configPath);

    if (!config) {
      return;
    }

    projectConfig = config[projectName];
  }

  if (!tree.command) {
    if (!projectConfig) {
      logger.log(`No config for project ${projectName} in wtf.json at ${configPath}`);
    } else if (!projectConfig.env) {
      logger.log(`No environments for project ${projectName} at ${configPath}`);
    } else {
      logger.log(JSON.stringify(projectConfig.env));
    }

    return process.exit(0);
  }

  config = config ? config : {};

  if (typeof key !== 'string') {
    logger.log('No key provided');
    return process.exit(1);
  }

  switch (tree.command.name) {
    case 'set':
      if (typeof value !== 'string') {
        logger.log('No value provided');
        return process.exit(1);
      }

      setIn(config, [projectName, 'env', env, key], value);
      break;
    case 'get':
      logger.log(getIn(config, [projectName, 'env', env, key]));
      return process.exit(0);
      break;
    case 'del':
      delIn(config, [projectName, 'env', env, key]);
      break;
    default:
      logger.log(`Unknown command ${tree.command.name}`);
      return process.exit(1);
  }

  const stringConfig = createStringFromConfig(getIn(config, [projectName, 'env']));

  process.stdin.resume();

  logger.log(`\nCreated config:\n\n${stringConfig}\nIs this correct? [y]`);

  process.stdin.once('data', (data) => {
    process.stdin.pause();

    const input: string = (data || '').toString().trim();

    if (input !== 'n' && input !== 'N') {
      fs.writeFile(
        configPath,
        stringConfig,
        UTF8,
        writeConfigCallback
      );
    }
  });
};

export default envCommand;
