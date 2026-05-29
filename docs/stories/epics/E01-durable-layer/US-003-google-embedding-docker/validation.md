# Validation

## Proof Strategy

We will verify both the code implementation and the dockerized execution:
1. Ensure the code compiles cleanly after library addition.
2. Confirm the database can initialize its schema with a 768-dimensional vector size.
3. Launch the containerized stack and run indexing/searching tool calls to verify the full network path and Google embedding integration work correctly.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Verify fallback array size of 768 values works if `GEMINI_API_KEY` is missing. |
| Integration | Verify schema creation successfully registers a `VECTOR(768)` column in PostgreSQL. |
| E2E | Confirm that indexing a file generates a real 768-dimension vector and stores it in pgvector database. |
| Platform | Verify `docker compose up` successfully launches both `db` and `mcp-server` services. |
| Logs/Audit | Confirm logging diagnostics print correct statements on database connection and key validation. |

## Fixtures

- Mock typescript file for AST indexing.
- Valid `GEMINI_API_KEY` (supplied by user during verification).

## Commands

```bash
# Compile and check typescript
npm run build

# Start the Docker Compose stack
docker compose up -d

# Verify logs
docker compose logs mcp-server
```

## Acceptance Evidence

(To be populated after execution)
