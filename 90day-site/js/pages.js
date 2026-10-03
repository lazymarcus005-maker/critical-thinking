'use strict';
/* ===== pages: routes, handlers, boot ===== */

/* ---------- shared data ---------- */
var RUBRIC_ITEMS = ['Problem framing','Evidence quality','Identify assumptions','Alternative hypotheses','Bias awareness','Systems thinking','Option generation','Risk / trade-off analysis','Decision rationale','Reflection / learning','Stakeholder & interest analysis','Framing & omission detection'];
var RUBRIC_MAX = RUBRIC_ITEMS.length * 5; // 12 หัว → /60 (rubric เดิม 10 หัว /50 — คะแนนเก่ายังเทียบได้)
var RUB_CUR = {};
var EDIT_DEC = null;
var TIMER = { key: null, end: 0, iv: null };

var ASSESS = [
  { key: 'day1', label: 'Baseline — Day 1', when: 'ทำวันแรกของโปรแกรม (1 ต.ค. 2026)', caseTitle: 'เคส A1 · Morale ทรุด',
    text: 'Ward C: complaint เรื่องทัศนคติพยาบาลเพิ่มขึ้น 2 เท่าใน 3 เดือน · sick leave เพิ่มจาก 4% เป็น 7% · engagement ลดจาก 3.9 → 3.1 · หัวหน้าเวร 2 คนเพิ่งเปลี่ยนใหม่ · turnover ยังทรงตัวที่ 9% · ผู้อำนวยการพยาบาลถามว่า "ต้องแก้อะไรก่อน"',
    hint: 'อย่าเตรียม — ตั้งใจให้เห็น baseline จริง วิเคราะห์ 30 นาทีแล้วให้คะแนนตัวเองตาม rubric' },
  { key: 'day30', label: 'Day 30', when: 'ทำวันที่ 29–30 ของโปรแกรม (29–30 ต.ค. 2026)', caseTitle: 'เคส A2 · กด OT',
    text: 'ผู้บริหารสั่งลดค่า OT พยาบาล 15% ภายในไตรมาสหน้า โดย medication error และ fall rate ต้องไม่แย่ลง · OT ปัจจุบันเฉลี่ย 24 ชม./คน/เดือน · vacancy 12% · มี float pool เล็ก 4 คน · agency แพงกว่า OT 40%',
    hint: 'เกณฑ์ผ่านรอบนี้: reasoning มี structure — ใช้ elements/standards ได้, แยก fact/assumption ได้, options ≥3' },
  { key: 'day60', label: 'Day 60', when: 'ทำวันที่ 59–60 ของโปรแกรม (28–29 พ.ย. 2026)', caseTitle: 'เคส A3 · เปิดหอใหม่',
    text: 'เปิด ward ใหม่ 20 เตียงใน 4 เดือน · recruitment ติดขัด (ได้ 3 จาก 12 อัตรา) · หัวหน้าเวรที่เสนอไว้เพิ่งลาออก · มีข้อเสนอ: ย้ายพยาบาลเก่าบางส่วน / จ้าง agency / เลื่อนเปิด / เปิดครึ่งเดียว',
    hint: 'เกณฑ์ผ่านรอบนี้: decision quality — มี alternatives + counter-evidence + risk analysis + matrix อย่างน้อยในโครง' },
  { key: 'day90', label: 'Day 90', when: 'ทำวันสุดท้าย (29 ธ.ค. 2026)', caseTitle: 'เคส A4 · Readmission',
    text: 'Readmission ภายใน 30 วันสูงกว่าเป้า 40% · เกี่ยวข้อง 4 หน่วยงาน (OPD, ward, pharmacy, home care) · แต่ละหน่วยโทษกันคนละที่ · คุณได้รับมอบหมายให้นำทีมข้ามหน่วยงานแก้ปัญหานี้ใน 6 เดือน',
    hint: 'เกณฑ์ผ่านรอบนี้: ใช้ framework ได้เป็นระบบ — framing, system view, alternatives, trigger/response ปรากฏโดยอัตโนมัติ' }
];

/* ---------- nav ---------- */
function buildNav(active) {
  var wd = store.get('weekDone', {});
  var p = progress();
  var item = function(href, label, num, isActive, done) {
    return '<a class="nav-item' + (isActive ? ' active' : '') + '" href="' + href + '">' +
      (num ? '<span class="nav-num">' + num + '</span>' : '') + '<span>' + label + '</span>' +
      (done ? '<span class="done-dot"></span>' : '') + '</a>';
  };
  var h = '';
  h += item('#/home', 'หน้าแรก', null, active === 'home');
  h += item('#/roadmap', 'โรดแมป 90 วัน', null, active === 'roadmap');
  [['Phase 1 · Think Better', 1], ['Phase 2 · Decide Better', 2], ['Phase 3 · Lead Better', 3]].forEach(function(ph) {
    h += '<div class="nav-sec">' + ph[0] + '</div>';
    WEEKS.filter(function(w) { return w.phase === ph[1]; }).forEach(function(w) {
      h += item('#/week/' + w.n, esc(w.title), 'W' + w.n, active === 'week' && String(w.n) === (parseHash()[1] || ''), !!wd['w' + w.n]);
    });
  });
  h += '<div class="nav-sec">เครื่องมือ</div>';
  h += item('#/journal', 'Thinking Journal', null, active === 'journal');
  h += item('#/decisions', 'Decision Journal', null, active === 'decisions');
  h += item('#/assessment', 'แบบประเมิน Day 1/30/60/90', null, active === 'assessment');
  h += item('#/reading', 'โมดูล: อ่านระหว่างบรรทัด', null, active === 'reading');
  h += item('#/templates', 'เทมเพลต T1–T14', null, active === 'templates');
  h += '<div class="nav-sec">เพิ่มเติม</div>';
  h += item('#/guide', 'คู่มือการใช้งาน', null, active === 'guide');
  h += item('#/resources', 'หลักสูตร · สำรองข้อมูล', null, active === 'resources');
  document.getElementById('side-nav').innerHTML = h;
  document.getElementById('side-foot').innerHTML =
    '<div class="prog" style="background:#24444b"><div class="prog-fill js-prog-fill" style="width:' + p.pct + '%"></div></div>ความคืบหน้ารวม ' + p.pct + '%' +
    '<div class="sync-line">' + syncStatusLine() + '</div>';
}
function syncStatusLine() {
  if (!(window.SYNC)) return 'บันทึกในเบราว์เซอร์นี้';
  if (SYNC.mode !== 'server') return 'บันทึกในเบราว์เซอร์นี้เท่านั้น';
  var map = { idle: '☁️ ซิงก์เซิร์ฟเวอร์: พร้อม', saving: '☁️ กำลังบันทึกขึ้นเซิร์ฟเวอร์…', saved: '☁️ บันทึกบนเซิร์ฟเวอร์แล้ว ✓', error: '⚠️ บันทึกบนเซิร์ฟเวอร์ไม่สำเร็จ', conflict: '☁️ ชนกัน — โหลดเวอร์ชันเซิร์ฟเวอร์แล้ว' };
  return map[SYNC.status] || '';
}

/* ---------- helpers ---------- */
function progBar(pct, cls) {
  return '<div class="prog ' + (cls || '') + '"><div class="prog-fill js-prog-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="prog-row"><span class="js-prog-pct">' + pct + '%</span></div>';
}
function weekTaskIds(w) {
  var ids = w.days.map(function(d) { return 'w' + w.n + 'd' + d.d; });
  (w.outputs || []).forEach(function(_, i) { ids.push('w' + w.n + 'out' + i); });
  return ids;
}
function weekProgress(w) {
  var tasks = store.get('tasks', {});
  var ids = weekTaskIds(w);
  var done = ids.filter(function(id) { return tasks[id]; }).length;
  return { done: done, total: ids.length, pct: ids.length ? Math.round(done / ids.length * 100) : 0 };
}
function chip(done, now, todo) {
  var p = progressMeta();
  return '<span class="chip ' + (p === 'done' ? 'chip-done' : p === 'now' ? 'chip-now' : 'chip-todo') + '">' +
    (p === 'done' ? done : p === 'now' ? now : todo) + '</span>';
}
function progressMeta() { return 'todo'; } /* overridden per context below */

