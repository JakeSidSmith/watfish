interface Events {
  [i: string]: undefined | ((error?: any) => any)
}

jest.mock('net', () => {
  const PORT_IN_USE = '8080';
  const PORT_THAT_ERRORS = '666';

  const events: Events = {};

  const server = {
    once: function once (event: string, callback: (error?: any) => any) {
      events[event] = callback;

      return this;
    },
    listen: function once (port: string) {
      const { error, listening } = events;

      if (port === PORT_IN_USE) {
        if (typeof error === 'function') {
          error({code: 'EADDRINUSE', message: 'Port taken', name: 'An error'});
        }
      } else if (port === PORT_THAT_ERRORS) {
        if (typeof error === 'function') {
          error({code: 'UNEXPECTED_ERROR', message: 'Oops', name: 'An error'});
        }
      } else if (typeof listening === 'function') {
        listening();
      }

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
  };
});
