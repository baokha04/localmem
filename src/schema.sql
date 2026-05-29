-- Kích hoạt extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Bảng lưu trữ Code Chunks & AST Nodes
CREATE TABLE IF NOT EXISTS code_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(50) NOT NULL, -- 'file', 'class', 'function', 'import'
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Kích thước vector tùy thuộc vào model embedding
    metadata JSONB DEFAULT '{}'::jsonb, -- Chứa tags, project, filepath, language
    edges JSONB DEFAULT '[]'::jsonb, -- Chứa Graph edges: [{ type: 'CALLS', target_id: 'uuid' }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo Index cho Vector Search và JSONB Filtering
CREATE INDEX IF NOT EXISTS code_nodes_embedding_idx ON code_nodes USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_code_nodes_metadata ON code_nodes USING GIN (metadata);
