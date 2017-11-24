interface Route {
  process?: string;
  url?: string;
}

interface Config {
  routes: Route[];
}

export type Callback = (value: string | undefined) => any;
export type Condition = (value: string | undefined) => boolean;

export interface Question {
  message: string;
  callback: Callback;
  condition: Condition;
}

const config: Config = {};
const route: Route = {};

export const QUESTIONS: Question[] = [
  {
    message: 'What is the name of the process you would like to route?',
    condition: (value: string | undefined) => Boolean(value),
    callback: (value: string | undefined) => {
      route.process = value;
    },
  },
  {
    message: 'What url would you like to route this process to?',
    condition: (value: string | undefined) => 'process' in route && Boolean(value),
    callback: (value: string | undefined) => {
      route.url = value;
    },
  },
];

const askForInput = ({message, callback, condition}: Question) => {
  process.stdin.resume();

  process.stderr.write(message);

  process.stdin.once('data', (data) => {
    const value: string | undefined = data.toString().trim();

    if (condition(value)) {
      callback(value);
    }
  });
};

const createStringConfig = () => {
  const routes = route.process ? [route] : undefined;

  return JSON.stringify({
    ...config,
    routes,
  });
};

const init = () => {
  const questions = [...QUESTIONS];

  while (questions.length) {
    const question = questions.shift() as Question;

    askForInput(question);
  }

  return createStringConfig();
};

export default init;
