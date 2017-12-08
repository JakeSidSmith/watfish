const mockStd = (answers: string[]) => {
  const answersCopy = [...answers];

  spyOn(process.stdin, 'resume').and.callFake(() => null as any);

  spyOn(process.stdin, 'once').and.callFake((event: string, callback: (data: any) => any) => {
    callback(answersCopy.shift());

    return null as any;
  });

  spyOn(process.stdout, 'write').and.callFake((message: string) => {
    return null as any;
  });
};

export default mockStd;
