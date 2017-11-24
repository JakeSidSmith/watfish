declare module 'procfile' {

  export function parse(data: string): {
    [i: string]: {
      command: string,
      options: string[],
    },
  };

}
