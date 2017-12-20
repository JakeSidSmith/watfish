import * as colors from 'colors/safe';
import * as net from 'net';
import { DEFAULT_ENV, TABLE_FLIP, WAT } from '../src/constants';
import * as logger from '../src/logger';
import {
  constructHTMLMessage,
  delIn,
  getAvailablePort,
  getConfigPath,
  getDisplayName,
  getEnvVariables,
  getIn,
  getProjectName,
  getRouterPort,
  getTimeNow,
  handleShebang,
  injectEnvVars,
  isPortTaken,
  onClose,
  readWtfJson,
  setIn,
  wrapDisplayName,
  writeConfigCallback,
} from '../src/utils';

const EADDRINUSE_ERROR = {
  code: 'EADDRINUSE',
  message: 'Port taken',
  name: 'An error',
};

interface NetMock {
  _trigger: (event: string, data: any) => void;
  _clear: () => void;
}

describe('utils.ts', () => {

  const { _clear, _trigger } = net as any as NetMock;

  beforeEach(() => {
    spyOn(process.stderr, 'write');
    spyOn(process, 'cwd').and.callFake(() => '/directory/');
    spyOn(process, 'exit');
    spyOn(logger, 'log');

    _clear();

    spyOn(colors, 'red').and.callThrough();
  });

  describe('isPortTaken', () => {
    it('should call with success', () => {
      const callback = jest.fn();

      isPortTaken(1234, callback);

      _trigger('listening', undefined);

      expect(callback).toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });

    it('should call with failure', () => {
      const callback = jest.fn();

      isPortTaken(8080, callback);

      _trigger('error', EADDRINUSE_ERROR);

      expect(callback).toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });

    it('should call with unexpected error', () => {
      const callback = jest.fn();

      isPortTaken(666, callback);

      _trigger('error', new Error('error'));

      expect(callback).toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });
  });

  describe('getAvailablePort', () => {
    it('should check for available ports until one is found', () => {
      const callback = jest.fn();
      getAvailablePort(callback);

      _trigger('error', EADDRINUSE_ERROR);

      expect(callback).not.toHaveBeenCalled();

      _trigger('error', EADDRINUSE_ERROR);

      expect(callback).not.toHaveBeenCalled();

      _trigger('listening', undefined);

      expect(callback).toHaveBeenCalledWith(undefined, 0);
    });

    it('should output unknown errors', () => {
      const callback = jest.fn();
      getAvailablePort(callback);

      _trigger('error', 'error');

      expect(callback).toHaveBeenCalledWith('error');
    });

    it('should exit if after 100 attempts it cannot find a free port', () => {
      getAvailablePort(jest.fn());

      for (let i = 0; i < 101; i += 1) {
        _trigger('error', EADDRINUSE_ERROR);
      }

      expect(logger.log).toHaveBeenCalledWith('Could not find an available port');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('injectEnvVars', () => {
    it('should inject env vars into procfile', () => {
      const result = injectEnvVars(['wat', '0.0.0.0:$WAT', '$NOPE'], {WAT: '1234'});

      expect(result).toEqual(['wat', '0.0.0.0:1234', '$NOPE']);
    });
  });

  describe('getEnvVariables', () => {
    it('returns an empty object if no env file found', () => {
      expect(getEnvVariables('nope')).toEqual({});
      expect(logger.log).toHaveBeenCalledWith('No environment file at nope\n');
    });

    it('returns the env variables from the env file', () => {
      expect(getEnvVariables('etc/environments/development/env')).toEqual({VAR: 'value'});
      expect(logger.log).toHaveBeenCalledWith('Found 1 variables in etc/environments/development/env\n');
    });
  });

  describe('handleShebang', () => {
    it('should return the program from a shebang', () => {
      expect(handleShebang('manage.py')).toBe('/directory/env/bin/python manage.py');
      expect(handleShebang('python')).toBe('/directory/env/bin/python');
      expect(handleShebang('start.js')).toBe('node start.js');
      expect(handleShebang('npm')).toBe('npm');
      expect(handleShebang('empty')).toBe('empty');
      expect(handleShebang('no-shebang')).toBe('no-shebang');
    });
  });

  describe('onClose', () => {
    it('should log that a process exited', () => {
      expect(logger.log).not.toHaveBeenCalled();

      onClose('prefix ', 0);
      expect(logger.log).toHaveBeenCalledWith('prefix Process exited with code 0');

      onClose('prefix ', 1);
      expect(logger.log).toHaveBeenCalledWith(`${WAT}prefix Process exited with code 1 ${TABLE_FLIP}`);
    });
  });

  describe('getConfigPath', () => {
    it('should return the config path', () => {
      expect(getConfigPath()).toBe('~/wtf.json');
    });
  });

  describe('getProjectName', () => {
    it('should return the directory of the project', () => {
      expect(getProjectName()).toBe('directory');
    });
  });

  describe('getDisplayName', () => {

    it('should construct a process name', () => {
      expect(getDisplayName('web', DEFAULT_ENV)).toBe('web');
      expect(getDisplayName('web', 'production')).toBe('production:web');
    });

  });

  describe('wrapDisplayName', () => {

    it('should wrap a process name', () => {
      expect(wrapDisplayName('web', 0)).toBe('[ web ] ');
      expect(wrapDisplayName('web', 8)).toBe('[ web      ] ');
      expect(wrapDisplayName('production:web', 14)).toBe('[ production:web ] ');
    });

  });

  describe('constructHTMLMessage', () => {

    it('should construct an HTML message', () => {
      expect(constructHTMLMessage('Hello, World!')).toContain('Hello, World!');
    });

  });

  describe('getTimeNow', () => {

    it('gets the time now in a nice format', () => {
      const MATCHES_TIME_FORMAT = /^\d\d:\d\d:\d\d\.\d\d$/;
      const result = getTimeNow();

      expect(MATCHES_TIME_FORMAT.test(result)).toBe(true);
    });

  });

  describe('readWtfJson', () => {

    it('should the wtf.json', () => {
      expect(readWtfJson('valid/wtf.json')).toEqual({
        project: {
          routes: {
            web: 'example.domain.com',
          },
          env: {
            development: {
              KEY: 'value',
            },
          },
        },
      });
    });

    it('should empty wtf.json', () => {
      expect(readWtfJson('empty/wtf.json')).toEqual({});
    });

    it('should exit if config is invalid', () => {
      readWtfJson('invalid/wtf.json');

      expect(logger.log).toHaveBeenCalledWith('Invalid wtf.json at invalid/wtf.json');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

  });

  describe('getRouterPort', () => {

    it('should return the default router port', () => {
      expect(getRouterPort()).toBe(8080);
    });

    it('should return a custom router port', () => {
      process.env.PORT = '1234';

      expect(getRouterPort()).toBe(1234);

      delete process.env.PORT;
    });

  });

  describe('setIn', () => {

    it('should set a single depth', () => {
      const obj = {};

      setIn(obj, ['a'], 'b');

      expect(obj).toEqual({a: 'b'});
    });

    it('should set in multiple depths', () => {
      const obj = {};

      setIn(obj, ['a', 'b'], 'c');

      expect(obj).toEqual({a: {b: 'c'}});
    });

    it('should set in and overwrite existing values', () => {
      const obj = {a: {b: 'd'}};

      setIn(obj, ['a', 'b'], 'c');

      expect(obj).toEqual({a: {b: 'c'}});
    });

  });

  describe('getIn', () => {

    it('should return undefined if it cannot find a value at single depth', () => {
      const obj = {};

      expect(getIn(obj, ['a'])).toEqual(undefined);
    });

    it('should return undefined if it cannot find value multi depth', () => {
      const obj = {c: {b: 'a'}};

      expect(getIn(obj, ['a', 'b', 'c'])).toEqual(undefined);

      expect(getIn(obj, ['c', 'b', 'a'])).toEqual(undefined);
    });

    it('should return a value at a single depth', () => {
      const obj = {a: 'b'};

      expect(getIn(obj, ['a'])).toEqual('b');
    });

    it('should return a value at multiple depths', () => {
      const obj = {a: {b: 'c'}};

      expect(getIn(obj, ['a', 'b'])).toEqual('c');
    });

  });

  describe('delIn', () => {

    it('should do nothing if the value does not exist', () => {
      const obj = {a: {b: 'c'}};

      delIn(obj, ['a', 'c', 'd']);

      expect(obj).toEqual({a: {b: 'c'}});
    });

    it('should delete a value at a single depth', () => {
      const obj = {a: 'b'};

      delIn(obj, ['a']);

      expect(obj).toEqual({});
    });

    it('should delete a value at multiple depths', () => {
      const obj = {a: {b: 'c'}};

      delIn(obj, ['a', 'b']);

      expect(obj).toEqual({a: {}});
    });

  });

  describe('writeConfigCallback', () => {

    it('should output a success message', () => {
      writeConfigCallback();

      expect(logger.log).toHaveBeenCalledWith('wtf.json written to ~/wtf.json');
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should exit on error', () => {
      writeConfigCallback(new Error('WTF'));

      expect(logger.log).toHaveBeenCalledWith('WTF');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

});
