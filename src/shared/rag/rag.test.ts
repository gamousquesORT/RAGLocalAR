import { RagService } from './rag.service';
import { OllamaClient, OllamaError } from '../ollama/ollama.client';
import { ChromaClientAdapter, ChromaResult } from '../chroma/chroma.client';

const mockOllama = {
  embed: jest.fn(),
  chat: jest.fn(),
} as unknown as OllamaClient;

const mockChroma = {
  upsert: jest.fn(),
  query: jest.fn(),
} as unknown as ChromaClientAdapter;

const candidateResults: ChromaResult[] = [
  { id: '1', metadata: { category_name_es: 'Electrónica y Tecnología' }, document: 'laptops computers', distance: 0.1 },
  { id: '2', metadata: { category_name_es: 'Arte y Antigüedades' }, document: 'paintings sculptures', distance: 0.2 },
];

let service: RagService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new RagService(mockOllama, mockChroma);
});

describe('RagService.buildGroundedPrompt', () => {
  it('includes the user query in the prompt', () => {
    const prompt = service.buildGroundedPrompt('ship a laptop', candidateResults);
    expect(prompt).toContain('ship a laptop');
  });

  it('includes candidate category names in the prompt', () => {
    const prompt = service.buildGroundedPrompt('ship a laptop', candidateResults);
    expect(prompt).toContain('Electrónica y Tecnología');
    expect(prompt).toContain('Arte y Antigüedades');
  });
});

describe('RagService.parseCategories', () => {
  it('parses a valid JSON array', () => {
    expect(service.parseCategories('["Electrónica y Tecnología"]')).toEqual(['Electrónica y Tecnología']);
  });

  it('parses multiple categories', () => {
    expect(service.parseCategories('["Electrónica y Tecnología", "Arte y Antigüedades"]'))
      .toEqual(['Electrónica y Tecnología', 'Arte y Antigüedades']);
  });

  it('returns [] for invalid JSON', () => {
    expect(service.parseCategories('I cannot determine the category')).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(service.parseCategories('')).toEqual([]);
  });

  it('returns [] when JSON parses to a non-array', () => {
    expect(service.parseCategories('{"category":"Electronics"}')).toEqual([]);
  });

  it('parses categories from a markdown fenced JSON response', () => {
    const raw = 'Sure, here is the result:\n```json\n["Electrónica y Tecnología", "Arte y Antigüedades"]\n```';
    expect(service.parseCategories(raw)).toEqual(['Electrónica y Tecnología', 'Arte y Antigüedades']);
  });

  it('parses nested category arrays from a fenced response with trailing text', () => {
    const raw = '```json\n[\n  ["Pinturas, Tratamientos de Pared e Insumos"],\n  ["Computadoras"]\n]\n```\n\nEn este caso...';
    expect(service.parseCategories(raw)).toEqual(['Pinturas, Tratamientos de Pared e Insumos', 'Computadoras']);
  });
});

describe('RagService.buildEmbedding', () => {
  it('delegates to ollamaClient.embed', async () => {
    (mockOllama.embed as jest.Mock).mockResolvedValue([0.5, 0.6]);

    const result = await service.buildEmbedding('some text');

    expect(result).toEqual([0.5, 0.6]);
    expect(mockOllama.embed).toHaveBeenCalledWith('some text');
  });
});

describe('RagService.classify', () => {
  it('orchestrates embed → query → chat and returns parsed categories', async () => {
    (mockOllama.embed as jest.Mock).mockResolvedValue([0.1, 0.2]);
    (mockChroma.query as jest.Mock).mockResolvedValue(candidateResults);
    (mockOllama.chat as jest.Mock).mockResolvedValue('["Electrónica y Tecnología"]');

    const result = await service.classify('ship a laptop', 3);

    expect(mockOllama.embed).toHaveBeenCalledWith('ship a laptop');
    expect(mockChroma.query).toHaveBeenCalledWith([0.1, 0.2], 3);
    expect(mockOllama.chat).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['Electrónica y Tecnología']);
  });

  it('propagates OllamaError when embed throws', async () => {
    (mockOllama.embed as jest.Mock).mockRejectedValue(new OllamaError('network down'));

    await expect(service.classify('ship a laptop', 3)).rejects.toBeInstanceOf(OllamaError);
  });
});
