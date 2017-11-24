const mockStd = (answers: string[]) => {
  let index = 0;

  process.stdin.resume = () => null as any;

  process.stdin.once = (event: string, callback: (data: any) => any) => {
    callback(answers[index]);

    index += 1;

    return null as any;
  };

  process.stdout.write = (message: string) => {
    return null as any;
  };
};

export default mockStd;
