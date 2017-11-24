import { DataOrError } from '../../src/start';

type OnErrorOrDataCallback = (dataOrError: DataOrError) => any;
type OnCloseCallback = (code: number) => any;

jest.mock('child_process', () => {
  let firstCall = true;

  const onErrorOrData = (event: 'data' | 'error', callback: OnErrorOrDataCallback) => {
    if (firstCall) {
      callback('data');
    } else {
      callback(new Error('error'));
    }

    firstCall = false;
  };

  const onClose = (event: 'close', callback: OnCloseCallback) => {
    callback(7);
  };

  const spawn = () => {
    return {
      stdout: {
        on: onErrorOrData,
      },
      stderr: {
        on: onErrorOrData,
      },
      on: onClose,
    };
  };

  return {
    spawn,
  };
});