function journalStreak() {
  var entries = store.get('journal', []);
  var dates = new Set(entries.map(function(e) { return e.date; }));
  var d = new Date(todayStr() + 'T00:00:00');
  var s = 0;
  if (!dates.has(todayStr())) d.setDate(d.getDate() - 1);
  while (dates.has(d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()))) {
    s++; d.setDate(d.getDate() - 1);
  }
  return s;
}
function todayInfo() {
  var d = dayNumber();
  if (d < 1) return { kind: 'before' };
  if (d > 90) return { kind: 'done' };
  if (d === 29 || d === 30) return { kind: 'assess', key: 'day30' };
  if (d === 59 || d === 60) return { kind: 'assess', key: 'day60' };
  var w = WEEKS.find(function(x) { return d >= x.startDay && d <= x.endDay; });
  if (w) {
    var day = w.days.find(function(x) { return x.d === d; });
    return { kind: 'week', w: w, day: day, d: d };
  }
  return { kind: 'assess', key: 'day90' };
}
function getFieldVal(id) {
  var el = document.querySelector('[data-save="' + id + '"]');
  return el ? el.value : '';
}

/* ---------- route: home ---------- */
function routeHome() {
  var p = progress();
  var d = dayNumber();
  var ti = todayInfo();
  var entries = store.get('journal', []);
  var hasToday = entries.some(function(e) { return e.date === todayStr(); });
  var decs = store.get('decisions', []);
  var dueDecs = decs.filter(function(x) { return !x.actual && x.reviewDate && x.reviewDate <= todayStr(); }).length;
  var rubric = store.get('rubric', []);

  var h = '<div class="hero"><h1>Critical Management 90</h1>' +
    '<p>โปรแกรมฝึก Critical Thinking → Decision-Making → Systems &amp; Management Thinking สำหรับ Senior Nurse Manager</p>' +
    '<p style="font-weight:700;font-size:1.05rem">' + (d < 1 ? 'โปรแกรมจะเริ่มวัน ' + fmtDate(programStart()) : d > 90 ? 'จบโปรแกรมแล้ว — ยินดีด้วย 🎉' : 'วันนี้คือ Day ' + d + ' / 90 · ' + fmtDate(todayStr())) + '</p>' +
    progBar(p.pct) + '</div>';

  /* today card */
  h += '<div class="card today-card"><h3>📌 งานของวันนี้</h3>';
  if (ti.kind === 'before') {
    h += '<p>โปรแกรมเริ่มวัน ' + fmtDate(programStart()) + ' — เปลี่ยนวันเริ่มได้ที่ "ตั้งค่า" ด้านล่าง</p>';
  } else if (ti.kind === 'done') {
    h += '<p>จบ 90 วันแล้ว — ดูสรุปได้ที่ <a href="#/assessment">แบบประเมิน</a> และวางแผนรอบถัดไปใน <a href="#/week/13">บทที่ 13</a></p>';
  } else if (ti.kind === 'assess') {
    var a = ASSESS.find(function(x) { return x.key === ti.key; });
    h += '<p><b>' + a.label + '</b> — วิเคราะห์ ' + a.caseTitle + ' 30 นาที แล้วให้คะแนนตัวเอง</p>' +
      '<a class="btn" href="#/assessment">ไปหน้าแบบประเมิน</a>';
  } else {
    var day = ti.day;
    h += '<p><b>Day ' + ti.d + ' · บทที่ ' + ti.w.n + ' — ' + esc(ti.w.title) + '</b></p>' +
      '<p>' + esc(day ? day.t : 'ทบทวนงานสัปดาห์นี้') + (day && day.m ? ' <span class="t-mins">· ~' + day.m + ' นาที</span>' : '') + '</p>' +
      '<a class="btn" href="#/week/' + ti.w.n + '">ไปบทเรียนวันนี้</a> ';
    if (!hasToday) h += '<a class="btn ghost" href="#/journal">ยังไม่ได้เขียน Thinking Journal วันนี้ →</a>';
  }
  h += '</div>';

  /* quick actions */
  h += '<div class="qa-grid">' +
    '<a class="qa" href="#/journal"><div class="qa-t">Thinking Journal <span class="chip chip-now">🔥 ' + journalStreak() + ' วันต่อเนื่อง</span></div><div class="qa-s">7 คำถาม · 10 นาที/วัน — กฎเหล็กข้อเดียวที่ห้ามขาด</div></a>' +
    '<a class="qa" href="#/decisions"><div class="qa-t">Decision Journal' + (dueDecs ? ' <span class="chip chip-warn">' + dueDecs + ' รายการถึงเวลาทบทวน</span>' : '') + '</div><div class="qa-s">บันทึกก่อนรู้ผล · ทบทวนตาม review date</div></a>' +
    '<a class="qa" href="#/assessment"><div class="qa-t">แบบประเมิน</div><div class="qa-s">Rubric ' + RUBRIC_ITEMS.length + ' ด้าน /' + RUBRIC_MAX + ' · เคส A1–A4 พร้อมจับเวลา</div></a>' +
    '</div>';

  /* stats */
  h += '<div class="grid3">' +
    '<div class="stat"><div class="num">' + p.taskDone + '/' + p.taskTotal + '</div><div class="lbl">งานรายวัน/สัปดาห์ที่ทำแล้ว</div></div>' +
    '<div class="stat"><div class="num">' + p.weeksDone + '/13</div><div class="lbl">สัปดาห์ที่ปิดแล้ว</div></div>' +
    '<div class="stat"><div class="num">' + rubric.length + '/4</div><div class="lbl">รอบประเมินที่บันทึกแล้ว</div></div>' +
    '</div>';

  /* phase progress */
  var tasks = store.get('tasks', {});
  h += '<div class="card"><h3>ความคืบหน้าแยกตาม Phase</h3>';
  [1, 2, 3].forEach(function(ph) {
    var ws = WEEKS.filter(function(w) { return w.phase === ph; });
    var tot = 0, dn = 0;
    ws.forEach(function(w) { weekTaskIds(w).forEach(function(id) { tot++; if (tasks[id]) dn++; }); });
    var names = { 1: 'Phase 1 · Think Better (D1–30)', 2: 'Phase 2 · Decide Better (D31–60)', 3: 'Phase 3 · Lead Better (D61–90)' };
    h += '<p style="margin:12px 0 4px;font-weight:600">' + names[ph] + '</p>' + progBar(tot ? Math.round(dn / tot * 100) : 0);
  });
  h += '</div>';

  /* settings */
  h += '<div class="card"><h3>⚙️ ตั้งค่า</h3>' +
    '<div class="field"><label>วันเริ่มโปรแกรม (ปัจจุบัน: ' + fmtDate(programStart()) + ')</label>' +
    '<input type="date" id="set-start" value="' + esc(programStart()) + '"></div>';
  if (window.SYNC && SYNC.mode === 'server' && SYNC.learner) {
    h += '<h3>ใช้งานข้ามเครื่อง (server mode)</h3>' +
      '<p class="small">ข้อมูลผูกกับ <b>รหัสผู้เรียน</b> ของเบราว์เซอร์นี้:</p>' +
      '<p><code class="ext-link">' + esc(SYNC.learner) + '</code> <button type="button" class="btn small ghost" data-copy-ext="' + esc(SYNC.learner) + '">คัดลอกรหัส</button></p>' +
      '<p class="small">เปิดเว็บจากเครื่อง/มือถืออื่น (URL เดียวกัน) แล้วกรอกรหัสนี้เพื่อดึงข้อมูลชุดเดียวกัน:</p>' +
      '<div class="field"><input type="text" id="set-learner" placeholder="วางรหัสผู้เรียนเดิมที่นี่"></div>' +
      '<button type="button" class="btn small ghost" id="btn-use-learner">ใช้รหัสนี้ (โหลดข้อมูลของมัน)</button> ' +
      '<p class="hint">⚠️ รหัสนี้คือ "กุญแจ" ของข้อมูล — อย่าแชร์ให้คนที่ไม่ไว้ใจ</p>';
  }
  h += '<p class="hint">ทุกอย่างบันทึกในเบราว์เซอร์นี้เท่านั้น — สำรองข้อมูลเป็นระยะที่ <a href="#/resources">หลักสูตร · สำรองข้อมูล</a></p></div>';

  return { html: h, title: 'หน้าแรก' };
}

