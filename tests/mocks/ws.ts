import { Data } from 'ws';

interface Events {
  [i: string]: undefined | ((data: any) => any);
}

jest.mock('ws', () => {
  let webSocketServerEvents: Events = {};
  let webSocketEvents: Events = {};

  class Server {
    public static _trigger (event: string, data: any) {
      const callback = webSocketServerEvents[event];

      if (typeof callback === 'function') {
        callback(data);
      }
    }

    public static _clear () {
      webSocketServerEvents = {};
    }

    public clients = [];

    public on (type: 'callback', callback: (webSocket: WebSocket) => any): void;
    public on (type: 'close', callback: () => any): void;
    public on (type: string, callback: (webSocket: WebSocket) => any): void {
      webSocketServerEvents[type] = callback;
    }
  }

  // tslint:disable-next-line:max-classes-per-file
  class WebSocket {
    public static OPEN = 'OPEN';
    public static Server = Server;

    public static _trigger (event: string, data: any) {
      const callback = webSocketEvents[event];

      if (typeof callback === 'function') {
        callback(data);
      }
    }

    public static _clear () {
      webSocketEvents = {};
    }

    public readyState: string;

    public constructor () {
      this.readyState = WebSocket.OPEN;

      Server._trigger('connection', this);
    }

    public send (message: Data) {
      Server._trigger('message', message);
    }

    public on (type: 'message', callback: (message: Data) => any): void;
    public on (type: string, callback: (message: Data) => any): void {
      webSocketEvents[type] = callback;
    }
  }

  return WebSocket;
});
