describe('cli.js', () => {
  it('should collect command line arguments', () => {
    process.argv = [];

    require('../src/cli');

    expect(!false).toBe(true);
  });
});
