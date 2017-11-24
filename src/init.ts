import * as fs from 'fs';
import * as path from 'path';
import { UTF8 } from './constants';

type Route = Partial<{
  process: string;
  url: string;
}>;

type Config = Partial<{
  routes: Route[];
}>;

export type ValueOrFunction<V> = V | (() => V);
export type Callback = (value: string | undefined) => any;
export type Condition = ValueOrFunction<boolean>;

export interface Question {
  message: ValueOrFunction<string>;
  callback: Callback;
  condition: Condition;
}

let config: Config = {};
let route: Route = {};

const createStringConfig = (): string => {
  const routes = route.process ? [route] : [];

  return JSON.stringify(
    {
      ...config,
      routes,
    },
    undefined,
    2
  ) + '\n';
};

export const QUESTIONS: Question[] = [
  {
    message: 'What is the name of the process you would like to route?',
    condition: true,
    callback: (value: string | undefined) => {
      route.process = value;
    },
  },
  {
    message: 'What url would you like to route this process to?',
    condition: () => Boolean(route.process),
    callback: (value: string | undefined) => {
      route.url = value;
    },
  },
  {
    message: () => {
      return `\nCreated config:\n\n${createStringConfig()}\nIs this correct? [y]`;
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

    process.stderr.write((typeof question.message === 'function' ? question.message() : question.message) + ' ');

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
    process.stderr.write(error.message);
    return process.exit(1);
  }

  const configPath = path.join(process.cwd(), 'wtf.json');

  process.stderr.write(`wtf.json written to ${configPath}\n`);
};

const askQuestions = (questions: Question[], callback: () => any) => {
  const [question, ...remainingQuestions] = questions;

  if (!question) {
    callback();
    return;
  }

  askForInput(question, () => {
    askQuestions(remainingQuestions, callback);
  });
};

const writeFile = () => {
  const configPath = path.join(process.cwd(), 'wtf.json');

  fs.writeFile(
    configPath,
    createStringConfig(),
    UTF8,
    writeFileCallback
  );
};

const init = () => {
  config = {};
  route = {};

  askQuestions(QUESTIONS, writeFile);
};

export default init;
