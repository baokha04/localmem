# Overview

## Current Behavior

- The database schema (`src/schema.sql`) declares `embedding VECTOR(1536)`.
- The MCP server (`src/mcp-server.ts`) utilizes a mock embedding generator which yields a static array of size 1536 filled with `0.01` values.
- There is no containerization or Docker configuration, requiring developers to manually configure local databases and Node runtimes on host machines.

## Target Behavior

- The MCP server generates high-quality semantic embeddings using the official **`@google/genai`** SDK and the **`text-embedding-004`** model.
- An API key is loaded via `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) from environment variables.
- The PostgreSQL pgvector column dimension in `src/schema.sql` is migrated to **`768`** (matching the default dimensionality of `text-embedding-004`).
- A multi-stage `Dockerfile` compiles TypeScript safely under Node 20 and runs the MCP server.
- A `docker-compose.yml` launches the `pgvector/pgvector:pg16` database service and the containerized MCP server, handling health checks and linking them together.

## Affected Users

- **Developers**: Can run the database and MCP server with a single command (`docker compose up`) and search their codebases using real Google embeddings.
- **LLM/Client Integrations**: Benefit from real cosine-similarity search scores instead of mocks, resulting in significantly higher quality context window retrievals.

## Affected Product Docs

- `README.md` (Update deployment guidelines and environment variable requirements)
- `src/schema.sql` (Update vector sizes)
- `src/mcp-server.ts` (Implement embedding integration)

## Non-Goals

- Migrating old mock database entries (since it is a development mock, we will clean-init the database instead).
- Converting the MCP server communication protocol from Stdio to Server-Sent Events (SSE). It remains stdio-based.
