jest.mock('http-proxy', () => {
  const events: Events = {};

  const on = jest.fn((type: string, callback: (data: any) => any) => {
    events[type] = callback;
  });

  const web = jest.fn();

  const trigger = (type: string, data: any) => {
    const callback = events[type];

    if (typeof callback === 'function') {
      callback(data);
    }
  };

  const proxy = {
    on,
    web,
  };

  const createServer = jest.fn(() => proxy);

  return {
    createServer,
    _on: on,
    _web: web,
    _trigger: trigger,
  };
});
