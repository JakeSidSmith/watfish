#! /usr/bin/env node

import {
  Arg,
  collect,
  Command,
  Flag,
  Help,
  KWArg,
  Program,
  RequireAll,
  RequireAny,
} from 'jargs';
import init from './init';
import start from './start';
import version from './version';

const NAME = 'watfish';
const PROGRAM = 'wtf';

const GLOBAL_FLAG = Flag(
  'global',
  {
    alias: 'g',
    description: 'View or edit global config',
  }
);

const ENVIRONMENT = KWArg(
  'env',
  {
    alias: 'e',
    description: 'Environment to run in',
  }
);

const VERBOSE = Flag(
  'verbose',
  {
    alias: 'v',
    description: 'Output verbose logs',
  }
);

collect(
  Help(
    'help',
    {
      alias: 'h',
      description: 'Display help and usage info',
    },
    Program(
      NAME,
      {
        description:
          'Simple development platform with process management & router',
        usage: `${PROGRAM} [<command>] [<sub-command>] [options]`,
        examples: [`${PROGRAM} start --env dev`],
        callback: version,
      },
      RequireAny(
        Command(
          'init',
          {
            alias: 'i',
            description: `Generate a ${NAME} config file`,
            usage: `${PROGRAM} init`,
            examples: [
              `${PROGRAM} init`,
            ],
            callback: init,
          }
        ),
        Command(
          'start',
          {
            alias: 's',
            description: 'Start project processes',
            usage: `${PROGRAM} start [options]`,
            examples: [
              `${PROGRAM} start`,
              `${PROGRAM} start watcher`,
              `${PROGRAM} start --env production`,
            ],
            callback: start,
          },
          Arg(
            'processes',
            {
              description: 'Process to start',
            }
          ),
          ENVIRONMENT,
          VERBOSE
        ),
        Command(
          'config',
          {
            alias: 'c',
            description: 'View or edit project config',
            usage: `${PROGRAM} config [<sub-command>] [options]`,
            examples: [
              `${PROGRAM} config`,
              `${PROGRAM} config -g`,
              `${PROGRAM} config set key value`,
              `${PROGRAM} config get key`,
              `${PROGRAM} config del key`,
              `${PROGRAM} config set key value --global`,
            ],
          },
          Command(
            'set',
            {
              alias: 's',
              description: 'Set config value',
              usage: `${PROGRAM} config set [options]`,
              examples: [
                `${PROGRAM} config set key value`,
                `${PROGRAM} config set key value -g`,
              ],
            },
            GLOBAL_FLAG,
            RequireAll(
              Arg(
                'key',
                {
                  description: 'Key to set in config',
                }
              ),
              Arg(
                'value',
                {
                  description: 'Value to set in config',
                }
              )
            )
          ),
          Command(
            'get',
            {
              alias: 'g',
              description: 'Get config value',
              usage: `${PROGRAM} config get [options]`,
              examples: [
                `${PROGRAM} config get key`,
                `${PROGRAM} config get key -g`,
              ],
            },
            GLOBAL_FLAG,
            Arg(
              'key',
              {
                description: 'Key to get from config',
              }
            )
          ),
          Command(
            'del',
            {
              alias: 'd',
              description: 'Delete config value',
              usage: `${PROGRAM} config del [options]`,
              examples: [
                `${PROGRAM} config del key`,
                `${PROGRAM} config del key -g`,
              ],
            },
            GLOBAL_FLAG,
            Arg(
              'key',
              {
                description: 'Key to remove from config',
              }
            )
          ),
          GLOBAL_FLAG
        ),
        Flag(
          'version',
          {
            alias: 'v',
            description: 'Display version',
          }
        )
      )
    )
  )
);
