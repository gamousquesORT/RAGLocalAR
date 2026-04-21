import { ChromaClient } from 'chromadb-client';

export class ChromaError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ChromaError';
  }
}

export interface ChromaItem {
  id: string;
  embedding: number[];
  metadata: Record<string, string>;
  document: string;
}

export interface ChromaResult {
  id: string;
  metadata: Record<string, string>;
  document: string;
  distance: number;
}

export class ChromaClientAdapter {
  private client: ChromaClient;
  private collectionName: string;

  constructor(url: string, collectionName: string) {
    this.client = new ChromaClient({ path: url });
    this.collectionName = collectionName;
  }

  private async getCollection() {
    return this.client.getOrCreateCollection({ name: this.collectionName });
  }

  async upsert(items: ChromaItem[]): Promise<void> {
    try {
      const collection = await this.getCollection();
      await collection.upsert({
        ids: items.map((i) => i.id),
        embeddings: items.map((i) => i.embedding),
        metadatas: items.map((i) => i.metadata),
        documents: items.map((i) => i.document),
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new ChromaError(`Chroma upsert failed: ${cause}`, err);
    }
  }

  async query(embedding: number[], topK: number): Promise<ChromaResult[]> {
    try {
      const collection = await this.getCollection();
      const result = await collection.query({
        queryEmbeddings: [embedding],
        nResults: topK,
      });

      return result.ids[0].map((id, i) => ({
        id,
        metadata: (result.metadatas?.[0]?.[i] ?? {}) as Record<string, string>,
        document: result.documents?.[0]?.[i] ?? '',
        distance: result.distances?.[0]?.[i] ?? 0,
      }));
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new ChromaError(`Chroma query failed: ${cause}`, err);
    }
  }
}
