import * as logger from '../src/logger';

describe('logger.ts', () => {
  beforeEach(() => {
    spyOn(console, 'error');
  });

  it('should log messages', () => {
    logger.log('test');

    expect(console.error).toHaveBeenCalledWith('test');
  });
});
