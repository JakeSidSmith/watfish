import * as express from 'express';
import * as httpProxy from 'http-proxy';
import * as net from 'net';
import * as WebSocket from 'ws';
import * as logger from '../src/logger';
import * as router from '../src/router';
import { ACTIONS } from '../src/router';
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

      expect(router.startSockets).toHaveBeenCalledWith(2020, new WebSocket.Server());
      expect(logger.log).toHaveBeenCalledWith('Router running on port 2020\n');

      delete process.env.PORT;
    });

    it('should use a default port', () => {
      router.default();

      (net as any)._trigger('listening');

      expect(router.startSockets).toHaveBeenCalledWith(8080, new WebSocket.Server());
      expect(logger.log).toHaveBeenCalledWith('Router running on port 8080\n');
    });

    it('should log that the port is in use if this is the case', () => {
      router.default();

      (net as any)._trigger('error', EADDRINUSE_ERROR);

      expect(logger.log).toHaveBeenCalledWith('Router port 8080 is already in use\n');
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
      expect(logger.log).toHaveBeenCalledWith('Process may still be starting\n');
    });

    it('should return an HTML error for unknown hosts', () => {
      router.init();

      expect((express as any)._res.send)
        .toHaveBeenCalledWith(constructHTMLMessage('Unknown host example.domain.com'));
    });

    it('should return an text error for unknown hosts if python request', () => {
      const expressMock = express as any;

      expressMock._req.headers['user-agent'] = 'python-requests-0.0.0';

      router.init();

      expect((express as any)._res.send).toHaveBeenCalledWith('Unknown host example.domain.com');

      delete expressMock._req.headers['user-agent'];
    });

    it('should handle user agent arrays', () => {
      const expressMock = express as any;

      expressMock._req.headers['user-agent'] = ['python-requests', '0.0.0'];

      router.init();

      expect((express as any)._res.send).toHaveBeenCalledWith('Unknown host example.domain.com');

      delete expressMock._req.headers['user-agent'];
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

  describe('addRoutes', () => {

    beforeEach(() => {
      spyOn(router, 'addRoute');
    });

    it('should add the supplied routes', () => {
      const ws = new WebSocket('');

      router.addRoutes(
        {
          'example1.domain.com': {
            processName: 'web1',
            url: 'example1.domain.com',
            color: 'red',
            port: 8080,
          },
          'example2.domain.com': {
            processName: 'web2',
            url: 'example2.domain.com',
            color: 'green',
            port: 2020,
          },
        },
        ws
      );

      expect(router.addRoute).toHaveBeenCalledTimes(2);

      expect(router.addRoute).toHaveBeenCalledWith('web1', 'red', 'example1.domain.com', 8080, ws);
      expect(router.addRoute).toHaveBeenCalledWith('web2', 'green', 'example2.domain.com', 2020, ws);
    });

  });

  describe('removeRoutes', () => {

    it('should remove the supplied routes', () => {
      const ws = new WebSocket('');

      spyOn(ws, 'send');

      router.removeRoutes(
        {
          'example1.domain.com': {
            processName: 'web1',
            url: 'example1.domain.com',
            color: 'red',
            port: 8080,
          },
          'example2.domain.com': {
            processName: 'web2',
            url: 'example2.domain.com',
            color: 'green',
            port: 2020,
          },
        },
        ws
      );

      expect(ws.send).toHaveBeenCalledTimes(2);

      expect(ws.send).toHaveBeenCalledWith('Removing route web1 http://example1.domain.com:8080 on port 8080');
      expect(ws.send).toHaveBeenCalledWith('Removing route web2 http://example2.domain.com:8080 on port 2020');
    });

  });

  describe('startSockets', () => {

    beforeEach(() => {
      spyOn(WebSocket.Server.prototype, 'on').and.callThrough();

      spyOn(router, 'addRoute');
      spyOn(router, 'addRoutes');
      spyOn(router, 'removeRoutes');
    });

    it('should start a web socket server', () => {
      const wss = new WebSocket.Server();
      router.startSockets(1234, wss);

      expect(WebSocket.Server.prototype.on).toHaveBeenCalledTimes(2);
    });

    it('should listen to a web socket on connection', () => {
      const wss = new WebSocket.Server();
      const ws = new WebSocket('');
      spyOn(ws, 'on');

      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('connection', ws);

      expect(ws.on).toHaveBeenCalledTimes(1);
    });

    it('should message its clients on close', () => {
      const wss = new WebSocket.Server();

      wss.clients = [new WebSocket(''), new WebSocket('')];

      spyOn(WebSocket.prototype, 'send');
      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('close');

      expect((WebSocket.prototype as any).send).toHaveBeenCalledTimes(2);
    });

    it('should add a route when messaged by a client', () => {
      const wss = new WebSocket.Server();
      const ws = new WebSocket('');
      spyOn(ws, 'on').and.callThrough();

      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('connection', ws);
      (WebSocket as any)._trigger(
        'message',
        JSON.stringify({
          type: ACTIONS.ADD_ROUTE,
          payload: {
            processName: 'web',
            url: 'example.domain.com',
            color: 'red',
            port: 8080,
          },
        })
      );

      expect(router.addRoute).toHaveBeenCalledWith('web', 'red', 'example.domain.com', 8080, ws);
    });

    it('should add routes when messaged by a client', () => {
      const payload = {
        'example.domain.com': {
          processName: 'web',
          url: 'example.domain.com',
          color: 'red',
          port: 8080,
        },
      };

      const wss = new WebSocket.Server();
      const ws = new WebSocket('');
      spyOn(ws, 'on').and.callThrough();

      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('connection', ws);
      (WebSocket as any)._trigger(
        'message',
        JSON.stringify({
          type: ACTIONS.ADD_ROUTES,
          payload,
        })
      );

      expect(router.addRoutes).toHaveBeenCalledWith(payload, ws);
    });

    it('should remove routes when messaged by a client', () => {
      const payload = {
        'example.domain.com': {
          processName: 'web',
          url: 'example.domain.com',
          color: 'red',
          port: 8080,
        },
      };

      const wss = new WebSocket.Server();
      const ws = new WebSocket('');
      spyOn(ws, 'on').and.callThrough();

      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('connection', ws);
      (WebSocket as any)._trigger(
        'message',
        JSON.stringify({
          type: ACTIONS.REMOVE_ROUTES,
          payload,
        })
      );

      expect(router.removeRoutes).toHaveBeenCalledWith(payload, ws);
    });

    it('should log if an unknown message is received', () => {
      const wss = new WebSocket.Server();
      const ws = new WebSocket('');
      spyOn(ws, 'on').and.callThrough();

      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('connection', ws);
      (WebSocket as any)._trigger(
        'message',
        JSON.stringify({
          type: 'unknown',
          payload: 'nope',
        })
      );

      expect(logger.log).toHaveBeenCalledWith('Unknown router action {"type":"unknown","payload":"nope"}');
    });

    it('should log if invalid json is received', () => {
      const wss = new WebSocket.Server();
      const ws = new WebSocket('');
      spyOn(ws, 'on').and.callThrough();

      router.startSockets(1234, wss);

      (WebSocket.Server as any)._trigger('connection', ws);
      (WebSocket as any)._trigger(
        'message',
        '{foo:bar}'
      );

      expect(logger.log).toHaveBeenCalledWith('Invalid router action {foo:bar}');
    });

  });

});
