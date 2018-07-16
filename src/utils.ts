import * as colors from 'colors/safe';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as moment from 'moment';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import {
  Config,
  DEFAULT_ENV,
  ENV_BIN,
  MATCHES_ENV_VAR,
  MATCHES_SHEBANG,
  PADDING,
  TABLE_FLIP,
  UTF8,
  WAT,
} from './constants';
import * as logger from './logger';

export interface PortError extends Error {
  message: string;
  code: string;
}

export type PortCallback = (error: PortError | undefined, inUse?: boolean) => any;

export const setIn = (obj: {[i: string]: any}, setPath: ReadonlyArray<string>, value: any) => {
  const [first, ...rest] = setPath;

  if (!rest.length) {
    obj[first] = value;
  } else {
    if (!(first in obj)) {
      obj[first] = {};
    }

    setIn(obj[first], rest, value);
  }
};

export const getIn = (obj: Readonly<{[i: string]: any}>, setPath: ReadonlyArray<string>): any => {
  const [first, ...rest] = setPath;

  if (!rest.length) {
    return obj[first];
  } else {
    if (!(first in obj)) {
      return;
    }

    return getIn(obj[first], rest);
  }
};

export const delIn = (obj: {[i: string]: any}, setPath: ReadonlyArray<string>) => {
  const [first, ...rest] = setPath;

  if (!rest.length) {
    delete obj[first];
  } else {
    if (!(first in obj)) {
      return;
    } else {
      delIn(obj[first], rest);
    }
  }
};

export const isPortTaken = (port: number, callback: PortCallback) => {
  const tester = net.createServer();

  tester
    .once('error', (error: PortError) => {
      if (error.code !== 'EADDRINUSE') {
        callback(error);
      }

      callback(undefined, true);
    })
    .once('listening', () => {
      tester.once('close', () => {
        callback(undefined, false) ;
      })
      .close();
    })
    .listen(port);
};

export type ServerCallback = (error: PortError | undefined, port?: number) => any;

export const getAvailablePort = (callback: ServerCallback, attempt = 0) => {
  const server = net.createServer();

  server
    .once('error', (error: PortError) => {
      if (error.code !== 'EADDRINUSE') {
        callback(error);
      }

      if (attempt >= 100) {
        logger.log('Could not find an available port');
        return process.exit(1);
      }

      getAvailablePort(
        (portError: PortError | undefined, port?: number) => {
          server
            .once('close', () => {
              callback(portError, port);
            })
            .close();
        },
        attempt + 1
      );
    })
    .once('listening', () => {
      const { port } = server.address();

      server
        .once('close', () => {
          callback(undefined, port);
        })
        .close();
    })
    .listen(0);
};

export const handleShebang = (command: string): string => {
  const filePath = path.join(process.cwd(), command);
  const envFilePath = path.join(process.cwd(), ENV_BIN, command);

  // In root of project
  if (!fs.existsSync(filePath)) {
    // In env
    if (fs.existsSync(envFilePath)) {
      return envFilePath;
    // Global command
    } else {
      return command;
    }
  }

  const firstLine = fs.readFileSync(filePath, UTF8).split('\n')[0];

  if (!firstLine) {
    return command;
  }

  const shebang = MATCHES_SHEBANG.exec(firstLine);

  if (shebang) {
    const shebangCommand = shebang[2].trim();

    const shebangCommandPath = path.join(process.cwd(), ENV_BIN, shebangCommand);

    const envExists = fs.existsSync(shebangCommandPath);

    // Shebang in env
    if (envExists) {
      return `${shebangCommandPath} ${command}`;
    }

    // Global command
    return `${shebangCommand} ${command}`;
  }

  return command;
};

export const getEnvVariables = (envPath: string): {[i: string]: string} => {
  if (!fs.existsSync(envPath)) {
    logger.log(`No environment file at ${envPath}\n`);
    return {};
  }

  const envFile = fs.readFileSync(envPath, UTF8);

  const envVariables = dotenv.parse(envFile);

  logger.log(`Found ${Object.keys(envVariables).length} variables in ${envPath}\n`);

  return envVariables;
};

