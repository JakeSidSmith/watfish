const mockStd = (answers: string[]) => {
  let index = 0;

  spyOn(process.stdin, 'resume').and.callFake(() => null as any);

  spyOn(process.stdin, 'once').and.callFake((event: string, callback: (data: any) => any) => {
    callback(answers[index]);

    index += 1;

    return null as any;
  });

  spyOn(process.stdout, 'write').and.callFake((message: string) => {
    return null as any;
  });
};

export default mockStd;
