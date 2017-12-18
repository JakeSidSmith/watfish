import * as fs from 'fs';
import { Config, UTF8 } from './constants';
import * as logger from './logger';
import {
  createStringFromConfig,
  getConfigPath,
  getProjectName,
  loadWtfJson,
  writeConfigCallback,
} from './utils';

type TempRoute = Partial<{
  process: string;
  url: string;
}>;

export type ValueOrFunction<V> = V | (() => V);
export type Callback = (input: string) => any;
export type Condition = ValueOrFunction<boolean>;

export interface Question {
  message: ValueOrFunction<string>;
  callback: Callback;
  condition: Condition;
}

let config: Config | undefined;
let tempRoute: TempRoute = {};

export const QUESTIONS: Question[] = [
  {
    message: 'What is the name of the process you would like to route?',
    condition: true,
    callback: (value: string | undefined) => {
      tempRoute.process = value;
    },
  },
  {
    message: 'From what url would you like to route this process?',
    condition: () => Boolean(tempRoute.process),
    callback: (value: string | undefined) => {
      tempRoute.url = value;
    },
  },
  {
    message: () => {
      const projectName = getProjectName();
      const createdConfig = createConfig();
      const stringConfig = createStringFromConfig(createdConfig[projectName]);

      return `\nCreated config:\n\n${stringConfig}\nIs this correct? [y]`;
    },
    condition: true,
    callback: (input: string) => {
      if (input === 'n' || input === 'N') {
        process.exit(0);
      }
    },
  },
];

const createConfig = (): Config => {
  const routes = tempRoute.process ? {[tempRoute.process]: tempRoute.url as string} : {};
  const projectName = getProjectName();

  return {
    ...config,
    [projectName]: {
      routes,
    },
  };
};

const askForInput = (question: Question, callback: () => any) => {
  if (
    (typeof question.condition === 'boolean' && question.condition) ||
    (typeof question.condition === 'function' && question.condition())
  ) {
    process.stdin.resume();

    logger.log((typeof question.message === 'function' ? question.message() : question.message) + ' ');

    process.stdin.once('data', (data) => {
      process.stdin.pause();

      const input: string = (data || '').toString().trim();

      question.callback(input);

      callback();
    });
  } else {
    callback();
  }
};

export const askQuestions = (questions: Question[], callback: () => any) => {
  const [question, ...remainingQuestions] = questions;

  if (!question) {
    callback();
    return;
  }

  askForInput(question, () => {
    askQuestions(remainingQuestions, callback);
  });
};

export const writeFile = () => {
  const configPath = getConfigPath();
  const createdConfig = createConfig();
  const stringConfig = createStringFromConfig(createdConfig);

  fs.writeFile(
    configPath,
    stringConfig,
    UTF8,
    writeConfigCallback
  );
};

const init = () => {
  tempRoute = {};

  const configPath = getConfigPath();

  if (fs.existsSync(configPath)) {
    config = loadWtfJson(configPath);

    if (!config) {
      return;
    }

    askQuestions(QUESTIONS, writeFile);
  } else {
    logger.log(`No wtf.json found at ${configPath}. I\'ll create that for you`);
    config = {};
    askQuestions(QUESTIONS, writeFile);
  }
};

export default init;
