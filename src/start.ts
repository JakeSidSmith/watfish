import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tree } from 'jargs';
import * as path from 'path';
import { UTF8 } from './constants';
import * as procfile from './procfile';
import { getAvailablePort, PortError } from './utils';

const DEFAULT_ENV = 'development';
const ENV_BIN = 'env/bin';
const MATCHES_SHEBANG = /#!( *\S+ +)?( *\S+ *)$/m;
const MATCHES_ENV_KEY_VALUE = /^(\w+)=(\S+)$/;
const MATCHES_ENV_VAR = /\$([A-Z0-9_]+)/;

let options: Tree;

export type DataOrError = Buffer | Error | string;

const getDisplayName = (processName: string, env: string) => {
  return `${env === DEFAULT_ENV ? '' : `${env}:`}${processName}`;
};

const onDataOrError = (processName: string, env: string, dataOrError: DataOrError) => {
  const messages = (dataOrError instanceof Error ? dataOrError.message : dataOrError)
    .toString().split('\n');
  const displayName = getDisplayName(processName, env);

  messages.forEach((message) => {
    process.stderr.write(
      `${displayName} > ${message}\n`
    );
  });
};

const onClose = (processName: string, env: string, code: number) => {
  const displayName = getDisplayName(processName, env);

  process.stderr.write(
    `${displayName} > process exited with code ${code}\n`
  );
};

export const handleShebang = (command: string): string => {
  const filePath = path.join(process.cwd(), command);

  if (!fs.existsSync(filePath)) {
    return command;
  }

  const content = fs.readFileSync(filePath, UTF8);

  const shebang = MATCHES_SHEBANG.exec(content);

  if (shebang) {
    const shebangCommand = shebang[2].trim();

    const shebangCommandPath = path.join(process.cwd(), ENV_BIN, shebangCommand);

    const envExists = fs.existsSync(shebangCommandPath);

    if (envExists) {
      return `${shebangCommandPath} ${command}`;
    }

    return `${shebangCommand} ${command}`;
  }

  return command;
};

export const getEnvVariables = (env: string) => {
  const envPath = path.join(process.cwd(), 'etc/environments', env, 'env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const lines = fs.readFileSync(envPath, UTF8).split('\n');

  const envVariables: {[i: string]: string} = {};

  lines.forEach((line) => {
    const match = MATCHES_ENV_KEY_VALUE.exec(line);

    if (match) {
      envVariables[match[1]] = match[2];
    }
  });

  process.stderr.write(`Found ${Object.keys(envVariables).length} variables in ${envPath}\n`);

  return envVariables;
};

export const injectEnvVars = (commandOptions: string[], environment: {[i: string]: string}) => {
  return commandOptions.map((option) => {
    return option.replace(MATCHES_ENV_VAR, (match: string): string => {
      const varName = match.substring(1);

      if (varName in environment) {
        return environment[varName];
      }

      return match;
    });
  });
};

const startProcessOnPort = (item: procfile.Command, processName: string, env: string, port: string) => {
  const displayName = getDisplayName(processName, env);

  process.stderr.write(`Starting ${displayName} process on port ${port}\n`);

  const environment: {[i: string]: string} = {
    ...getEnvVariables(env),
    ...process.env,
    PORT: port,
  };

  const command = handleShebang(item.command);

  const commandOptions = injectEnvVars(item.options, environment);

  const subProcess = childProcess.spawn(
    command,
    commandOptions,
    {
      cwd: process.cwd(),
      shell: true,
      env: environment,
    }
  );

  subProcess.stdout.on('data', (dataOrError) => onDataOrError(processName, env, dataOrError));
  subProcess.stdout.on('error', (dataOrError) => onDataOrError(processName, env, dataOrError));
  subProcess.stderr.on('data', (dataOrError) => onDataOrError(processName, env, dataOrError));
  subProcess.stderr.on('error', (dataOrError) => onDataOrError(processName, env, dataOrError));

  subProcess.on('close', (code) => onClose(processName, env, code));
};

export const startProcess = (item: procfile.Command, processName: string, env: string) => {
  getAvailablePort((error: PortError | undefined, port: string) => {
    if (error) {
      process.stderr.write(error.message + '\n');
      return process.exit(1);
    }

    startProcessOnPort(item, processName, env, port);
  });
};

export const readFileCallback = (error: NodeJS.ErrnoException, data: string) => {
  if (error) {
    process.stderr.write(error.message + '\n');
    return process.exit(1);
  }

  const { processes } = options.args;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfileConfig = procfile.parse(data);

  for (const processName in procfileConfig) {
    if (
      procfileConfig.hasOwnProperty(processName) &&
      !processes || processes === processName
    ) {
      const item = procfileConfig[processName];

      startProcess(item, processName, env);
    }
  }
};

const start = (tree: Tree) => {
  options = tree;
  const { env = DEFAULT_ENV } = options.kwargs;

  const procfilePath = path.join(process.cwd(), 'etc/environments', env, 'procfile');

  fs.readFile(procfilePath, UTF8, readFileCallback);
};

export default start;
