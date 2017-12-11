import * as express from 'express';
import * as httpProxy from 'http-proxy';
import * as net from 'net';
import * as WebSocket from 'ws';
import * as logger from '../src/logger';
import * as router from '../src/router';
import { constructHTMLMessage } from '../src/utils';

const EADDRINUSE_ERROR = {
  code: 'EADDRINUSE',
  message: 'Port taken',
  name: 'An error',
};

describe('router.ts', () => {

  beforeEach(() => {
    spyOn(logger, 'log');
  });

  describe('router', () => {

    beforeEach(() => {
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

  describe('init', () => {

    beforeEach(() => {
      (express as any as jest.Mock<any>).mockClear();
      (express.Router as any as jest.Mock<any>).mockClear();
      ((express as any)._res.send).mockClear();

      (httpProxy as any)._on.mockClear();
      (httpProxy as any)._web.mockClear();
    });

    it('should create an express server, router, and proxy', () => {
      router.init();

      expect(express).toHaveBeenCalled();
      expect(express.Router).toHaveBeenCalled();
      expect(httpProxy.createServer).toHaveBeenCalled();
    });

    it('should error if the proxy encounters an error', () => {
      router.init();

      (httpProxy as any)._trigger('error', new Error('error'));

      expect(logger.log).toHaveBeenCalledWith('error');
      expect(logger.log).toHaveBeenCalledWith('Process may still be starting');
    });

    it('should return an HTML error for unknown hosts', () => {
      router.init();

      expect((express as any)._res.send)
        .toHaveBeenCalledWith(constructHTMLMessage('Unknown host example.domain.com'));
    });

    it('should proxy for known hosts', () => {
      router.addRoute('web', 'red', 'example.domain.com', 8080, new WebSocket(''));

      router.init();

      expect((httpProxy as any)._web).toHaveBeenCalledWith(
        (express as any)._req,
        (express as any)._res,
        {target: 'http://0.0.0.0:8080'}
      );

    });

  });

});
