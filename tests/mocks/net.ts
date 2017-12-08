interface Events {
  [i: string]: undefined | ((error?: any) => any)
}

jest.mock('net', () => {
  let events: Events = {};
  let returnPort = 8080;

  const server = {
    address: () => ({
      port: returnPort,
    }),
    once: function once (event: string, callback: (error?: any) => any) {
      events[event] = callback;

      return this;
    },
    listen: function listen (port: number) {
      returnPort = port;

      return this;
    },
    close: function close () {
      const { close: closeCallback } = events;

      if (typeof closeCallback === 'function') {
        closeCallback();
      }
    },
  };

  return {
    createServer: () => server,
    _trigger: (event: string, data: any) => {
      const callback = events[event];

      if (typeof callback === 'function') {
        callback(data);
      }
    },
    _clear: () => {
      events = {};
    },
  };
});
