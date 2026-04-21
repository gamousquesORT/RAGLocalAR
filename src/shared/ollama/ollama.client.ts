export class OllamaError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaClient {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly embeddingModel: string,
  ) {}

  async embed(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.embeddingModel, input: text }),
      });

      if (!response.ok) {
        throw new OllamaError(`Ollama embed failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { embeddings: number[][] };
      return data.embeddings[0];
    } catch (err) {
      if (err instanceof OllamaError) throw err;
      throw new OllamaError('Ollama embed request failed', err);
    }
  }

  async chat(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new OllamaError(`Ollama chat failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { message: { content: string } };
      return data.message.content;
    } catch (err) {
      if (err instanceof OllamaError) throw err;
      throw new OllamaError('Ollama chat request failed', err);
    }
  }
}
