import * as colors from 'colors/safe';
import * as express from 'express';
import * as httpProxy from 'http-proxy';
import * as WebSocket from 'ws';
import { Colors, SOCKET_PORT } from './constants';
import * as logger from './logger';
import { isPortTaken, PortError } from './utils';

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

const app = express();
const expressRouter = express.Router();
const proxy = httpProxy.createServer();

proxy.on('error', (error) => {
  logger.log(error.message);
  logger.log('Process may still be starting');
});

expressRouter.use((req, res) => {
  const route = globalRoutes[req.hostname];

  if (route) {
    proxy.web(req, res, {
      target: `http://0.0.0.0:${route.port}`,
    });
  } else {
    res.send(`Unknown host ${req.hostname}`);
  }
});

app.use((req, res, next) => {
  return expressRouter(req, res, next);
});

const addRoute = (processName: string, color: Colors, url: string, port: number, ws: WebSocket) => {
  globalRoutes[url] = {
    processName,
    url,
    port,
    color,
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(colors[color](`Routing process ${processName} from ${url} to port ${port}`));
  }
};

const addRoutes = (routes: Routes, ws: WebSocket) => {
  for (const url in routes) {
    if (routes.hasOwnProperty(url)) {
      const { processName, port, color } = routes[url];
      addRoute(processName, color, url, port, ws);
    }
  }
};

const removeRoutes = (routes: Routes, ws: WebSocket) => {
  for (const url in routes) {
    if (routes.hasOwnProperty(url)) {
      const { processName, port, color } = routes[url];
      delete globalRoutes[url];

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(colors[color](`Removing route ${processName} ${url} on port ${port}`));
      }
    }
  }
};

const startSockets = (port: number) => {
  const wss = new WebSocket.Server({ port: SOCKET_PORT });

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

      const { type, payload, payload: { processName, color, url, port: routePort } } = json;

      switch (type) {
        case ACTIONS.ADD_ROUTE:
          addRoute(processName, color, url, routePort, ws);
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
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`Connected to router on port ${port}\n`);
    }
  });

  wss.on('close', () => {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('Router no longer running');
      }
    });
  });
};

const router = () => {
  const { PORT } = process.env;

  const port = PORT ? parseInt(PORT, 10) : 8080;

  isPortTaken(port, (error: PortError | undefined, inUse?: boolean) => {
    if (error) {
      logger.log(error.message);
    } else if (inUse) {
      logger.log(`Router port ${port} is already in use`);
    } else {
      logger.log(`Router starting on port ${port}...`);

      app.listen(port, () => {
        logger.log(`Router running on port ${port}`);

        startSockets(port);
      });
    }
  });
};

export default router;
