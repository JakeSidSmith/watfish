# watfish

**Simple development platform with process management & router**

[![CircleCI](https://circleci.com/gh/JakeSidSmith/watfish/tree/master.svg?style=svg)](https://circleci.com/gh/JakeSidSmith/watfish/tree/master) [![Known Vulnerabilities](https://snyk.io/test/github/jakesidsmith/watfish/badge.svg)](https://snyk.io/test/github/jakesidsmith/watfish)

## About

Watfish is designed to allow you to easily run multiple processes in various different environments inside the context of a project.

It loads processes from an `etc/environments/${env-name}/procfile` inside your project directory and assigns them random ports, which are then routed from a url of your choice defined in a `wtf.json` in your home directory.

All processes are provided with your global environment variables, variables defined in `etc/environments/${env-name}/env`, and sensitive environments variables (that should not be included in your project), from the `wtf.json`.

Environment variables can be used within your procfile (e.g. `$PORT`) and will be substituted when the project is started.

It also looks in `env/bin` inside your project for suitable commands to run within the project context, so when starting, for example, a python process, it will use the python version that is installed within your virtual environment.

Watfish provides several commands to easily help you setup a project (`wtf init`), and define sensitive environment variables in your `wtf.json` (`wtf env set`, `wtf env get`, `wtf env del`).

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

## procfile and env

Procfiles and env files should be stored in a directory named after the environment you want to run them in, inside `etc/environments` within your project. E.g. `project/etc/environments/development/procfile` & `project/etc/environments/development/env`.

By default watfish will run all processes in the `development` environment, but you can start processes in an environment of your choice by providing the `--env` argument. E.g. `wtf start --env staging`.

An example `procfile` might look like the following.

```
web: http-server ./ -p :$PORT
watch-js: watchify -t babelify src/index.js -o build/index.js
watch-less: watch-less-do-more -u postcss -i src/index.less -o build/index.less
```

An example `env` file might look like the following.

```
DEBUG=true
ALLOWED_HOSTS=localhost
```

## wtf.json

Routes & sensitive environment variables are loaded from a `wtf.json` in your home directory.

If this is your first time running watfish on your machine, or for a new project, you can run `wtf init` to setup a route for this project and create a `wtf.json` for you.

You can run `wtf init` for as many projects as you like and additional config will be added to the `wtf.json`.

Each project will receive its own key within the `wtf.json` based on the its directory name.

You can also run `wtf init` for a single project more than once. This will, however, erase any existing config for that project.

You can manually edit the `wtf.json` to add, remove, or adjust routes & environment variables, or use the provided commands.

An example `wtf.json` might look like the following.

```json
{
  "project-name": {
    "routes": {
      "web": "sub.domain.com"
    },
    "env": {
      "SECRET_KEY": "********"
    }
  }
}
```

## Quick setup

Initialize the project:

```shell
wtf init
```

Answer questions about routing:

```shell
What is the name of the process you would like to route?
web
From what url would you like to route this process?
example.domain.com

Created config:

{
  "routes": {
    "web": "example.domain.com"
  }
}

Is this correct? [y]

wtf.json written to /Users/user/wtf.json
```

Add a development environment variable:

```shell
wtf env set SECRET_KEY my-secret-key

Created config:

{
  "development": {
    "SECRET_KEY": "my-secret-key"
  }
}

Is this correct? [y]

wtf.json written to /Users/user/wtf.json
```

Add a production environment variable:

```shell
wtf env set SECRET_KEY another-secret-key --env production

Created config:

{
  "development": {
    "SECRET_KEY": "my-secret-key"
  },
  "production" : {
    "SECRET_KEY": "another-secret-key"
  }
}

Is this correct? [y]

wtf.json written to /Users/user/wtf.json
```

This will have created a `wtf.json` in your home directory with the following contents:

```json
{
  "project": {
    "routes": {
      "web": "example.domain.com"
    },
      "development": {
      "SECRET_KEY": "my-secret-key"
    },
    "production" : {
      "SECRET_KEY": "another-secret-key"
    }
  }
}
```
