import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import start, { readFileCallback } from '../src/start';

describe('start.ts', () => {
  beforeEach(() => {
    spyOn(process, 'exit');
    spyOn(process, 'cwd').and.returnValue('directory');
    spyOn(process.stderr, 'write');
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

    expect(process.stderr.write).toHaveBeenCalledWith('error');
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
  });
});
