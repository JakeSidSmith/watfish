import * as childProcess from 'child_process';
import * as colors from 'colors/safe';
import * as es from 'event-stream';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as WebSocket from 'ws';
import {
  Colors,
  COLORS,
  DataOrError,
  DEFAULT_ENV,
  MATCHES_CTF_URL,
  PADDING,
  SOCKET_PORT,
  UTF8,
} from './constants';
import * as logger from './logger';
import * as procfile from './procfile';
import router, { ACTIONS, Routes } from './router';
import {
  getAvailablePort,
  getEnvVariables,
  handleShebang,
  injectEnvVars,
  onClose,
  PortError,
} from './utils';

const routes: Routes = {};

let ws: WebSocket;
let longestName: number = 0;
let options: Tree;

const applyRoutes = () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: ACTIONS.ADD_ROUTES, payload: routes}));
  }
};

const addRoute = (processName: string, color: Colors, url: string, port: number) => {
  if (!MATCHES_CTF_URL.test(url)) {
    logger.log(`Invalid url ${url}`);
    logger.log('URLs must follow the pattern sub-domain.ctf.sh and should not include a port or protocol');
    return process.exit(1);
  }

  routes[url] = {
    processName,
    url,
    port,
    color,
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: ACTIONS.ADD_ROUTE, payload: {processName, color, url, port}}));
  }
};

const getDisplayName = (processName: string, env: string): string => {
  return `${env === DEFAULT_ENV ? '' : `${env}:`}${processName}`;
};

const wrapDisplayName = (displayName: string): string => {
  const diff = longestName - displayName.length;

  const padding = diff >= 0 ? PADDING.substring(0, diff) : '';

  return `[ ${displayName}${padding} ] `;
};

const startProcessWithMaybePort =
  (item: procfile.Command, processName: string, env: string, color: Colors, url?: string, port?: number) => {
  const displayName = getDisplayName(processName, env);

  logger.log(colors[color](`Starting ${displayName} process...`));

  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');
  const envVariables = getEnvVariables(env, envPath);

  logger.log(colors[color](`Found ${Object.keys(envVariables).length} variables in ${envPath}`));

  const environment: {[i: string]: string} = {
    ...envVariables,
    ...process.env,
    PORT: process.env.PORT || '',
  };

  if (url && port) {
    environment.PORT = port.toString();
    addRoute(displayName, color, url, port);
  }

  const command = handleShebang(item.command);
  const commandOptions = injectEnvVars(item.options, environment);

  const subProcess = childProcess.spawn(
    command,
    commandOptions,
    {
      cwd: process.cwd(),
      shell: true,
      env: environment,
      stdio: 'pipe',
    }
  );

  logger.log(colors[color](`Running ${command} ${commandOptions.join(' ')}`));
  logger.log(colors[color](`PID: ${subProcess.pid}, Parent PID: ${process.pid}\n`));

  const prefix = colors[color](wrapDisplayName(getDisplayName(processName, env)));

  subProcess.stdout
    .pipe(es.split('\n'))
    .pipe(es.map((message: any, cb: any) => {
      logger.log(`${prefix}${message}`);
      cb();
    }));

  subProcess.stderr
    .pipe(es.split('\n'))
    .pipe(es.map((message: any, cb: any) => {
      logger.log(`${prefix}${message}`);
      cb();
    }));

  subProcess.on('close', (code) => onClose(prefix, code));
};

export const startProcess = (item: procfile.Command, processName: string, env: string, color: Colors, url?: string) => {
  if (url) {
    getAvailablePort((error: PortError | undefined, port: number) => {
      if (error) {
        logger.log(error.message);
        return process.exit(1);
      }

      startProcessWithMaybePort(item, processName, env, color, url, port);
    });
  } else {
    startProcessWithMaybePort(item, processName, env, color);
  }
};

const startProcesses = (procfileData: Buffer | string, wtfJson?: any) => {
  const { processes } = options.args;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfileConfig = procfile.parse(procfileData.toString());

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

        const url = processName in wtfJson.routes ? wtfJson.routes[processName] : undefined;

        startProcess(item, processName, env, COLORS[index % (COLORS.length)], url);
      }

      index += 1;
    }
  }
};

export const readProcfileCallback = (error: NodeJS.ErrnoException, procfileData: Buffer | string) => {
  if (error) {
    logger.log(error.message);
    return process.exit(1);
  }

  const wtfJsonPath = path.join(process.cwd(), 'wtf.json');

  if (!fs.existsSync(wtfJsonPath)) {
    logger.log(`No wtf.json found at ${wtfJsonPath}\n`);
    startProcesses(procfileData);
  } else {
    fs.readFile(wtfJsonPath, UTF8, (wtfJsonError: Error, wtfJsonData) => {
      let wtfJson;

      try {
        wtfJson = JSON.parse(wtfJsonData.toString());
      } catch (error) {
        logger.log('Invalid wtf.json');
        logger.log(error.message);
        return process.exit(1);
      }

      logger.log(`Loaded wtf.json from ${wtfJsonPath}\n`);

      startProcesses(procfileData, wtfJson);
    });
  }

};

const startRouterCommunication = () => {
  ws = new WebSocket(`ws://localhost:${SOCKET_PORT}`);

  ws.on('open', applyRoutes);

  ws.on('close', () => {
    router();

    setTimeout(startRouterCommunication, 1000);
  });

  ws.on('message', (data) => {
    logger.log(data.toString());
  });
};

const start = (tree: Tree) => {
  router();
  startRouterCommunication();

  options = tree;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfilePath = path.join(process.cwd(), 'etc/environments', env, 'procfile');

  if (!fs.existsSync(procfilePath)) {
    logger.log(`No procfile found at ${procfilePath}`);
    return process.exit(1);
  }

  fs.readFile(procfilePath, UTF8, readProcfileCallback);
};

export default start;
