import { RagService } from '../shared/rag/rag.service';
import { ClassifyResponse } from './classify.types';

export class ClassifyService {
  constructor(
    private readonly ragService: RagService,
    private readonly topK: number,
  ) {}

  async classify(prompt: string): Promise<ClassifyResponse> {
    const categories = await this.ragService.classify(prompt, this.topK);
    return { categories };
  }
}
