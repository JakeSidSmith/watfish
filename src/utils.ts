import * as colors from 'colors';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import {
  ENV_BIN,
  MATCHES_ENV_KEY_VALUE,
  MATCHES_ENV_VAR,
  MATCHES_SHEBANG,
  UTF8,
  WAT,
} from './constants';
import * as logger from './logger';

export interface PortError extends Error {
  message: string;
  code: string;
}

export type PortCallback = (error: PortError | undefined, inUse?: boolean) => any;

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

export const getEnvVariables = (env: string, envPath: string): {[i: string]: string} => {
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

export const onClose = (prefix: string, code: number) => {
  const exitColor = code ? 'red' : 'green';
  logger.log(`${code ? colors.red(WAT) : ''}${prefix}${colors[exitColor](`Process exited with code ${code}`)}`);
};
