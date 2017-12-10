jest.mock('ws', () => {
  class Server {
    public clients = [];

    public on (type: string, callback: (webSocket: WebSocket) => any) {

    }
  }

  // tslint:disable-next-line:max-classes-per-file
  class WebSocket {
    public static OPEN = 'OPEN';
    public static Server = Server;

    public readyState: string;

    public constructor () {
      this.readyState = WebSocket.OPEN;
    }

    public send (message: string) {

    }

    public on (type: string, callback: (message: string) => any) {

    }
  }
});
