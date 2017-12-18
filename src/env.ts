import * as fs from 'fs';
import { Tree } from 'jargs';
import { Config, ConfigProject, DEFAULT_ENV } from './constants';
import * as logger from './logger';
import { getConfigPath, getProjectName, loadWtfJson } from './utils';

const envCommand = (tree: Tree) => {
  let config: Config | undefined;
  let projectConfig: ConfigProject | undefined;

  const configPath = getConfigPath();
  const projectName = getProjectName();

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
    } else {
      if (!projectConfig.env) {
        logger.log(`No environments for project ${projectName} at ${configPath}`);
      } else {
        logger.log(JSON.stringify(projectConfig.env));
      }
    }

    return process.exit(0);
  }

  switch (tree.command.name) {
    case 'set':
    case 'get':
    case 'del':
    return process.exit(0);
    default:
      logger.log(`Unknown command ${tree.command.name}`);
      return process.exit(1);
  }
};

export default envCommand;
