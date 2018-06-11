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
  Required,
} from 'jargs';
import env from './env';
import init from './init';
import program from './program';
import run from './run';
import start from './start';

const NAME = 'watfish';
const PROGRAM = 'wtf';
const CONFIG_LOCATION = '(in ~/wtf.json)';

const ENVIRONMENT = KWArg(
  'env',
  {
    alias: 'e',
    description: 'Environment to use or configure',
  }
);

const COMMAND = Arg(
  'command',
  {
    description: 'Arbitrary command to run in the environment',
    multi: true,
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
        usage: `${PROGRAM} command [<sub-command>] [options]`,
        examples: [
          `${PROGRAM} init`,
          `${PROGRAM} env set KEY value`,
          `${PROGRAM} start`,
          `${PROGRAM} start --env production`,
          `${PROGRAM} manage.py migrate`,
          `${PROGRAM} run manage.py migrate`,
        ],
        callback: program,
      },
      RequireAny(
        Command(
          'init',
          {
            alias: 'i',
            description: `Generate initial project config ${CONFIG_LOCATION}`,
            usage: `${PROGRAM} init`,
            examples: [
              `${PROGRAM} init`,
              `${PROGRAM} i`,
            ],
            callback: init,
          }
        ),
        Command(
          'start',
          {
            alias: 's',
            description: 'Start project processes from procfile',
            usage: `${PROGRAM} start [options]`,
            examples: [
              `${PROGRAM} start`,
              `${PROGRAM} s`,
              `${PROGRAM} start watcher`,
              `${PROGRAM} start --env production`,
              `${PROGRAM} s watcher --env production`,
            ],
            callback: start,
          },
          Arg(
            'processes',
            {
              multi: true,
              description: 'Process to start',
            }
          ),
          ENVIRONMENT,
          Flag(
            'time',
            {
              alias: 't',
              description: 'Display time in logs',
            }
          )
        ),
        Command(
          'env',
          {
            alias: 'e',
            description: `Change project environment variables ${CONFIG_LOCATION}`,
            usage: `${PROGRAM} env [options]`,
            examples: [
              `${PROGRAM} env`,
              `${PROGRAM} e`,
              `${PROGRAM} env set key value`,
              `${PROGRAM} env get key`,
              `${PROGRAM} env del key`,
              `${PROGRAM} e set key value --env production`,
            ],
            callback: env,
          },
          ENVIRONMENT,
          Command(
            'set',
            {
              alias: 's',
              description: 'Set config value',
              usage: `${PROGRAM} config set [options]`,
              examples: [
                `${PROGRAM} env set key value`,
                `${PROGRAM} e set key value`,
                `${PROGRAM} e set key value --env production`,
              ],
            },
            ENVIRONMENT,
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
                `${PROGRAM} env get key`,
                `${PROGRAM} e get key`,
                `${PROGRAM} e set key --env production`,
              ],
            },
            ENVIRONMENT,
            Required(
              Arg(
                'key',
                {
                  description: 'Key to get from config',
                }
              )
            )
          ),
          Command(
            'del',
            {
              alias: 'd',
              description: 'Delete config value',
              usage: `${PROGRAM} config del [options]`,
              examples: [
                `${PROGRAM} env del key`,
                `${PROGRAM} e del key`,
                `${PROGRAM} e del key --env production`,
              ],
            },
            ENVIRONMENT,
            Required(
              Arg(
                'key',
                {
                  description: 'Key to remove from config',
                }
              )
            )
          )
        ),
        Command(
          'run',
          {
            alias: 'r',
            description: 'Run arbitrary commands in the environment',
            usage: `${PROGRAM} run <command>`,
            examples: [
              `${PROGRAM} run build`,
              `${PROGRAM} r build`,
              `${PROGRAM} r manage.py migrate`,
            ],
            callback: run,
          },
          Required(
            COMMAND
          )
        ),
        COMMAND,
        Flag(
          'version',
          {
            alias: 'v',
            description: 'Display version',
          }
        )
      )
    )
  ),
  process.argv
);
