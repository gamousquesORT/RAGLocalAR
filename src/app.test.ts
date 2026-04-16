import request from 'supertest';
import { createApp } from './app';
import { ClassifyService } from './classify/classify.service';
import { IndexingService } from './indexing/indexing.service';

const mockClassifyService = { classify: jest.fn() } as unknown as ClassifyService;
const mockIndexingService = { indexFromCsv: jest.fn() } as unknown as IndexingService;

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  jest.clearAllMocks();
  app = createApp({ classifyService: mockClassifyService, indexingService: mockIndexingService });
});

describe('global error handler', () => {
  it('returns 500 JSON for unhandled errors', async () => {
    (mockClassifyService.classify as jest.Mock).mockRejectedValue(new Error('unexpected crash'));

    const res = await request(app).post('/classify').send({ prompt: 'test' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'unexpected crash');
  });
});

describe('unknown routes', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/unknown-route');

    expect(res.status).toBe(404);
  });
});
