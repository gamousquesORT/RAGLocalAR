import express from 'express';
import request from 'supertest';
import { ClassifyService } from './classify.service';
import { RagService } from '../shared/rag/rag.service';
import { createClassifyRouter } from './classify.router';
import { OllamaError } from '../shared/ollama/ollama.client';

const mockRag = { classify: jest.fn() } as unknown as RagService;

// ── ClassifyService tests ────────────────────────────────────────────────────

describe('ClassifyService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns ClassifyResponse from ragService.classify', async () => {
    (mockRag.classify as jest.Mock).mockResolvedValue(['Electrónica y Tecnología']);
    const service = new ClassifyService(mockRag, 5);

    const result = await service.classify('ship a laptop');

    expect(result).toEqual({ categories: ['Electrónica y Tecnología'] });
    expect(mockRag.classify).toHaveBeenCalledWith('ship a laptop', 5);
  });
});

// ── Classify router tests ────────────────────────────────────────────────────

describe('POST /classify', () => {
  let app: express.Express;
  let mockService: ClassifyService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = {
      classify: jest.fn(),
    } as unknown as ClassifyService;
    app = express();
    app.use(express.json());
    app.use('/', createClassifyRouter(mockService));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    });
  });

  it('returns 200 with categories on success', async () => {
    (mockService.classify as jest.Mock).mockResolvedValue({ categories: ['Electrónica y Tecnología'] });

    const res = await request(app).post('/').send({ prompt: 'ship a laptop' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories: ['Electrónica y Tecnología'] });
  });

  it('returns 400 when prompt is missing', async () => {
    const res = await request(app).post('/').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when prompt is not a string', async () => {
    const res = await request(app).post('/').send({ prompt: 123 });

    expect(res.status).toBe(400);
  });

  it('returns 500 when classify throws OllamaError', async () => {
    (mockService.classify as jest.Mock).mockRejectedValue(new OllamaError('Ollama unavailable'));

    const res = await request(app).post('/').send({ prompt: 'ship a laptop' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
