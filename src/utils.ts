import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { ENV_BIN, UTF8 } from './constants';
import * as logger from './logger';

const MATCHES_SHEBANG = /#!( *\S+ +)?( *\S+ *)$/;

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
