import { Config } from './init';

export const CONFIG_KEYS: Array<keyof Config> = [
  'routes',
];

export const UTF8 = 'utf8';

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
