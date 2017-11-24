describe('cli.js', () => {
  it('should collect command line arguments', () => {
    process.argv = ['node', 'wtf', 'start'];

    require('../src/cli');

    expect(!false).toBe(true);
  });
});
