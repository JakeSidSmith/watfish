jest.mock('../src/env', () => ({default: jest.fn()}));
jest.mock('../src/init', () => ({default: jest.fn()}));
jest.mock('../src/program', () => ({default: jest.fn()}));
jest.mock('../src/router', () => ({
  default: jest.fn(),
  ACTIONS: {
    ADD_ROUTE: 'ADD_ROUTE',
    ADD_ROUTES: 'ADD_ROUTES',
  },
}));

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as moment from 'moment';
import * as net from 'net';
import * as WebSocket from 'ws';
import { DEFAULT_ENV, TABLE_FLIP, UTF8, WAT } from '../src/constants';
import * as logger from '../src/logger';
import router, { ACTIONS, Routes } from '../src/router';
import * as start from '../src/start';
import {
  addRoute,
  applyRoutes,
  readWtfJsonAndEnv,
  startProcess,
  startProcesses,
  startProcessWithMaybePort,
  startRouterCommunication,
} from '../src/start';
import * as utils from '../src/utils';

describe('start.ts', () => {

  const tree = {
    name: 'start',
    args: {},
    kwargs: {},
    flags: {},
  };

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

    (net as any)._clear();
  });

  describe('start', () => {

    beforeEach(() => {
      spyOn(start, 'readWtfJsonAndEnv');
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

    it('should call readWtfJsonAndEnv', () => {
      start.default({
        name: 'start',
        args: {},
        kwargs: {},
        flags: {},
      });

      expect(start.readWtfJsonAndEnv)
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
      spyOn(start, 'applyRoutes');
    });

    it('should start a web socket client', () => {
      startRouterCommunication();

      expect(WebSocket.prototype.on).toHaveBeenCalledTimes(3);
    });

    it('should apply routes on open connection', () => {
      jest.useFakeTimers();

      startRouterCommunication();

      expect(start.applyRoutes).not.toHaveBeenCalled();

      (WebSocket as any)._trigger('open');

      expect(start.applyRoutes).toHaveBeenCalled();
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

  describe('readWtfJsonAndEnv', () => {

    beforeEach(() => {
      spyOn(start, 'startProcesses');
    });

    it('should read from the wtf.json and start processes', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'empty/wtf.json');

      readWtfJsonAndEnv('procfileData', {name: 'readWtfJsonAndEnv', args: {}, kwargs: {}, flags: {}});

      expect(fs.existsSync).toHaveBeenCalledWith('empty/wtf.json');
      expect(fs.readFileSync).toHaveBeenCalledWith('empty/wtf.json', UTF8);
      expect(logger.log).toHaveBeenCalledWith('Loaded wtf.json from empty/wtf.json\n');
      expect(start.startProcesses).toHaveBeenCalledWith(
        'procfileData',
        {},
        'development',
        {name: 'readWtfJsonAndEnv', args: {}, kwargs: {}, flags: {}},
        {VAR: 'value'}
      );
    });

    it('should instruct running "wtf init" if config does not exist', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => 'error/wtf.json');

      readWtfJsonAndEnv('procfileData', {name: 'readWtfJsonAndEnv', args: {}, kwargs: {}, flags: {}});

      expect(fs.existsSync).toHaveBeenCalledWith('error/wtf.json');
      expect(logger.log).toHaveBeenCalledWith('No wtf.json found at error/wtf.json - run "wtf init" to begin setup\n');
      expect(start.startProcesses).toHaveBeenCalledWith(
        'procfileData',
        {},
        'development',
        {name: 'readWtfJsonAndEnv', args: {}, kwargs: {}, flags: {}},
        {VAR: 'value'}
      );
    });

    it('should exit if wtf.json is invalid', () => {
      readWtfJsonAndEnv('procfileData', {name: 'readWtfJsonAndEnv', args: {}, kwargs: {}, flags: {}});

      expect(logger.log).toHaveBeenCalledWith('Invalid wtf.json at ~/wtf.json');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should accept a custom env', () => {
      spyOn(utils, 'getConfigPath').and.callFake(() => '~/wtf.json');
      spyOn(utils, 'loadWtfJson').and.callThrough();

      readWtfJsonAndEnv('procfileData', {name: 'readWtfJsonAndEnv', args: {}, kwargs: {env: 'custom'}, flags: {}});

      expect(utils.loadWtfJson).toHaveBeenCalledWith('~/wtf.json', 'directory', 'custom');
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
        'development',
        tree,
        {}
      );

      expect(start.startProcess).toHaveBeenCalledTimes(2);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        8,
        DEFAULT_ENV,
        'red',
        tree,
        {},
        {},
        undefined
      );

      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'watchify',
          options: ['-t', 'babelify', 'src/index.js', '-o', 'build/index.js'],
        },
        'watch-js',
        8,
        DEFAULT_ENV,
        'green',
        tree,
        {},
        {},
        undefined
      );
    });

    it('should spawn child the processes that are supplied', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {},
        'development',
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {},
          flags: {},
        },
        {}
      );

      expect(start.startProcess).toHaveBeenCalledTimes(1);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        3,
        DEFAULT_ENV,
        'red',
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {},
          flags: {},
        },
        {},
        {},
        undefined
      );
    });

    it('should not spawn unknown processes', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {},
        'development',
        {
          name: 'start',
          args: {
            processes: ['unknown'],
          },
          kwargs: {},
          flags: {},
        },
        {}
      );

      expect(start.startProcess).not.toHaveBeenCalled();
    });

    it('should accept a custom env', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {},
        'custom',
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {
            env: 'custom',
          },
          flags: {},
        },
        {}
      );

      expect(start.startProcess).toHaveBeenCalledTimes(1);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        10,
        'custom',
        'red',
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {
            env: 'custom',
          },
          flags: {},
        },
        {},
        {},
        undefined
      );
    });

    it('should load routes from the wtf.json', () => {
      startProcesses(
        'web: http-server . -c-0 -o',
        {
          routes: {
            web: 'example.domain.com',
          },
        },
        'development',
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {},
          flags: {},
        },
        {}
      );

      expect(start.startProcess).toHaveBeenCalledTimes(1);
      expect(start.startProcess).toHaveBeenCalledWith(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        3,
        'development',
        'red',
        {
          name: 'start',
          args: {
            processes: ['web'],
          },
          kwargs: {},
          flags: {},
        },
        {},
        {},
        'example.domain.com'
      );
    });

  });

  describe('startProcess', () => {

    beforeEach(() => {
      spyOn(start, 'startProcessWithMaybePort');
    });

    it('should start a process on an available port', () => {
      startProcess(
        {command: 'http-server', options: []},
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {},
        'example.domain.com'
      );

      (net as any)._trigger('listening', 0);

      expect(start.startProcessWithMaybePort).toHaveBeenCalledWith(
        {command: 'http-server', options: []},
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {},
        'example.domain.com',
        0
      );
    });

    it('should start a process without port if no routing', () => {
      startProcess(
        {command: 'http-server', options: []},
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {}
      );

      (net as any)._trigger('listening');

      expect(start.startProcessWithMaybePort).toHaveBeenCalledWith(
        {command: 'http-server', options: []},
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {}
      );
    });

    it('should throw a port in use error', () => {
      startProcess(
        {command: 'http-server', options: []},
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {},
        'example.domain.com'
      );

      for (let i = 0; i <= 100; i += 1) {
        (net as any)._trigger('error', {code: 'EADDRINUSE', message: 'port in use'});
      }

      expect(logger.log).toHaveBeenCalledWith('Could not find an available port');
    });

    it('should throw an unknown error', () => {
      startProcess(
        {command: 'http-server', options: []},
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {},
        'example.domain.com'
      );

      (net as any)._trigger('error', new Error('error'));

      expect(logger.log).toHaveBeenCalledWith('error');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('startProcessWithMaybePort', () => {

    beforeEach(() => {
      spyOn(start, 'addRoute');
      spyOn(utils, 'getEnvVariables').and.callFake(() => ({}));
    });

    it('should nicely prefix messages', () => {
      const time = moment.utc('2000-01-01')
        .set('hour', 1)
        .set('minute', 23)
        .set('second', 45)
        .set('millisecond', 678)
        .valueOf();

      spyOn(Date, 'now').and.callFake(() => time);

      startProcessWithMaybePort(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {},
        'example.domain.com',
        8080
      );

      expect(logger.log).toHaveBeenCalledWith(`${WAT}[ web ] Process exited with code 7 ${TABLE_FLIP}`);

      startProcessWithMaybePort(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        0,
        'development',
        'red',
        {
          name: 'start',
          args: {},
          kwargs: {},
          flags: {
            time: true,
          },
        },
        {},
        {},
        'example.domain.com',
        8080
      );

      expect(logger.log).toHaveBeenCalledWith(`${WAT}[ 01:23:45.67 web ] Process exited with code 7 ${TABLE_FLIP}`);
    });

    it('should add routes for processes with a url and port', () => {
      startProcessWithMaybePort(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {},
        'example.domain.com',
        8080
      );

      expect(start.addRoute).toHaveBeenCalledWith('web', 'red', 'example.domain.com', 8080);

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'node http-server',
        ['.', '-c-0', '-o'],
        {
          cwd: process.cwd(),
          shell: true,
          env: {
            ...process.env,
            PORT: '8080',
            PYTHONUNBUFFERED: 'true',
          },
          stdio: 'pipe',
        }
      );

      expect(logger.log).toHaveBeenCalledWith('Running node http-server . -c-0 -o');
    });

    it('should add start processes that don\'t require a url or port', () => {
      startProcessWithMaybePort(
        {
          command: 'http-server',
          options: ['.', '-c-0', '-o'],
        },
        'web',
        0,
        'development',
        'red',
        tree,
        {},
        {}
      );

      expect(start.addRoute).not.toHaveBeenCalled();

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'node http-server',
        ['.', '-c-0', '-o'],
        {
          cwd: process.cwd(),
          shell: true,
          env: {
            ...process.env,
            PORT: '',
            PYTHONUNBUFFERED: 'true',
          },
          stdio: 'pipe',
        }
      );

      expect(logger.log).toHaveBeenCalledWith('Running node http-server . -c-0 -o');
    });

  });

  describe('addRoute', () => {

    beforeEach(() => {
      spyOn(WebSocket.prototype, 'send');
    });

    it('should contact the router about a new route', () => {
      addRoute('web', 'red', 'example.domain.com', 8080);

      expect(WebSocket.prototype.send).toHaveBeenCalledWith(
        JSON.stringify(
          {
            type: ACTIONS.ADD_ROUTE,
            payload: {
              processName: 'web',
              color: 'red',
              url: 'example.domain.com',
              port: 8080,
            },
          }
        )
      );
    });

  });

  describe('applyRoutes', () => {

    beforeEach(() => {
      spyOn(WebSocket.prototype, 'send');
    });

    it('should contact the router about a new route', () => {
      const routes: Routes = {
        'example.domain.com': {
          processName: 'web',
          color: 'red',
          url: 'example.domain.com',
          port: 8080,
        },
      };

      applyRoutes(routes);

      expect(WebSocket.prototype.send).toHaveBeenCalledWith(
        JSON.stringify(
          {
            type: ACTIONS.ADD_ROUTES,
            payload: routes,
          }
        )
      );
    });

  });

});
