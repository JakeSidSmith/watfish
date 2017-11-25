import { DataOrError } from '../../src/start';

type OnErrorOrDataCallback = (dataOrError: DataOrError) => any;
type OnCloseCallback = (code: number) => any;

jest.mock('child_process', () => {
  let firstCall = true;

  const onErrorOrDataOut = jest.fn((event: 'data' | 'error', callback: OnErrorOrDataCallback) => {
    if (firstCall) {
      callback('data');
    } else {
      callback(new Error('error'));
    }

    firstCall = false;
  });

  const onErrorOrDataErr = jest.fn((event: 'data' | 'error', callback: OnErrorOrDataCallback) => {
    if (firstCall) {
      callback('data');
    } else {
      callback(new Error('error'));
    }

    firstCall = false;
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
