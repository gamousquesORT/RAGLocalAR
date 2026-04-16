import { OllamaClient } from '../ollama/ollama.client';
import { ChromaClientAdapter, ChromaResult } from '../chroma/chroma.client';

export class RagService {
  constructor(
    private readonly ollama: OllamaClient,
    private readonly chroma: ChromaClientAdapter,
  ) {}

  buildGroundedPrompt(userQuery: string, candidates: ChromaResult[]): string {
    const candidateList = candidates
      .map((c) => `- ${c.metadata.category_name}: ${c.document}`)
      .join('\n');

    return `You are a logistics classification assistant. Given the candidate categories below, identify ALL categories that match the user's shipment description.

The user wants to transport: "${userQuery}"

Candidate categories:
${candidateList}

Respond ONLY with a JSON array of the Spanish category names (category_name_es) that apply.
Example: ["Electrónica y Tecnología", "Arte y Antigüedades"]

JSON response:`;
  }

  parseCategories(rawText: string): string[] {
    try {
      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed)) return parsed as string[];
      return [];
    } catch {
      return [];
    }
  }

  async buildEmbedding(text: string): Promise<number[]> {
    return this.ollama.embed(text);
  }

  async classify(userQuery: string, topK: number): Promise<string[]> {
    const embedding = await this.ollama.embed(userQuery);
    const candidates = await this.chroma.query(embedding, topK);
    const prompt = this.buildGroundedPrompt(userQuery, candidates);
    const rawResponse = await this.ollama.chat(prompt);
    return this.parseCategories(rawResponse);
  }
}
