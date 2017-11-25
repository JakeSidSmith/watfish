import * as logger from '../src/logger';
import version from '../src/version';

describe('version.ts', () => {
  beforeEach(() => {
    spyOn(logger, 'log');
  });

  it('should log the version if that flag is supplied', () => {
    version({
      name: 'watfish',
      command: null,
      args: {},
      kwargs: {},
      flags: {},
    });

    expect(logger.log).not.toHaveBeenCalled();

    version({
      name: 'watfish',
      command: null,
      args: {},
      kwargs: {},
      flags: {
        version: true,
      },
    });

    expect(logger.log).toHaveBeenCalledWith('0.0.0');
  });
});
