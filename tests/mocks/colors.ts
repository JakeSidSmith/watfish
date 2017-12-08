jest.mock('colors/safe', () => {
  const self = (input: string) => input;

  return {
    red: self,
    green: self,
    blue: self,
    magenta: self,
    cyan: self,
    yellow: self,
    black: self,
    white: self,
    grey: self,
    gray: self,
  };
});
