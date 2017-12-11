type CB = (dunno: any, result: any) => void;

jest.mock('event-stream', () => {
  const cb: CB = () => null;

  return {
    split: () => null,
    map: (callback: (message: string, cb: CB) => any) => {
      return callback('test', cb);
    },
  };
});
