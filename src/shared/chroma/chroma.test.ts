import { ChromaClientAdapter, ChromaError } from './chroma.client';

jest.mock('chromadb-client', () => {
  const mockCollection = {
    upsert: jest.fn(),
    query: jest.fn(),
  };
  return {
    ChromaClient: jest.fn().mockImplementation(() => ({
      getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection),
    })),
    __mockCollection: mockCollection,
  };
});

import * as chromadbMock from 'chromadb-client';

const getMockCollection = () => (chromadbMock as unknown as { __mockCollection: { upsert: jest.Mock; query: jest.Mock } }).__mockCollection;

let adapter: ChromaClientAdapter;

beforeEach(() => {
  jest.clearAllMocks();
  adapter = new ChromaClientAdapter('http://localhost:8000', 'test_collection');
});

describe('ChromaClientAdapter.query', () => {
  it('returns ChromaResult array mapped from SDK response', async () => {
    getMockCollection().query.mockResolvedValue({
      ids: [['id1', 'id2']],
      metadatas: [[{ category_name_es: 'Electrónica', category_name: 'Electronics' }, { category_name_es: 'Arte', category_name: 'Art' }]],
      documents: [['laptops computers', 'paintings sculptures']],
      distances: [[0.1, 0.2]],
      included: [],
    });

    const results = await adapter.query([0.1, 0.2, 0.3], 2);

    expect(results).toEqual([
      { id: 'id1', metadata: { category_name_es: 'Electrónica', category_name: 'Electronics' }, document: 'laptops computers', distance: 0.1 },
      { id: 'id2', metadata: { category_name_es: 'Arte', category_name: 'Art' }, document: 'paintings sculptures', distance: 0.2 },
    ]);
    expect(getMockCollection().query).toHaveBeenCalledWith({
      queryEmbeddings: [[0.1, 0.2, 0.3]],
      nResults: 2,
    });
  });

  it('throws ChromaError when SDK query throws an Error', async () => {
    getMockCollection().query.mockRejectedValue(new Error('connection refused'));

    await expect(adapter.query([0.1], 1)).rejects.toBeInstanceOf(ChromaError);
  });

  it('throws ChromaError when SDK query throws a non-Error value', async () => {
    getMockCollection().query.mockRejectedValue('connection string error');

    await expect(adapter.query([0.1], 1)).rejects.toBeInstanceOf(ChromaError);
  });

  it('handles null metadata, document and distances gracefully', async () => {
    getMockCollection().query.mockResolvedValue({
      ids: [['id1']],
      metadatas: [[null]],
      documents: [[null]],
      distances: null,
      included: [],
    });

    const results = await adapter.query([0.1], 1);

    expect(results[0].metadata).toEqual({});
    expect(results[0].document).toBe('');
    expect(results[0].distance).toBe(0);
  });
});

describe('ChromaClientAdapter.upsert', () => {
  it('calls SDK upsert with correct parallel arrays', async () => {
    getMockCollection().upsert.mockResolvedValue(undefined);

    await adapter.upsert([
      { id: 'id1', embedding: [0.1, 0.2], metadata: { category_name_es: 'Electrónica', category_name: 'Electronics' }, document: 'laptops' },
    ]);

    expect(getMockCollection().upsert).toHaveBeenCalledWith({
      ids: ['id1'],
      embeddings: [[0.1, 0.2]],
      metadatas: [{ category_name_es: 'Electrónica', category_name: 'Electronics' }],
      documents: ['laptops'],
    });
  });

  it('throws ChromaError when SDK upsert throws an Error', async () => {
    getMockCollection().upsert.mockRejectedValue(new Error('upsert failed'));

    await expect(
      adapter.upsert([{ id: 'id1', embedding: [0.1], metadata: {}, document: 'test' }])
    ).rejects.toBeInstanceOf(ChromaError);
  });

  it('throws ChromaError when SDK upsert throws a non-Error value', async () => {
    getMockCollection().upsert.mockRejectedValue('string error');

    await expect(
      adapter.upsert([{ id: 'id1', embedding: [0.1], metadata: {}, document: 'test' }])
    ).rejects.toBeInstanceOf(ChromaError);
  });
});
