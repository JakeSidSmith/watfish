#! /usr/bin/env node

import {
  Arg,
  collect,
  Command,
  Flag,
  Help,
  Program,
  RequireAny,
} from 'jargs';
import { helloWorld } from './';

helloWorld.replace('World', 'Everybody');

const PROGRAM = 'wtf';

collect(
  Help(
    'help',
    {
      alias: 'h',
      description: 'Display help and usage info',
    },
    Program(
      'watfish',
      {
        description:
          'Simple development platform with process management & router',
        usage: `${PROGRAM} [<command>] [<sub-command>] [options]`,
        examples: [`${PROGRAM} start --env dev`],
      },
      RequireAny(
        Command(
          'start',
          {
            alias: 's',
            description: 'Start project processes',
            usage: `${PROGRAM} start [options]`,
            examples: [
              `${PROGRAM} start`,
              `${PROGRAM} start watcher`,
            ],
          },
          Arg(
            'processes',
            {
              description: 'Process to start',
            }
          )
        ),
        Command(
          'config',
          {
            alias: 'c',
            description: 'View or edit project config',
            usage: `${PROGRAM} config [<sub-command>] [options]`,
            examples: [
              `${PROGRAM} config`,
              `${PROGRAM} config set key value`,
              `${PROGRAM} config get key`,
              `${PROGRAM} config del key`,
              `${PROGRAM} config set key value --global`,
              `${PROGRAM} config -g`,
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
            }
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
            }
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
            }
          ),
          Flag(
            'global',
            {
              alias: 'g',
              description: 'View or edit global config',
            }
          )
        )
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
);
