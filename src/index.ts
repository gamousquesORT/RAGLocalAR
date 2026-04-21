import 'dotenv/config';
import { createApp } from './app';
import { config } from './shared/config/env';
import { OllamaClient } from './shared/ollama/ollama.client';
import { ChromaClientAdapter } from './shared/chroma/chroma.client';
import { RagService } from './shared/rag/rag.service';
import { ClassifyService } from './classify/classify.service';
import { IndexingService } from './indexing/indexing.service';

const ollamaClient = new OllamaClient(config.ollamaBaseUrl, config.ollamaModel, config.ollamaEmbeddingModel);
const chromaClient = new ChromaClientAdapter(config.chromaUrl, config.chromaCollection);
const ragService = new RagService(ollamaClient, chromaClient);

const classifyService = new ClassifyService(ragService, config.topK);
const indexingService = new IndexingService(ragService, chromaClient);

const app = createApp({ classifyService, indexingService });

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
