import { Router } from 'express';
import { IndexingService } from './indexing.service';

export function createIndexingRouter(indexingService: IndexingService): Router {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const result = await indexingService.indexFromCsv(process.env.CSV_PATH ?? '');
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
