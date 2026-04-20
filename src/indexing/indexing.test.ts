import 'dotenv/config';
import { parseCsv } from './csvLoader';
import { IndexingService } from './indexing.service';
import { RagService } from '../shared/rag/rag.service';
import { ChromaClientAdapter } from '../shared/chroma/chroma.client';
import express from 'express';
import request from 'supertest';
import { createIndexingRouter } from './indexing.router';
import * as fs from 'fs';

// ── csvLoader tests ──────────────────────────────────────────────────────────

describe('parseCsv', () => {
  const validCsv = `category_name_es,description
Electrónica,laptops computers
Arte,paintings sculptures`;

  it('parses valid CSV into CsvRow array', () => {
    const rows = parseCsv(validCsv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      category_name_es: 'Electrónica',
      description: 'laptops computers',
    });
  });

  it('throws when a row is missing the description field', () => {
    const badCsv = `category_name_es\nElectrónica`;
    expect(() => parseCsv(badCsv)).toThrow();
  });

  it('accepts descripcion as an alias for description', () => {
    const spanishHeaderCsv = `category_name_es,descripcion\nAbalorios y Fabricación de Joyería,Insumos de joyería`;

    const rows = parseCsv(spanishHeaderCsv);

    expect(rows).toEqual([
      {
        category_name_es: 'Abalorios y Fabricación de Joyería',
        description: 'Insumos de joyería',
      },
    ]);
  });

  it('throws when a row is missing category_name_es', () => {
    const badCsv = `description\nlaptops`;
    expect(() => parseCsv(badCsv)).toThrow();
  });

  it('returns [] for empty CSV input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

// ── IndexingService tests ────────────────────────────────────────────────────

const mockRag = { buildEmbedding: jest.fn(), classify: jest.fn() } as unknown as RagService;
const mockChroma = { upsert: jest.fn(), query: jest.fn() } as unknown as ChromaClientAdapter;

describe('IndexingService', () => {
  function resolveCsvPathForTests(): string {
    const configuredPath = process.env.CSV_PATH ?? './data/product-categories.csv';

    if (fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    if (configuredPath.startsWith('/app/')) {
      const localEquivalent = `.${configuredPath.slice('/app'.length)}`;
      if (fs.existsSync(localEquivalent)) {
        return localEquivalent;
      }
    }

    return configuredPath;
  }

  const CSV_PATH = resolveCsvPathForTests();

  function getCsvRowCount(filePath: string): number {
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (!content) return 0;
    return content.split('\n').length - 1;
  }

  beforeEach(() => jest.clearAllMocks());

  it('indexes rows from the CSV and returns IndexingResult', async () => {
    (mockRag as unknown as { buildEmbedding: jest.Mock }).buildEmbedding = jest.fn().mockResolvedValue([0.1, 0.2]);
    (mockChroma as unknown as { upsert: jest.Mock }).upsert = jest.fn().mockResolvedValue(undefined);

    const service = new IndexingService(mockRag, mockChroma);
    const result = await service.indexFromCsv(CSV_PATH);
    const expectedRows = getCsvRowCount(CSV_PATH);

    expect(result.indexed).toBe(expectedRows);
    expect(result.errors).toHaveLength(0);
  });

  it('throws when CSV file does not exist', async () => {
    const service = new IndexingService(mockRag, mockChroma);
    await expect(service.indexFromCsv('/nonexistent/path.csv')).rejects.toThrow();
  });

  it('records errors per-row when embedding fails, continues indexing others', async () => {
    const expectedRows = getCsvRowCount(CSV_PATH);
    const ragWithBuildEmbedding = {
      buildEmbedding: jest.fn()
        .mockResolvedValueOnce([0.1, 0.2])
        .mockRejectedValue(new Error('embed failed')),
    } as unknown as RagService;
    (mockChroma as unknown as { upsert: jest.Mock }).upsert = jest.fn().mockResolvedValue(undefined);

    const service = new IndexingService(ragWithBuildEmbedding, mockChroma);
    const result = await service.indexFromCsv(CSV_PATH);

    expect(result.indexed).toBe(1);
    expect(result.errors.length).toBe(Math.max(expectedRows - 1, 0));
  });
});

// ── Indexing router tests ────────────────────────────────────────────────────

describe('POST /index', () => {
  let app: express.Express;
  let mockService: IndexingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = {
      indexFromCsv: jest.fn(),
    } as unknown as IndexingService;
    app = express();
    app.use(express.json());
    app.use('/', createIndexingRouter(mockService));
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    });
  });

  it('returns 200 with IndexingResult on success', async () => {
    (mockService.indexFromCsv as jest.Mock).mockResolvedValue({ indexed: 10, errors: [] });

    const res = await request(app).post('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ indexed: 10, errors: [] });
  });

  it('returns 500 when indexFromCsv throws', async () => {
    (mockService.indexFromCsv as jest.Mock).mockRejectedValue(new Error('CSV file not found'));

    const res = await request(app).post('/');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
