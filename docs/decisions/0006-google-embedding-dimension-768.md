# 0006 Google Embedding Dimension 768

Date: 2026-05-29

## Status

Accepted

## Context

The MCP server previously utilized a mock vector embedding generator that produced uniform 1536-dimensional vectors. To provide high-quality semantic searching, we need to transition to a production-grade external embedding provider. 

Google's state-of-the-art developer embedding model `text-embedding-004` generates **768-dimensional** vectors. The database schema in `src/schema.sql` was originally defined with `VECTOR(1536)`. 

Furthermore, Google recently introduced the unified **`@google/genai`** SDK to replace the legacy `@google/generative-ai` package, offering cleaner API interfaces and improved consistency.

## Decision

1. Integrate Google Gemini embeddings using the new **`@google/genai`** SDK.
2. Select the **`text-embedding-004`** model for generating all source code chunk embeddings.
3. Migrate the PostgreSQL `code_nodes` table schema `embedding` column from `VECTOR(1536)` to `VECTOR(768)` in `src/schema.sql`.
4. Provide a robust, offline-capable fallback (generating a uniform 768-dimensional vector of `0.01` values) if the `GEMINI_API_KEY` is not configured, so local systems do not fail immediately when credentials are absent.

## Consequences

Positive:
- Dramatically increases the quality of context retrievals in semantic code search due to real vector cosine distance matching.
- Reduces database memory footprint and search index size by 50% compared to 1536-dimensional vectors, speeding up vector searches.
- Uses the modern and future-proof `@google/genai` SDK.

Tradeoffs:
- Changing the pgvector dimension is a breaking change for existing vector search entries. However, since the database was pre-populated only with mock vectors, we can perform a clean schema re-initialization safely.
- Introduces external API dependency requiring network access and valid Google credentials (`GEMINI_API_KEY`).
