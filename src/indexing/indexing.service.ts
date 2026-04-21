import { RagService } from '../shared/rag/rag.service';
import { ChromaClientAdapter } from '../shared/chroma/chroma.client';
import { loadCsvFromFile } from './csvLoader';
import { IndexingResult } from './indexing.types';

export class IndexingService {
  constructor(
    private readonly ragService: RagService,
    private readonly chroma: ChromaClientAdapter,
  ) {}

  async indexFromCsv(csvPath: string): Promise<IndexingResult> {
    const rows = loadCsvFromFile(csvPath);
    const errors: string[] = [];
    let indexed = 0;

    for (const row of rows) {
      try {
        const embedding = await this.ragService.buildEmbedding(row.description);
        const id = row.category_name_es.toLowerCase().replace(/\s+/g, '-');
        await this.chroma.upsert([{
          id,
          embedding,
          metadata: {
            category_name_es: row.category_name_es,
          },
          document: row.description,
        }]);
        indexed++;
      } catch (err) {
        errors.push(`Failed to index "${row.category_name_es}": ${(err as Error).message}`);
      }
    }

    return { indexed, errors };
  }
}
