const MATCHES_PROC_VALUE = /^([-_\w\d]+):\s*(.+)$/;
const MATCHES_WHITESPACE = /\s+/g;

export interface Command {
  command: string;
  options: string[];
}

export const parse = (data: string) => {
  const procs: {[i: string]: Command} = {};

  data.split('\n').forEach((line) => {
    const match = MATCHES_PROC_VALUE.exec(line);

    if (match) {
      const name = match[1].trim();
      const details = match[2].trim().split(MATCHES_WHITESPACE);
      const [command, ...options] = details;

      procs[name] = {
        command,
        options,
      };
    }
  });

  return procs;
};
