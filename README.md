# RAGLocalAR — Logistics Classification API

A TypeScript/Express REST API that classifies free-text shipment descriptions into logistics categories using a **RAG (Retrieval-Augmented Generation)** pipeline with a local LLM.

## How it works

```
User prompt
    │
    ▼
[Embed prompt]  ──── Ollama (nomic-embed-text-v2-moe)
    │
    ▼
[Semantic search]  ── Chroma vector DB  →  top-K similar categories
    │
    ▼
[Build grounded prompt]  ──  inject retrieved categories as context
    │
    ▼
[LLM classification]  ──── Ollama (e.g. llama3.2)
    │
    ▼
[Parse response]  →  JSON array of Spanish category names
```

1. **Indexing (`POST /index`)** — Reads a CSV of logistics categories, embeds each row's `description` field using the embedding model, and stores the vectors in Chroma with Spanish/English category names as metadata. Safe to call multiple times (idempotent).

2. **Classification (`POST /classify`)** — Embeds the user's free-text prompt, retrieves the top-K most semantically similar categories from Chroma, injects them into a grounded prompt, and asks the LLM to identify all matching categories. Returns category names in Spanish.

---

## Tech stack

| Component | Technology |
|---|---|
| API | TypeScript + Express 5 |
| LLM runtime | Ollama (local) |
| Embedding model | `nomic-embed-text-v2-moe` |
| Vector database | Chroma |
| Testing | Jest + ts-jest (90%+ coverage) |
| Containerization | Docker + Docker Compose |

---

## Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [Ollama](https://ollama.com/) installed and running
- Required Ollama models pulled:
  ```bash
  ollama pull llama3.2
  ollama pull nomic-embed-text-v2-moe
  ```
- [Docker + Docker Compose](https://docs.docker.com/get-docker/) (for containerized setup)

---

## Project structure

```
.
├── data/
│   └── logistics-categories.csv   # Category catalog (source data)
├── src/
│   ├── index.ts                    # Entry point
│   ├── app.ts                      # Express app + DI wiring
│   ├── classify/                   # POST /classify feature
│   │   ├── classify.router.ts
│   │   ├── classify.service.ts
│   │   ├── classify.types.ts
│   │   └── classify.test.ts
│   ├── indexing/                   # POST /index feature
│   │   ├── indexing.router.ts
│   │   ├── indexing.service.ts
│   │   ├── indexing.types.ts
│   │   ├── csvLoader.ts
│   │   └── indexing.test.ts
│   └── shared/
│       ├── config/env.ts           # Zod-validated environment config
│       ├── ollama/                 # Ollama HTTP client
│       ├── chroma/                 # Chroma vector DB adapter
│       └── rag/                    # RAG orchestration (embed → search → classify)
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## Running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work as-is if Ollama and Chroma are running locally:

```env
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text-v2-moe
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=logistics_categories
CSV_PATH=./data/logistics-categories.csv
TOP_K=5
```

### 3. Start Chroma

```bash
docker run -p 8000:8000 chromadb/chroma
```

### 4. Start the API

```bash
npm run dev
```

### 5. Index the categories

```bash
curl -X POST http://localhost:3000/index
# {"indexed":10,"errors":[]}
```

### 6. Classify a shipment

```bash
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Necesito enviar una laptop y una pintura al óleo"}'
# {"categories":["Electrónica y Tecnología","Arte y Antigüedades"]}
```

---

## Running with Docker Compose

Docker Compose runs both the API and Chroma as separate services. Ollama must be running on your host machine.

### 1. Configure environment

```bash
cp .env.example .env
```

Update `OLLAMA_BASE_URL` to reach Ollama from inside Docker:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

> **Linux users:** `host.docker.internal` does not resolve automatically. Add the following to the `api` service in `docker-compose.yml`:
> ```yaml
> extra_hosts:
>   - "host.docker.internal:host-gateway"
> ```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- `api` — Express API on port 3000
- `chroma` — Chroma vector DB on port 8000 (with persistent volume)

### 3. Index the categories

```bash
curl -X POST http://localhost:3000/index
```

### 4. Classify a shipment

```bash
curl -X POST http://localhost:3000/classify \
  -H "Content-Type: application/json" \
  -d '{"prompt": "I need to ship furniture and some medication"}'
```

---

## API reference

### `POST /index`

Reads the CSV catalog, embeds all descriptions, and upserts them into Chroma. Safe to call multiple times.

**Response**
```json
{
  "indexed": 10,
  "errors": []
}
```

---

### `POST /classify`

Classifies a free-text shipment description. Accepts Spanish or English input.

**Request body**
```json
{
  "prompt": "Necesito enviar una computadora y medicamentos"
}
```

**Response**
```json
{
  "categories": ["Electrónica y Tecnología", "Medicamentos y Productos Médicos"]
}
```

**Error responses**

| Status | Cause |
|---|---|
| 400 | Missing or non-string `prompt` |
| 500 | Ollama or Chroma unreachable |

---

## Running tests

```bash
# Run all tests
npm test

# Run with coverage report (enforces 90% threshold)
npm run test:coverage
```

---

## Category catalog

The `data/logistics-categories.csv` file contains 10 logistics categories used as the knowledge base:

| Spanish name | English name |
|---|---|
| Arte y Antigüedades | Art and Antiques |
| Electrónica y Tecnología | Electronics and Technology |
| Muebles y Decoración del Hogar | Furniture and Home Decor |
| Ropa y Textiles | Clothing and Textiles |
| Alimentos y Bebidas | Food and Beverages |
| Medicamentos y Productos Médicos | Medications and Medical Products |
| Maquinaria Industrial | Industrial Machinery |
| Vehículos y Autopartes | Vehicles and Auto Parts |
| Materiales de Construcción | Construction Materials |
| Químicos y Materiales Peligrosos | Chemicals and Hazardous Materials |

To add more categories, edit the CSV and call `POST /index` again.
