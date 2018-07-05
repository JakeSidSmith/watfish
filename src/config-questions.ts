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
  writeConfigCallback,
} from './utils';

type TempRoute = Partial<{
  process: string;
  url: string;
}>;

export type ValueOrFunction<V> = V | ((config: Config) => V);
export type Callback = (config: Config, input?: string) => any;
export type Condition = ValueOrFunction<boolean>;

export interface Question {
  message: ValueOrFunction<string>;
  callback: Callback;
  condition: Condition;
}

// let config: Config | undefined;
// const tempRoute: TempRoute = {};

const createConfig = (config: Config): Config => {
  const routes = tempRoute.process ? {[tempRoute.process]: tempRoute.url as string} : {};
  const projectName = getProjectName();

  return {
    ...config,
    [projectName]: {
      routes,
    },
  };
};

export const QUESTIONS: Question[] = [
  {
    message: 'What is the name of the process you would like to route?',
    condition: true,
    callback: (config: Config, value: string | undefined) => {
      tempRoute.process = value;
    },
  },
  {
    message: 'From what url would you like to route this process?',
    condition: () => Boolean(tempRoute.process),
    callback: (config: Config, value: string | undefined) => {
      tempRoute.url = value;
    },
  },
  {
    message: (config: Config) => {
      const projectName = getProjectName();
      const createdConfig = createConfig(config);
      const stringConfig = createStringFromConfig(createdConfig[projectName]);

      return `\nCreated config:\n\n${stringConfig}\nIs this correct? [y]`;
    },
    condition: true,
    callback: (config: Config, value: string | undefined) => {
      if (value && MATCHES_NO.test(value)) {
        process.exit(0);
      }
    },
  },
];

const askForInput = (config: Config, question: Question, callback: () => any) => {
  if (
    (typeof question.condition === 'boolean' && question.condition) ||
    (typeof question.condition === 'function' && question.condition(config))
  ) {
    process.stdin.resume();

    logger.log((typeof question.message === 'function' ? question.message(config) : question.message) + ' ');

    process.stdin.once('data', (data) => {
      process.stdin.pause();

      const input: string = (data || '').toString().trim();

      question.callback(config, input);

      callback();
    });
  } else {
    callback();
  }
};

const writeFile = (config: Config) => {
  const configPath = getConfigPath();
  const createdConfig = createConfig(config);
  const stringConfig = createStringFromConfig(createdConfig);

  fs.writeFile(
    configPath,
    stringConfig,
    UTF8,
    writeConfigCallback
  );
};

export const askQuestions = (config: Config | undefined = {}, questions: Question[]) => {
  const [question, ...remainingQuestions] = questions;

  if (!question) {
    writeFile(config);
    return;
  }

  askForInput(
    config,
    question, () => {
      askQuestions(config, remainingQuestions);
    }
  );
};
