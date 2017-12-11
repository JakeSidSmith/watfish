import { DEFAULT_ENV } from '../src/constants';
import * as run from '../src/run';
// import { runCommand } from '../src/run';

describe('run.ts', () => {

  describe('run', () => {

    beforeEach(() => {
      spyOn(run, 'runCommand');
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

});
