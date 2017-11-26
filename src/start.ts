import * as childProcess from 'child_process';
import * as colors from 'colors/safe';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as WebSocket from 'ws';
import { SOCKET_PORT, UTF8 } from './constants';
import * as logger from './logger';
import * as procfile from './procfile';
import router, { ACTIONS, Routes } from './router';
import { getAvailablePort, PortError } from './utils';

router();

const routes: Routes = {};

const ws = new WebSocket(`ws://localhost:${SOCKET_PORT}`);

const applyRoutes = () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: ACTIONS.ADD_ROUTES, payload: routes}));
  }
};

const addRoute = (processName: string, url: string, port: number) => {
  routes[processName] = {
    url,
    port,
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: ACTIONS.ADD_ROUTE, payload: {processName, url, port}}));
  }
};

ws.on('open', applyRoutes);

ws.on('close', () => {
  router();
});

ws.on('message', (data) => {
  logger.log(data.toString());
});

const PADDING = '                       ';
const DEFAULT_ENV = 'development';
const ENV_BIN = 'env/bin';
const MATCHES_SHEBANG = /#!( *\S+ +)?( *\S+ *)$/m;
const MATCHES_ENV_KEY_VALUE = /^(\w+)=(\S+)$/;
const MATCHES_ENV_VAR = /\$([A-Z0-9_]+)/;

type Colors = 'red' | 'green' | 'blue' | 'magenta' | 'cyan' | 'yellow';

const COLORS: Colors[] = [
  'red',
  'green',
  'blue',
  'magenta',
  'cyan',
  'yellow',
];

let longestName: number = 0;
let options: Tree;

export type DataOrError = Buffer | Error | string;

const getDisplayName = (processName: string, env: string): string => {
  return `${env === DEFAULT_ENV ? '' : `${env}:`}${processName}`;
};

const wrapDisplayName = (displayName: string): string => {
  const diff = longestName - displayName.length;

  const padding = diff >= 0 ? PADDING.substring(0, diff) : '';

  return `[ ${displayName}${padding} ]`;
};

const onDataOrError = (processName: string, env: string, color: Colors, dataOrError: DataOrError) => {
  const messages = (dataOrError instanceof Error ? dataOrError.message : dataOrError)
    .toString().split('\n');
  const displayName = colors[color](wrapDisplayName(getDisplayName(processName, env)));

  messages.forEach((message) => {
    logger.log(`${displayName} ${message}`);
  });
};

const onClose = (processName: string, env: string, color: Colors, code: number) => {
  const displayName = colors[color](wrapDisplayName(getDisplayName(processName, env)));

  logger.log(`${displayName} ${colors.red(`Process exited with code ${code}`)}`);
};

export const handleShebang = (command: string): string => {
  const filePath = path.join(process.cwd(), command);

  if (!fs.existsSync(filePath)) {
    return command;
  }

  const content = fs.readFileSync(filePath, UTF8);

  const shebang = MATCHES_SHEBANG.exec(content);

  if (shebang) {
    const shebangCommand = shebang[2].trim();

    const shebangCommandPath = path.join(process.cwd(), ENV_BIN, shebangCommand);

    const envExists = fs.existsSync(shebangCommandPath);

    if (envExists) {
      return `${shebangCommandPath} ${command}`;
    }

    return `${shebangCommand} ${command}`;
  }

  return command;
};

export const getEnvVariables = (env: string, color: Colors) => {
  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const lines = fs.readFileSync(envPath, UTF8).split('\n');

  const envVariables: {[i: string]: string} = {};

  lines.forEach((line) => {
    const match = MATCHES_ENV_KEY_VALUE.exec(line);

    if (match) {
      envVariables[match[1]] = match[2];
    }
  });

  logger.log(colors[color](`Found ${Object.keys(envVariables).length} variables in ${envPath}`));

  return envVariables;
};

export const injectEnvVars = (commandOptions: string[], environment: {[i: string]: string}) => {
  return commandOptions.map((option) => {
    return option.replace(MATCHES_ENV_VAR, (match: string): string => {
      const varName = match.substring(1);

      if (varName in environment) {
        return environment[varName];
      }

      return match;
    });
  });
};

const startProcessOnPort =
  (item: procfile.Command, processName: string, env: string, color: Colors, port: number) => {
  const displayName = getDisplayName(processName, env);

  logger.log(colors[color](`Starting ${displayName} process...`));

  const environment: {[i: string]: string} = {
    ...getEnvVariables(env, color),
    ...process.env,
    PORT: port.toString(),
  };

  const command = handleShebang(item.command);

  const commandOptions = injectEnvVars(item.options, environment);

  logger.log(colors[color](`Running ${command} ${commandOptions.join(' ')}\n`));

  addRoute(colors[color](displayName), 'test.ctf.sh', port);

  const subProcess = childProcess.spawn(
    command,
    commandOptions,
    {
      cwd: process.cwd(),
      shell: true,
      env: environment,
    }
  );

  subProcess.stdout.on('data', (dataOrError) => onDataOrError(processName, env, color, dataOrError));
  subProcess.stdout.on('error', (dataOrError) => onDataOrError(processName, env, color, dataOrError));
  subProcess.stderr.on('data', (dataOrError) => onDataOrError(processName, env, color, dataOrError));
  subProcess.stderr.on('error', (dataOrError) => onDataOrError(processName, env, color, dataOrError));

  subProcess.on('close', (code) => onClose(processName, env, color, code));
};

export const startProcess = (item: procfile.Command, processName: string, env: string, color: Colors) => {
  getAvailablePort((error: PortError | undefined, port: number) => {
    if (error) {
      logger.log(error.message);
      return process.exit(1);
    }

    startProcessOnPort(item, processName, env, color, port);
  });
};

export const readFileCallback = (error: NodeJS.ErrnoException, data: string) => {
  if (error) {
    logger.log(error.message);
    return process.exit(1);
  }

  const { processes } = options.args;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfileConfig = procfile.parse(data);

  let index = 0;

  for (const processName in procfileConfig) {
    /* istanbul ignore else */
    if (
      procfileConfig.hasOwnProperty(processName) &&
      (!processes || processes === processName) &&
      (!longestName || processName.length > longestName)
    ) {
      longestName = processName.length;
    }
  }

  for (const processName in procfileConfig) {
    /* istanbul ignore else */
    if (procfileConfig.hasOwnProperty(processName)) {
      if (!processes || processes === processName) {
        const item = procfileConfig[processName];

        startProcess(item, processName, env, COLORS[index % (COLORS.length)]);
      }

      index += 1;
    }
  }
};

const start = (tree: Tree) => {
  options = tree;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfilePath = path.join(process.cwd(), 'etc/environments', env, 'procfile');

  fs.readFile(procfilePath, UTF8, readFileCallback);
};

export default start;
