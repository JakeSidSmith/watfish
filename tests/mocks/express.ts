jest.mock('express', () => {
  const req = {
    hostname: 'example.domain.com',
  };

  const res = {
    send: jest.fn(() => null),
  };

  const use = (callback: (req: any, res: any, next: () => any) => any) => {
    callback(req, res, () => null);
  };

  const listen = (port: number, callback: () => any) => {
    callback();
  };

  const Router = jest.fn(() => {
    const router = () => () => null;

    (router as any).use = use;

    return router;
  });

  const express = jest.fn(() => {
    return {
      use,
      listen,
    };
  });

  (express as any).Router = Router;
  (express as any)._res = res;
  (express as any)._req = req;

  return express;
});
