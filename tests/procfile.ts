import * as procfile from '../src/procfile';

describe('procfile.ts', () => {
  it('should parse a procfile', () => {
    expect(procfile.parse('web: http-server . -c-0 -o')).toEqual({
      web: {
        command: 'http-server',
        options: ['.', '-c-0', '-o'],
      },
    });

    expect(procfile.parse('web: http-server . -c-0 -o\nwatch-js: watchify $PORT')).toEqual({
      'web': {
        command: 'http-server',
        options: ['.', '-c-0', '-o'],
      },
      'watch-js': {
        command: 'watchify',
        options: ['$PORT'],
      },
    });

    expect(procfile.parse('invalid name: stuff')).toEqual({});
  });
});