/* ---------- route: roadmap ---------- */
function routeRoadmap() {
  var wd = store.get('weekDone', {});
  var d = dayNumber();
  var h = '<h1>โรดแมป 90 วัน</h1><p class="hint">3 Phases · 13 บท · ประเมิน 4 ครั้ง — คลิกบทเพื่อเปิดบทเรียนเต็ม</p>';
  var phNames = { 1: ['Phase 1 — THINK BETTER', 'สร้าง Thinking Operating System · Day 1–30'], 2: ['Phase 2 — DECIDE BETTER', 'จาก Critical Thinking → Managerial Thinking · Day 31–60'], 3: ['Phase 3 — LEAD BETTER', 'ทำให้ทีมคิดดีขึ้น + Capstone · Day 61–90'] };
  [1, 2, 3].forEach(function(ph) {
    h += '<h2>' + phNames[ph][0] + '</h2><p class="hint">' + phNames[ph][1] + '</p>';
    WEEKS.filter(function(w) { return w.phase === ph; }).forEach(function(w) {
      var wp = weekProgress(w);
      var meta = d > w.endDay ? 'chip-done' : (d >= w.startDay ? 'chip-now' : 'chip-todo');
      var label = d > w.endDay ? 'ผ่านแล้ว' : (d >= w.startDay ? 'กำลังเรียน' : 'ยังไม่ถึง');
      if (wd['w' + w.n]) { meta = 'chip-done'; label = 'ปิดสัปดาห์แล้ว ✓'; }
      h += '<a class="week-card" href="#/week/' + w.n + '"><div class="week-num">W' + w.n + '</div>' +
        '<div class="week-info"><div class="wc-title">' + esc(w.title) + '</div><div class="wc-dates">' + esc(w.dates) + ' · วันที่ ' + w.startDay + '–' + w.endDay + '</div></div>' +
        '<div class="week-side"><span class="chip ' + meta + '">' + label + '</span><br>' + wp.done + '/' + wp.total + ' งาน</div></a>';
    });
    if (ph === 1) h += milestoneCard('Day 29–30', 'ประเมินรอบที่ 2 — เคส A2', '#/assessment');
    if (ph === 2) h += milestoneCard('Day 59–60', 'ประเมินรอบที่ 3 — เคส A3', '#/assessment');
    if (ph === 3) h += milestoneCard('Day 89–90', 'นำเสนอ Capstone + ประเมินรอบสุดท้าย (เคส A4)', '#/week/13');
  });
  return { html: h, title: 'โรดแมป' };
}
function milestoneCard(days, label, href) {
  return '<a class="week-card milestone" href="' + href + '"><div class="week-num">🎯</div>' +
    '<div class="week-info"><div class="wc-title">' + label + '</div><div class="wc-dates">' + days + '</div></div>' +
    '<div class="week-side"><span class="chip chip-now">จุดวัดผล</span></div></a>';
}

/* ---------- route: week ---------- */
function routeWeek(args) {
  var n = parseInt(args[0], 10);
  var w = WEEKS[n - 1];
  if (!w) return { html: '<h1>ไม่พบบทเรียน</h1>', title: 'ไม่พบบทเรียน' };
  return { html: renderWeek(w, false), title: 'บทที่ ' + w.n + ' · ' + w.title };
}

/* ---------- route: journal ---------- */
function routeJournal() {
  var entries = store.get('journal', []).slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var today = todayStr();
  var cur = entries.find(function(e) { return e.date === today; });
  var QS = ['What problem am I solving?', 'What do I know?', 'What am I assuming?', 'What evidence am I missing?', 'What are the alternatives?', 'What could prove me wrong?', 'What are the consequences of my decision?'];
  var h = '<h1>Thinking Journal</h1><p class="hint">7 คำถาม · 10 นาที/วัน — กฎเหล็กข้อเดียวที่ห้ามขาดตลอด 90 วัน ทุกคำตอบบันทึกในเบราว์เซอร์นี้</p>';
  h += '<p><span class="chip chip-now">🔥 streak ' + journalStreak() + ' วันต่อเนื่อง</span> <span class="chip chip-todo">ทั้งหมด ' + entries.length + ' รายการ</span></p>';
  h += '<div class="card"><h3>รายการวันนี้ · ' + fmtDate(today) + (cur ? ' (มีอยู่แล้ว — แก้ไขได้)' : '') + '</h3>';
  QS.forEach(function(q, i) {
    h += '<div class="field"><label>' + (i + 1) + '. ' + esc(q) + '</label><textarea id="jq' + (i + 1) + '" rows="2" placeholder="">' + esc(cur ? cur.qs[i] || '' : '') + '</textarea></div>';
  });
  h += '<button type="button" class="btn" id="btn-save-journal">บันทึกรายการวันนี้</button></div>';
  h += '<h2>รายการที่ผ่านมา</h2>';
  if (!entries.length) h += '<p class="hint">ยังไม่มีรายการ — เริ่มวันนี้เลย</p>';
  entries.forEach(function(e) {
    var first = (e.qs.find(function(x) { return x; }) || '').slice(0, 80);
    h += '<details class="entry"><summary><span class="entry-date">' + fmtDate(e.date) + '</span><span class="entry-prev">' + esc(first) + '</span></summary>' +
      '<div class="entry-body">';
    QS.forEach(function(q, i) {
      if (e.qs[i]) h += '<p><span class="q-lbl">' + (i + 1) + '. ' + esc(q) + '</span><br>' + esc(e.qs[i]) + '</p>';
    });
    h += '<div class="entry-actions"><button type="button" class="btn small warn" data-del-journal="' + e.id + '">ลบ</button></div></div></details>';
  });
  return { html: h, title: 'Thinking Journal' };
}

/* ---------- route: decisions ---------- */
function routeDecisions() {
  var entries = store.get('decisions', []).slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var e = EDIT_DEC ? entries.find(function(x) { return x.id === EDIT_DEC; }) : null;
  var v = function(k) { return e ? esc(e[k] || '') : ''; };
  var h = '<h1>Decision Journal</h1><p class="hint">บันทึก decision สำคัญ <b>ก่อนรู้ผล</b> — พร้อม confidence % และ review date เสมอ (T4) · ระบบจะแจ้งเมื่อถึงเวลาทบทวน</p>';
  h += '<div class="card"><h3>' + (e ? 'แก้ไข: ' + esc(e.title) : 'เพิ่มรายการใหม่') + '</h3>' +
    '<div class="field"><label>Decision (เรื่องอะไร)</label><input type="text" id="dec-title" placeholder="เช่น อนุมัติจ้าง part-time 2 คนช่วง พ.ย." value="' + v('title') + '"></div>' +
    '<div class="field"><label>Problem</label><textarea id="dec-problem" rows="2">' + v('problem') + '</textarea></div>' +
    '<div class="field"><label>Option A</label><textarea id="dec-a" rows="2">' + v('optA') + '</textarea></div>' +
    '<div class="field"><label>Option B</label><textarea id="dec-b" rows="2">' + v('optB') + '</textarea></div>' +
    '<div class="field"><label>Option C (ถ้ามี)</label><textarea id="dec-c" rows="2">' + v('optC') + '</textarea></div>' +
    '<div class="field"><label>Evidence</label><textarea id="dec-evid" rows="3">' + v('evidence') + '</textarea></div>' +
    '<div class="field"><label>Assumptions</label><textarea id="dec-assum" rows="2">' + v('assumptions') + '</textarea></div>' +
    '<div class="field"><label>Unknowns</label><textarea id="dec-unknown" rows="2">' + v('unknowns') + '</textarea></div>' +
    '<div class="field"><label>Expected outcome (ต้องเป็นตัวเลข/เงื่อนไขที่วัดได้)</label><textarea id="dec-expected" rows="2">' + v('expected') + '</textarea></div>' +
    '<div class="field"><label>Risks</label><textarea id="dec-risks" rows="2">' + v('risks') + '</textarea></div>' +
    '<div class="grid2">' +
    '<div class="field"><label>Confidence (%)</label><input type="number" id="dec-conf" min="0" max="100" value="' + (e ? (e.confidence || 60) : 60) + '"></div>' +
    '<div class="field"><label>Review date</label><input type="date" id="dec-review" value="' + v('reviewDate') + '"></div>' +
    '</div>' +
    '<div class="field"><label>Why I chose this option (เหตุผลตัวตัดสินจริง)</label><textarea id="dec-why" rows="2">' + v('why') + '</textarea></div>' +
    '<div class="field"><label>What would make this decision wrong?</label><textarea id="dec-wrong" rows="2">' + v('wrongWhat') + '</textarea></div>' +
    '<button type="button" class="btn" id="btn-save-dec">' + (e ? 'บันทึกการแก้ไข' : 'บันทึก Decision') + '</button> ' +
    (e ? '<button type="button" class="btn ghost" id="btn-cancel-edit">ยกเลิกการแก้ไข</button>' : '') +
    '</div>';
  h += '<h2>รายการทั้งหมด (' + entries.length + ')</h2>';
  if (!entries.length) h += '<p class="hint">ยังไม่มีรายการ — เริ่มจาก decision ที่ "ย้อนกลับยาก" หรือใช้ทรัพยากรมาก</p>';
  entries.forEach(function(x) {
    var due = !x.actual && x.reviewDate && x.reviewDate <= todayStr();
    h += '<div class="entry"><div class="dec-head"><span class="dec-title">' + esc(x.title) + '</span>' +
      (x.actual ? '<span class="chip chip-done">ทบทวนแล้ว</span>' : due ? '<span class="chip chip-warn">ถึงเวลาทบทวน</span>' : '<span class="chip chip-todo">ติดตามผล</span>') +
      '<span class="dec-meta">' + fmtDate(x.date) + (x.reviewDate ? ' · review ' + fmtDate(x.reviewDate) : '') + ' · conf ' + (x.confidence || '?') + '%</span></div>' +
      '<div class="dec-body">' +
      (x.problem ? '<p><span class="q-lbl">Problem:</span> ' + esc(x.problem) + '</p>' : '') +
      (x.optA ? '<p><span class="q-lbl">Options:</span> A) ' + esc(x.optA) + (x.optB ? ' · B) ' + esc(x.optB) : '') + (x.optC ? ' · C) ' + esc(x.optC) : '') + '</p>' : '') +
      (x.expected ? '<p><span class="q-lbl">คาดหวัง:</span> ' + esc(x.expected) + '</p>' : '') +
      (x.why ? '<p><span class="q-lbl">เหตุผลที่เลือก:</span> ' + esc(x.why) + '</p>' : '') +
      (x.wrongWhat ? '<p><span class="q-lbl">จะผิดเมื่อ:</span> ' + esc(x.wrongWhat) + '</p>' : '') +
      '</div>';
    if (due) {
      h += '<div class="dec-flag">⏰ ถึง review date แล้ว — กลับมาตอบ 3 คำถาม: ผลจริงต่างจากคาดอย่างไร? Assumption ไหนพัง? Bias ไหนเล่น?</div>' +
        '<div class="dec-body"><div class="field"><label>ผลจริง</label><textarea id="rev-' + x.id + '-actual" rows="2"></textarea></div>' +
        '<div class="field"><label>What did I learn?</label><textarea id="rev-' + x.id + '-learned" rows="2"></textarea></div>' +
        '<button type="button" class="btn small" data-review-dec="' + x.id + '">บันทึกการทบทวน</button></div>';
    }
    if (x.actual) {
      h += '<div class="dec-body"><p><span class="q-lbl">ผลจริง:</span> ' + esc(x.actual) + '</p>' +
        (x.learned ? '<p><span class="q-lbl">เรียนรู้ว่า:</span> ' + esc(x.learned) + '</p>' : '') + '</div>';
    }
    h += '<div class="entry-actions"><button type="button" class="btn small ghost" data-edit-dec="' + x.id + '">แก้ไข</button> ' +
      '<button type="button" class="btn small warn" data-del-dec="' + x.id + '">ลบ</button></div></div>';
  });
  return { html: h, title: 'Decision Journal' };
}

