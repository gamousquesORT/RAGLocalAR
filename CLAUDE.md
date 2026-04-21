# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start with hot reload (tsx watch)
npm run build        # compile TypeScript to dist/
npm test             # run all tests
npm run test:coverage  # run tests with coverage report
```

Run a single test file:
```bash
npx jest src/indexing/indexing.test.ts
```

Run with Docker:
```bash
docker compose up
```

## Architecture

Express API with a RAG pipeline on top of a local Ollama LLM and Chroma vector DB.

**Two endpoints:**
- `POST /classify` — embeds user prompt → queries Chroma top-K → builds grounded prompt → LLM returns JSON array of matching `category_name_es` values.
- `POST /index` — reads CSV → embeds each row's `description` → upserts into Chroma.

**Dependency wiring** lives in `src/app.ts`. All services use constructor injection; no globals.

**Key data flow:**
1. `csvLoader.ts` parses CSV into `CsvRow[]` (`category_name_es` + `description` only).
2. `IndexingService` drives the loop: embedding via `RagService.buildEmbedding` → upsert via `ChromaClientAdapter`.
3. `RagService.classify` orchestrates embed → chroma query → `buildGroundedPrompt` → ollama chat → `parseCategories`.
4. The LLM prompt lists candidates as `- {category_name_es}: {document}` and instructs the model to return a JSON array using those exact names.

**CSV format** (`./data/`, path set via `CSV_PATH` env var):
- `category_name_es` — Spanish name; used as the Chroma document ID (lowercased, spaces→dashes) and returned in API responses.
- `description` — embedded for semantic search (also accepted as `descripcion`).

## Configuration

```
PORT, OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_EMBEDDING_MODEL
CHROMA_URL, CHROMA_COLLECTION, CSV_PATH, TOP_K
```

Validated at startup via Zod in `src/shared/config/env.ts`.

## Testing

- **Framework:** Jest + ts-jest (`jest.config.js`, `tsconfig.test.json`).
- **Coverage threshold:** 90% statements/branches/functions/lines (enforced in `jest.config.js`).
- All external dependencies (Ollama, Chroma) are mocked via `jest.fn()` / constructor injection — no live services needed for unit tests.
- Test files are co-located with source files (`<module>.test.ts`).

## Development Workflow — Strict TDD

Every production code change must follow **Red → Green → Refactor**:
1. Write a failing test first; confirm it fails for the right reason.
2. Write the minimum code to make it pass.
3. Refactor; re-run tests to confirm green.

Never test implementation details — test observable behavior only.
