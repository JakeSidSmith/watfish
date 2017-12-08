import * as fs from 'fs';
import { UTF8 } from './constants';
import * as logger from './logger';
import { getConfigPath, getProjectName } from './utils';

type TempRoute = Partial<{
  process: string;
  url: string;
}>;

export interface Routes {
  [i: string]: string;
}

export interface Config {
  [i: string]: Partial<{
    routes: Routes;
  }>;
}

export type ValueOrFunction<V> = V | (() => V);
export type Callback = (value: string | undefined) => any;
export type Condition = ValueOrFunction<boolean>;

export interface Question {
  message: ValueOrFunction<string>;
  callback: Callback;
  condition: Condition;
}

let config: Config = {};
let tempRoute: TempRoute = {};

const createStringFromConfig = (createdConfig: {} | undefined): string => {
  return JSON.stringify(
    createdConfig,
    undefined,
    2
  ) + '\n';
};

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
    callback: (value: string | undefined) => {
      if (value === 'n' || value === 'N') {
        process.exit(0);
      }
    },
  },
];

const askForInput = (question: Question, callback: () => any) => {
  if (
    (typeof question.condition === 'boolean' && question.condition) ||
    (typeof question.condition === 'function' && question.condition())
  ) {
    process.stdin.resume();

    logger.log((typeof question.message === 'function' ? question.message() : question.message) + ' ');

    process.stdin.once('data', (data) => {
      const value: string | undefined = (data || '').toString().trim();

      question.callback(value);

      process.stdin.pause();

      callback();
    });
  } else {
    callback();
  }
};

export const writeFileCallback = (error?: NodeJS.ErrnoException) => {
  if (error) {
    logger.log(error.message);
    return process.exit(1);
  }

  const configPath = getConfigPath();

  logger.log(`wtf.json written to ${configPath}`);
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
    writeFileCallback
  );
};

const init = () => {
  tempRoute = {};

  const configPath = getConfigPath();

  if (fs.existsSync(configPath)) {
    fs.readFile(configPath, (error: NodeJS.ErrnoException, data) => {
      if (error) {
        logger.log(error.message);
        return process.exit(1);
      }

      try {
        config = JSON.parse(data.toString());
      } catch (error) {
        logger.log('Invalid wtf.json');
        logger.log(error.message);
        return process.exit(1);
      }

      askQuestions(QUESTIONS, writeFile);
    });
  } else {
    logger.log(`No wtf.json found at ${configPath}. I\'ll create that for you`);
    config = {};
    askQuestions(QUESTIONS, writeFile);
  }
};

export default init;
