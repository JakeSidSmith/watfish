import { helloWorld } from '../src/index';

describe('index.js', () => {
  it('should export a string', () => {
    expect(helloWorld).toBe('Hello, World!');
  });
});