/* ---------- route: assessment ---------- */
function rubricForm(key) {
  var cur = RUB_CUR[key] || (RUB_CUR[key] = RUBRIC_ITEMS.map(function() { return 3; }));
  var h = '<div class="rubric">';
  RUBRIC_ITEMS.forEach(function(name, i) {
    h += '<div class="rubric-row"><label>' + esc(name) + '</label>' +
      '<input type="range" min="1" max="5" step="1" value="' + cur[i] + '" data-rub="' + key + '" data-ri="' + i + '">' +
      '<span class="rv" data-rv="' + i + '">' + cur[i] + '</span></div>';
  });
  var sum = cur.reduce(function(a, b) { return a + b; }, 0);
  h += '</div><div class="rubric-total">รวม: <span data-rubtotal="' + key + '">' + sum + '</span>/' + RUBRIC_MAX + '</div>';
  return h;
}
function routeAssessment() {
  var rubric = store.get('rubric', []);
  var h = '<h1>แบบประเมิน Day 1 / 30 / 60 / 90</h1>' +
    '<p class="hint">วิธี: เปิดจับเวลา 30 นาที → วิเคราะห์เคสด้วยการเขียน (ไม่ใช่คิดในหัว) → ให้คะแนนตัวเองตาม rubric 12 ด้าน → บันทึก · rubric นี้เป็นเครื่องมือพัฒนาภายใน ไม่ใช่ validated assessment จึงไม่ต้องยึด "ต้องเพิ่ม X%"</p>';
  ASSESS.forEach(function(a) {
    var mine = rubric.filter(function(r) { return r.cp === a.key; });
    var last = mine.length ? mine[mine.length - 1] : null;
    h += '<div class="card"><h3>' + a.label + ' — ' + a.caseTitle + '</h3>' +
      '<p class="small">' + esc(a.when) + (last ? ' · <span class="chip chip-done">บันทึกแล้ว ' + fmtDate(last.date) + ' ได้ ' + last.total + '/' + (last.scores.length >= 12 ? 60 : 50) + '</span>' : '') + '</p>' +
      '<div class="call call-case"><div class="call-t">' + esc(a.caseTitle) + '</div><div class="call-b"><p>' + esc(a.text) + '</p></div></div>' +
      '<p class="hint">✎ ' + esc(a.hint) + '</p>' +
      '<p><span class="timer" id="timer-' + a.key + '">30:00</span> <button type="button" class="btn small ghost" data-timer-start="' + a.key + '">เริ่มจับเวลา 30 นาที</button></p>' +
      '<h3>ให้คะแนนตัวเอง</h3>' + rubricForm(a.key) +
      FIELD('rub-notes-' + a.key, 'หมายเหตุ: ทำอะไรได้ดี / ข้ามอะไรไป / จะฝึกอะไรต่อ', '', 3) +
      '<button type="button" class="btn" data-save-rubric="' + a.key + '">บันทึกผล ' + a.label + '</button>' +
      '<div class="ext-reviews" id="ext-reviews-' + a.key + '">' + extReviewsPlaceholder(a.key) + '</div></div>';
  });
  h += '<div class="card"><h3>สรุปเทียบผล</h3>';
  var any = false;
  ASSESS.forEach(function(a) {
    var mine = rubric.filter(function(r) { return r.cp === a.key; });
    if (!mine.length) return;
    any = true;
    var last = mine[mine.length - 1];
    var max = (last.scores && last.scores.length >= 12) ? 60 : 50;
    h += '<div class="score-bar"><span class="sb-label">' + a.label + ' (ตัวเอง)</span><div class="sb-track"><div class="sb-fill" style="width:' + Math.min(100, last.total / max * 100) + '%"></div></div><span class="sb-num">' + last.total + '/' + max + '</span></div>';
  });
  if (!any) h += '<p class="hint">ยังไม่มีผลประเมิน — เริ่มที่ Baseline (Day 1)</p>';
  h += '</div>';
  if (window.SYNC && SYNC.mode === 'server') loadExtReviews();
  return { html: h, title: 'แบบประเมิน' };
}
function extReviewsPlaceholder(key) {
  if (!(window.SYNC && SYNC.mode === 'server' && SYNC.learner)) return '';
  var link = location.origin + '/review.html?c=' + key + '&l=' + encodeURIComponent(SYNC.learner);
  return '<details class="ext-box"><summary>👥 ขอความเห็นจากภายนอก (external feedback — จุดอ่อนที่สุดของการประเมินตัวเอง)</summary>' +
    '<div class="ext-inner">' +
    '<p class="small">ส่งลิงก์นี้ให้เพื่อนร่วมงาน/หัวหน้า/ที่ปรึกษา เพื่อให้เขาวิเคราะห์<b>เคสเดียวกันนี้</b>และให้คะแนน rubric เดียวกัน — ผลจะถูกเก็บบนเซิร์ฟเวอร์และแสดงเทียบกับคะแนนตัวเองที่นี่</p>' +
    '<p class="small" style="color:var(--amber)">⚠️ ลิงก์นี้มีรหัสผู้เรียนฝังอยู่ — ใครมีรหัสนี้สามารถเข้าถึง/ลบข้อมูลของบัญชีนี้ได้ จึงควรส่งเฉพาะคนที่ไว้ใจเท่านั้น</p>' +
    '<p><code class="ext-link">' + esc(link) + '</code> <button type="button" class="btn small ghost" data-copy-ext="' + esc(link) + '">คัดลอกลิงก์</button></p>' +
    '<div class="ext-list" data-ext-list="' + key + '"><p class="hint">กำลังโหลดความเห็นภายนอก…</p></div>' +
    '</div></details>';
}
function loadExtReviews() {
  if (!(window.SYNC && SYNC.mode === 'server' && SYNC.learner)) return;
  fetch('/api/reviews?learner=' + encodeURIComponent(SYNC.learner)).then(function(r) { return r.ok ? r.json() : { reviews: [] }; }).then(function(j) {
    (j.reviews || []).forEach(function(rv) {
      var box = document.querySelector('[data-ext-list="' + rv.checkpoint + '"]');
      if (!box) return;
      var empty = box.querySelector('.hint');
      if (empty) empty.remove();
      var max = (rv.scores && rv.scores.length >= 12) ? 60 : 50;
      var item = document.createElement('div');
      item.className = 'score-bar';
      item.innerHTML = '<span class="sb-label">👤 ' + esc(rv.reviewer || 'ไม่ระบุชื่อ') + '</span>' +
        '<div class="sb-track"><div class="sb-fill" style="width:' + Math.min(100, rv.total / max * 100) + '%"></div></div>' +
        '<span class="sb-num">' + rv.total + '/' + max + '</span>';
      box.appendChild(item);
      if (rv.notes) {
        var note = document.createElement('p');
        note.className = 'small';
        note.textContent = '— ' + rv.notes;
        box.appendChild(note);
      }
    });
    document.querySelectorAll('[data-ext-list] .hint').forEach(function(p) {
      if (p.textContent.indexOf('กำลังโหลด') === 0) p.textContent = 'ยังไม่มีความเห็นภายนอก — ส่งลิงก์ด้านบนไปได้เลย';
    });
  }).catch(function() {
    document.querySelectorAll('[data-ext-list] .hint').forEach(function(p) {
      if (p.textContent.indexOf('กำลังโหลด') === 0) p.textContent = 'โหลดความเห็นภายนอกไม่สำเร็จ — ลองรีเฟรชหน้านี้ใหม่';
    });
  });
}

