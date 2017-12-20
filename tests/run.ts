import * as childProcess from 'child_process';
import { DEFAULT_ENV, DISAPPROVAL, WAT } from '../src/constants';
import * as logger from '../src/logger';
import * as run from '../src/run';
import { runCommand } from '../src/run';
import * as utils from '../src/utils';

describe('run.ts', () => {

  beforeEach(() => {
    spyOn(logger, 'log');
    spyOn(process, 'exit');
    spyOn(process, 'cwd').and.callFake(() => 'directory/');

    (childProcess.spawn as jest.Mock<any>).mockClear();
  });

  describe('run', () => {

    beforeEach(() => {
      spyOn(run, 'runCommand');
      spyOn(utils, 'getEnvVariables').and.callFake(() => ({}));
    });

    it('calls runCommand', () => {
      run.default({
        name: 'watfish',
        args: {
          command: ['npm', 'install'],
        },
        kwargs: {},
        flags: {},
        rest: ['--save'],
      });

      expect(run.runCommand).toHaveBeenCalledWith(['npm', 'install'], DEFAULT_ENV, ['--save']);
    });

    it('calls runCommand with a default command', () => {
      run.default({
        name: 'watfish',
        args: {},
        kwargs: {},
        flags: {},
        rest: ['--save'],
      });

      expect(run.runCommand).toHaveBeenCalledWith([], DEFAULT_ENV, ['--save']);
    });

    it('calls runCommand with the provided env', () => {
      run.default({
        name: 'watfish',
        args: {
          command: ['npm', 'install'],
        },
        kwargs: {
          env: 'custom',
        },
        flags: {},
      });

      expect(run.runCommand).toHaveBeenCalledWith(['npm', 'install'], 'custom', []);
    });

  });

  describe('runCommand', () => {

    it('should log "WAT" if running wtf inside itself', () => {
      runCommand(['wtf'], DEFAULT_ENV, []);

      expect(logger.log).toHaveBeenCalledWith(WAT + 'Wat are you doing? ' + DISAPPROVAL);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should spawn a child process with the provided options', () => {
      spyOn(utils, 'getEnvVariables').and.callFake(() => ({}));
      runCommand(['npm', 'install'], DEFAULT_ENV, ['--save']);

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'npm',
        ['install', '--save'],
        {
          cwd: 'directory/',
          shell: true,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: 'true',
          },
          stdio: 'inherit',
        }
      );

      expect(logger.log).toHaveBeenCalledWith('Running npm install --save');
    });

    it('should spawn a child process without a rest parameter', () => {
      spyOn(utils, 'getEnvVariables').and.callFake(() => ({}));
      runCommand(['npm', 'install'], DEFAULT_ENV, undefined);

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        {
          cwd: 'directory/',
          shell: true,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: 'true',
          },
          stdio: 'inherit',
        }
      );

      expect(logger.log).toHaveBeenCalledWith('Running npm install');
    });

    it('should load environment variables found in the env and wtf.json', () => {
      spyOn(utils, 'getConfigPath').and.returnValue('valid/wtf.json');
      spyOn(utils, 'getProjectName').and.returnValue('project');

      runCommand(['npm', 'install'], DEFAULT_ENV, undefined);

      const combinedWtfJsonAndEnvVariables = {
        KEY: 'value',
        VAR: 'value',
      };

      expect(childProcess.spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        {
          cwd: 'directory/',
          shell: true,
          env: {
            ...combinedWtfJsonAndEnvVariables,
            ...process.env,
            PYTHONUNBUFFERED: 'true',
          },
          stdio: 'inherit',
        }
      );

      expect(logger.log).toHaveBeenCalledWith('Found 1 variables in directory/etc/environments/development/env\n');
      expect(logger.log).toHaveBeenCalledWith('Found 1 variables in wtf.json\n');
    });

    it('should exit if no command is supplied', () => {
      runCommand([], DEFAULT_ENV, ['--save']);

      expect(logger.log).toHaveBeenCalledWith('No command supplied');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit if no command is supplied (undefined)', () => {
      runCommand(undefined, DEFAULT_ENV, undefined);

      expect(logger.log).toHaveBeenCalledWith('No command supplied');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

  });

});
