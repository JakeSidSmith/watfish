type CB = (dunno: any, result: any) => void;

jest.mock('event-stream', () => {

  return {
    split: () => null,
    map: () => null,
  };
});
