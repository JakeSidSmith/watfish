import * as net from 'net';

export interface PortError extends Error {
  message: string;
  code: string;
}

export type PortCallback = (error: PortError | undefined, inUse?: boolean) => any;

export const isPortTaken = (port: string, callback: PortCallback) => {
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

export type ServerCallback = (error: PortError | undefined, port?: string) => any;

export const getAvailablePort = (callback: ServerCallback) => {
  const server = net.createServer();

  server
    .once('error', (error: PortError) => {
      if (error.code !== 'EADDRINUSE') {
        callback(error);
      }

      getAvailablePort((portError: PortError | undefined, port?: string) => {
        server
          .once('close', () => {
            callback(portError, port);
          })
          .close();
      });
    })
    .once('listening', () => {
      const { port } = server.address();

      server
        .once('close', () => {
          callback(undefined, port.toString());
        })
        .close();
    })
    .listen(0);
};
