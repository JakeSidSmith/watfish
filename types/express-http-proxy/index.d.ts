declare module 'express-http-proxy' {
  import { Handler } from 'express';

  function proxy(url: string): Handler;

  export = proxy;

  namespace proxy {}
}

