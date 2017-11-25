import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import { UTF8 } from '../src/constants';
import start, {
  getEnvVariables,
  handleShebang,
  injectEnvVars,
  readFileCallback,
  startProcess,
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

    spyOn(process, 'exit');
    spyOn(process, 'cwd').and.returnValue('directory');
    spyOn(process.stderr, 'write');

    _clear();
  });

  it('should exit if it cannot find a procfile', () => {
    start({
      name: 'start',
      command: null,
      args: {},
      kwargs: {
        env: 'error',
      },
      flags: {},
    });

    expect(fs.readFile).toHaveBeenCalledWith(
      'directory/etc/environments/error/procfile',
      UTF8,
      readFileCallback
    );

    expect(process.stderr.write).toHaveBeenCalledWith('error\n');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should read from a procfile', () => {
    start({
      name: 'start',
      command: null,
      args: {},
      kwargs: {},
      flags: {},
    });

    expect(fs.readFile).toHaveBeenCalledWith(
      'directory/etc/environments/development/procfile',
      UTF8,
      readFileCallback
    );

    _trigger('listening', undefined);

    expect(childProcess.spawn).toHaveBeenCalled();
  });

  it('should spawn child the processes that are supplied', () => {
    start({
      name: 'start',
      command: null,
      args: {
        processes: 'web',
      },
      kwargs: {},
      flags: {},
    });

    _trigger('listening', undefined);

    expect(childProcess.spawn).toHaveBeenCalledTimes(1);
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'env/bin/node http-server',
      ['.', '-c-0', '-o'],
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

  it('should not spawn unknown processes', () => {
    start({
      name: 'start',
      command: null,
      args: {
        processes: 'unknown',
      },
      kwargs: {},
      flags: {},
    });

    _trigger('listening', undefined);

    expect(childProcess.spawn).not.toHaveBeenCalled();
  });

  it('should log the environment if not the default', () => {
    start({
      name: 'start',
      command: null,
      args: {
        processes: 'watch',
      },
      kwargs: {},
      flags: {},
    });

    _trigger('listening', undefined);

    expect(process.stderr.write).toHaveBeenCalledWith('watch > data\n');
    expect(process.stderr.write).toHaveBeenCalledWith('watch > error\n');
    expect(process.stderr.write).toHaveBeenCalledWith('watch > process exited with code 7\n');

    start({
      name: 'start',
      command: null,
      args: {
        processes: 'watch',
      },
      kwargs: {
        env: 'production',
      },
      flags: {},
    });

    _trigger('listening', undefined);

    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > data\n');
    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > error\n');
    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > process exited with code 7\n');
  });

  describe('handleShebang', () => {
    it('should return the program from a shebang', () => {
      expect(handleShebang('#!')).toBe('');

      expect(handleShebang('#!/usr/bin/env node')).toBe('env/bin/node');
      expect(handleShebang('#!    /usr/bin/env   node  ')).toBe('env/bin/node');
      expect(handleShebang('#!/usr/bin/env node  ')).toBe('env/bin/node');
      expect(handleShebang('#!   /usr/bin/env        node')).toBe('env/bin/node');
      expect(handleShebang('#! /usr/bin/env  node   ')).toBe('env/bin/node');

      expect(handleShebang('#!   nope  ')).toBe('nope');
      expect(handleShebang('#!nope')).toBe('nope');
    });
  });

  describe('getEnvVariables', () => {
    it('returns an empty object if no env file found', () => {
      expect(getEnvVariables('nope')).toEqual({});
    });

    it('returns the env variables from the env file', () => {
      expect(getEnvVariables('development')).toEqual({VAR: 'value'});
    });
  });

  describe('startProcess', () => {
    it('should start a process on an available port', () => {
      startProcess({command: 'http-server', options: []}, 'web', 'development');

      _trigger('listening', undefined);

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'env/bin/node http-server',
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
      startProcess({command: 'http-server', options: []}, 'web', 'development');

      for (let i = 0; i <= 100; i += 1) {
        _trigger('error', {code: 'EADDRINUSE', message: 'port in use'});
      }

      expect(process.stderr.write).toHaveBeenCalledWith('Could not find an available port\n');
    });

    it('should throw an unknown error', () => {
      startProcess({command: 'http-server', options: []}, 'web', 'development');

      _trigger('error', new Error('error'));

      expect(process.stderr.write).toHaveBeenCalledWith('error\n');
    });
  });

  describe('injectEnvVars', () => {
    it('should inject env vars into procfile', () => {
      const result = injectEnvVars(['wat', '0.0.0.0:$WAT', '$NOPE'], {WAT: '1234'});

      expect(result).toEqual(['wat', '0.0.0.0:1234', '$NOPE']);
    });
  });
});
