#! /usr/bin/env node

import {
  Arg,
  collect,
  Command,
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
            'process',
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
          }
        )
      )
    )
  )
);
