#! /usr/bin/env node

import { collect, Help, Program } from 'jargs';
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
    Program('watfish', {
      description:
        'Simple development platform with process management & router',
      usage: `${PROGRAM} [<command>] [<sub-command>] [options]`,
      examples: [`${PROGRAM} start --env dev`],
    })
  )
);
