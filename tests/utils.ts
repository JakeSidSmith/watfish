import * as net from 'net';
import { WAT } from '../src/constants';
import * as logger from '../src/logger';
import {
  getAvailablePort,
  getConfigPath,
  getEnvVariables,
  getProjectName,
  handleShebang,
  injectEnvVars,
  isPortTaken,
  onClose,
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
    spyOn(logger, 'log');

    _clear();
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
  });

  describe('injectEnvVars', () => {
    it('should inject env vars into procfile', () => {
      const result = injectEnvVars(['wat', '0.0.0.0:$WAT', '$NOPE'], {WAT: '1234'});

      expect(result).toEqual(['wat', '0.0.0.0:1234', '$NOPE']);
    });
  });

  describe('getEnvVariables', () => {
    it('returns an empty object if no env file found', () => {
      expect(getEnvVariables('nope', 'nope')).toEqual({});
    });

    it('returns the env variables from the env file', () => {
      expect(getEnvVariables('development', 'etc/environments/development/env')).toEqual({VAR: 'value'});
    });
  });

  describe('handleShebang', () => {
    it('should return the program from a shebang', () => {
      expect(handleShebang('#!'))
        .toBe('#!');

      expect(handleShebang('#!/usr/bin/env node'))
        .toBe('/directory/env/bin/node #!/usr/bin/env node');
      expect(handleShebang('#!    /usr/bin/env   node  '))
        .toBe('/directory/env/bin/node #!    /usr/bin/env   node  ');
      expect(handleShebang('#!/usr/bin/env node  '))
        .toBe('/directory/env/bin/node #!/usr/bin/env node  ');
      expect(handleShebang('#!   /usr/bin/env        node'))
        .toBe('/directory/env/bin/node #!   /usr/bin/env        node');
      expect(handleShebang('#! /usr/bin/env  node   '))
        .toBe('/directory/env/bin/node #! /usr/bin/env  node   ');

      expect(handleShebang('#!   nope  '))
        .toBe('#!   nope  ');
      expect(handleShebang('#!nope'))
        .toBe('#!nope');

      expect(handleShebang('#! /usr/bin/env no-env'))
        .toBe('no-env/env-no #! /usr/bin/env no-env');
    });
  });

  describe('onClose', () => {
    it('should log that a process exited', () => {
      expect(logger.log).not.toHaveBeenCalled();

      onClose('prefix ', 0);
      expect(logger.log).toHaveBeenCalledWith('prefix Process exited with code 0');

      onClose('prefix ', 1);
      expect(logger.log).toHaveBeenCalledWith(`${WAT}prefix Process exited with code 1`);
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

});
