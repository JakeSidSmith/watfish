import * as childProcess from 'child_process';
import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import start, { readFileCallback } from '../src/start';

describe('start.ts', () => {
  beforeEach(() => {
    (childProcess.spawn as jest.Mock<any>).mockClear();

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

    expect(childProcess.spawn).toHaveBeenCalledTimes(1);
    expect(childProcess.spawn).toHaveBeenCalledWith('http-server', ['.', '-c-0', '-o']);
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

    expect(childProcess.spawn).not.toHaveBeenCalled();
  });
});
