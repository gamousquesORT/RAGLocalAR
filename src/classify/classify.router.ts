import { Router, Request, Response, NextFunction } from 'express';
import { ClassifyService } from './classify.service';

export function createClassifyRouter(classifyService: ClassifyService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    const { prompt } = req.body as { prompt?: unknown };

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt is required and must be a string' });
      return;
    }

    try {
      const result = await classifyService.classify(prompt);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