export const isTruthyString = (value: any): value is string => {
  return Boolean(value && typeof value === 'string');
};

export const injectEnvVars = (
  commandOptions: ReadonlyArray<string | undefined>,
  environment: Readonly<{[i: string]: string | undefined}>
) => {
  return commandOptions
    .filter(isTruthyString)
    .map((option) => {
      return option.replace(MATCHES_ENV_VAR, (match: string): string => {
        const varName = match.substring(1);

        if (varName in environment) {
          const value = environment[varName];

          /* istanbul ignore else */
          if (typeof value !== 'undefined') {
            return value;
          }
        }

        if (varName === 'PORT') {
          logger.log(
            colors.red(
              `${WAT}Environment variable $${varName} is not defined, please ensure you have configured your routes`
            )
          );
        } else {
          logger.log(
            colors.red(
              `${WAT}Environment variable $${varName} is not defined`
            )
          );
        }

        return match;
      });
    });
};

export const onClose = (prefix: string, code: number) => {
  const exitColor = code ? 'red' : 'green';
  const wat = code ? colors.red(WAT) : '';
  const tableFlip = code ? ' ' + TABLE_FLIP : '';
  const message = `${wat}${prefix}${colors[exitColor](`Process exited with code ${code}${tableFlip}`)}`;
  logger.log(message);
};

export const getConfigPath = () => {
  return path.join(os.homedir(), 'wtf.json');
};

export const getProjectName = () => {
  return path.basename(process.cwd());
};

export const getDisplayName = (processName: string, env: string): string => {
  return `${env === DEFAULT_ENV ? '' : `${env}:`}${processName}`;
};

export const wrapDisplayName = (displayName: string, longestName: number): string => {
  const diff = longestName - displayName.length;

  const padding = diff >= 0 ? PADDING.substring(0, diff) : '';

  return `[ ${displayName}${padding} ] `;
};

export const constructHTMLMessage = (message: string) => {
  return (
    `<html>
      <head>
        <title>WAT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      </head>
      <body>
        <div style="font-family: arial, helvetica, sans-serif; color: #333; text-align: center;">
          <pre style="display: inline-block; color: red; font-size: 10px; line-height: 1; text-align: left;">
            ${WAT}
          </pre>
          <p style="font-size: 16px;">${message}</p>
        </div>
      </body>
    </html>`
  );
};

export const getTimeNow = () => {
  return moment().format('HH:mm:ss.SS');
};

export const readWtfJson = (configPath: string): Config => {
  let config: Config = {};
  const configContent = fs.readFileSync(configPath, UTF8);

  try {
    config = JSON.parse(configContent);
  } catch (error) {
    logger.log(colors.red(`Invalid wtf.json at ${configPath}`));
    logger.log(colors.red(`${error.message}`));
    return {};
  }

  return config;
};

export const loadWtfJson = (configPath: string, projectName: string, env: string): Config => {
  if (!fs.existsSync(configPath)) {
    logger.log(`No wtf.json found at ${configPath} - run "wtf init" to begin setup\n`);
    return {};
  } else {
    logger.log(`Loading wtf.json from ${configPath}`);

    const config = readWtfJson(configPath);

    const configEnvVariables = getIn(config, [projectName, 'env', env]) || {};

    logger.log(`Found ${Object.keys(configEnvVariables).length} variables in wtf.json\n`);

    return config;
  }
};

export const getRouterPort = () => {
  const { PORT } = process.env;

  return PORT ? parseInt(PORT, 10) : 8080;
};

export const createStringFromConfig = (createdConfig: {} | undefined): string => {
  return JSON.stringify(
    createdConfig,
    undefined,
    2
  ) + '\n';
};

export const writeConfigCallback = (error?: NodeJS.ErrnoException) => {
  if (error) {
    logger.log(error.message);
    return process.exit(1);
  }

  const configPath = getConfigPath();

  logger.log(`wtf.json written to ${configPath}`);
};
