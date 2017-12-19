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
        examples: [`${PROGRAM} start --env dev`],
        callback: program,
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
            description: 'Change local project environment variables',
            usage: `${PROGRAM} env [options]`,
            examples: [
              `${PROGRAM} env`,
              `${PROGRAM} env set key value`,
              `${PROGRAM} env get key`,
              `${PROGRAM} env del key`,
              `${PROGRAM} env set key value --env production`,
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
                `${PROGRAM} env set key value --env production`,
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
                `${PROGRAM} env set key --env production`,
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
                `${PROGRAM} config del key`,
                `${PROGRAM} config del key --env production`,
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
              `${PROGRAM} run manage.py migrate`,
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
