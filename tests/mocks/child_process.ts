import { DataOrError } from '../../src/constants';

type OnErrorOrDataCallback = (dataOrError: DataOrError) => any;
type OnCloseCallback = (code: number) => any;

jest.mock('child_process', () => {
  const onErrorOrData = jest.fn((event: 'data' | 'error', callback: OnErrorOrDataCallback) => {
    if (event === 'data') {
      callback('data');
    } else {
      callback(new Error('error'));
    }
  });

  const onClose = jest.fn((event: 'close', callback: OnCloseCallback) => {
    callback(7);
  });

  class Stream {
    public on = onErrorOrData;

    public pipe () {
      return this;
    }
  }

  const spawn = jest.fn(() => {
    return {
      stdout: new Stream(),
      stderr: new Stream(),
      on: onClose,
    };
  });

  return {
    spawn,
  };
});
