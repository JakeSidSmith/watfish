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
  const MATCHES_MANAGE_PY = /manage\.py/;
  const MATCHES_START_JS = /start\.js/;
  const MATCHES_NPM = /npm/;
  const MATCHES_EMPTY = /empty/;
  const MATCHES_PYTHON = /python/;
  const MATCHES_ENV_PYTHON = /env\/bin\/python/;
  const MATCHES_NODE = /node/;
  const MATCHES_NO_SHEBANG = /no-shebang/;
  const MATCHES_EMPTY_CONFIG = /empty\/wtf\.json/;
  const MATCHES_INVALID_CONFIG = /invalid\/wtf\.json/;
  const MATCHES_VALID_CONFIG = /valid\/wtf\.json/;
  const MATCHES_NO_ENV_CONFIG = /no-env\/wtf\.json/;

  return {
    writeFile: jest.fn((path: string, data: string, format: string, callback: WriteFileCallback) => {
      callback();
    }),
    readFileSync: jest.fn((path: string, encoding: string): string => {
      if (MATCHES_NO_ENV_CONFIG.test(path)) {
        return '{"project": {}}';
      }

      if (MATCHES_EMPTY_CONFIG.test(path)) {
        return '{}';
      }

      if (MATCHES_INVALID_CONFIG.test(path)) {
        return '{test: foo}';
      }

      if (MATCHES_VALID_CONFIG.test(path)) {
        return '{"project": {"routes": {"web": "example.domain.com"}, "env": {"development": {"KEY": "value"}}}}';
      }

      if (MATCHES_PROCFILE.test(path)) {
        return 'web: http-server . -c-0 -o\nwatch: watchify src/index.js build/index.js';
      }

      if (MATCHES_NO_SHEBANG.test(path)) {
        return 'no-shebang';
      }

      if (MATCHES_MANAGE_PY.test(path)) {
        return '#! /usr/bin/env python';
      }

      if (MATCHES_START_JS.test(path)) {
        return '#! /usr/bin/env node';
      }

      if (MATCHES_NPM.test(path)) {
        return 'npm';
      }

      if (MATCHES_EMPTY.test(path)) {
        return '';
      }

      if (MATCHES_ENV_FILE.test(path)) {
        return 'VAR=value\nFOO="double-quoted"\nBAR=\'single-quoted\'\nNOT-valid';
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
      if (MATCHES_ERROR.test(path)) {
        return false;
      }

      if (MATCHES_NO_SHEBANG.test(path)) {
        return true;
      }

      if (MATCHES_EMPTY.test(path)) {
        return true;
      }

      if (MATCHES_NODE.test(path)) {
        return false;
      }

      if (MATCHES_ENV_PYTHON.test(path)) {
        return true;
      }

      if (MATCHES_PYTHON.test(path)) {
        return false;
      }

      if (MATCHES_START_JS.test(path)) {
        return true;
      }

      if (MATCHES_NPM.test(path)) {
        return false;
      }

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
