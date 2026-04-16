describe('env config', () => {
  const REQUIRED_ENV = {
    PORT: '3000',
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OLLAMA_MODEL: 'llama3.2',
    OLLAMA_EMBEDDING_MODEL: 'nomic-embed-text-v2-moe',
    CHROMA_URL: 'http://localhost:8000',
    CHROMA_COLLECTION: 'logistics_categories',
    CSV_PATH: './data/logistics-categories.csv',
    TOP_K: '5',
  };

  beforeEach(() => {
    jest.resetModules();
    Object.entries(REQUIRED_ENV).forEach(([k, v]) => {
      process.env[k] = v;
    });
  });

  afterEach(() => {
    Object.keys(REQUIRED_ENV).forEach((k) => delete process.env[k]);
  });

  it('parses PORT as a number', async () => {
    const { config } = await import('./env');
    expect(config.port).toBe(3000);
  });

  it('throws on missing PORT', async () => {
    delete process.env.PORT;
    await expect(import('./env')).rejects.toThrow();
  });

  it('parses all 8 fields correctly', async () => {
    const { config } = await import('./env');
    expect(config).toMatchObject({
      port: 3000,
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2',
      ollamaEmbeddingModel: 'nomic-embed-text-v2-moe',
      chromaUrl: 'http://localhost:8000',
      chromaCollection: 'logistics_categories',
      csvPath: './data/logistics-categories.csv',
      topK: 5,
    });
  });
});
