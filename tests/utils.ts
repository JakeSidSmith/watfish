import * as net from 'net';
import { getAvailablePort, isPortTaken } from '../src/utils';

const EADDRINUSE_ERROR = {
  code: 'EADDRINUSE',
  message: 'Port taken',
  name: 'An error',
};

interface NetMock {
  _trigger: (event: string, data: any) => void;
  _clear: () => void;
}

describe('utils.ts', () => {

  const { _clear, _trigger } = net as any as NetMock;

  beforeEach(() => {
    spyOn(process.stderr, 'write');

    _clear();
  });

  describe('isPortTaken', () => {
    it('should call with success', () => {
      const callback = jest.fn();

      isPortTaken(1234, callback);

      _trigger('listening', undefined);

      expect(callback).toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });

    it('should call with failure', () => {
      const callback = jest.fn();

      isPortTaken(8080, callback);

      _trigger('error', EADDRINUSE_ERROR);

      expect(callback).toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });

    it('should call with unexpected error', () => {
      const callback = jest.fn();

      isPortTaken(666, callback);

      _trigger('error', new Error('error'));

      expect(callback).toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });
  });

  describe('getAvailablePort', () => {
    it('should check for available ports until one is found', () => {
      const callback = jest.fn();
      getAvailablePort(callback);

      _trigger('error', EADDRINUSE_ERROR);

      expect(callback).not.toHaveBeenCalled();

      _trigger('error', EADDRINUSE_ERROR);

      expect(callback).not.toHaveBeenCalled();

      _trigger('listening', undefined);

      expect(callback).toHaveBeenCalledWith(undefined, 0);
    });
  });
});
