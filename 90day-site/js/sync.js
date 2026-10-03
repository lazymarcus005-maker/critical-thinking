'use strict';
/* ===== cm90 sync: server-backed persistence (localStorage fallback) =====
   - โหมด server: หน้าเว็บถูกเสิร์ฟจาก backend (http/https + /api/health ตอบกลับ) —
     ข้อมูล cm90.* ทั้งหมดถูกดันขึ้น SQLite บนเซิร์ฟเวอร์ (debounce 1.2 วินาที) และดึงกลับตอนเปิดหน้า
   - โหมด local: เปิดจากไฟล์ตรง ๆ หรือเซิร์ฟเวอร์ไม่ตอบ — ทำงานแบบเดิม (localStorage ล้วน) */
(function () {
  var EXCLUDE = { 'cm90.learner': 1, 'cm90.lastSync': 1 };
  function isExcluded(k) { return !!EXCLUDE[k] || k.indexOf('cm90.conflictBackup.') === 0; }
  var SYNC = {
    mode: 'local',            // 'local' | 'server'
    status: 'idle',           // idle | saving | saved | error | conflict
    learner: null,
    version: 0,
    updatedAt: null,
    lastError: null,
    adopted: false,           // true เมื่อ bootstrap โหลดข้อมูลจากเซิร์ฟเวอร์มาแทนที่เครื่องนี้
    bootstrapped: false       // จริงเมื่อ bootstrap เสร็จ — ก่อนหน้านั้นห้าม schedulePush
  };
  window.SYNC = SYNC;

  function collectLocal() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('cm90.') !== 0 || isExcluded(k)) continue;
      data[k] = localStorage.getItem(k);
    }
    return data;
  }
  function hasLocalData() { return Object.keys(collectLocal()).length > 0; }

  // ก่อนทับ/ลบข้อมูลเครื่องด้วยข้อมูลเซิร์ฟเวอร์ — เก็บสำเนาไว้กู้คืนได้เสมอ (conflict backup)
  function stashBeforeAdopt() {
    try {
      var ts = new Date().toISOString().replace(/[:.]/g, '-');
      var stash = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf('cm90.') !== 0 || isExcluded(k)) continue;
        stash[k] = localStorage.getItem(k);
      }
      if (Object.keys(stash).length) {
        localStorage.setItem('cm90.conflictBackup.' + ts, JSON.stringify(stash));
        SYNC.lastBackup = 'cm90.conflictBackup.' + ts;
      }
    } catch (e) {}
  }

  function adoptServer(data) {
    stashBeforeAdopt();
    var keep = {};
    Object.keys(data).forEach(function (k) { keep[k] = 1; });
    var remove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('cm90.') === 0 && !isExcluded(k) && !keep[k]) remove.push(k);
    }
    remove.forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(data).forEach(function (k) { localStorage.setItem(k, data[k]); });
  }
  function markSynced(j) {
    SYNC.version = j.version;
    SYNC.updatedAt = j.updated_at;
    try { localStorage.setItem('cm90.lastSync', j.updated_at); } catch (e) {}
  }
  function notify() { try { document.dispatchEvent(new CustomEvent('cm90-sync-status')); } catch (e) {} }
  function renderSoon() { try { if (typeof window.render === 'function') window.render(); } catch (e) {} }

  var pushTimer = null;
  function schedulePush() {
    if (SYNC.mode !== 'server' || !SYNC.bootstrapped || !SYNC.learner) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushState, 1200);
  }
  function pushState() {
    if (SYNC.mode !== 'server' || !SYNC.learner) return Promise.resolve(false);
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    SYNC.status = 'saving'; notify();
    var payload = { data: collectLocal(), baseVersion: SYNC.version || undefined };
    return fetch('/api/state?learner=' + encodeURIComponent(SYNC.learner), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.status === 409) return r.json().then(pullConflict);
      if (!r.ok) throw new Error('push failed (' + r.status + ')');
      return r.json();
    }).then(function (j) {
      if (!j) return true;
      markSynced(j);
      SYNC.status = 'saved'; SYNC.lastError = null; notify();
      return true;
    }).catch(function (e) {
      SYNC.status = 'error'; SYNC.lastError = e && e.message; notify();
      return false;
    });
  }
  function pullConflict() {
    return fetch('/api/state?learner=' + encodeURIComponent(SYNC.learner)).then(function (r) { return r.json(); }).then(function (remote) {
      if (remote && remote.data) {
        adoptServer(remote.data);
        markSynced(remote);
      }
      SYNC.status = 'conflict';
      SYNC.lastError = 'ข้อมูลถูกแก้ไขจากเครื่องอื่น — โหลดเวอร์ชันล่าสุดจากเซิร์ฟเวอร์แล้ว (ข้อมูลชุดเดิมของเครื่องนี้ถูกเก็บสำรองไว้ที่ ' + (SYNC.lastBackup || 'localStorage') + ')';
      notify(); renderSoon();
      return true;
    });
  }
  function bootstrapState() {
    return fetch('/api/state?learner=' + encodeURIComponent(SYNC.learner)).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('state fetch failed');
      return r.json();
    }).then(function (remote) {
      if (remote && remote.data) {
        var lastSync = localStorage.getItem('cm90.lastSync');
        if (!hasLocalData() || (lastSync && remote.updated_at > lastSync)) {
          adoptServer(remote.data);
          markSynced(remote);
          SYNC.adopted = true;
        } else if (!lastSync || lastSync > remote.updated_at) {
          return pushState(); // เครื่องนี้มีข้อมูล offline ที่ใหม่กว่า — ดันขึ้นเซิร์ฟเวอร์
        } else {
          markSynced(remote);
        }
        return true;
      }
      return pushState(); // เซิร์ฟเวอร์ยังว่าง — อัปโหลดสิ่งที่มี (อาจเป็น {} ก็ได้)
    });
  }

  function flush() {
    if (SYNC.mode !== 'server' || !SYNC.learner) return;
    try {
      var payload = JSON.stringify({ data: collectLocal(), baseVersion: SYNC.version || undefined });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/state?learner=' + encodeURIComponent(SYNC.learner), new Blob([payload], { type: 'application/json' }));
      }
    } catch (e) {}
  }

  function ensureLearner() {
    var l = localStorage.getItem('cm90.learner');
    if (!l) {
      l = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem('cm90.learner', l); } catch (e) {}
    }
    SYNC.learner = l;
  }
  SYNC.ensureLearner = ensureLearner;

  function init() {
    ensureLearner();
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return Promise.resolve(false);
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, 2500);
    return fetch('/api/health', { signal: ctl.signal }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('health not ok');
      return r.json();
    }).then(function (j) {
      if (!j || !j.ok) throw new Error('health not ok');
      SYNC.mode = 'server';
      return bootstrapState();
    }).then(function (result) {
      SYNC.bootstrapped = true;
      return result;
    }).catch(function () {
      clearTimeout(t);
      SYNC.mode = 'local';
      SYNC.bootstrapped = true;
      return false;
    });
  }

  // patch store ให้ดันขึ้นเซิร์ฟเวอร์อัตโนมัติทุกครั้งที่ข้อมูลเปลี่ยน
  if (window.store) {
    var _set = store.set, _del = store.del;
    store.set = function (k, v) { _set(k, v); schedulePush(); };
    store.del = function (k) { _del(k); schedulePush(); };
  }

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);

  SYNC.ready = init();
  SYNC.pushState = pushState;
  SYNC.flushNow = flush;
  SYNC.wipeServer = function () {
    if (SYNC.mode !== 'server') return Promise.resolve(false);
    return fetch('/api/state?learner=' + encodeURIComponent(SYNC.learner), { method: 'DELETE' }).then(function (r) { return r.ok; }).catch(function () { return false; });
  };
})();
