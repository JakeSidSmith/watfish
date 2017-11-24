import * as net from 'net';

export interface PortError extends Error {
  message: string;
  code: string;
}

export type PortCallback = (error: PortError | undefined, thing?: boolean) => any;

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
