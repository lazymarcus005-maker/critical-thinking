'use strict';
/* ===== Critical Management 90 — core: state, helpers, components, router ===== */

var START_DEFAULT = '2026-10-01';
var THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

var store = {
  get: function(k, d) {
    try {
      var r = localStorage.getItem('cm90.' + k);
      return r == null ? d : JSON.parse(r);
    } catch (e) { return d; }
  },
  set: function(k, v) {
    try { localStorage.setItem('cm90.' + k, JSON.stringify(v)); }
    catch (e) { console.error('store failed', k, e); }
  },
  del: function(k) { try { localStorage.removeItem('cm90.' + k); } catch (e) {} }
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function pad2(n) { return String(n).padStart(2, '0'); }
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function fmtDate(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  if (p.length < 3) return iso;
  return parseInt(p[2], 10) + ' ' + THAI_MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function programStart() { return store.get('settings.start', START_DEFAULT); }
function dayNumber() {
  var s = new Date(programStart() + 'T00:00:00');
  var t = new Date(todayStr() + 'T00:00:00');
  return Math.floor((t - s) / 86400000) + 1;
}

/* All 13 weeks are pushed here by content-*.js.
   Each week: {n, phase, title, dates, startDay, endDay, goal,
               html: ()=>blocks, case:{title,text,q:[]}, ex: ()=>blocks,
               days:[{d,t,m}], outputs:[]} */
var WEEKS = [];
var QUIZ_REG = {};

/* ---------- content block helpers (content is trusted authored HTML) ---------- */
function P(t) { return '<p>' + t + '</p>'; }
function H2(t) { return '<h2>' + t + '</h2>'; }
function H3(t) { return '<h3>' + t + '</h3>'; }
function UL(items) { return '<ul>' + items.map(function(i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }
function OL(items) { return '<ol>' + items.map(function(i) { return '<li>' + i + '</li>'; }).join('') + '</ol>'; }
function TBL(head, rows) {
  return '<div class="tbl-wrap"><table><thead><tr>' +
    head.map(function(h) { return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    rows.map(function(r) { return '<tr>' + r.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>';
}
function CALL(title, body, kind) {
  kind = kind || 'tip';
  return '<div class="call call-' + kind + '"><div class="call-t">' + esc(title) + '</div><div class="call-b">' + body + '</div></div>';
}
function NOTE(t) { return '<p class="hint">' + t + '</p>'; }
function PRE(text) { return '<pre class="tpl">' + esc(text) + '</pre>'; }

/* ---------- interactive components ---------- */
function FIELD(id, label, ph, rows) {
  rows = rows || 3;
  var v = esc((store.get('fields', {})[id]) || '');
  return '<div class="field"><label>' + esc(label) + '</label>' +
    '<textarea data-save="' + esc(id) + '" rows="' + rows + '" placeholder="' + esc(ph || '') + '">' + v + '</textarea>' +
    '<span class="saved-tag">✓ บันทึกแล้วอัตโนมัติ</span></div>';
}
function EX(title, body, note) {
  return '<div class="exercise"><div class="ex-head"><span class="ex-icon">✎</span> ' + esc(title) + '</div>' +
    (note ? '<p class="ex-note">' + note + '</p>' : '') + body + '</div>';
}
function QUIZ(id, q, opts, correct, why) {
  QUIZ_REG[id] = correct;
  var prev = (store.get('quiz', {})[id]) || {};
  var html = '<div class="quiz" data-quiz-id="' + esc(id) + '"><p class="quiz-q">' + q + '</p><div class="quiz-opts">';
  opts.forEach(function(o, i) {
    var cls = 'quiz-opt';
    if (prev.i === i) cls += prev.ok ? ' ok' : ' bad';
    html += '<button type="button" class="' + cls + '" data-quiz="' + esc(id) + '" data-i="' + i + '">' + esc(o) + '</button>';
  });
  html += '</div><div class="quiz-why' + (prev.i != null ? ' show' : '') + '">' + esc(why) + '</div></div>';
  return html;
}
function TASK(id, label, mins) {
  var done = !!store.get('tasks', {})[id];
  return '<label class="task' + (done ? ' done' : '') + '">' +
    '<input type="checkbox" data-task="' + esc(id) + '"' + (done ? ' checked' : '') + '>' +
    '<span class="t-label">' + esc(label) + (mins ? ' <span class="t-mins">· ' + mins + ' นาที</span>' : '') + '</span></label>';
}
function TASKLIST(items) { return '<div class="tasklist">' + items.join('') + '</div>'; }

function MATRIX(id, criteria, options) {
  var st = store.get('matrix.' + id, null);
  var weights = (st && st.weights) || criteria.map(function() { return 3; });
  var scores = (st && st.scores) || criteria.map(function() { return options.map(function() { return 3; }); });
  var html = '<div class="matrix" data-matrix="' + esc(id) + '"><table><thead><tr><th>เกณฑ์</th><th>น้ำหนัก</th>';
  options.forEach(function(o) { html += '<th>' + esc(o) + '</th>'; });
  html += '</tr></thead><tbody>';
  criteria.forEach(function(c, i) {
    html += '<tr><td>' + esc(c) + '</td><td><input type="number" min="1" max="5" value="' + weights[i] + '" data-mat-w data-mat="' + esc(id) + '" data-i="' + i + '"></td>';
    options.forEach(function(o, j) {
      html += '<td><input type="number" min="1" max="5" value="' + scores[i][j] + '" data-mat-s data-mat="' + esc(id) + '" data-i="' + i + '" data-j="' + j + '"></td>';
    });
    html += '</tr>';
  });
  html += '</tbody><tfoot><tr><td colspan="2">รวมถ่วงน้ำหนัก</td>';
  options.forEach(function(o, j) { html += '<td class="mat-total" data-j="' + j + '">—</td>'; });
  html += '</tr></tfoot></table>' +
    '<p class="hint">คะแนน 1–5 · น้ำหนัก 1–5 (5 = สำคัญสุด) · ระบบคำนวณให้อัตโนมัติ · กฎเหล็ก: ทุกคะแนนต้องมี rationale — ถ้าให้คะแนนไม่ได้เพราะไม่มีข้อมูล แสดงว่าเป็น unknown ที่ต้องไปหาก่อน</p></div>';
  return html;
}
function updateMatrix(root) {
  var rows = Array.prototype.slice.call(root.querySelectorAll('tbody tr'));
  if (!rows.length) return;
  var weights = [], scores = [];
  var nOpts = rows[0].querySelectorAll('[data-mat-s]').length;
  var totals = [];
  for (var j = 0; j < nOpts; j++) totals.push(0);
  rows.forEach(function(tr) {
    var w = +tr.querySelector('[data-mat-w]').value || 0;
    weights.push(w);
    var rowS = [];
    tr.querySelectorAll('[data-mat-s]').forEach(function(el) {
      var v = +el.value || 0;
      rowS.push(v);
      totals[+el.dataset.j] += v * w;
    });
    scores.push(rowS);
  });
  var best = Math.max.apply(null, totals);
  root.querySelectorAll('.mat-total').forEach(function(td) {
    var j = +td.dataset.j;
    td.textContent = totals[j];
    td.classList.toggle('best', best > 0 && totals[j] === best);
  });
  store.set('matrix.' + root.getAttribute('data-matrix'), { weights: weights, scores: scores });
}

/* ---------- week page renderer ---------- */
function renderWeek(w, forScan) {
  var wd = store.get('weekDone', {});
  var h = '';
  h += '<div class="wk-head"><span class="phase-badge phase-' + w.phase + '">Phase ' + w.phase + '</span>' +
    '<h1>บทที่ ' + w.n + ' · ' + esc(w.title) + '</h1>' +
    '<p class="wk-dates">' + esc(w.dates) + ' · วันที่ ' + w.startDay + '–' + w.endDay + ' ของโปรแกรม</p></div>';
  h += CALL('เป้าหมายสัปดาห์นี้', esc(w.goal), 'goal');
  h += '<div class="wk-body">' + w.html() + '</div>';
  if (w.case) {
    var cbody = '<p>' + esc(w.case.text) + '</p>';
    if (w.case.q && w.case.q.length) {
      cbody += '<p class="case-q"><b>คำถามบังคับ:</b></p><ul>' + w.case.q.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    }
    h += CALL('Case ของสัปดาห์ — ' + w.case.title, cbody, 'case');
    // เคสเวอร์ชันกลาง (เสริม ไม่แทนที่) — จาก content-neutral.js
    if (typeof window.NEUTRAL === 'object' && window.NEUTRAL && window.NEUTRAL[w.n]) {
      var nc = window.NEUTRAL[w.n];
      var nbody = '<p>' + esc(nc.text) + '</p>';
      if (nc.q && nc.q.length) {
        nbody += '<p class="case-q"><b>คำถามบังคับ:</b></p><ul>' + nc.q.map(function(x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }
      h += '<details class="call call-tip details-call"><summary class="call-t">ดูเวอร์ชันกลาง (ข้ามสายงาน) — ' + esc(nc.title) + '</summary><div class="call-b">' + nbody + '</div></details>';
    }
  }
  if (w.ex) h += '<h2>แบบฝึกหัดของบทนี้</h2>' + w.ex();
  // spaced retrieval — ควิซย้อนสัปดาห์ก่อน (จาก content-retrieval.js)
  if (w.n >= 2 && typeof window.RETRIEVAL === 'object' && window.RETRIEVAL && window.RETRIEVAL[w.n]) {
    h += '<h2>🔁 ทบทวนสัปดาห์ก่อน — spaced retrieval</h2>' +
      '<p class="hint">ควิซสั้นย้อน framework ของบทที่ ' + (w.n - 1) + ' — พยายามตอบจากความจำก่อน (testing effect: การดึงจากความจำช่วยให้จำได้นานกว่าการอ่านซ้ำ)</p>';
    window.RETRIEVAL[w.n].forEach(function(it, i) {
      h += QUIZ('r' + w.n + 'q' + i, esc(it.q), it.opts, it.correct, it.why);
    });
  }
  // เจาะลึกทฤษฎี + ตัวอย่างเหตุการณ์จริง (ไม่บังคับ) — จาก content-deep.js
  if (typeof window.DEEP === 'object' && window.DEEP && window.DEEP[w.n]) {
    h += '<details class="call call-tip details-call deep-call"><summary class="call-t">🔭 เจาะลึกทฤษฎี + ตัวอย่างเหตุการณ์จริง (ไม่บังคับ)</summary><div class="call-b deep-body">' + window.DEEP[w.n].html() + '</div></details>';
  }
  h += '<h2>แผนรายวันของสัปดาห์นี้</h2><p class="hint">ทุกวันเริ่มด้วย Thinking Journal 10 นาที (หน้าเครื่องมือ) — ติ๊กเมื่อทำครบ</p>' +
    TASKLIST(w.days.map(function(d) { return TASK('w' + w.n + 'd' + d.d, 'Day ' + d.d + ': ' + d.t, d.m); }));
  if (w.outputs && w.outputs.length) {
    h += '<h2>Output ที่ต้องมีตอนจบสัปดาห์</h2>' + TASKLIST(w.outputs.map(function(o, i) { return TASK('w' + w.n + 'out' + i, o); }));
  }
  if (!forScan) {
    h += '<div class="wk-done"><button type="button" class="btn' + (wd['w' + w.n] ? ' done' : ' ghost') + '" data-week-done="w' + w.n + '">' +
      (wd['w' + w.n] ? '✓ เรียนสัปดาห์นี้เสร็จแล้ว' : 'ทำเครื่องหมายว่าเรียนสัปดาห์นี้เสร็จแล้ว') + '</button></div>';
    var prev = WEEKS[w.n - 2], next = WEEKS[w.n];
    var left = prev ? '<a class="pager-link" href="#/week/' + prev.n + '">← บทที่ ' + prev.n + '</a>' : '<a class="pager-link" href="#/roadmap">← โรดแมป</a>';
    var right = next ? '<a class="pager-link" href="#/week/' + next.n + '">บทที่ ' + next.n + ' →</a>' : '<a class="pager-link" href="#/assessment">ไปแบบประเมิน Day 90 →</a>';
    h += '<div class="pager">' + left + right + '</div>';
  }
  return h;
}

/* ---------- scan & progress ---------- */
function collectIds(html, reg) {
  (html.match(/data-task="([^"]+)"/g) || []).forEach(function(s) { reg.tasks.add(s.slice(11, -1)); });
  (html.match(/data-save="([^"]+)"/g) || []).forEach(function(s) { reg.fields.add(s.slice(11, -1)); });
  (html.match(/data-quiz-id="([^"]+)"/g) || []).forEach(function(s) { reg.quizzes.add(s.slice(14, -1)); });
}
function scanAll() {
  var reg = { tasks: new Set(), fields: new Set(), quizzes: new Set() };
  WEEKS.forEach(function(w) { collectIds(renderWeek(w, true), reg); });
  return reg;
}
function progress() {
  var reg = scanAll();
  var tasks = store.get('tasks', {});
  var quiz = store.get('quiz', {});
  var done = 0, qok = 0;
  reg.tasks.forEach(function(id) { if (tasks[id]) done++; });
  reg.quizzes.forEach(function(id) { if (quiz[id] && quiz[id].ok) qok++; });
  var total = reg.tasks.size + reg.quizzes.size;
  var wd = store.get('weekDone', {});
  return {
    pct: total ? Math.round((done + qok) / total * 100) : 0,
    taskDone: done, taskTotal: reg.tasks.size,
    quizOk: qok, quizTotal: reg.quizzes.size,
    weeksDone: Object.keys(wd).filter(function(k) { return wd[k]; }).length
  };
}

/* ---------- router ---------- */
var ROUTES = {};
function registerRoute(name, fn) { ROUTES[name] = fn; }
function parseHash() {
  var h = location.hash.replace(/^#\/?/, '');
  var parts = h.split('/').filter(Boolean);
  return parts.length ? parts : ['home'];
}
function render() {
  var parts = parseHash();
  var name = parts[0];
  var html, title;
  var fn = ROUTES[name];
  if (fn) { var r = fn(parts.slice(1)); html = r.html; title = r.title; }
  else { html = '<h1>ไม่พบหน้านี้</h1><p><a href="#/home">กลับหน้าแรก</a></p>'; title = 'ไม่พบหน้า'; }
  var main = document.getElementById('main');
  main.innerHTML = html;
  document.title = title + ' · Critical Management 90';
  main.querySelectorAll('.matrix').forEach(updateMatrix);
  buildNav(name);
  var td = document.getElementById('top-day');
  if (td) td.textContent = topDayLabel();
  window.scrollTo(0, 0);
}
function topDayLabel() {
  var d = dayNumber();
  if (d < 1) return 'เริ่ม ' + fmtDate(programStart());
  if (d > 90) return 'จบโปรแกรมแล้ว ✓';
  return 'Day ' + d + '/90';
}
window.addEventListener('hashchange', render);
function refreshProgressUI() {
  var p = progress();
  document.querySelectorAll('.js-prog-fill').forEach(function(el) { el.style.width = p.pct + '%'; });
  document.querySelectorAll('.js-prog-pct').forEach(function(el) { el.textContent = p.pct + '%'; });
  var td = document.getElementById('top-day');
  if (td) td.textContent = topDayLabel();
}
