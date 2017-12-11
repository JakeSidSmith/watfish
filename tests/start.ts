jest.mock('../src/router', () => ({
  default: jest.fn(),
}));

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as WebSocket from 'ws';
import { UTF8 } from '../src/constants';
import * as logger from '../src/logger';
import router from '../src/router';
import * as start from '../src/start';
import { applyRoutes, startProcess, startRouterCommunication } from '../src/start';

interface NetMock {
  _trigger: (event: string, data: any) => void;
  _clear: () => void;
}

describe('start.ts', () => {

  const { _clear, _trigger } = net as any as NetMock;

  beforeEach(() => {
    process.env = {
      VARIABLE: 'variable',
    };

    const subProcess = childProcess.spawn('test');
    (childProcess.spawn as jest.Mock<any>).mockClear();

    (subProcess.stderr.on as jest.Mock<any>).mockClear();
    (subProcess.stdout.on as jest.Mock<any>).mockClear();

    (router as jest.Mock<any>).mockClear();

    spyOn(process, 'exit');
    spyOn(process, 'cwd').and.returnValue('directory');
    spyOn(logger, 'log').and.callFake(() => null);

    _clear();
  });

  describe('start', () => {

    beforeEach(() => {
      spyOn(start, 'readWtfJson');
      spyOn(start, 'startRouterCommunication');
    });

    it('should start the router and communication', () => {
      start.default({
        name: 'start',
        args: {},
        kwargs: {},
        flags: {},
      });

      expect(start.startRouterCommunication).toHaveBeenCalled();
      expect(router).toHaveBeenCalled();
    });

    it('should exit if it cannot find a procfile', () => {
      start.default({
        name: 'start',
        args: {},
        kwargs: {
          env: 'error',
        },
        flags: {},
      });

      expect(logger.log).toHaveBeenCalledWith('No procfile found at directory/etc/environments/error/procfile');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should read from a procfile', () => {
      start.default({
        name: 'start',
        args: {},
        kwargs: {},
        flags: {},
      });

      expect(fs.readFileSync).toHaveBeenCalledWith(
        'directory/etc/environments/development/procfile',
        UTF8
      );
    });

    it('should call readWtfJson', () => {
      start.default({
        name: 'start',
        args: {},
        kwargs: {},
        flags: {},
      });

      expect(start.readWtfJson)
        .toHaveBeenCalledWith('web: http-server . -c-0 -o\nwatch: watchify src/index.js build/index.js');
    });

  });

  describe('startRouterCommunication', () => {

    beforeEach(() => {
      spyOn(WebSocket.prototype, 'on').and.callThrough();
    });

    it('should start a web socket client', () => {
      startRouterCommunication();

      expect(WebSocket.prototype.on).toHaveBeenCalledWith('open', applyRoutes);
      expect(WebSocket.prototype.on).toHaveBeenCalledTimes(3);
    });

    it('should restart the router and communication on close', () => {
      jest.useFakeTimers();

      startRouterCommunication();

      expect(router).not.toHaveBeenCalled();
      expect(WebSocket.prototype.on).toHaveBeenCalledTimes(3);

      (WebSocket as any)._trigger('close');

      jest.runAllTimers();

      expect(router).toHaveBeenCalled();
      expect(WebSocket.prototype.on).toHaveBeenCalledTimes(6);
    });

    it('should log messages from the router', () => {
      startRouterCommunication();

      (WebSocket as any)._trigger('message', 'Hello, World!');

      expect(logger.log).toHaveBeenCalledWith('Hello, World!');
    });

  });

  // it('should spawn child the processes that are supplied', () => {
  //   start({
  //     name: 'start',
  //     args: {
  //       processes: 'web',
  //     },
  //     kwargs: {},
  //     flags: {},
  //   });

  //   _trigger('listening', undefined);

  //   expect(childProcess.spawn).toHaveBeenCalledTimes(1);
  //   expect(childProcess.spawn).toHaveBeenCalledWith(
  //     'directory/env/bin/node http-server',
  //     ['.', '-c-0', '-o'],
  //     {
  //       cwd: 'directory',
  //       shell: true,
  //       env: {
  //         VARIABLE: 'variable',
  //         VAR: 'value',
  //         PORT: '0',
  //       },
  //     }
  //   );
  // });

  // it('should not spawn unknown processes', () => {
  //   start({
  //     name: 'start',
  //     args: {
  //       processes: 'unknown',
  //     },
  //     kwargs: {},
  //     flags: {},
  //   });

  //   _trigger('listening', undefined);

  //   expect(childProcess.spawn).not.toHaveBeenCalled();
  // });

  // it('should log the environment if not the default', () => {
  //   start({
  //     name: 'start',
  //     args: {
  //       processes: 'watch',
  //     },
  //     kwargs: {},
  //     flags: {},
  //   });

  //   _trigger('listening', undefined);

  //   expect(logger.log).toHaveBeenCalledWith('[ watch ] data');
  //   expect(logger.log).toHaveBeenCalledWith('[ watch ] error');
  //   expect(logger.log).toHaveBeenCalledWith('[ watch ] Process exited with code 7');

  //   start({
  //     name: 'start',
  //     args: {
  //       processes: 'watch',
  //     },
  //     kwargs: {
  //       env: 'production',
  //     },
  //     flags: {},
  //   });

  //   _trigger('listening', undefined);

  //   expect(logger.log).toHaveBeenCalledWith('[ production:watch ] data');
  //   expect(logger.log).toHaveBeenCalledWith('[ production:watch ] error');
  //   expect(logger.log).toHaveBeenCalledWith('[ production:watch ] Process exited with code 7');
  // });

  describe('startProcess', () => {
    it('should start a process on an available port', () => {
      startProcess({command: 'http-server', options: []}, 'web', 'development', 'red');

      _trigger('listening', undefined);

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'directory/env/bin/node http-server',
        [],
        {
          cwd: 'directory',
          shell: true,
          env: {
            VARIABLE: 'variable',
            VAR: 'value',
            PORT: '0',
          },
        }
      );
    });

    it('should throw a port in use error', () => {
      startProcess({command: 'http-server', options: []}, 'web', 'development', 'red');

      for (let i = 0; i <= 100; i += 1) {
        _trigger('error', {code: 'EADDRINUSE', message: 'port in use'});
      }

      expect(logger.log).toHaveBeenCalledWith('Could not find an available port');
    });

    it('should throw an unknown error', () => {
      startProcess({command: 'http-server', options: []}, 'web', 'development', 'red');

      _trigger('error', new Error('error'));

      expect(logger.log).toHaveBeenCalledWith('error');
    });
  });

});
