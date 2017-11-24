import { isPortTaken } from '../src/utils';

const EADDRINUSE_ERROR = {
  code: 'EADDRINUSE',
  message: 'Port taken',
  name: 'An error',
};

describe('utils.ts', () => {
  describe('isPortTaken', () => {
    it('should call with success', () => {
      const callback = jest.fn();

      isPortTaken('1234', callback);

      expect(callback).toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });

    it('should call with failure', () => {
      const callback = jest.fn();

      isPortTaken('8080', callback);

      expect(callback).toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });

    it('should call with unexpected error', () => {
      const callback = jest.fn();

      isPortTaken('666', callback);

      expect(callback).toHaveBeenCalledWith(undefined, true);
      expect(callback).not.toHaveBeenCalledWith(undefined, false);
      expect(callback).not.toHaveBeenCalledWith(EADDRINUSE_ERROR);
    });
  });
});
