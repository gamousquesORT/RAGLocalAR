import { OllamaClient } from '../ollama/ollama.client';
import { ChromaClientAdapter, ChromaResult } from '../chroma/chroma.client';

export class RagService {
  constructor(
    private readonly ollama: OllamaClient,
    private readonly chroma: ChromaClientAdapter,
  ) {}

  buildGroundedPrompt(userQuery: string, candidates: ChromaResult[]): string {
    const candidateList = candidates
      .map((c) => `- ${c.metadata.category_name_es}: ${c.document}`)
      .join('\n');

    return `Eres un asistente experto en clasificar los ítems de las solicitudes de traslado realizadas por los usuarios. Dadas las siguientes categorías candidatas: ${candidateList}  
    identifica para cada item en la solicitud del usuario "${userQuery}" a cual de las categorías dadas pertenece cada ítem.

    responde en un Array JSON como el formato del siguiente ejemplo: Example: Respuesta: [ { "item": "Computadoras" }, { "item": "Pinturas, Tratamientos de Pared e Insumos" } ]
    
    JSON response`;
  }

  parseCategories(rawText: string): string[] {
    const direct = this.tryParseStringArray(rawText.trim());
    if (direct) return direct;

    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch) {
      const fromFence = this.tryParseStringArray(fencedMatch[1].trim());
      if (fromFence) return fromFence;
    }

    const start = rawText.indexOf('[');
    const end = rawText.lastIndexOf(']');
    if (start !== -1 && end > start) {
      const fromSlice = this.tryParseStringArray(rawText.slice(start, end + 1).trim());
      if (fromSlice) return fromSlice;
    }

    return [];
  }

  private tryParseStringArray(value: string): string[] | null {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return null;

      const collected = this.collectCategoryStrings(parsed)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      return collected;
    } catch {
      return null;
    }
  }

  private collectCategoryStrings(value: unknown): string[] {
    if (typeof value === 'string') {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.collectCategoryStrings(item));
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const direct = ['item', 'category', 'category_name_es']
        .map((key) => record[key])
        .find((entry) => typeof entry === 'string');

      if (typeof direct === 'string') {
        return [direct];
      }
    }

    return [];
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
