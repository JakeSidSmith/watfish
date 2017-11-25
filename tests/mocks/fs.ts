type WriteFileCallback = (error?: NodeJS.ErrnoException) => void;

type Callback = (error: NodeJS.ErrnoException | undefined, data: string) => any;

jest.mock('fs', () => {
  const MATCHES_ERROR = /error/i;
  const MATCHES_PROCFILE = /\bprocfile$/i;

  return {
    readFile: jest.fn((path: string, encoding: string, callback: Callback) => {
      if (MATCHES_ERROR.test(path)) {
        callback(new Error('error'), '');
      } else if (MATCHES_PROCFILE.test(path)) {
        callback(undefined, 'web: http-server . -c-0 -o\nwatch: watchify src/index.js build/index.js');
      }
    }),
    writeFile: jest.fn((path: string, data: string, format: string, callback: WriteFileCallback) => {
      callback();
    }),
  };
});
