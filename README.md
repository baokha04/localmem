# 🧠 LocalMem: AST Processor & pgvector MCP Server

[![Model Context Protocol](https://img.shields.io/badge/MCP-Supported-blue.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/database-PostgreSQL%20%2B%20pgvector-emerald.svg)](https://github.com/pgvector/pgvector)
[![Harness](https://img.shields.io/badge/Harness-Integrated-orange.svg)](https://github.com/hoangnb24/harness-experimental)

**LocalMem** is a highly efficient Model Context Protocol (MCP) server designed to parse, chunk, and index TypeScript codebases. It combines tree-sitter AST analysis with the `pgvector` extension for PostgreSQL to build a **Graph-Vector Cache**. This enables LLMs to perform precise semantic code searches, follow function dependency edges, and filter queries by specific project contexts or structural boundaries to minimize context window bloat.

---

## 🌟 Key Features

*   **🔍 AST-Based Smart Chunking**: Uses `tree-sitter` and `tree-sitter-typescript` to intelligently break down source code into three distinct levels: **Files**, **Classes**, and **Functions/Methods**.
*   **🔗 Graph-Vector Hybrid Storage**: Indexes code blocks alongside their relational edges (e.g. function call graphs) in PostgreSQL using `pgvector` embeddings and JSONB fields.
*   **⚡ HNSW Vector Indexing**: Configured with Hierarchical Navigable Small World (HNSW) indexes using cosine distance (`vector_cosine_ops`) for lightning-fast similarity search.
*   **🤖 Google Gemini Embeddings**: Integrates with the official `@google/genai` client, utilizing the powerful `text-embedding-004` model to generate high-quality 768-dimension vectors (with automatic mock fallbacks).
*   **📦 Multi-Tenant Metadata Filter (Mem0-Style)**: Filters queries by project ID or AST node types to scope retrievals efficiently, reducing tokens and noise.
*   **🐳 Docker-Ready Orchestration**: Comes fully containerized with `docker-compose` setting up a PG16 database with the pre-installed `pgvector` extension.
*   **🏗️ Harness v0 Integrated**: Pre-configured with the SQLite-backed agent harness CLI for tracking stories, ADRs, tasks, and system traces.

---

## 🗺️ Architectural Workflow

The following diagram illustrates how **LocalMem** processes, indexes, and queries a codebase:

```mermaid
graph TD
    %% Define styles
    classDef source fill:#f9f,stroke:#333,stroke-width:2px;
    classDef process fill:#bbf,stroke:#333,stroke-width:1px;
    classDef storage fill:#bfb,stroke:#333,stroke-width:2px;
    classDef mcp fill:#fbb,stroke:#333,stroke-width:2px;

    %% Source Code & AST Processing
    subgraph Ingolstion ["Code Ingestion & AST Analysis"]
        A[TS Source Code] -->|Read File| B(ASTProcessor)
        B -->|Tree-Sitter Parsing| C{AST Node Types}
        C -->|File-level| D[File Chunk]
        C -->|class_declaration| E[Class Chunk]
        C -->|function_declaration| F[Function Chunk]
    end

    %% Dependency & Edge Extraction
    F -->|extractFunctionCalls| G[Extract Call Edges]
    
    %% Vector Embedding Generation
    D & E & F --> H[Google Gemini API]
    H -->|text-embedding-004| I[768d Vector Embeddings]

    %% Vector DB Storage
    subgraph DB ["PostgreSQL + pgvector Database"]
        I & G --> J[(code_nodes Table)]
        J -->|Index| K[HNSW Vector Index]
        J -->|Index| L[GIN Metadata Index]
    end

    %% MCP Protocol
    subgraph ClientQuery ["LLM / Agent Query Workflow"]
        M[Agent Context / Prompt] -->|Semantic Query| N[MCP Client]
        N -->|semantic_code_search| O[LocalMem MCP Server]
        O -->|Hybrid Cosine Similarity| J
        J -->|Filtered Code Chunks & Edges| O
        O -->|Formatted Results| N
    end

    class A,M source;
    class B,C,G,H process;
    class J,K,L storage;
    class N,O mcp;
```

---

## 📂 Repository Structure

| Directory / File | Description |
| :--- | :--- |
| **`src/`** | Core TypeScript implementation folder. |
| ├── [ast-processor.ts](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/src/ast-processor.ts) | AST traversal, chunking definitions, and dependency function call extraction. |
| ├── [mcp-server.ts](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/src/mcp-server.ts) | Main MCP Streamable HTTP Server initializing pgvector connection, Gemini SDK, and registering tools. |
| ├── [schema.sql](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/src/schema.sql) | PostgreSQL schema establishing pgvector, `code_nodes` table, GIN, and HNSW indexes. |
| └── [test-parser.ts](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/src/test-parser.ts) | A local sandbox script to test and log chunk outputs of a NestJS service. |
| **`scripts/`** | Operational helper scripts. |
| ├── [db-init.js](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/scripts/db-init.js) | Node.js script connecting to PostgreSQL and executing `schema.sql`. |
| ├── [harness-init.js](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/scripts/harness-init.js) | Script initializing the local Harness SQLite DB (`harness.db`). |
| └── [install-harness.sh](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/scripts/install-harness.sh) | The scaffolding installer script for Experimental Agent Harness. |
| **Configuration** | Setup & deployment descriptors. |
| ├── [Dockerfile](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/Dockerfile) | Production Docker image build specs. |
| ├── [docker-compose.yml](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/docker-compose.yml) | Multi-container setup for `pgvector` DB & `mcp-server`. |
| ├── [package.json](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/package.json) | Node project configuration, build scripts, and dependencies. |
| └── [tsconfig.json](file:///c:/Users/baokh/Projects/antigravity/projects/localmem/tsconfig.json) | TypeScript compiler options. |

---

## 🗄️ Database Schema Details

The PostgreSQL schema is structured as follows to ensure optimal hybrid search queries:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Code Chunks & AST Nodes Table
CREATE TABLE IF NOT EXISTS code_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(50) NOT NULL,                      -- 'file', 'class', 'function'
    content TEXT NOT NULL,                               -- Raw snippet text
    embedding VECTOR(768),                               -- 768d text-embedding-004 Vector
    metadata JSONB DEFAULT '{}'::jsonb,                  -- Tags, project boundaries, filepaths
    edges JSONB DEFAULT '[]'::jsonb,                     -- Relational Graph: [{type: 'CALLS', target: 'name'}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Index for High-Performance Cosine Vector Searches
CREATE INDEX IF NOT EXISTS code_nodes_embedding_idx ON code_nodes USING hnsw (embedding vector_cosine_ops);

-- GIN Index for Metadata-Scoped Filtering
CREATE INDEX IF NOT EXISTS idx_code_nodes_metadata ON code_nodes USING GIN (metadata);
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites

Ensure you have the following installed on your local host:
*   [Node.js](https://nodejs.org/) (v20+ recommended)
*   [Docker & Docker Compose](https://www.docker.com/)
*   A valid **Google Gemini API Key** (for creating embeddings)

### 2. Environment Variables Configuration

Copy `.env.example` to `.env` and provide your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
DATABASE_URL=postgres://postgres:postgres@localhost:5432/antigravity
```
> [!NOTE]
> If running inside the Docker Compose network, use `db` instead of `localhost` in the connection string (already configured in `docker-compose.yml`).

### 3. Running with Docker Compose 🐳

To launch the database with `pgvector` and spin up the MCP server container:

```bash
docker-compose up -d --build
```

### 4. Local Development & Setup

To install dependencies and compile the TypeScript source code locally:

```bash
# Install npm dependencies
npm install

# Initialize the PostgreSQL schema (requires local/Docker Postgres running)
npm run db:init

# Initialize the SQLite Harness database
npm run harness:init

# Build the TypeScript project
npm run build
```

---

## 🚀 Model Context Protocol (MCP) Tools Reference

**LocalMem** exposes two standard tools to your LLM agent or MCP Host:

### 1. `index_code_file`
Parses the input file's AST, extracts metadata + dependency edges, generates Gemini embeddings, and indexes chunks into `pgvector`.

*   **Parameters**:
    *   `filePath` (string, required): Absolute or relative path to the source code file.
    *   `sourceCode` (string, required): Full content of the code.
    *   `project` (string, required): Name/scope of the target project.
*   **Example Payload**:
    ```json
    {
      "filePath": "src/services/logger.ts",
      "sourceCode": "export class Logger { log(msg: string) { console.log(msg); } }",
      "project": "Antigravity-Workspace"
    }
    ```
*   **Response**:
    ```json
    {
      "content": [{ "type": "text", "text": "Successfully indexed file src/services/logger.ts into 2 nodes (Graph/Vector)." }]
    }
    ```

---

### 2. `semantic_code_search`
Queries the vector database using cosine similarity, combined with metadata filters (Mem0-style) to target a specific project or AST structure.

*   **Parameters**:
    *   `query` (string, required): Search prompt (e.g. *"how does queue processing work"*).
    *   `project` (string, optional): Restrict results to a particular project.
    *   `nodeType` (enum: `file` \| `class` \| `function`, optional): Filter results by specific AST component types.
    *   `limit` (number, default: `5`): Maximum matches to return.
*   **Example Payload**:
    ```json
    {
      "query": "process incoming jobs",
      "project": "Antigravity-Workspace",
      "nodeType": "function",
      "limit": 3
    }
    ```
*   **Response**:
    ```text
    [Type: Function: processQueue]
    [File: src/wait-queue.service.ts]
    [Similarity: 88.42%]
    [Edges: [{"type":"CALLS","target":"fetchQueueData"},{"type":"CALLS","target":"validateQueueItem"},{"type":"CALLS","target":"saveQueueStatus"}]]
    Content:
    async processQueue(queueId: string) {
        const data = await this.fetchQueueData(queueId);
        if (!data) {
          this.logError("Empty queue data");
          ...
    ```

---

## 🧪 Testing the Parser

To test the parser's AST breakdown and edge identification algorithms locally without hitting a live PostgreSQL DB, run the pre-bundled dry run test script:

```bash
# Run tsx-powered sandbox test
npm run dev
```

This parses the mock NestJS service defined in `src/test-parser.ts` and prints the resulting JSON chunks, metadata, and extracted dependency edges to the console.
