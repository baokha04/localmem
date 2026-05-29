import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../harness.db');
const schemaPath = path.resolve(__dirname, './schema/001-init.sql');

console.log(`[Harness Init] Database target: ${dbPath}`);
console.log(`[Harness Init] Schema source: ${schemaPath}`);

if (!fs.existsSync(schemaPath)) {
  console.error(`[Error] Schema file not found at: ${schemaPath}`);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Error] Failed to connect to SQLite:', err.message);
    process.exit(1);
  }
  console.log('[SQLite] Connected to SQLite database.');
});

db.serialize(() => {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql, (err) => {
    if (err) {
      console.error('[SQLite Error] Failed to execute schema script:', err.message);
      process.exit(1);
    }
    console.log('[Harness Init] Schema applied successfully.');
    db.close((closeErr) => {
      if (closeErr) console.error('[SQLite] Error closing database:', closeErr.message);
      console.log('[Harness Init] Harness SQLite database is ready!');
    });
  });
});
