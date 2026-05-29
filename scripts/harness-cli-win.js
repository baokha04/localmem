import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../harness.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Error] Failed to connect to SQLite:', err.message);
    process.exit(1);
  }
});

const action = process.argv[2];

if (!action || action === 'help') {
  console.log(`
Usage:
  node scripts/harness-cli-win.js <command> [args...]

Commands:
  intake --type <type> --summary <sum> --lane <lane> [--flags <flags>] [--docs <docs>] [--story <story>] [--notes <notes>]
  story-add --id <id> --title <title> --lane <lane> [--contract <doc>] [--notes <notes>]
  story-update --id <id> [--status <status>] [--evidence <evidence>] [--unit <0|1>] [--integration <0|1>] [--e2e <0|1>] [--platform <0|1>]
  decision-add --id <id> --title <title> [--status <status>] [--doc <path>] [--notes <notes>]
  trace --summary <sum> --outcome <outcome> [--intake <id>] [--story <id>] [--agent <agent>] [--read <files>] [--changed <files>] [--actions <actions>]
  query-stats
  query-matrix
  `);
  db.close();
  process.exit(0);
}

function parseArgs(args) {
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1];
      params[key] = val;
      i++;
    }
  }
  return params;
}

db.serialize(() => {
  if (action === 'intake') {
    const params = parseArgs(process.argv.slice(3));
    if (!params.type || !params.summary || !params.lane) {
      console.error('[Error] Missing required fields: --type, --summary, --lane');
      process.exit(1);
    }
    const q = `INSERT INTO intake (input_type, summary, risk_lane, risk_flags, affected_docs, story_id, notes) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(q, [
      params.type,
      params.summary,
      params.lane,
      params.flags ? JSON.stringify(params.flags.split(',')) : '[]',
      params.docs ? JSON.stringify(params.docs.split(',')) : '[]',
      params.story || null,
      params.notes || null
    ], function(err) {
      if (err) console.error('[Error]', err.message);
      else console.log(`[Success] Intake recorded with ID: ${this.lastID}`);
      db.close();
    });
  }

  else if (action === 'story-add') {
    const params = parseArgs(process.argv.slice(3));
    if (!params.id || !params.title || !params.lane) {
      console.error('[Error] Missing required fields: --id, --title, --lane');
      process.exit(1);
    }
    const q = `INSERT INTO story (id, title, risk_lane, contract_doc, status, notes) 
               VALUES (?, ?, ?, ?, 'planned', ?)`;
    db.run(q, [
      params.id,
      params.title,
      params.lane,
      params.contract || null,
      params.notes || null
    ], function(err) {
      if (err) console.error('[Error]', err.message);
      else console.log(`[Success] Story ${params.id} added.`);
      db.close();
    });
  }

  else if (action === 'story-update') {
    const params = parseArgs(process.argv.slice(3));
    if (!params.id) {
      console.error('[Error] Missing required field: --id');
      process.exit(1);
    }
    
    const updates = [];
    const vals = [];
    if (params.status) { updates.push('status = ?'); vals.push(params.status); }
    if (params.evidence) { updates.push('evidence = ?'); vals.push(params.evidence); }
    if (params.unit) { updates.push('unit_proof = ?'); vals.push(parseInt(params.unit)); }
    if (params.integration) { updates.push('integration_proof = ?'); vals.push(parseInt(params.integration)); }
    if (params.e2e) { updates.push('e2e_proof = ?'); vals.push(parseInt(params.e2e)); }
    if (params.platform) { updates.push('platform_proof = ?'); vals.push(parseInt(params.platform)); }

    if (updates.length === 0) {
      console.error('[Error] Nothing to update.');
      process.exit(1);
    }

    vals.push(params.id);
    const q = `UPDATE story SET ${updates.join(', ')} WHERE id = ?`;
    db.run(q, vals, function(err) {
      if (err) console.error('[Error]', err.message);
      else console.log(`[Success] Story ${params.id} updated. Rows changed: ${this.changes}`);
      db.close();
    });
  }

  else if (action === 'decision-add') {
    const params = parseArgs(process.argv.slice(3));
    if (!params.id || !params.title) {
      console.error('[Error] Missing required fields: --id, --title');
      process.exit(1);
    }
    const q = `INSERT INTO decision (id, title, status, doc_path, notes) 
               VALUES (?, ?, ?, ?, ?)`;
    db.run(q, [
      params.id,
      params.title,
      params.status || 'accepted',
      params.doc || null,
      params.notes || null
    ], function(err) {
      if (err) console.error('[Error]', err.message);
      else console.log(`[Success] Decision ${params.id} recorded.`);
      db.close();
    });
  }

  else if (action === 'trace') {
    const params = parseArgs(process.argv.slice(3));
    if (!params.summary || !params.outcome) {
      console.error('[Error] Missing required fields: --summary, --outcome');
      process.exit(1);
    }
    const q = `INSERT INTO trace (task_summary, intake_id, story_id, agent, outcome, actions_taken, files_read, files_changed) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(q, [
      params.summary,
      params.intake ? parseInt(params.intake) : null,
      params.story || null,
      params.agent || 'Antigravity',
      params.outcome,
      params.actions ? JSON.stringify(params.actions.split(',')) : '[]',
      params.read ? JSON.stringify(params.read.split(',')) : '[]',
      params.changed ? JSON.stringify(params.changed.split(',')) : '[]'
    ], function(err) {
      if (err) console.error('[Error]', err.message);
      else console.log(`[Success] Trace recorded with ID: ${this.lastID}`);
      db.close();
    });
  }

  else if (action === 'query-stats') {
    db.all(`SELECT
              (SELECT COUNT(*) FROM intake) AS intakes,
              (SELECT COUNT(*) FROM story) AS stories,
              (SELECT COUNT(*) FROM decision) AS decisions,
              (SELECT COUNT(*) FROM backlog) AS backlog_items,
              (SELECT COUNT(*) FROM trace) AS traces`, (err, rows) => {
      if (err) console.error('[Error]', err.message);
      else console.table(rows);
      db.close();
    });
  }

  else if (action === 'query-matrix') {
    db.all(`SELECT id, title, status, unit_proof AS unit, integration_proof AS integ, e2e_proof AS e2e, platform_proof AS plat, evidence FROM story`, (err, rows) => {
      if (err) console.error('[Error]', err.message);
      else console.table(rows);
      db.close();
    });
  }
});
