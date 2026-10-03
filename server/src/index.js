'use strict';
import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openDb } from './db.js';

const CHECKPOINTS = new Set(['day1', 'day30', 'day60', 'day90']);
const LEARNER_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_ENTRY_LEN = 1_000_000; // ต่ำกว่า body limit 2mb พอที่จะไม่ชน 413 ก่อน 400

export function createApp({ dbPath, staticDir } = {}) {
  const db = openDb(dbPath);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(express.json({ limit: '2mb' }));

  const now = () => new Date().toISOString();
  const getLearner = (req) => {
    const l = req.get('X-Learner') || req.query.learner || '';
    return LEARNER_RE.test(String(l)) ? String(l) : null;
  };

  app.get('/api/health', (req, res) => {
    let dbOk = true;
    try { db.prepare('SELECT COUNT(*) AS n FROM states').get(); } catch (e) { dbOk = false; }
    res.status(dbOk ? 200 : 500).json({ ok: dbOk, db: dbOk, version: '1.0.0' });
  });

  app.get('/api/state', (req, res) => {
    const learner = getLearner(req);
    if (!learner) return res.status(400).json({ error: 'invalid_learner' });
    const row = db.prepare('SELECT data, version, updated_at FROM states WHERE learner_id = ?').get(learner);
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ learner, data: JSON.parse(row.data), version: row.version, updated_at: row.updated_at });
  });

  function upsertState(req, res) {
    const learner = getLearner(req);
    if (!learner) return res.status(400).json({ error: 'invalid_learner' });
    const { data, baseVersion } = req.body || {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'invalid_data' });
    }
    for (const [k, v] of Object.entries(data)) {
      if (k.length > 64 || typeof v !== 'string' || v.length > MAX_ENTRY_LEN) {
        return res.status(400).json({ error: 'invalid_entry', key: k });
      }
    }
    const row = db.prepare('SELECT version FROM states WHERE learner_id = ?').get(learner);
    if (row && baseVersion != null && Number(baseVersion) !== row.version) {
      return res.status(409).json({ error: 'conflict', version: row.version });
    }
    const version = (row ? row.version : 0) + 1;
    const ts = now();
    db.prepare(`
      INSERT INTO states (learner_id, data, version, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(learner_id) DO UPDATE SET data = excluded.data, version = excluded.version, updated_at = excluded.updated_at
    `).run(learner, JSON.stringify(data), version, ts);
    res.json({ ok: true, version, updated_at: ts });
  }
  app.put('/api/state', upsertState);
  app.post('/api/state', upsertState); // sendBeacon can only POST

  app.delete('/api/state', (req, res) => {
    const learner = getLearner(req);
    if (!learner) return res.status(400).json({ error: 'invalid_learner' });
    db.prepare('DELETE FROM states WHERE learner_id = ?').run(learner);
    db.prepare('DELETE FROM reviews WHERE learner_id = ?').run(learner);
    res.json({ ok: true });
  });

  app.post('/api/reviews', (req, res) => {
    const { learnerId, checkpoint, reviewer, scores, notes } = req.body || {};
    if (!LEARNER_RE.test(String(learnerId || ''))) return res.status(400).json({ error: 'invalid_learner' });
    if (!CHECKPOINTS.has(checkpoint)) return res.status(400).json({ error: 'invalid_checkpoint' });
    if (!Array.isArray(scores) || scores.length < 10 || scores.length > 12 ||
        !scores.every((n) => Number.isInteger(n) && n >= 1 && n <= 5)) {
      return res.status(400).json({ error: 'invalid_scores' });
    }
    const rv = String(reviewer || '').slice(0, 120);
    const nt = String(notes || '').slice(0, 4000);
    const total = scores.reduce((a, b) => a + b, 0);
    const info = db.prepare(
      'INSERT INTO reviews (learner_id, checkpoint, reviewer, scores, total, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(learnerId, checkpoint, rv, JSON.stringify(scores), total, nt, now());
    res.status(201).json({ ok: true, id: Number(info.lastInsertRowid), total });
  });

  app.get('/api/reviews', (req, res) => {
    const learner = getLearner(req);
    if (!learner) return res.status(400).json({ error: 'invalid_learner' });
    const cp = req.query.checkpoint;
    if (cp && !CHECKPOINTS.has(String(cp))) return res.status(400).json({ error: 'invalid_checkpoint' });
    const rows = (cp)
      ? db.prepare('SELECT id, checkpoint, reviewer, scores, total, notes, created_at FROM reviews WHERE learner_id = ? AND checkpoint = ? ORDER BY id').all(learner, cp)
      : db.prepare('SELECT id, checkpoint, reviewer, scores, total, notes, created_at FROM reviews WHERE learner_id = ? ORDER BY id').all(learner);
    res.json({ reviews: rows.map((r) => ({ ...r, scores: JSON.parse(r.scores) })) });
  });

  app.get('/api/export', (req, res) => {
    const learner = getLearner(req);
    if (!learner) return res.status(400).json({ error: 'invalid_learner' });
    const row = db.prepare('SELECT data, version, updated_at FROM states WHERE learner_id = ?').get(learner);
    const reviews = db.prepare('SELECT id, checkpoint, reviewer, scores, total, notes, created_at FROM reviews WHERE learner_id = ? ORDER BY id').all(learner);
    const payload = {
      exported_at: now(),
      learner,
      state: row ? { data: JSON.parse(row.data), version: row.version, updated_at: row.updated_at } : null,
      reviews: reviews.map((r) => ({ ...r, scores: JSON.parse(r.scores) }))
    };
    res.setHeader('Content-Disposition', 'attachment; filename="cm90-server-backup.json"');
    res.json(payload);
  });

  if (staticDir) {
    app.use(express.static(staticDir, { extensions: ['html'] }));
  }

  // error handler (invalid JSON body, payload too large, unexpected)
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err && (err.type === 'entity.too.large' || err.statusCode === 413)) {
      return res.status(413).json({ error: 'payload_too_large' });
    }
    if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
      return res.status(400).json({ error: 'invalid_json' });
    }
    console.error('[cm90] error:', err);
    res.status(500).json({ error: 'internal' });
  });

  app.locals.db = db;
  return app;
}

export function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const port = Number(process.env.PORT || 3000);
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const staticDir = process.env.STATIC_DIR || path.resolve(here, '../../90day-site');
  const app = createApp({ dbPath: path.join(dataDir, 'cm90.db'), staticDir });
  const db = app.locals.db;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log('[cm90] listening on http://0.0.0.0:' + port + ' (db: ' + path.join(dataDir, 'cm90.db') + ', static: ' + staticDir + ')');
  });
  const shutdown = () => {
    console.log('[cm90] shutting down…');
    try { db.close(); } catch (e) { /* WAL จะกู้ตัวเองตอนเปิดใหม่ */ }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
