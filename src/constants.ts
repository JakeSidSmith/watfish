import { Config } from './init';

export type DataOrError = Buffer | Error | string;

export const PADDING = '                       ';
export const MATCHES_CTF_URL = /^[-a-z0-9]+\.ctf\.sh$/;
export const MATCHES_SHEBANG = /#!( *\S+ +)?( *\S+ *)$/;
export const MATCHES_ENV_KEY_VALUE = /^(\w+)=(\S+)$/;
export const MATCHES_ENV_VAR = /\$([_A-Z0-9]+)/;

export const CONFIG_KEYS: Array<keyof Config> = [
  'routes',
];

export const UTF8 = 'utf8';

export const DEFAULT_ENV = 'development';

export const ENV_BIN = 'env/bin';

export const SOCKET_PORT = 5253;

export type Colors = 'red' | 'green' | 'blue' | 'magenta' | 'cyan' | 'yellow';

export const COLORS: Colors[] = [
  'red',
  'green',
  'blue',
  'magenta',
  'cyan',
  'yellow',
];