/* ---------- route: templates ---------- */
function routeTemplates() {
  var T = [
    ['T1 · Thinking Journal (ทุกวัน 10 นาที)', '1. What problem am I solving?\n2. What do I know?\n3. What am I assuming?\n4. What evidence am I missing?\n5. What are the alternatives?\n6. What could prove me wrong?\n7. What are the consequences of my decision?'],
    ['T2 · One-Page Problem Analysis', 'Problem:\nWhat do we know?\nWhat don\'t we know?\nEvidence:\nAssumptions:\nPossible causes:\nAlternative explanations:\nStakeholders:\nPossible actions:\nRisks:\nWhat evidence would change my mind?'],
    ['T3 · Fact–Assumption–Interpretation–Opinion', 'FACT         วัดได้/อ้างอิงแหล่งได้\nASSUMPTION   เชื่อโดยไม่พิสูจน์ (มักอยู่หลังคำว่า "เพราะ")\nINTERPRETATION สรุปความหมายจาก fact\nOPINION      ความเห็น/ความชอบ\n\n→ คำถามต่อ: What data would distinguish these explanations?'],
    ['T4 · Decision Journal', 'Decision:                    Date:\nProblem:\nOptions (≥3):\nEvidence:\nAssumptions:\nUnknowns:\nOption A/B/C: pros / cons / expected outcome\nExpected outcome:\nRisks:\nConfidence: ____ %\nWhy I chose this option:\nWhat would make this decision wrong?\nReview date:\n--- (เติมภายหลัง) ---\nActual outcome:\nWhat did I learn?'],
    ['T5 · System Map Worksheet', 'ตัวแปรหลัก: ______________________\nเส้นเชื่อม: → ทำให้เพิ่ม, -| ทำให้ลด\n  A → B → C → A   (reinforcing loop R)\n  X -| Y          (balancing loop B)\nDelay ที่พบ (จุด + ระยะเวลา):\nLoop ที่พบ:\nLeverage points (ควบคุมได้จริง):\nSymptomatic fixes ที่ควรเลี่ยง:'],
    ['T6 · Cause → Evidence → Counter-evidence', 'Hypothesis: ______________________\nEvidence supporting:    1) 2) 3)\nEvidence against:       1) 2)   (ต้องไปหาจริง ไม่ใช่นั่งเดา)\nAlternative explanations: 1) 2) 3)\nConfidence: ____ %\nData ชุดถัดไปที่จะยืนยัน/ตัด hypothesis:'],
    ['T7 · Decision Matrix (weighted)', '| Option | เกณฑ์1 (w=?) | เกณฑ์2 | เกณฑ์3 | เกณฑ์4 | เกณฑ์5 | รวมถ่วงน้ำหนัก |\nกฎ: ทุกช่องต้องมี rationale 1 บรรทัด — ให้คะแนนไม่ได้เพราะไม่มี data = unknown\nPre-mortem: "ถ้า option ที่เลือกล้มใน 6 เดือน สาเหตุคืออะไร" (≥5 ข้อ)\nแยก: ป้องกันได้ / ตรวจจับได้ (ตั้ง trigger) / ยอมรับได้'],
    ['T8 · PDSA One-Pager', 'Aim: [เพิ่ม/ลดอะไร] ที่ [ใคร/ไหน] จาก [baseline] เป็น [เป้า] ภายใน [วันที่] + balancing measure\nChange hypothesis: ถ้าเราทำ X แล้ว Y จะเกิดขึ้นเพราะ Z\nPlan: ใคร ทำอะไร ที่ไหน นานแค่ไหน (เล็กพอทำได้ใน 1 สัปดาห์)\nDo: บันทึกสิ่งที่เกิดจริง (รวมที่ไม่คาดคิด)\nStudy: เทียบกับ prediction\nAct: adapt / adopt / abandon\nMeasures: Outcome / Process / Balancing'],
    ['T9 · Problem Framing Canvas (workshop 30 นาที)', '5 นาที   แต่ละคนเขียน problem statement แยกกัน (ห้ามคุย)\n10 นาที  อ่านออกเสียงทีละคน — ห้ามแก้/ห้ามโต้แย้ง (ทางแก้ที่ลอยมา จดไว้แผง "สำรองทางแก้")\n10 นาที  จัดกลุ่ม: statement ไหนต่างกันตรงไหน (ปัญหาเดียวกันไหม?)\n5 นาที    สังเคราะห์ problem statement ร่วม 1 ประโยค + ตัวชี้วัด\nเช็ค:   เป็น "ปัญหา" หรือแอบเป็น "ทางแก้" แล้ว'],
    ['T10 · Red Team Question Card', 'What are we assuming?\nWhat evidence is weak?\nWhat could make this plan fail?\nWho sees this differently?\nWhat second-order effect are we missing?\nWhat would our strongest critic say?\nWhose interests does this option serve — and whose does it ignore?\nWhat are we conspicuously not discussing, and who benefits from not discussing it?\n\nกติกา: ประกาศบทบาทล่วงหน้า · คำถาม ไม่ใช่ความเห็น · เจ้าของแผน "จดไว้ก่อน" ห้ามปกป้องทันที · หมุนเวียนคน'],
    ['T11 · Scenario / Trigger Plan', '                Best case | Base case | Worst case\nผลลัพธ์ (เลข):        |          |\nMechanism (ทำไม):    |          |\nLeading indicators:\nTrigger (จุดตัดสินใจ): ถ้า X > / < ____ แล้ว...\nResponse: pause / adjust / escalate\nผู้ตัดสินทันที (ไม่ต้องรอประชุม): [ชื่อ]'],
    ['T12 · Executive Decision Memo (1 หน้า, BLUF)', 'Problem\nWhy it matters\nEvidence\nRoot causes\nOptions\nTrade-offs\nRecommendation  ← ต้องมีเสมอ + เหตุผลว่าทำไมไม่ใช่ทางอื่น\nRisks\nMitigation\nMetrics + Review date\n\nทดสอบ: ผู้อ่านจริง 2 นาที ต้องรู้ว่าจะตัดสินอะไร'],
    ['T13 · Incentive Audit (อ่านระหว่างบรรทัด)', 'Speaker: ______________________\n1. ผลประโยชน์อะไรของเขาถูกกระทบจากเรื่องนี้ (เงิน / ตำแหน่ง / ภาระงาน / ชื่อเสียง / หน้าที่รับผิด)?\n2. เขาถือสารสนเทศที่เปรียบกว่าเราตรงไหน (เห็นข้อมูลที่เราไม่เห็น)?\n3. ถ้าเขาถูกถามตรง ๆ ต่อหน้าคนอื่น เขาจะกล้าพูดสิ่งนี้ไหม — ทำไม?\n4. ใครได้ประโยชน์จากการ "เลือกเล่า" ข้อมูลแบบที่เห็นนี้?\n5. สมมุติฐานของเราเรื่อง incentive นี้ — ทดสอบได้อย่างไร ถามใครได้อย่างปลอดภัย?\n\nกันสุดโต่ง: คนส่วนใหญ่เชื่อจริง ไม่ได้แอบแผน (Kunda 1990) — audit เพื่อเข้าใจ ไม่ใช่เพื่อจับผิด'],
    ['T14 · Framing & Omission Audit', 'ประโยค/เอกสารที่วิเคราะห์: ______________________\n1. ใครนิยามปัญหานี้ และนิยามไว้อย่างไร?\n2. คำไหนแฝงการตัดสินคุณค่า ("หนี", "ไม่ค่อยรู้", "แก้ไม่ตก")?\n3. สาเหตุถูกฝังในประโยคไหน ("X เพราะ Y" — Y ยังไม่พิสูจน์)?\n4. เขียนเวอร์ชันกลางที่ตัด framing ออก (แค่ข้อมูล + ช่องว่าง)\n5. สุนัขที่ไม่เห่า: 5 คำถามที่ "คนที่รู้งานต้องถาม" — ข้อไหนหายไป?\n6. ใครได้ประโยชน์จากการไม่พูดเรื่องที่หายไป?']
  ];
  var h = '<h1>เทมเพลต T1–T14</h1><p class="hint">คัดลอกไปใช้ในสมุด/ไฟล์ของคุณ — ปุ่มคัดลอกอยู่มุมขวาของแต่ละหัวข้อ</p>';
  T.forEach(function(t, i) {
    h += '<div class="tpl-head"><h3>' + esc(t[0]) + '</h3><button type="button" class="btn small ghost" data-copy="tpl-' + i + '">คัดลอก</button></div>' +
      '<pre class="tpl" id="tpl-' + i + '">' + esc(t[1]) + '</pre>';
  });
  return { html: h, title: 'เทมเพลต' };
}

