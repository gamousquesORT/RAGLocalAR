import { OllamaClient, OllamaError } from './ollama.client';

const BASE_URL = 'http://localhost:11434';
const MODEL = 'llama3.2';
const EMBED_MODEL = 'nomic-embed-text-v2-moe';

let client: OllamaClient;
let mockFetch: jest.Mock;

beforeEach(() => {
  mockFetch = jest.fn();
  global.fetch = mockFetch;
  client = new OllamaClient(BASE_URL, MODEL, EMBED_MODEL);
});

describe('OllamaClient.embed', () => {
  it('returns an array of numbers on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }),
    });

    const result = await client.embed('hello world');

    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/embed`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws OllamaError when fetch rejects (network failure)', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.embed('hello')).rejects.toBeInstanceOf(OllamaError);
  });

  it('throws OllamaError when response is not ok (HTTP 500)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(client.embed('hello')).rejects.toBeInstanceOf(OllamaError);
  });
});

describe('OllamaClient.chat', () => {
  it('returns the assistant message content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Electronics' } }),
    });

    const result = await client.chat('classify this');

    expect(result).toBe('Electronics');
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/chat`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws OllamaError when response is not ok (HTTP 500)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(client.chat('classify this')).rejects.toBeInstanceOf(OllamaError);
  });

  it('throws OllamaError when fetch rejects (network failure)', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.chat('classify this')).rejects.toBeInstanceOf(OllamaError);
  });
});
