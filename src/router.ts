import * as express from 'express';
import * as proxy from 'express-http-proxy';
import * as vhost from 'vhost';
import * as WebSocket from 'ws';
import { SOCKET_PORT } from './constants';
import * as logger from './logger';
import { isPortTaken, PortError } from './utils';

export interface Routes {
  [i: string]: {
    url: string;
    port: number;
  };
}

export const ACTIONS = {
  ADD_ROUTE: 'ADD_ROUTE',
  ADD_ROUTES: 'ADD_ROUTES',
  REMOVE_ROUTES: 'REMOVE_ROUTES',
};

const globalRoutes: Routes = {};

let expressRouter: express.Router = express.Router();

const app = express();

app.use((req, res, next) => {
  return expressRouter(req, res, next);
});

const applyRoutes = () => {
  for (const processName in globalRoutes) {
    if (globalRoutes.hasOwnProperty(processName)) {
      const { url, port } = globalRoutes[processName];

      expressRouter.use(vhost(`localhost:${port}`, proxy(url)));
    }
  }
};

const addRoute = (name: string, url: string, port: number, ws: WebSocket) => {
  globalRoutes[name] = {
    url,
    port,
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(`Routing process ${name} from ${url} to port ${port}`);
  }
};

const addRoutes = (routes: Routes, ws: WebSocket) => {
  for (const processName in routes) {
    if (routes.hasOwnProperty(processName)) {
      const { url, port } = routes[processName];
      addRoute(name, url, port, ws);
    }
  }

  expressRouter = express.Router();
  applyRoutes();
};

const removeRoutes = (routes: Routes, ws: WebSocket) => {
  for (const processName in routes) {
    if (routes.hasOwnProperty(processName)) {
      const { url, port} = routes[processName];
      delete globalRoutes[processName];

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`Removing route ${processName} ${url} on port ${port}`);
      }
    }
  }

  expressRouter = express.Router();
  applyRoutes();
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

      const { type, payload, payload: { processName, url, port: routePort } } = json;

      switch (type) {
        case ACTIONS.ADD_ROUTE:
          addRoute(processName, url, routePort, ws);
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
      ws.send(`Connected to router on port ${port}`);
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
