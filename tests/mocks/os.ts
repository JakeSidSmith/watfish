jest.mock('os', () => ({
  homedir: () => '~/',
}));