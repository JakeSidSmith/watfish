declare module 'vhost' {
  import { Handler } from 'express';

  function vhost(url: string, handler?: Handler): Handler;

  export = vhost;

  namespace vhost {}
}
