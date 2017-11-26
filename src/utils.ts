import * as net from 'net';
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
