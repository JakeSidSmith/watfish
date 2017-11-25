import * as net from 'net';
import { isPortTaken } from '../src/utils';

const EADDRINUSE_ERROR = {
  code: 'EADDRINUSE',
  message: 'Port taken',
  name: 'An error',
};

describe('utils.ts', () => {

  const { _trigger } = net as any as {_trigger: (event: string, data: any) => void};

  beforeEach(() => {
    spyOn(process.stderr, 'write');
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
});
