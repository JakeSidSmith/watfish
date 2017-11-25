import * as express from 'express';
import * as proxy from 'express-http-proxy';
import * as vhost from 'vhost';
import { SOCKET_PORT } from './constants';
import * as logger from './logger';
import { isPortTaken, PortError } from './utils';

interface Routes {
  [i: string]: string;
}

const routes: Routes = {};

let expressRouter: express.Router = express.Router();

const app = express();

app.use((req, res, next) => {
  return expressRouter(req, res, next);
});

const applyRoutes = () => {
  for (const subDomain in routes) {
    if (routes.hasOwnProperty(subDomain)) {
      const url = routes[subDomain];

      expressRouter.use(vhost(url, proxy(subDomain)));
    }
  }
};

const addRoute = (subDomain: string, url: string) => {
  routes[subDomain] = url;
  expressRouter = express.Router();
  applyRoutes();
};

const removeRoute = (subDomain: string, url: string) => {
  delete routes[subDomain];
  expressRouter = express.Router();
  applyRoutes();
};

const router = () => {
  const { PORT } = process.env;

  const port = PORT ? parseInt(PORT, 10) : 8080;

  isPortTaken(port, (error: PortError | undefined, inUse?: boolean) => {
    if (error) {
      logger.log(error.message);
    } else if (inUse) {
      logger.log(`Port ${port} is already in use`);
    } else {
      logger.log(`Starting router on port ${port}`);
      app.listen(port);
    }
  });
};

export default router;
