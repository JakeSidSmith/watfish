import * as fs from 'fs';
import { Tree } from 'jargs';
import { Config, ConfigProject, DEFAULT_ENV, UTF8 } from './constants';
import * as logger from './logger';
import { getConfigPath, getProjectName } from './utils';

const env = (tree: Tree) => {
  let config: Config = {};
  let projectConfig: ConfigProject = {};
  const configPath = getConfigPath();
  const projectName = getProjectName();

  if (!fs.existsSync(configPath)) {
    if (tree.command && tree.command.name === 'set') {
      logger.log(`No wtf.json found at ${configPath}. I\'ll create that for you`);
    } else {
      logger.log(`No wtf.json found at ${configPath} - run "wtf init" to begin setup`);
      process.exit(1);
    }
  } else {
    const configContent = fs.readFileSync(configPath, UTF8);

    try {
      config = JSON.parse(configContent);
      projectConfig = config[projectName];
    } catch (error) {
      logger.log(`Invalid wtf.json at ${configPath}`);
      logger.log(error.message);
      return process.exit(1);
    }
  }

  if (!tree.command) {
    if (!projectConfig) {
      logger.log(`No project config in wtf.json at ${configPath}`);
    } else {
      if (!projectConfig.env) {
        logger.log(`No environments for this project at ${configPath}`);
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

export default env;
