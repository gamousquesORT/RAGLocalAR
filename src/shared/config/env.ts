import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  OLLAMA_BASE_URL: z.string().min(1),
  OLLAMA_MODEL: z.string().min(1),
  OLLAMA_EMBEDDING_MODEL: z.string().min(1),
  CHROMA_URL: z.string().min(1),
  CHROMA_COLLECTION: z.string().min(1),
  CSV_PATH: z.string().min(1),
  TOP_K: z.coerce.number().int().positive(),
});

const parsed = schema.parse(process.env);

export const config = Object.freeze({
  port: parsed.PORT,
  ollamaBaseUrl: parsed.OLLAMA_BASE_URL,
  ollamaModel: parsed.OLLAMA_MODEL,
  ollamaEmbeddingModel: parsed.OLLAMA_EMBEDDING_MODEL,
  chromaUrl: parsed.CHROMA_URL,
  chromaCollection: parsed.CHROMA_COLLECTION,
  csvPath: parsed.CSV_PATH,
  topK: parsed.TOP_K,
});
