import * as fs from 'fs';
import { UTF8 } from '../src/constants';
import start, { readFileCallback } from '../src/start';

describe('start.ts', () => {
  beforeEach(() => {
    process.cwd = () => 'directory';
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
