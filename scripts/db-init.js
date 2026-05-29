import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../src/schema.sql');

console.log(`[DB Init] Database target: ${process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/antigravity"}`);
console.log(`[DB Init] Schema source: ${schemaPath}`);

const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/antigravity",
});

async function init() {
  try {
    await client.connect();
    console.log('[PG] Connected successfully to PostgreSQL.');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('[DB Init] Executing schema SQL...');
    await client.query(schemaSql);
    console.log('[DB Init] Database schema initialized successfully (with pgvector 768 dimensions)!');
  } catch (err) {
    console.error('[Error] Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

init();
