import version from '../src/version';

describe('version.ts', () => {
  beforeEach(() => {
    spyOn(process.stderr, 'write');
  });

  it('should log the version if that flag is supplied', () => {
    version({
      name: 'watfish',
      command: null,
      args: {},
      kwargs: {},
      flags: {},
    });

    expect(process.stderr.write).not.toHaveBeenCalled();

    version({
      name: 'watfish',
      command: null,
      args: {},
      kwargs: {},
      flags: {
        version: true,
      },
    });

    expect(process.stderr.write).toHaveBeenCalledWith('0.0.0\n');
  });
});
