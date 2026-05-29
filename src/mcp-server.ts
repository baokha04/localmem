import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "node:crypto";
import pg from 'pg';
import { z } from "zod";
import { ASTProcessor } from "./ast-processor.js";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

const { Client } = pg;

// Configure PostgreSQL
const dbUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/antigravity";
const pgClient = new Client({
  connectionString: dbUrl,
});

// Connect to database gracefully
try {
  await pgClient.connect();
  // NOTE: Stdio MCP servers must log all debug logs to console.error (stderr)
  // to avoid corrupting the stdio protocol stream on stdout.
  console.error(`[PG] Connected successfully to PostgreSQL at: ${dbUrl}`);
} catch (err: any) {
  console.error(`[PG] Connection error for ${dbUrl} (Note: pgvector tools will fail if PostgreSQL is not running):`, err.message);
}

// Initialize Google Gen AI
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
    console.error("[Gemini] GoogleGenAI client initialized successfully.");
  } catch (err: any) {
    console.error("[Gemini] Failed to initialize GoogleGenAI client:", err.message);
  }
} else {
  console.error("[Gemini] Warning: GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not defined. Operating in fallback mock mode (768 dimensions).");
}

const server = new McpServer({
  name: "Antigravity-Graph-Vector-Cache",
  version: "2.0.0",
});

const astProcessor = new ASTProcessor();

// GOOGLE GEMINI EMBEDDING GENERATOR (using text-embedding-004 model)
async function generateEmbedding(text: string): Promise<number[]> {
  if (ai) {
    try {
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: text,
      });

      if (response && response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
        return response.embeddings[0].values;
      }
      console.error("[Gemini] Invalid embedding response format. Falling back to mock.");
    } catch (err: any) {
      console.error("[Gemini] Error generating embedding:", err.message);
    }
  }
  // Fallback mock of dimension 768
  return new Array(768).fill(0.01); 
}

// Tool 1: Analyze and Index Codebase
server.registerTool(
  "index_code_file",
  {
    description: "Analyzes AST and indexes code into Vector Database",
    inputSchema: {
      filePath: z.string().describe("Path to the file to be indexed"),
      sourceCode: z.string().describe("Raw source code content"),
      project: z.string().describe("Project name context"),
    },
  },
  async ({ filePath, sourceCode, project }) => {
    // 1. Smart chunking based on AST
    const chunks = astProcessor.parseAndChunk(filePath, sourceCode, project);

    // 2. Write to pgvector
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      const embeddingVector = `[${embedding.join(',')}]`;

      await pgClient.query(
        `INSERT INTO code_nodes (node_type, content, metadata, edges, embedding) 
         VALUES ($1, $2, $3, $4, $5)`,
        [chunk.type, chunk.content, JSON.stringify(chunk.metadata), JSON.stringify(chunk.edges), embeddingVector]
      );
    }

    return {
      content: [{ type: "text", text: `Successfully indexed file ${filePath} into ${chunks.length} nodes (Graph/Vector).` }],
    };
  }
);

// Tool 2: Semantic Search with Metadata Filtering (Mem0-style)
server.registerTool(
  "semantic_code_search",
  {
    description: "Search code using Vector search combined with Metadata filters to save tokens",
    inputSchema: {
      query: z.string().describe("Search query (e.g. 'OCR processing for Vietnamese')"),
      project: z.string().optional().describe("Project name to narrow scope"),
      nodeType: z.enum(['file', 'class', 'function']).optional().describe("Filter by specific type of AST node"),
      limit: z.number().default(5).describe("Maximum number of results to return"),
    },
  },
  async ({ query, project, nodeType, limit }) => {
    const queryEmbedding = await generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // Dynamic SQL query for vector similarity hybrid search
    let sql = `
      SELECT content, metadata, edges, 1 - (embedding <=> $1) AS similarity 
      FROM code_nodes 
      WHERE 1=1
    `;
    const params: any[] = [vectorStr];
    let paramIndex = 2;

    // Apply Metadata Filtering
    if (project) {
      sql += ` AND metadata->>'project' = $${paramIndex}`;
      params.push(project);
      paramIndex++;
    }
    
    if (nodeType) {
      sql += ` AND node_type = $${paramIndex}`;
      params.push(nodeType);
      paramIndex++;
    }

    sql += ` ORDER BY embedding <=> $1 LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pgClient.query(sql, params);

    // Format output for LLM
    const formattedResults = result.rows.map(row => 
      `[Type: ${row.metadata.function ? 'Function: ' + row.metadata.function : row.metadata.class ? 'Class: ' + row.metadata.class : 'File'}]\n` +
      `[File: ${row.metadata.file}]\n` +
      `[Similarity: ${(row.similarity * 100).toFixed(2)}%]\n` +
      `[Edges: ${JSON.stringify(row.edges)}]\n` +
      `Content:\n${row.content}\n`
    ).join("\n---\n");

    return {
      content: [{ type: "text", text: formattedResults || "No matching code nodes found." }],
    };
  }
);

// Create Express application
const app = express();
app.use(express.json());

// Initialize the modern Streamable HTTP server transport (stateful)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

// Connect the MCP server to the Streamable HTTP transport
await server.connect(transport);

// Express handler: a single endpoint handles both GET (SSE stream establishment)
// and POST (JSON-RPC client-to-server messages)
app.all("/mcp", async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

// Start listening on HTTP port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.error(`\n🚀 [MCP Streamable HTTP Server] running on http://localhost:${port}`);
  console.error(`🔌 Connection endpoint (GET / POST): http://localhost:${port}/mcp\n`);
});
