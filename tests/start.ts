jest.mock('../src/router', () => ({
  default: jest.fn(),
}));

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as WebSocket from 'ws';
import { DEFAULT_ENV, UTF8 } from '../src/constants';
import * as logger from '../src/logger';
import router from '../src/router';
import * as start from '../src/start';
import {
  applyRoutes,
  readWtfJson,
  startProcess,
  startProcesses,
  startRouterCommunication,
} from '../src/start';
import * as utils from '../src/utils';

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
        .toHaveBeenCalledWith(
          'web: http-server . -c-0 -o\nwatch: watchify src/index.js build/index.js',
          {
            name: 'start',
            args: {},
            kwargs: {},
            flags: {},
          }
        );
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

  describe('readWtfJson', () => {

    beforeEach(() => {
      spyOn(start, 'startProcesses');
    });

    it('should read from the wtf.json and start processes', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'empty/wtf.json');

      readWtfJson('procfileData', {name: 'readWtfJson', args: {}, kwargs: {}, flags: {}});

      expect(fs.existsSync).toHaveBeenCalledWith('empty/wtf.json');
      expect(fs.readFileSync).toHaveBeenCalledWith('empty/wtf.json', UTF8);
      expect(logger.log).toHaveBeenCalledWith('Loaded wtf.json from empty/wtf.json\n');
      expect(start.startProcesses)
        .toHaveBeenCalledWith('procfileData', {}, {name: 'readWtfJson', args: {}, kwargs: {}, flags: {}});
    });

    it('should instruct running "wtf init" if config does not exist', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'error/wtf.json');

      readWtfJson('procfileData', {name: 'readWtfJson', args: {}, kwargs: {}, flags: {}});

      expect(fs.existsSync).toHaveBeenCalledWith('error/wtf.json');
      expect(logger.log).toHaveBeenCalledWith('No wtf.json found at error/wtf.json - run "wtf init" to begin setup\n');
      expect(start.startProcesses)
        .toHaveBeenCalledWith('procfileData', {}, {name: 'readWtfJson', args: {}, kwargs: {}, flags: {}});
    });

    it('should exit if wtf.json is invalid', () => {
      readWtfJson('procfileData', {name: 'readWtfJson', args: {}, kwargs: {}, flags: {}});

      expect(logger.log).toHaveBeenCalledWith('Invalid wtf.json');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

  });

  describe('startProcesses', () => {

    beforeEach(() => {
      spyOn(start, 'startProcess');
    });

    it('should spawn all processes if none are supplied', () => {
      startProcesses(
        'web: http-server . -c-0 -o\nwatch-js: watchify -t babelify src/index.js -o build/index.js',
        {},
        {
          name: 'start',
          args: {},
          kwargs: {},
          flags: {},
        }
      );

      expect(start.startProcess).toHaveBeenCalledTimes(2);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        DEFAULT_ENV,
        'red',
        undefined
      );

      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'watchify',
          options: ['-t', 'babelify', 'src/index.js', '-o', 'build/index.js'],
        },
        'watch-js',
        DEFAULT_ENV,
        'green',
        undefined
      );
    });

    it('should spawn child the processes that are supplied', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {},
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {},
          flags: {},
        }
      );

      expect(start.startProcess).toHaveBeenCalledTimes(1);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        DEFAULT_ENV,
        'red',
        undefined
      );
    });

    it('should not spawn unknown processes', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {},
        {
          name: 'start',
          args: {
            processes: ['unknown'],
          },
          kwargs: {},
          flags: {},
        }
      );

      expect(start.startProcess).not.toHaveBeenCalled();
    });

    it('should accept a custom env', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {},
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {
            env: 'custom',
          },
          flags: {},
        }
      );

      expect(start.startProcess).toHaveBeenCalledTimes(1);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        'custom',
        'red',
        undefined
      );
    });

  });

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
