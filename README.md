# watfish

**Simple development platform with process management & router**

[![CircleCI](https://circleci.com/gh/JakeSidSmith/watfish/tree/master.svg?style=svg)](https://circleci.com/gh/JakeSidSmith/watfish/tree/master)

## Install

Run the following command from any terminal

```shell
npm install watfish -g
```

## Setup route for project

Run the following command inside your project directory

```shell
wtf init
```

Then follow the on screen instructions

```shell
What is the name of the process you would like to route?
web
From what url would you like to route this process?
url.com

Created config:

{
  "routes": {
    "web": "url.com"
  }
}

Is this correct? [y]
```

## Usage

Now you can go ahead and start your project or run arbitrary commands in the project's environment.

```shell
wtf start
```

```shell
wtf runtests
```

Here's some of the commands that are available

```shell
  Usage: wtf command [<sub-command>] [options]

  Commands:
    init, i    Generate a watfish config file
    run, r     Run arbitrary commands in the environment
    start, s   Start project processes

  Options:
    --help, -h     Display help and usage info
    --version, -v  Display version
    <command>      Arbitrary command to run in the environment

  Examples:
    wtf start --env dev
```
