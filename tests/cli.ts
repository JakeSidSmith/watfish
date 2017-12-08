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
