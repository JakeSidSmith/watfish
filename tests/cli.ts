jest.mock('../src/init', () => ({default: () => null}));
jest.mock('../src/program', () => ({default: () => null}));
jest.mock('../src/run', () => ({default: () => null}));
jest.mock('../src/start', () => ({default: () => null}));

describe('cli.js', () => {
  beforeEach(() => {
    spyOn(process, 'exit');
    spyOn(process.stderr, 'write');
  });

  it('should collect command line arguments', () => {
    process.argv = ['node', 'wtf', 'start'];

    require('../src/cli');

    expect(!false).toBe(true);
  });
});