/* ---------- route: reading-between-the-lines module ---------- */
function routeReading() {
  var h = '<h1>โมดูลเสริม: อ่านระหว่างบรรทัด</h1>' +
    '<p class="hint">บริบท ผลประโยชน์ และสิ่งที่หายไป — ตามคำแนะนำหัวข้อ 5.1 ของเอกสารรีวิว · แนะนำให้ทำหลังจบ Week 9–10 (ใช้เทมเพลต T13–T14 ประกอบ)</p>';
  if (window.READING && window.READING.html) {
    h += window.READING.html();
  } else {
    h += '<p class="hint">ยังไม่ได้โหลดเนื้อหาโมดูล (ไฟล์ content-reading.js หายไปหรือโหลดไม่สำเร็จ)</p>';
  }
  return { html: h, title: 'อ่านระหว่างบรรทัด' };
}

/* ---------- route: guide ---------- */
function routeGuide() {
  var h = '<h1>คู่มือการใช้งานเว็บนี้</h1>' +
    '<div class="card"><h3>โครงสร้างเว็บ = โครงสร้างโปรแกรม</h3>' + UL([
      '<b>บทเรียน 13 บท</b> (เมนูซ้าย) = 13 สัปดาห์ของโปรแกรม แต่ละบทมีเนื้อหาเต็ม + แบบฝึกหัด + เคสสัปดาห์ + แผนรายวันที่ติ๊กได้',
      '<b>Thinking Journal</b> = เขียนทุกวัน 10 นาที (7 คำถาม) — บันทึกได้วันละ 1 รายการ แก้ไขซ้ำได้',
      '<b>Decision Journal</b> = บันทึก decision สำคัญก่อนรู้ผล เมื่อถึง review date ระบบจะติดธง "ถึงเวลาทบทวน" พร้อมช่องกรอกผลจริง',
      '<b>แบบประเมิน</b> = เคส A1–A4 + จับเวลา 30 นาที + rubric 12 ด้าน (/60; คะแนนเก่า 10 ด้าน ยังแสดงเทียบได้) — ทำ 4 ครั้งตามวัน Day 1/30/60/90',
      '<b>เทมเพลต T1–T14</b> = อ้างอิง/คัดลอกไปใช้นอกระบบ',
      '<b>หน้าแรก</b> = บอก "งานของวันนี้" อัตโนมัติตามวันเริ่มโปรแกรม'
    ]) + '</div>' +
    '<div class="card"><h3>ข้อมูลของคุณถูกเก็บที่ไหน</h3>' +
    (window.SYNC && SYNC.mode === 'server'
      ? P('คุณกำลังใช้ผ่าน <b>เซิร์ฟเวอร์</b> — ข้อมูลทั้งหมด (คำตอบ, journal, decision, คะแนน) ถูกบันทึก<b>อัตโนมัติลงฐานข้อมูล SQLite บนเซิร์ฟเวอร์</b> (ปกติ <code>/data/cm90.db</code> ในโวลุ่มของ Docker) และซิงก์กลับเครื่องนี้ตอนเปิดหน้าใหม่') +
        P('<b>การใช้งานข้ามเครื่อง:</b> ข้อมูลผูกกับ <b>รหัสผู้เรียน</b> ของแต่ละเบราว์เซอร์ — เปิดหน้าแรก → ตั้งค่า → คัดลอกรหัสผู้เรียนจากเครื่องหลัก ไปกรอก "ใช้รหัสผู้เรียนเดิม" ที่เครื่องอื่น จึงจะเห็นข้อมูลชุดเดียวกัน (รหัสนี้คือกุญแจ อย่าแชร์ให้คนไม่ไว้ใจ)')
      : P('ทุกอย่าง (คำตอบแบบฝึกหัด, journal, decision, คะแนนประเมิน, ติ๊กงาน) ถูกบันทึกใน <b>localStorage ของเบราว์เซอร์เครื่องนี้</b> — ไม่มีการส่งขึ้นอินเทอร์เน็ตใด ๆ ทั้งสิ้น (ถ้าเปิดผ่านเซิร์ฟเวอร์ ระบบจะซิงก์ขึ้นเซิร์ฟเวอร์ให้อัตโนมัติ)')) +
    '<p><b>ข้อควรระวัง:</b> การล้างข้อมูลเบราว์เซอร์/เปลี่ยนเครื่อง = ข้อมูลหาย — <b>สำรองข้อมูลทุก 1–2 สัปดาห์</b> ผ่านหน้า "หลักสูตร · สำรองข้อมูล" (ดาวน์โหลดไฟล์ .json เก็บไว้) และกู้คืนได้ด้วยปุ่มนำเข้า</p></div>' +
    '<div class="card"><h3>จังหวะรายสัปดาห์ที่ระบบออกแบบไว้</h3>' + TBL(['สล็อต', 'เนื้อหา', 'เวลา'], [
      ['วันที่ 1 ของสัปดาห์', 'Learn: framework ของสัปดาห์', '30–45 นาที'],
      ['วันที่ 2', 'Learn ต่อ / ตัวอย่างจากงานจริง', '30 นาที'],
      ['วันที่ 3', 'Apply: exercise ของสัปดาห์', '30 นาที'],
      ['วันที่ 4', 'Case ของสัปดาห์ (เคสจริง หรือเคสในบท)', '45–60 นาที'],
      ['วันที่ 5', 'Challenge: โจมตีงานตัวเองด้วย standards', '30 นาที'],
      ['วันที่ 6', 'Course block (LinkedIn / IHI)', '60–90 นาที'],
      ['วันที่ 7', 'Weekly reflection + เช็ก output', '10–20 นาที']
    ]) + '<p class="hint">+ ทุกวัน: Thinking Journal 10 นาที · ทุก decision สำคัญ: Decision Journal</p></div>' +
    '<div class="card"><h3>เริ่มอย่างไร (Day 1)</h3>' + OL([
      'ไปหน้า <a href="#/assessment">แบบประเมิน</a> ทำ Baseline เคส A1 (จับเวลา 30 นาที) + ให้คะแนน rubric',
      'ตั้ง Thinking Journal แล้วเขียนวันแรก (7 คำถาม)',
      'เปิด <a href="#/week/1">บทที่ 1</a> ตามแผนรายวัน'
    ]) + '</div>';
  return { html: h, title: 'คู่มือการใช้งาน' };
}

