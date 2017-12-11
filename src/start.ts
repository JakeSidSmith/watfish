import * as childProcess from 'child_process';
import * as colors from 'colors/safe';
import * as es from 'event-stream';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import * as WebSocket from 'ws';
import * as constants from './constants';
import {
  Colors,
  COLORS,
  DEFAULT_ENV,
  PADDING,
  SOCKET_PORT,
  UTF8,
} from './constants';
import * as logger from './logger';
import * as procfile from './procfile';
import router, { ACTIONS, Routes } from './router';
import {
  getAvailablePort,
  getConfigPath,
  getEnvVariables,
  getProjectName,
  handleShebang,
  injectEnvVars,
  onClose,
  PortError,
} from './utils';

const routes: Routes = {};

let ws: WebSocket;
let longestName: number = 0;

export const applyRoutes = () => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: ACTIONS.ADD_ROUTES, payload: routes}));
  }
};

const addRoute = (processName: string, color: Colors, url: string, port: number) => {
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

export const startProcessWithMaybePort =
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
    PYTHONUNBUFFERED: 'true',
  };

  if (url && port) {
    environment.PORT = port.toString();
    addRoute(displayName, color, url, port);
  }

  const resolvedCommand = handleShebang(item.command);
  const commandOptions = injectEnvVars(item.options, environment);

  const subProcess = childProcess.spawn(
    resolvedCommand,
    commandOptions,
    {
      cwd: process.cwd(),
      shell: true,
      env: environment,
      stdio: 'pipe',
    }
  );

  logger.log(colors[color](`Running ${resolvedCommand} ${commandOptions.join(' ')}`));
  logger.log(colors[color](`PID: ${subProcess.pid}, Parent PID: ${process.pid}\n`));

  const prefix = colors[color](wrapDisplayName(getDisplayName(processName, env)));

  subProcess.stdout
    .pipe(es.split('\n'))
    .pipe(es.map((message: any, cb: any) => {
      cb(null, `${prefix}${message}\n`);
    }))
    .pipe(process.stderr);

  subProcess.stderr
    .pipe(es.split('\n'))
    .pipe(es.map((message: any, cb: any) => {
      cb(null, `${prefix}${message}\n`);
    }))
    .pipe(process.stderr);

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

export const startProcesses = (procfileData: string, wtfJson: constants.ConfigProject, tree: Tree) => {
  let { processes } = tree.args;
  let { env } = tree.kwargs;
  processes = Array.isArray(processes) ? processes : [];
  env = typeof env === 'string' ? env : DEFAULT_ENV;

  const procfileConfig = procfile.parse(procfileData.toString());

  let index = 0;

  for (const processName in procfileConfig) {
    /* istanbul ignore else */
    if (procfileConfig.hasOwnProperty(processName)) {
      const displayName = getDisplayName(processName, env);

      if (
        (!processes.length || processes.indexOf(processName) >= 0) &&
        (!longestName || displayName.length > longestName)
      ) {
        longestName = displayName.length;
      }
    }
  }

  for (const processName in procfileConfig) {
    /* istanbul ignore else */
    if (procfileConfig.hasOwnProperty(processName)) {
      if (!processes.length || processes.indexOf(processName) >= 0) {
        const item = procfileConfig[processName];

        const url = wtfJson.routes &&
          (processName in wtfJson.routes) ? wtfJson.routes[processName] : undefined;

        startProcess(item, processName, env, COLORS[index % (COLORS.length)], url);
      }

      index += 1;
    }
  }
};

export const readWtfJson = (procfileData: string, tree: Tree) => {
  const configPath = getConfigPath();
  const projectName = getProjectName();
  let wtfJson: any = {};

  if (!fs.existsSync(configPath)) {
    logger.log(`No wtf.json found at ${configPath} - run "wtf init" to begin setup\n`);
  } else {
    const configContent = fs.readFileSync(configPath, UTF8);

    try {
      wtfJson = JSON.parse(configContent);
    } catch (error) {
      logger.log('Invalid wtf.json');
      logger.log(error.message);
      return process.exit(1);
    }

    logger.log(`Loaded wtf.json from ${configPath}\n`);
  }

  startProcesses(procfileData, wtfJson[projectName] || {}, tree);
};

export const startRouterCommunication = () => {
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

  let { env } = tree.kwargs;
  env = typeof env === 'string' ? env : DEFAULT_ENV;

  const procfilePath = path.join(process.cwd(), 'etc/environments', env, 'procfile');

  if (!fs.existsSync(procfilePath)) {
    logger.log(`No procfile found at ${procfilePath}`);
    return process.exit(1);
  }

  const procfileContent = fs.readFileSync(procfilePath, UTF8);

  readWtfJson(procfileContent, tree);
};

export default start;
