import { DataOrError } from '../../src/start';

type OnErrorOrDataCallback = (dataOrError: DataOrError) => any;
type OnCloseCallback = (code: number) => any;

jest.mock('child_process', () => {
  const onErrorOrDataOut = jest.fn((event: 'data' | 'error', callback: OnErrorOrDataCallback) => {
    if (event === 'data') {
      callback('data');
    } else {
      callback(new Error('error'));
    }
  });

  const onErrorOrDataErr = jest.fn((event: 'data' | 'error', callback: OnErrorOrDataCallback) => {
    if (event === 'data') {
      callback('data');
    } else {
      callback(new Error('error'));
    }
  });

  const onClose = jest.fn((event: 'close', callback: OnCloseCallback) => {
    callback(7);
  });

  const spawn = jest.fn(() => {
    return {
      stdout: {
        on: onErrorOrDataOut,
      },
      stderr: {
        on: onErrorOrDataErr,
      },
      on: onClose,
    };
  });

  return {
    spawn,
  };
});
