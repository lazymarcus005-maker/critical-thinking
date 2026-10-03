'use strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS states (
      learner_id TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id  TEXT NOT NULL,
      checkpoint  TEXT NOT NULL,
      reviewer    TEXT NOT NULL DEFAULT '',
      scores      TEXT NOT NULL,
      total       INTEGER NOT NULL,
      notes       TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_learner ON reviews(learner_id, checkpoint);
  `);
  return db;
}