/* ---------- route: resources ---------- */
function routeResources() {
  var h = '<h1>หลักสูตร · Event · สำรองข้อมูล</h1>' +
    '<div class="card"><h3>หลักสูตรและ Workshop ที่รองรับโปรแกรม</h3>' + TBL(['Priority', 'รายการ', 'รายละเอียด'], [
      ['★★★★★', 'IHI Open School — QI subscription', '~$210/ปี (7 courses) หรือ full ~$399/ปี (30+ courses, nursing CE) — ใช้ Week 7–11 · ตรวจราคาปัจจุบันที่ ihi.org'],
      ['★★★★☆', 'AONL CNML Essentials Review', 'เริ่ม 13 ต.ค. 2026 (Virtual), scenario-based — ถ้าเป้าต่อยอดคือ CNML certification'],
      ['★★★★☆', 'LinkedIn Learning — Critical Thinking for Better Judgment and Decision-Making', '~56 นาที — ใช้ Week 1–2'],
      ['★★★★☆', 'ASIORNA 2026 + Perioperative Nursing Leadership Forum', '23–25 ต.ค. 2026, InterContinental Bangkok — คุ้มถ้าอยู่สาย OR/perioperative'],
      ['★★★★★ (รอบหน้า)', 'AONL Virtual Nurse Manager Institute', 'รอบ 29 ก.ย.–1 ต.ค. 2026 เพิ่งจบ · รอบถัดไปที่ประกาศ 14–16 ก.ย. 2027 (~$1,150 member / $1,400 non-member · เวลาไทย ≈ 22:00–03:30)'],
      ['เก็บไว้รอบหน้า', 'HBS Online — Strategy Execution', '~40–45 ชม., $1,949 — ไม่ให้แย่งเวลา 90 วันนี้']
    ]) + '<p class="small">แหล่งอ้างอิง: <a href="https://www.aonl.org/resources/nurse-leader-competencies" target="_blank" rel="noopener">AONL Nurse Leader Competencies</a> · <a href="https://www.ihi.org/learn/courses/open-school" target="_blank" rel="noopener">IHI Open School</a> · <a href="https://www.criticalthinking.org/pages/steps-of-critical-thinking/480" target="_blank" rel="noopener">Foundation for Critical Thinking</a> · <a href="https://www.aacnnursing.org/essentials/tool-kit/domains-concepts/systems-based-practice" target="_blank" rel="noopener">AACN Systems-Based Practice</a></p></div>';
  h += '<div class="card"><h3>สำรอง / กู้คืน / ล้างข้อมูล</h3>' +
    (window.SYNC && SYNC.mode === 'server'
      ? '<p class="small">โหมดเซิร์ฟเวอร์: ข้อมูลถูกบันทึกอัตโนมัติบนเซิร์ฟเวอร์ (SQLite) แล้ว — ปุ่มด้านล่างดาวน์โหลดสำรองจากเซิร์ฟเวอร์โดยตรง (รวมความเห็นภายนอก)</p>' +
        '<p><a class="btn" href="/api/export?learner=' + encodeURIComponent(SYNC.learner || '') + '">ดาวน์โหลดสำรองจากเซิร์ฟเวอร์ (.json)</a></p>'
      : '<p class="small">ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์นี้เท่านั้น — แนะนำสำรองทุก 1–2 สัปดาห์ (ถ้าเสิร์ฟจากเซิร์ฟเวอร์ ข้อมูลจะถูกซิงก์ขึ้นเซิร์ฟเวอร์อัตโนมัติ)</p>') +
    '<button type="button" class="btn ghost" id="btn-export-json">ดาวน์โหลดข้อมูลสำรองเครื่องนี้ (.json)</button> ' +
    '<button type="button" class="btn ghost" id="btn-export-md">ส่งออก Journal เป็น Markdown</button> ' +
    '<label class="btn ghost" style="cursor:pointer">นำเข้าไฟล์สำรอง<input type="file" id="import-file" accept=".json" style="display:none"></label> ' +
    '<button type="button" class="btn warn" id="btn-reset">ล้างข้อมูลทั้งหมด</button></div>';
  return { html: h, title: 'หลักสูตร · สำรองข้อมูล' };
}

/* ---------- handlers ---------- */
function handleQuiz(btn) {
  var id = btn.dataset.quiz, i = +btn.dataset.i, correct = QUIZ_REG[id];
  if (correct == null) return;
  var box = btn.closest('.quiz');
  var quiz = store.get('quiz', {});
  if (i === correct) {
    box.querySelectorAll('.quiz-opt').forEach(function(b) {
      b.disabled = true;
      b.classList.remove('ok', 'bad');
      if (+b.dataset.i === correct) b.classList.add('ok');
    });
    quiz[id] = { i: i, ok: true };
  } else {
    btn.classList.add('bad');
    btn.disabled = true;
    quiz[id] = { i: i, ok: quiz[id] ? quiz[id].ok : false };
  }
  box.querySelector('.quiz-why').classList.add('show');
  store.set('quiz', quiz);
  refreshProgressUI();
}
function saveJournal() {
  var qs = [];
  for (var i = 1; i <= 7; i++) {
    var el = document.getElementById('jq' + i);
    qs.push(el ? el.value.trim() : '');
  }
  if (!qs.some(Boolean)) { alert('เขียนอย่างน้อย 1 ข้อก่อนบันทึกนะ'); return; }
  var entries = store.get('journal', []);
  var date = todayStr();
  var ex = entries.find(function(e) { return e.date === date; });
  if (ex) { ex.qs = qs; } else { entries.push({ id: uid(), date: date, qs: qs }); }
  store.set('journal', entries);
  render();
}
function deleteJournal(id) {
  if (!confirm('ลบรายการวันนี้?')) return;
  var entries = store.get('journal', []).filter(function(e) { return e.id !== id; });
  store.set('journal', entries);
  render();
}
function saveDecision() {
  var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var title = g('dec-title');
  if (!title) { alert('ใส่ชื่อ decision ก่อน'); return; }
  var entry = {
    id: EDIT_DEC || uid(), date: todayStr(), title: title,
    problem: g('dec-problem'), optA: g('dec-a'), optB: g('dec-b'), optC: g('dec-c'),
    evidence: g('dec-evid'), assumptions: g('dec-assum'), unknowns: g('dec-unknown'),
    expected: g('dec-expected'), risks: g('dec-risks'),
    confidence: +g('dec-conf') || 60, reviewDate: g('dec-review'),
    why: g('dec-why'), wrongWhat: g('dec-wrong')
  };
  var entries = store.get('decisions', []);
  var idx = entries.findIndex(function(e) { return e.id === entry.id; });
  if (idx >= 0) { entry.date = entries[idx].date; entry.actual = entries[idx].actual; entry.learned = entries[idx].learned; entries[idx] = entry; }
  else entries.push(entry);
  store.set('decisions', entries);
  EDIT_DEC = null;
  render();
}
function reviewDecision(id) {
  var a = document.getElementById('rev-' + id + '-actual');
  if (!a || !a.value.trim()) { alert('ใส่ผลจริงก่อน'); return; }
  var l = document.getElementById('rev-' + id + '-learned');
  var entries = store.get('decisions', []);
  var e = entries.find(function(x) { return x.id === id; });
  if (e) { e.actual = a.value.trim(); e.learned = l ? l.value.trim() : ''; store.set('decisions', entries); }
  render();
}
function saveRubric(key) {
  var scores = RUB_CUR[key];
  if (!scores) return;
  var total = scores.reduce(function(a, b) { return a + b; }, 0);
  var entries = store.get('rubric', []);
  entries.push({ id: uid(), cp: key, date: todayStr(), scores: scores.slice(), total: total, notes: getFieldVal('rub-notes-' + key) });
  store.set('rubric', entries);
  RUB_CUR[key] = RUBRIC_ITEMS.map(function() { return 3; });
  render();
}
function updateRubDisplay(key) {
  var card = document.querySelector('[data-save-rubric="' + key + '"]');
  if (!card) return;
  var box = card.closest('.card');
  var cur = RUB_CUR[key];
  box.querySelectorAll('.rv').forEach(function(sp) { sp.textContent = cur[+sp.dataset.rv]; });
  var tot = box.querySelector('[data-rubtotal="' + key + '"]');
  if (tot) tot.textContent = cur.reduce(function(a, b) { return a + b; }, 0);
}
function startTimer(key) {
  if (TIMER.iv) clearInterval(TIMER.iv);
  TIMER.key = key; TIMER.end = Date.now() + 30 * 60 * 1000;
  TIMER.iv = setInterval(function() {
    var el = document.getElementById('timer-' + TIMER.key);
    if (!el) { clearInterval(TIMER.iv); TIMER.iv = null; return; }
    var left = Math.max(0, TIMER.end - Date.now());
    var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    el.textContent = pad2(m) + ':' + pad2(s);
    el.classList.add('running');
    if (left <= 0) { clearInterval(TIMER.iv); TIMER.iv = null; el.classList.remove('running'); alert('⏰ ครบ 30 นาที — หยุดเขียนแล้วให้คะแนนตัวเองได้เลย'); }
  }, 500);
}
function download(name, content, type) {
  var blob = new Blob([content], { type: type || 'application/octet-stream' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 500);
}
function exportAllJson() {
  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k.indexOf('cm90.') === 0) data[k] = localStorage.getItem(k);
  }
  download('cm90-backup-' + todayStr() + '.json', JSON.stringify(data, null, 2), 'application/json');
}
function exportMarkdown() {
  var md = '# Critical Management 90 — Journal Export (' + todayStr() + ')\n\n';
  var QS = ['Problem?', 'Know?', 'Assuming?', 'Missing evidence?', 'Alternatives?', 'Prove wrong?', 'Consequences?'];
  md += '## Thinking Journal\n\n';
  store.get('journal', []).slice().sort(function(a, b) { return a.date.localeCompare(b.date); }).forEach(function(e) {
    md += '### ' + e.date + '\n';
    e.qs.forEach(function(q, i) { if (q) md += '- **' + QS[i] + '** ' + q + '\n'; });
    md += '\n';
  });
  md += '## Decision Journal\n\n';
  store.get('decisions', []).forEach(function(d) {
    md += '### ' + d.date + ' — ' + d.title + ' (conf ' + d.confidence + '%)\n';
    if (d.problem) md += '- Problem: ' + d.problem + '\n';
    if (d.expected) md += '- Expected: ' + d.expected + '\n';
    if (d.why) md += '- Why: ' + d.why + '\n';
    if (d.actual) md += '- **ผลจริง:** ' + d.actual + (d.learned ? ' · เรียนรู้: ' + d.learned : '') + '\n';
    md += '\n';
  });
  md += '## Rubric\n\n';
  store.get('rubric', []).forEach(function(r) {
    var max = (r.scores && r.scores.length >= 12) ? 60 : 50;
    md += '- ' + r.cp + ' (' + r.date + '): ' + r.total + '/' + max + (r.notes ? ' — ' + r.notes : '') + '\n';
  });
  download('cm90-journal-' + todayStr() + '.md', md, 'text/markdown');
}
function handleImport(input) {
  var f = input.files && input.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function() {
    try {
      var data = JSON.parse(r.result);
      var n = 0;
      Object.keys(data).forEach(function(k) { if (k.indexOf('cm90.') === 0) { localStorage.setItem(k, data[k]); n++; } });
      alert('นำเข้าเรียบร้อย (' + n + ' รายการ)');
      if (window.SYNC && SYNC.mode === 'server' && SYNC.pushState) {
        SYNC.pushState(); // นำเข้าแล้วดันข้อมูลชุดใหม่ขึ้นเซิร์ฟเวอร์ทันที
      }
      render();
    } catch (err) { alert('ไฟล์ไม่ถูกต้อง'); }
    input.value = '';
  };
  r.readAsText(f);
}
function resetAll() {
  if (!confirm('ล้างข้อมูลทั้งหมดของโปรแกรมนี้ (งาน, journal, decision, คะแนน)? ทำแล้วย้อนกลับไม่ได้')) return;
  if (!confirm('ยืนยันอีกครั้ง — ล้างจริงหรือ? (แนะนำดาวน์โหลดข้อมูลสำรองก่อน)')) return;
  var finish = function() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('cm90.') === 0) keys.push(k);
    }
    keys.forEach(function(k) { localStorage.removeItem(k); });
    if (window.SYNC) { SYNC.learner = null; SYNC.bootstrapped = false; SYNC.ready.then(function() { SYNC.ensureLearner(); render(); }); }
    render();
  };
  if (window.SYNC && SYNC.mode === 'server') {
    // ล้างเซิร์ฟเวอร์ก่อนเสมอ — ถ้าล้างไม่สำเร็จ ห้ามล้างเครื่อง ไม่งั้นข้อมูลจะ "ฟื้น" กลับมาตอนซิงก์
    SYNC.wipeServer().then(function(ok) {
      if (!ok) { alert('ล้างข้อมูลบนเซิร์ฟเวอร์ไม่สำเร็จ — ยังไม่ล้างข้อมูลของเครื่องนี้ ลองใหม่ภายหลัง'); return; }
      finish();
    });
    return;
  }
  finish();
}

