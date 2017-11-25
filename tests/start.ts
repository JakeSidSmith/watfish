import * as childProcess from 'child_process';
import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import start, { readFileCallback } from '../src/start';

describe('start.ts', () => {
  beforeEach(() => {
    const subProcess = childProcess.spawn('test');
    (childProcess.spawn as jest.Mock<any>).mockClear();

    (subProcess.stderr.on as jest.Mock<any>).mockClear();
    (subProcess.stdout.on as jest.Mock<any>).mockClear();

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

    expect(childProcess.spawn).toHaveBeenCalledTimes(2);
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

  it('should add logs in verbose mode', () => {
    const subProcess = childProcess.spawn('test');

    start({
      name: 'start',
      command: null,
      args: {
        processes: 'watch',
      },
      kwargs: {},
      flags: {
        verbose: true,
      },
    });

    expect(subProcess.stderr.on).toHaveBeenCalledTimes(2);
    expect(subProcess.stdout.on).toHaveBeenCalledTimes(2);

    (subProcess.stderr.on as jest.Mock<any>).mockClear();
    (subProcess.stdout.on as jest.Mock<any>).mockClear();

    start({
      name: 'start',
      command: null,
      args: {
        processes: 'watch',
      },
      kwargs: {},
      flags: {},
    });

    expect(subProcess.stderr.on).toHaveBeenCalledTimes(2);
    expect(subProcess.stdout.on).not.toHaveBeenCalled();
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

    expect(process.stderr.write).toHaveBeenCalledWith('watch > data');
    expect(process.stderr.write).toHaveBeenCalledWith('watch > error');
    expect(process.stderr.write).toHaveBeenCalledWith('watch > data');
    expect(process.stderr.write).toHaveBeenCalledWith('watch > error');
    expect(process.stderr.write).toHaveBeenCalledWith('watch > process exited with code 7');

    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > data');
    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > error');
    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > data');
    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > error');
    expect(process.stderr.write).toHaveBeenCalledWith('production:watch > process exited with code 7');
  });
});
