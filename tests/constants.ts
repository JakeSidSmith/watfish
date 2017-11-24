import * as constants from '../src/constants';

describe('constants.ts', () => {
  it('should export config keys', () => {
    expect(Array.isArray(constants.CONFIG_KEYS)).toBe(true);
  });
});
