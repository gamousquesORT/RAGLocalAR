# Logistics Classification Web API

## Project Overview

We are building a **TypeScript Web API** for a logistics application. The API receives natural-language shipment requests from users and automatically detects the **category (or categories)** of the item(s) to be transported using a **RAG (Retrieval-Augmented Generation)** pipeline on top of a **local LLM served by Ollama**.

The goal is to improve category detection accuracy by grounding the LLM's response in a curated, domain-specific catalog of categories stored in a vector database.

## Tech Stack

- **Language:** TypeScript (Node.js)
- **Web framework:** Express
- **LLM runtime:** Ollama (local) — the specific chat/completion model is configured via environment variable
- **Embedding model:** `nomic-embed-text-v2-moe` (configurable via environment variable)
- **Vector database:** Chroma (running locally)
- **Containerization:** Docker + Docker Compose (the API and Chroma run as separate services)

## Functional Requirements

### 1. `POST /classify`

- **Input:** A JSON body containing a free-text prompt describing what the user wants to transport (e.g., *"Necesito enviar una pintura al óleo y una computadora portátil"* or *"I need to ship a painting and a laptop"*).
- **Language support:** Prompts may be in **Spanish or English**.
- **Processing flow:**
  1. Embed the incoming prompt using the configured embedding model.
  2. Perform a semantic search against the Chroma collection using **top-K** results (K is configurable via environment variable).
  3. Build a grounded prompt containing the retrieved category candidates and send it to the local LLM via the Ollama API.
  4. The LLM must identify **all categories** present in the user's request — if the prompt mentions multiple items, the response must include multiple categories.
- **Output:** A JSON response containing the list of detected categories (using `category_name_es` from the source data).

> Note: Whether to enforce structured output via **function calling / JSON schema** is still undecided. The implementation should make it easy to switch between free-text parsing and structured output later.

### 2. `POST /index`

- Triggers the (re)indexing process.
- Reads the CSV source file, generates embeddings for each row's `description` field, and upserts them into the Chroma collection along with metadata (`category_name_es`, `category_name`).
- Should be idempotent (safe to call multiple times).

## Data Source

- **Format:** CSV file
- **Location:** `./data/` (filename configured via environment variable)
- **Columns:**
  - `category_name_es` — Spanish category name (used in API responses)
  - `category_name` — English/canonical category name
  - `description` — Rich textual description of the category; **this is the field used for semantic search / embedding**

## RAG Pipeline

1. **Indexing (`POST /index`):** Load CSV → embed each row's `description` → store the vector in Chroma with `category_name_es` and `category_name` as metadata.
2. **Querying (`POST /classify`):** Embed the user prompt → retrieve top-K most similar category descriptions from Chroma → inject them as context into the LLM prompt → LLM returns the matching categories.

## Configuration (Environment Variables)

- `PORT` — HTTP port for the API
- `OLLAMA_BASE_URL` — URL of the Ollama server
- `OLLAMA_MODEL` — LLM model used for classification
- `OLLAMA_EMBEDDING_MODEL` — embedding model (default: `nomic-embed-text-v2-moe`)
- `CHROMA_URL` — URL of the local Chroma instance
- `CHROMA_COLLECTION` — collection name
- `CSV_PATH` — CSV filename inside `./data/`
- `TOP_K` — number of nearest neighbors retrieved from Chroma

## Non-Functional Requirements

- **Authentication:** Not required for this phase.
- **Deployment:** The entire solution must run via `docker compose up`, with **separate services** for `api` (Express/TypeScript) and `chroma` (with a persistent volume). Ollama may run externally or be added as another service.
- **Language-agnostic prompts:** Must work for Spanish and English input.
- **Logging:** Basic request/response and pipeline-step logging.
- **Error handling:** Clear error responses when Ollama or Chroma are unavailable, the CSV is missing, or indexing fails.

## Suggested Project Structure
.
├── data/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── classify.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── ollama.ts
│   │   ├── chroma.ts
│   │   └── rag.ts
│   ├── ingestion/
│   │   └── csvLoader.ts
│   └── config/
│       └── env.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example


## Open Questions / Future Decisions

- Adopt **function calling / structured JSON output** from Ollama for deterministic parsing.
- Add authentication (API key or JWT) when exposed beyond local use.
- Add automated tests (Vitest/Jest).
- Decide whether Ollama runs as a Compose service or external dependency.
