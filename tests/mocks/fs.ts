type WriteFileCallback = (error?: NodeJS.ErrnoException) => void;

type Callback = (error: NodeJS.ErrnoException | undefined, data: string) => any;

jest.mock('fs', () => {
  const MATCHES_ERROR = /error/i;
  const MATCHES_PROCFILE = /\bprocfile$/i;
  const MATCHES_SHEBANG = /#!/;
  const MATCHES_ENV_FILE = /development\/env$/;
  const MATCHES_NOPE = /nope/;
  const MATCHES_ENV_NO = /env-no/;
  const MATCHES_NO_ENV = /no-env/;

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
    readFileSync: jest.fn((path: string, encoding: string): string => {
      if (MATCHES_ENV_FILE.test(path)) {
        return 'VAR=value\nNOT-valid';
      }

      if (MATCHES_SHEBANG.test(path)) {
        if (MATCHES_NO_ENV.test(path)) {
          return `${path}/env-no`;
        }

        return path;
      }

      return '#! /usr/bin/env node\necho "text"';
    }),
    existsSync: jest.fn((path: string): boolean => {
      if (MATCHES_ENV_NO.test(path)) {
        return false;
      }

      if (MATCHES_NO_ENV.test(path)) {
        return true;
      }

      return !MATCHES_NOPE.test(path);
    }),
  };
});
