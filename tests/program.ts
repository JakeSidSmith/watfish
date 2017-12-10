import * as logger from '../src/logger';
import version from '../src/program';

// tslint:disable-next-line:no-var-requires
const json = require('../package.json');

describe('program.ts', () => {
  beforeEach(() => {
    spyOn(logger, 'log');
  });

  it('should log the version if that flag is supplied', () => {
    version({
      name: 'watfish',
      args: {},
      kwargs: {},
      flags: {},
    });

    expect(logger.log).not.toHaveBeenCalled();

    version({
      name: 'watfish',
      args: {},
      kwargs: {},
      flags: {
        version: true,
      },
    });

    expect(logger.log).toHaveBeenCalledWith(json.version);
  });
});
