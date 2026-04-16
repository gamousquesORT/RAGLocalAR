import express, { Request, Response, NextFunction } from 'express';
import { ClassifyService } from './classify/classify.service';
import { IndexingService } from './indexing/indexing.service';
import { createClassifyRouter } from './classify/classify.router';
import { createIndexingRouter } from './indexing/indexing.router';

interface AppDependencies {
  classifyService: ClassifyService;
  indexingService: IndexingService;
}

export function createApp(deps: AppDependencies): express.Express {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  app.use('/classify', createClassifyRouter(deps.classifyService));
  app.use('/index', createIndexingRouter(deps.indexingService));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  });

  return app;
}
