'use strict';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm90-test-'));
const staticDir = path.resolve(import.meta.dirname, '../../90day-site');
const app = createApp({ dbPath: path.join(tmp, 'test.db'), staticDir });

const server = app.listen(0);
const PORT = server.address().port;
const BASE = 'http://127.0.0.1:' + PORT;

test.after(() => new Promise((res) => server.close(res)));

const L = { 'X-Learner': 'learner-abc123' };

test('health', async () => {
  const r = await fetch(BASE + '/api/health');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
  assert.equal(j.db, true);
});

test('state: 404 when empty, 400 on invalid learner', async () => {
  const r = await fetch(BASE + '/api/state?learner=learner-abc123');
  assert.equal(r.status, 404);
  const bad = await fetch(BASE + '/api/state?learner=!!bad!!');
  assert.equal(bad.status, 400);
  const noId = await fetch(BASE + '/api/state');
  assert.equal(noId.status, 400);
});

test('state: PUT then GET roundtrip with version bump', async () => {
  const put = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.tasks': '{"w1d1":1}', 'cm90.journal': '[{"id":"a","date":"2026-10-01","qs":["x"]}]' } })
  });
  assert.equal(put.status, 200);
  const pj = await put.json();
  assert.equal(pj.ok, true);
  assert.equal(pj.version, 1);

  const get = await fetch(BASE + '/api/state?learner=learner-abc123');
  assert.equal(get.status, 200);
  const gj = await get.json();
  assert.equal(gj.version, 1);
  assert.equal(gj.data['cm90.tasks'], '{"w1d1":1}');
  assert.ok(gj.updated_at);

  const put2 = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.tasks': '{"w1d1":1,"w1d2":1}' } })
  });
  const pj2 = await put2.json();
  assert.equal(pj2.version, 2);
});

test('state: conflict 409 on stale baseVersion, allowed when baseVersion matches', async () => {
  const stale = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.tasks': 'x' }, baseVersion: 1 })
  });
  assert.equal(stale.status, 409);
  const sj = await stale.json();
  assert.equal(sj.error, 'conflict');
  assert.equal(sj.version, 2);

  const ok = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.tasks': 'y' }, baseVersion: 2 })
  });
  assert.equal(ok.status, 200);
});

test('state: invalid body rejected', async () => {
  const r1 = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'not-an-object' })
  });
  assert.equal(r1.status, 400);
  const r2 = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { bad: { nested: 'object' } } })
  });
  assert.equal(r2.status, 400);
  const r3 = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: 'not-json-at-all'
  });
  assert.equal(r3.status, 400);
});

test('reviews: valid POST, list, and validation errors', async () => {
  const good = await fetch(BASE + '/api/reviews', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      learnerId: 'learner-abc123', checkpoint: 'day30', reviewer: 'หัวหน้าพยาบาล',
      scores: [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3], notes: 'ทำได้ดี'
    })
  });
  assert.equal(good.status, 201);
  const gj = await good.json();
  assert.equal(gj.total, 42);

  const badCp = await fetch(BASE + '/api/reviews', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId: 'learner-abc123', checkpoint: 'day45', scores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] })
  });
  assert.equal(badCp.status, 400);

  const badScores = await fetch(BASE + '/api/reviews', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId: 'learner-abc123', checkpoint: 'day30', scores: [9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] })
  });
  assert.equal(badScores.status, 400);

  const list = await fetch(BASE + '/api/reviews?learner=learner-abc123&checkpoint=day30');
  assert.equal(list.status, 200);
  const lj = await list.json();
  assert.equal(lj.reviews.length, 1);
  assert.equal(lj.reviews[0].reviewer, 'หัวหน้าพยาบาล');
  assert.equal(lj.reviews[0].scores.length, 12);

  // invalid checkpoint บน GET ต้อง 400 ไม่ใช่คืน "ทั้งหมด"
  const badList = await fetch(BASE + '/api/reviews?learner=learner-abc123&checkpoint=day45');
  assert.equal(badList.status, 400);
});

test('learner id boundary: 7 chars → 400, 8 chars → OK, 65 chars → 400', async () => {
  const short = await fetch(BASE + '/api/state?learner=short7x');
  assert.equal(short.status, 400);
  const ok8 = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: {} })
  });
  assert.equal(ok8.status, 400, 'PUT without learner header must 400');
  const ok8b = await fetch(BASE + '/api/state?learner=abcd1234', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.tasks': '{}' } })
  });
  assert.equal(ok8b.status, 200);
  const long = await fetch(BASE + '/api/state?learner=' + 'a'.repeat(65));
  assert.equal(long.status, 400);
  await fetch(BASE + '/api/state', { method: 'DELETE', headers: { 'X-Learner': 'abcd1234' } });
});

test('payload larger than 2mb → 413 payload_too_large', async () => {
  const big = 'x'.repeat(2.5 * 1024 * 1024);
  const r = await fetch(BASE + '/api/state', {
    method: 'PUT', headers: { ...L, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.big': big } })
  });
  assert.equal(r.status, 413);
  const j = await r.json();
  assert.equal(j.error, 'payload_too_large');
});

test('export: contains state + reviews', async () => {
  const r = await fetch(BASE + '/api/export?learner=learner-abc123');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.state);
  assert.equal(j.state.version, 3);
  assert.equal(j.reviews.length, 1);
  assert.equal(j.learner, 'learner-abc123');
});

test('delete state wipes learner data AND reviews', async () => {
  // ensure a review exists (beyond the day30 one)
  await fetch(BASE + '/api/reviews', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnerId: 'learner-abc123', checkpoint: 'day90', scores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] })
  });
  const r = await fetch(BASE + '/api/state', { method: 'DELETE', headers: L });
  assert.equal(r.status, 200);
  const gone = await fetch(BASE + '/api/state?learner=learner-abc123');
  assert.equal(gone.status, 404);
  const revs = await fetch(BASE + '/api/reviews?learner=learner-abc123');
  assert.equal(revs.status, 200);
  const rj = await revs.json();
  assert.equal(rj.reviews.length, 0, 'reviews must be wiped with the learner');
});

test('beacon POST /api/state works (same as PUT)', async () => {
  const r = await fetch(BASE + '/api/state?learner=learner-beacon99', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { 'cm90.tasks': '{}' } })
  });
  assert.equal(r.status, 200);
});

test('static site served with index.html', async () => {
  const r = await fetch(BASE + '/');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(html.includes('Critical Management'));
});