/* ---------- global event delegation ---------- */
document.addEventListener('input', function(e) {
  var t = e.target;
  if (t.matches('[data-save]')) {
    var fields = store.get('fields', {});
    fields[t.dataset.save] = t.value;
    store.set('fields', fields);
    var f = t.closest('.field');
    if (f) { f.classList.add('saved'); clearTimeout(f._t); f._t = setTimeout(function() { f.classList.remove('saved'); }, 1200); }
    return;
  }
  if (t.matches('[data-mat-w]') || t.matches('[data-mat-s]')) { updateMatrix(t.closest('.matrix')); return; }
  if (t.matches('[data-rub]')) {
    var key = t.dataset.rub;
    RUB_CUR[key][+t.dataset.ri] = +t.value;
    updateRubDisplay(key);
    return;
  }
});
document.addEventListener('change', function(e) {
  var t = e.target;
  if (t.matches('[data-task]')) {
    var tasks = store.get('tasks', {});
    if (t.checked) tasks[t.dataset.task] = 1; else delete tasks[t.dataset.task];
    store.set('tasks', tasks);
    t.closest('.task').classList.toggle('done', t.checked);
    refreshProgressUI();
    return;
  }
  if (t.id === 'set-start') { store.set('settings.start', t.value); render(); return; }
  if (t.id === 'btn-use-learner') {
    var inp = document.getElementById('set-learner');
    var id = inp ? inp.value.trim() : '';
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) { alert('รหัสผู้เรียนไม่ถูกต้อง (8–64 ตัวอักษร: a-z A-Z 0-9 _ -)'); return; }
    if (!confirm('เปลี่ยนไปใช้รหัสผู้เรียนนี้? ข้อมูลเดิมของเบราว์เซอร์นี้จะถูกแทนที่ด้วยข้อมูลของรหัสดังกล่าวหลังโหลดหน้าใหม่')) return;
    localStorage.setItem('cm90.learner', id);
    localStorage.removeItem('cm90.lastSync');
    location.reload();
    return;
  }
  if (t.id === 'import-file') { handleImport(t); return; }
});
document.addEventListener('click', function(e) {
  var t = e.target;
  var el;
  if ((el = t.closest('.quiz-opt'))) { handleQuiz(el); return; }
  if ((el = t.closest('[data-week-done]'))) {
    var wd = store.get('weekDone', {});
    var k = el.dataset.weekDone;
    wd[k] = !wd[k];
    store.set('weekDone', wd);
    render();
    return;
  }
  if ((el = t.closest('[data-copy]'))) {
    var src = document.getElementById(el.dataset.copy);
    if (src) {
      if (navigator.clipboard) navigator.clipboard.writeText(src.textContent);
      el.textContent = 'คัดลอกแล้ว ✓';
      setTimeout(function() { el.textContent = 'คัดลอก'; }, 1500);
    }
    return;
  }
  if ((el = t.closest('[data-copy-ext]'))) {
    if (navigator.clipboard) navigator.clipboard.writeText(el.dataset.copyExt);
    el.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(function() { el.textContent = 'คัดลอกลิงก์'; }, 1500);
    return;
  }
  if (t.id === 'btn-save-journal') { saveJournal(); return; }
  if ((el = t.closest('[data-del-journal]'))) { deleteJournal(el.dataset.delJournal); return; }
  if (t.id === 'btn-save-dec') { saveDecision(); return; }
  if (t.id === 'btn-cancel-edit') { EDIT_DEC = null; render(); return; }
  if ((el = t.closest('[data-edit-dec]'))) { EDIT_DEC = el.dataset.editDec; render(); return; }
  if ((el = t.closest('[data-del-dec]'))) {
    if (confirm('ลบ decision รายการนี้?')) {
      store.set('decisions', store.get('decisions', []).filter(function(x) { return x.id !== el.dataset.delDec; }));
      render();
    }
    return;
  }
  if ((el = t.closest('[data-review-dec]'))) { reviewDecision(el.dataset.reviewDec); return; }
  if ((el = t.closest('[data-save-rubric]'))) { saveRubric(el.dataset.saveRubric); return; }
  if ((el = t.closest('[data-timer-start]'))) { startTimer(el.dataset.timerStart); return; }
  if (t.id === 'btn-export-json') { exportAllJson(); return; }
  if (t.id === 'btn-export-md') { exportMarkdown(); return; }
  if (t.id === 'btn-reset') { resetAll(); return; }
});
document.addEventListener('click', function(e) {
  if (e.target.id === 'menu-btn') document.getElementById('sidebar').classList.toggle('open');
  var a = e.target.closest && e.target.closest('a[href^="#/"]');
  if (a) {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    setTimeout(render, 0);
  }
});

/* ---------- routes + boot ---------- */
registerRoute('home', routeHome);
registerRoute('roadmap', routeRoadmap);
registerRoute('week', routeWeek);
registerRoute('journal', routeJournal);
registerRoute('decisions', routeDecisions);
registerRoute('assessment', routeAssessment);
registerRoute('reading', routeReading);
registerRoute('templates', routeTemplates);
registerRoute('guide', routeGuide);
registerRoute('resources', routeResources);

// เมื่อ sync bootstrap เสร็จ (อาจโหลดข้อมูลจากเซิร์ฟเวอร์มาแทน) ให้วาดใหม่ + ตามสถานะการซิงก์
if (window.SYNC) {
  SYNC.ready.then(function(adopted) { if (adopted) render(); });
  var _syncNavTimer = null;
  document.addEventListener('cm90-sync-status', function() {
    clearTimeout(_syncNavTimer);
    _syncNavTimer = setTimeout(function() { buildNav(parseHash()[0]); }, 400);
  });
}

render();
