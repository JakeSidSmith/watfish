import init from '../src/init';

describe('init.ts', () => {
  it('should ask questions & output a config file', () => {
    jest.spyOn(console, 'log').mockImplementation(() => null);

    init();

    expect(console.log).toHaveBeenCalledWith('Initializing...');
  });
});
