import * as fs from 'fs';
import * as os from 'os';
import { UTF8 } from '../src/constants';
import env from '../src/env';
import * as logger from '../src/logger';
import * as utils from '../src/utils';
import mockStd from './mocks/std';

describe('env.ts', () => {

  beforeEach(() => {
    spyOn(process, 'exit');
    spyOn(logger, 'log');

    spyOn(os, 'homedir').and.returnValue('~');

    (fs.writeFile as any as jest.Mock<any>).mockClear();
  });

  it('should log if there is no existing config when calling set', () => {
    spyOn(utils, 'getConfigPath').and.returnValue('~/error/wtf.json');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'set',
        kwargs: {},
        flags: {},
        args: {},
      },
    });

    expect(logger.log).toHaveBeenCalledWith('No wtf.json found at ~/error/wtf.json. I\'ll create that for you');
  });

  it('should exit if there is no existing config when calling get, del, or log all', () => {
    spyOn(utils, 'getConfigPath').and.returnValue('~/error/wtf.json');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
    });

    expect(logger.log).toHaveBeenCalledWith('No wtf.json found at ~/error/wtf.json - run "wtf init" to begin setup');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log if there is no config for this project when logging all env config', () => {
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
    });

    expect(logger.log).toHaveBeenCalledWith('No config for project project in wtf.json at ~/wtf.json');
  });

  it('should log if there is no environment for this project', () => {
    spyOn(utils, 'getConfigPath').and.returnValue('~/no-env/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
    });

    expect(logger.log).toHaveBeenCalledWith('No environments for project project in wtf.json at ~/no-env/wtf.json');
  });

  it('should log the project env config', () => {
    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
    });

    expect(logger.log).toHaveBeenCalledWith(utils.createStringFromConfig({
      development: {
        KEY: 'value',
      },
    }));
  });

  it('should exit if no key is provided', () => {
    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'get',
        kwargs: {},
        flags: {},
        args: {},
      },
    });

    expect(logger.log).toHaveBeenCalledWith('No key provided');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit if no key is provided when calling set', () => {
    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'set',
        kwargs: {},
        flags: {},
        args: {
          key: 'FOO',
        },
      },
    });

    expect(logger.log).toHaveBeenCalledWith('No value provided');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should set a value in the default environment', () => {
    const answers = ['n'];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'set',
        kwargs: {},
        flags: {},
        args: {
          key: 'FOO',
          value: 'bar',
        },
      },
    });

    const expected = utils.createStringFromConfig({
      development: {
        KEY: 'value',
        FOO: 'bar',
      },
    });

    expect(logger.log).toHaveBeenCalledWith(`\nCreated config:\n\n${expected}\nIs this correct? [y]`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should set a value in the default environment and write a file', () => {
    const answers = [''];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'set',
        kwargs: {},
        flags: {},
        args: {
          key: 'FOO',
          value: 'bar',
        },
      },
    });

    const expected = utils.createStringFromConfig({
      development: {
        KEY: 'value',
        FOO: 'bar',
      },
    });

    const expectedFullConfig = utils.createStringFromConfig({
      project: {
        routes: {
          web: 'example.domain.com',
        },
        env: {
          development: {
            KEY: 'value',
            FOO: 'bar',
          },
        },
      },
    });

    expect(logger.log).toHaveBeenCalledWith(`\nCreated config:\n\n${expected}\nIs this correct? [y]`);
    expect(fs.writeFile).toHaveBeenCalledWith(
      '~/valid/wtf.json',
      expectedFullConfig,
      UTF8,
      utils.writeConfigCallback
    );
  });

  it('should get a value from the default environment', () => {
    const answers = ['n'];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'get',
        kwargs: {},
        flags: {},
        args: {
          key: 'KEY',
        },
      },
    });

    expect(logger.log).toHaveBeenCalledWith('value');
    expect(process.exit).toHaveBeenCalledWith(0);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should delete a value from the default environment', () => {
    const answers = ['n'];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'del',
        kwargs: {},
        flags: {},
        args: {
          key: 'KEY',
        },
      },
    });

    const expected = utils.createStringFromConfig({
      development: {},
    });

    expect(logger.log).toHaveBeenCalledWith(`\nCreated config:\n\n${expected}\nIs this correct? [y]`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should exit for unknown sub commands', () => {
    const answers = ['n'];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'unknown',
        kwargs: {},
        flags: {},
        args: {
          key: 'KEY',
        },
      },
    });

    expect(logger.log).toHaveBeenCalledWith('Unknown command unknown');
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should accept an env argument from the env command', () => {
    const answers = ['n'];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {
        env: 'test',
      },
      flags: {},
      args: {},
      command: {
        name: 'set',
        kwargs: {},
        flags: {},
        args: {
          key: 'FOO',
          value: 'bar',
        },
      },
    });

    const expected = utils.createStringFromConfig({
      development: {
        KEY: 'value',
      },
      test: {
        FOO: 'bar',
      },
    });

    expect(logger.log).toHaveBeenCalledWith(`\nCreated config:\n\n${expected}\nIs this correct? [y]`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should accept an env argument from a sub command', () => {
    const answers = ['n'];

    mockStd(answers);

    spyOn(utils, 'getConfigPath').and.returnValue('~/valid/wtf.json');
    spyOn(utils, 'getProjectName').and.returnValue('project');

    env({
      name: 'env',
      kwargs: {},
      flags: {},
      args: {},
      command: {
        name: 'set',
        kwargs: {
          env: 'test2',
        },
        flags: {},
        args: {
          key: 'FOO',
          value: 'bar',
        },
      },
    });

    const expected = utils.createStringFromConfig({
      development: {
        KEY: 'value',
      },
      test2: {
        FOO: 'bar',
      },
    });

    expect(logger.log).toHaveBeenCalledWith(`\nCreated config:\n\n${expected}\nIs this correct? [y]`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

});
