import * as net from 'net';
import * as logger from '../src/logger';
import * as router from '../src/router';

const EADDRINUSE_ERROR = {
  code: 'EADDRINUSE',
  message: 'Port taken',
  name: 'An error',
};

describe('router.ts', () => {

  describe('router', () => {

    beforeEach(() => {
      spyOn(logger, 'log');
      spyOn(router, 'startSockets');
    });

    it('should use a port from the env', () => {
      process.env.PORT = '2020';

      router.default();

      (net as any)._trigger('listening');

      expect(router.startSockets).toHaveBeenCalledWith(2020);
      expect(logger.log).toHaveBeenCalledWith('Router running on port 2020');

      delete process.env.PORT;
    });

    it('should use a default port', () => {
      router.default();

      (net as any)._trigger('listening');

      expect(router.startSockets).toHaveBeenCalledWith(8080);
      expect(logger.log).toHaveBeenCalledWith('Router running on port 8080');
    });

    it('should log that the port is in use if this is the case', () => {
      router.default();

      (net as any)._trigger('error', EADDRINUSE_ERROR);

      expect(logger.log).toHaveBeenCalledWith('Router port 8080 is already in use');
    });

    it('should exit if an unknown error is thrown', () => {
      router.default();

      (net as any)._trigger('error', new Error('error'));

      expect(logger.log).toHaveBeenCalledWith('error');
    });

  });

});
