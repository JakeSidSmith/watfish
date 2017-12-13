import { DEFAULT_ENV } from '../src/constants';
import * as logger from '../src/logger';
import program from '../src/program';
import * as run from '../src/run';

// tslint:disable-next-line:no-var-requires
const json = require('../package.json');

describe('program.ts', () => {
  beforeEach(() => {
    spyOn(logger, 'log');
    spyOn(run, 'runCommand');
  });

  it('should log the version if that flag is supplied', () => {
    program({
      name: 'watfish',
      args: {},
      kwargs: {},
      flags: {},
    });

    expect(logger.log).not.toHaveBeenCalled();

    program({
      name: 'watfish',
      args: {},
      kwargs: {},
      flags: {
        version: true,
      },
    });

    expect(logger.log).toHaveBeenCalledWith(json.version);
  });

  it('should log the version if the flag is supplied, even if there is a command', () => {
    program({
      name: 'watfish',
      args: {
        command: ['npm'],
      },
      kwargs: {},
      flags: {
        version: true,
      },
      rest: ['install'],
    });

    expect(logger.log).toHaveBeenCalledWith(json.version);
    expect(run.runCommand).not.toHaveBeenCalled();
  });

  it('should run a command if supplied', () => {
    program({
      name: 'watfish',
      args: {
        command: ['npm'],
      },
      kwargs: {},
      flags: {},
      rest: ['install'],
    });

    expect(run.runCommand).toHaveBeenCalledWith(['npm'], DEFAULT_ENV, ['install']);
  });

  it('should run a command in the supplied environment', () => {
    program({
      name: 'watfish',
      args: {
        command: ['npm'],
      },
      kwargs: {
        env: 'custom',
      },
      flags: {},
      rest: ['install'],
    });

    expect(run.runCommand).toHaveBeenCalledWith(['npm'], 'custom', ['install']);
  });

});
