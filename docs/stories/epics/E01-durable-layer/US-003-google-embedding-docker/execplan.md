# Exec Plan

## Goal

Successfully transition the MCP server from a mock vector generator to active Google Gemini embeddings (768 dimensions), and provide a production-ready Docker Compose stack that works out-of-the-box.

## Scope

In scope:
- Installing `@google/genai` dependency.
- Updating schema dimensions to 768.
- Replacing mock logic in `src/mcp-server.ts`.
- Building `Dockerfile` and `docker-compose.yml`.
- Providing `.env.example`.
- Verifying the end-to-end flow using real tool calls.

Out of scope:
- Deploying the Docker stack to cloud hosting (e.g. AWS, GCP).
- Implementing an SSE MCP gateway in this story.

## Risk Classification

Risk flags:
- **Data model**: Altering database schema vector column size.
- **External systems**: Connecting to Google Gemini API.
- **Public contracts**: Altering embedding dimension sizes.

Hard gates:
- External provider integration (Gemini API).
- Altering existing schema columns.

## Work Phases

1. **Intake and Stories Setup**: Log the task under Harness.
2. **ADR Writing**: Formulate and record ADR-0006.
3. **Dependencies**: Install `@google/genai` package.
4. **Code Changes**: Update `src/schema.sql` and `src/mcp-server.ts` with real embedding logic.
5. **Containerization**: Create `Dockerfile` and `docker-compose.yml`.
6. **Verification**: Spin up the containers, run tests, and write down proof.
7. **Trace Logging**: Finalize story progress under Harness.

## Stop Conditions

Pause for human confirmation if:
- Gemini API key fails to authenticate during testing (and fallback is not sufficient for user needs).
- WSL/Docker container networking issues block standard postgres connectivity on the host.
