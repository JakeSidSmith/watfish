import * as fs from 'fs';
import {
  Config,
  MATCHES_NO,
  UTF8,
} from './constants';
import * as logger from './logger';
import {
  createStringFromConfig,
  getConfigPath,
  getProjectName,
  readWtfJson,
  writeConfigCallback,
} from './utils';

const init = () => {
  tempRoute = {};

  const configPath = getConfigPath();

  if (fs.existsSync(configPath)) {
    config = readWtfJson(configPath);
    askQuestions(QUESTIONS, writeFile);
  } else {
    logger.log(`No wtf.json found at ${configPath}. I\'ll create that for you`);
    config = {};
    askQuestions(QUESTIONS, writeFile);
  }
};

export default init;
