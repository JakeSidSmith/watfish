jest.mock('express', () => {
  const req = {
    hostname: 'localhost',
  };

  const res = {
    send: () => null,
  };

  const use = () => (callback: (req: any, res: any, next: () => any) => any) => {
    callback(req, res, () => null);
  };

  const listen = (port: number, callback: () => any) => {
    callback();
  };

  const Router = () => {
    return {
      use,
    };
  };

  const express = () => {
    return {
      use,
      listen,
    };
  };

  (express as any).Router = Router;

  return express;
});
