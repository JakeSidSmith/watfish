import * as colors from 'colors/safe';
import * as express from 'express';
import * as httpProxy from 'http-proxy';
import * as WebSocket from 'ws';
import { Colors, SOCKET_PORT } from './constants';
import * as logger from './logger';
import { constructHTMLMessage, getRouterPort, isPortTaken, PortError } from './utils';

export interface Routes {
  [i: string]: {
    url: string;
    port: number;
    processName: string;
    color: Colors;
  };
}

export const ACTIONS = {
  ADD_ROUTE: 'ADD_ROUTE',
  ADD_ROUTES: 'ADD_ROUTES',
  REMOVE_ROUTES: 'REMOVE_ROUTES',
};

const globalRoutes: Routes = {};

let app: express.Express;
let expressRouter: express.Router;
let proxy: httpProxy;

export const init = () => {
  app = express();
  expressRouter = express.Router();
  proxy = httpProxy.createServer();

  proxy.on('error', (error) => {
    logger.log(error.message);
    logger.log('Process may still be starting\n');
  });

  expressRouter.use((req, res) => {
    const route = globalRoutes[req.hostname];
    let agent = req.headers['user-agent'] || '';
    agent = Array.isArray(agent) ? agent.join(' ') : agent;

    if (route) {
      proxy.web(req, res, {
        target: `http://0.0.0.0:${route.port}`,
      });
    } else {
      const message = `Unknown host ${req.hostname}`;
      res.status(404);

      if (req.accepts('html')) {
        res.send(constructHTMLMessage(message));
      } else if (req.accepts('json')) {
        res.json({message});
      } else {
        res.send(message);
      }
    }
  });

  app.use((req, res, next) => {
    return expressRouter(req, res, next);
  });
};

export const addRoute = (processName: string, color: Colors, url: string, port: number, ws: WebSocket) => {
  const routerPort = getRouterPort();

  globalRoutes[url] = {
    processName,
    url,
    port,
    color,
  };

  /* istanbul ignore else */
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(colors[color](`Routing process ${processName} from http://${url}:${routerPort} to port ${port}`));
  }
};

export const addRoutes = (routes: Routes, ws: WebSocket) => {
  for (const url in routes) {
    /* istanbul ignore else */
    if (routes.hasOwnProperty(url)) {
      const { processName, port, color } = routes[url];
      addRoute(processName, color, url, port, ws);
    }
  }
};

export const removeRoutes = (routes: Routes, ws: WebSocket) => {
  const routerPort = getRouterPort();

  for (const url in routes) {
    /* istanbul ignore else */
    if (routes.hasOwnProperty(url)) {
      const { processName, port, color } = routes[url];
      delete globalRoutes[url];

      /* istanbul ignore else */
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(colors[color](`Removing route ${processName} http://${url}:${routerPort} on port ${port}`));
      }
    }
  }
};

export const startSockets = (port: number, wss: WebSocket.Server) => {
  wss.on('connection', (ws) => {
    // Listen for messages
    ws.on('message', (data) => {
      let json;

      try {
        json = JSON.parse(data.toString());
      } catch (error) {
        logger.log(`Invalid router action ${data}`);
        logger.log(error.message);
        return;
      }

      const { type, payload, payload: { processName, color, url, port: routerPort } } = json;

      switch (type) {
        case ACTIONS.ADD_ROUTE:
          addRoute(processName, color, url, routerPort, ws);
          break;
        case ACTIONS.ADD_ROUTES:
          addRoutes(payload, ws);
          break;
        case ACTIONS.REMOVE_ROUTES:
          removeRoutes(payload, ws);
          break;
        default:
          logger.log(`Unknown router action ${data}`);
          break;
      }
    });

    // Send message
    /* istanbul ignore else */
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`Connected to router on port ${port}\n`);
    }
  });

  wss.on('close', () => {
    wss.clients.forEach((client: WebSocket) => {
      /* istanbul ignore else */
      if (client.readyState === WebSocket.OPEN) {
        client.send('Router no longer running');
      }
    });
  });
};

const router = () => {
  const routerPort = getRouterPort();

  isPortTaken(routerPort, (error: PortError | undefined, inUse?: boolean) => {
    if (error) {
      logger.log(error.message);
    } else if (inUse) {
      logger.log(`Router port ${routerPort} is already in use\n`);
    } else {
      logger.log(`Router starting on port ${routerPort}...\n`);

      app.listen(routerPort, () => {
        logger.log(`Router running on port ${routerPort}\n`);

        const wss = new WebSocket.Server({ port: SOCKET_PORT });

        startSockets(routerPort, wss);
      });
    }
  });
};

init();

export default router;
