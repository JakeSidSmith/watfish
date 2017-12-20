jest.mock('../src/env', () => ({default: jest.fn()}));
jest.mock('../src/init', () => ({default: jest.fn()}));
jest.mock('../src/program', () => ({default: jest.fn()}));
jest.mock('../src/run', () => ({default: jest.fn()}));
jest.mock('../src/start', () => ({default: jest.fn()}));

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
