/* Study pack player: every view is driven by the loaded pack.
   StudyPlayer.start(pack, opts) — opts: { packs:[entry], loadPack(id), remote, preview:{onExit}, analytics } */
const StudyPlayer = (() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = escHtml;
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const pct = v => Math.round(v * 100) + "%";
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const plain = s => String(s).replace(/\$([^$]*)\$/g, (m, g) => g.replace(/\\hat\\beta/g, "β̂").replace(/\\Omega/g, "Ω").replace(/\\sigma/g, "σ").replace(/\\mid/g, "|").replace(/\\operatorname\{([^}]*)\}/g, "$1").replace(/\^2/g, "²").replace(/\\[a-zA-Z]+/g, "").replace(/[{}_]/g, "")).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard" };
  const DW = { 1: 1, 2: 1.3, 3: 1.6 };

  /* ---------- pack state ---------- */
  let PACK = null, OPTS = {}, active = false, booted = false;
  let SECS = [], SEC = {}, QS = [], QM = {}, TAG2SEC = {}, EXAM = {}, MARKUP = "md";
  const rich_ = s => rich(s, MARKUP);
  const inl_ = s => richInline(s, MARKUP);
  const bySec = id => QS.filter(q => q.sec === id);
  const secName = id => (SEC[id] ? SEC[id].name : id);
  const secShort = id => (SEC[id] ? SEC[id].short : id);
  const scls = id => "sc-" + (SEC[id] ? SEC[id].ci : 0);

  function normalizePack(p) {
    if (!p || !Array.isArray(p.questions) || !Array.isArray(p.sections)) throw new Error("This file isn't a study pack.");
    const pack = Object.assign({ markup: "md", tags: {}, learn: {}, resources: {} }, p);
    pack.id = String(pack.id || "pack").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    pack.sections = pack.sections.map((s, i) => ({ id: String(s.id).replace(/[^a-z0-9]/gi, "") || "s" + i, short: s.short || "S" + (i + 1), name: s.name || "Section " + (i + 1), combined: !!s.combined, ci: i % 8 }));
    const ids = new Set(pack.sections.map(s => s.id));
    pack.questions = pack.questions.filter(q => q && ids.has(String(q.sec)) && Array.isArray(q.o) && q.o.length >= 2 && Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length)
      .map((q, i) => Object.assign({}, q, { id: String(q.id || "q" + i), d: [1, 2, 3].includes(q.d) ? q.d : 2, t: q.t || "general", v: Array.isArray(q.v) ? q.v.filter(v => v && Array.isArray(v.o) && Number.isInteger(v.a) && v.a < v.o.length) : [] }));
    if (!pack.exam || !pack.exam.perSection) {
      const total = (pack.exam && pack.exam.total) || 20, n = pack.sections.length, per = {};
      pack.sections.forEach((s, i) => { per[s.id] = Math.floor(total / n) + (i < total % n ? 1 : 0); });
      pack.exam = Object.assign({ total, note: `${total} multiple-choice questions` }, pack.exam || {}, { perSection: per });
    }
    return pack;
  }
  function loadPackState(p) {
    PACK = p; MARKUP = p.markup === "html" ? "html" : "md";
    SECS = p.sections; SEC = Object.fromEntries(SECS.map(s => [s.id, s]));
    QS = p.questions; QM = Object.fromEntries(QS.map(q => [q.id, q]));
    EXAM = p.exam.perSection;
    TAG2SEC = {};
    Object.entries(p.learn || {}).forEach(([sid, L]) => (L.topics || []).forEach(tp => (tp.tags || []).forEach(t => { const k = sid + ":" + t; if (!TAG2SEC[k]) TAG2SEC[k] = { sec: sid, topic: tp.id, title: tp.title }; })));
    window.PACK_RES = p.resources || {};
  }
  const tagLabel = t => (PACK.tags && PACK.tags[t]) || String(t).replace(/[-_]/g, " ");
  const secFor = q => TAG2SEC[q.sec + ":" + q.t];

  /* ---------- storage ---------- */
  const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const freshP = () => ({ v: 1, q: {}, sessions: [], mocks: [], days: {}, updatedAt: 0 });
  const LS_S = "econprep.settings.v1";
  const DEF = { sfx: true, sfxVol: 0.6, musicVol: 0.35, station: "pads", shuffle: true, fresh: false, size: "10", order: "smart", theme: "", dsems: null, mockTimer: 0, mockFresh: true, lastPack: "" };
  let ST = Object.assign({}, DEF, lsGet(LS_S) || {});
  const saveST = () => lsSet(LS_S, ST);
  let P = freshP(), LS_P = "";
  const remote = { ref: null, db: null, uid: null, on: false, writing: false, again: false, timer: null, retried: false };

  function merge(a, b) {
    const out = freshP();
    const ids = new Set([...Object.keys(a.q || {}), ...Object.keys(b.q || {})]);
    ids.forEach(id => { const x = (a.q || {})[id], y = (b.q || {})[id]; out.q[id] = !x ? y : !y ? x : ((y.t || 0) > (x.t || 0) ? y : x); });
    const ss = new Map(); [...(a.sessions || []), ...(b.sessions || [])].forEach(s => ss.set(s.id, s)); out.sessions = [...ss.values()].sort((m, n) => m.t - n.t).slice(-150);
    const mk = new Map(); [...(a.mocks || []), ...(b.mocks || [])].forEach(s => mk.set(s.id, s)); out.mocks = [...mk.values()].sort((m, n) => m.t - n.t).slice(-40);
    const days = Object.assign({}, a.days || {}); Object.entries(b.days || {}).forEach(([d, v]) => { if (!days[d] || (v.n || 0) > (days[d].n || 0)) days[d] = v; }); out.days = days;
    out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return out;
  }
  function openProgress() {
    LS_P = OPTS.preview ? `studypack.preview.${PACK.id}` : (PACK.storage && PACK.storage.local) || `studypack.progress.${PACK.id}`;
    P = Object.assign(freshP(), lsGet(LS_P) || {});
    remote.ref = null; remote.on = false;
    if (OPTS.remote && !OPTS.preview) connectRemote();
  }
  async function connectRemote() {
    try {
      if (!remote.db) {
        if (!window.claude || typeof window.claude.use !== "function") return;
        const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
        if (!db || !user) return;
        remote.uid = await user.id(); if (!remote.uid) return; remote.db = db;
      }
      const docName = (PACK.storage && PACK.storage.remote) || `progress-${PACK.id}`;
      const ref = remote.db.doc("data/users/" + remote.uid + "/" + docName); remote.ref = ref;
      const snap = await ref.get();
      if (remote.ref !== ref) return;
      if (snap.exists) { P = merge(P, snap.data() || {}); lsSet(LS_P, P); }
      remote.on = true; syncBadge(); updateFixCount();
      if (Object.keys(P.q).length) scheduleRemote();
      if (active && route().r !== "play") render();
    } catch (e) { remote.on = false; syncBadge(); }
  }
  function scheduleRemote() { if (!remote.ref) return; clearTimeout(remote.timer); remote.timer = setTimeout(flushRemote, 1500); }
  async function flushRemote() {
    if (!remote.ref) return;
    if (remote.writing) { remote.again = true; return; }
    remote.writing = true;
    try { await remote.ref.set(JSON.parse(JSON.stringify(P))); remote.on = true; remote.retried = false; }
    catch (e) {
      const code = e && e.code;
      if (code === "unavailable" && !remote.retried) { remote.retried = true; setTimeout(scheduleRemote, 2000 + Math.random() * 2000); }
      else if (code === "invalid_argument" || code === "revoked" || code === "not_granted") { remote.on = false; remote.ref = null; }
      else if (code === "quota_exceeded") toast("Couldn't sync: the progress store is full. Progress is still saved on this device.");
    }
    remote.writing = false; syncBadge();
    if (remote.again) { remote.again = false; scheduleRemote(); }
  }
  function persist() { P.updatedAt = Date.now(); lsSet(LS_P, P); scheduleRemote(); }
  function syncBadge() { $$(".sync").forEach(el => { el.classList.toggle("on", remote.on); const s = el.querySelector("span"); if (s) s.textContent = OPTS.preview ? "Preview: progress kept separately" : remote.on ? "Synced to your account" : "Saved on this device"; }); }

  /* ---------- stats ---------- */
  const rec = id => P.q[id] || (P.q[id] = { a: 0, c: 0, s: 0, t: 0, l: 0, w: 0, fx: 0, fs: 0 });
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function record(id, ok) {
    const r = rec(id); r.a++; if (ok) r.c++; r.t = Date.now(); r.l = ok ? 1 : 0;
    r.s = ok ? (r.s || 0) + (1 - (r.s || 0)) * 0.6 : (r.s || 0) * 0.3;
    let cleared = false;
    if (!ok) { r.fx = 1; r.fs = 0; r.w = (r.w || 0) + 1; }
    else if (r.fx) { r.fs = (r.fs || 0) + 1; if (r.fs >= 2) { r.fx = 0; r.fs = 0; cleared = true; } }
    const k = dayKey(); const dd = P.days[k] || (P.days[k] = { n: 0, c: 0 }); dd.n++; if (ok) dd.c++;
    const keys = Object.keys(P.days).sort(); while (keys.length > 60) delete P.days[keys.shift()];
    persist(); updateFixCount();
    return cleared;
  }
  function secStats(sid) {
    let w = 0, ws = 0, seen = 0, att = 0, cor = 0; const qs = bySec(sid);
    qs.forEach(q => { const r = P.q[q.id]; w += DW[q.d]; if (r && r.a) { seen++; att += r.a; cor += r.c; ws += DW[q.d] * (r.s || 0); } });
    return { total: qs.length, seen, att, cor, acc: att ? cor / att : null, mastery: w ? ws / w : 0 };
  }
  const level = m => m >= 0.88 ? "Exam-ready" : m >= 0.7 ? "Strong" : m >= 0.45 ? "Getting solid" : m >= 0.2 ? "Warming up" : "Just starting";
  function readiness() { let tw = 0, s = 0; SECS.forEach(sec => { const w = EXAM[sec.id] || 0; if (!w || !bySec(sec.id).length) return; tw += w; s += w * secStats(sec.id).mastery; }); return tw ? s / tw : 0; }
  const fixIds = () => QS.filter(q => P.q[q.id] && P.q[q.id].fx).map(q => q.id);
  function totals() { let att = 0, cor = 0, seen = 0; QS.forEach(q => { const r = P.q[q.id]; if (r && r.a) { seen++; att += r.a; cor += r.c; } }); return { att, cor, seen, acc: att ? cor / att : null }; }
  function updateFixCount() { const n = PACK ? fixIds().length : 0; $$(".nav-count").forEach(el => { el.textContent = n; el.hidden = n === 0; }); }

  /* ---------- analytics (GoatCounter, only where the script is on the page) ---------- */
  function track(path, title, event) {
    if (OPTS.preview) return;
    let tries = 0;
    const send = () => {
      const gc = window.goatcounter;
      if (gc && typeof gc.count === "function") { try { gc.count({ path, title: title || path, event: !!event }); } catch (e) { } }
      else if (document.querySelector("script[data-goatcounter]") && tries++ < 40) setTimeout(send, 250);
    };
    send();
  }
  const VIEW_PATH = { home: "home", learn: "learn", ex: "exercises", diff: "difficulty", mock: "mock-exam", fix: "fix-it", progress: "progress", packs: "subjects" };
  function trackView() {
    const { r, a } = route(); if (!VIEW_PATH[r] || !PACK) return;
    const path = r === "packs" ? "/subjects" : `/${PACK.id}/${VIEW_PATH[r]}${r === "learn" && a ? "/" + a : ""}`;
    track(path, r === "learn" && a && SEC[a] ? `${PACK.title} · Learn ${SEC[a].short}` : `${PACK.title} · ${VIEW_PATH[r]}`);
  }

  /* ---------- quiz engine ---------- */
  let S = null, timerInt = null;
  const isNumOpt = o => /^\$-?[\d.,]+\$$/.test(String(o).trim()) || /^-?[\d.,]+%?$/.test(String(o).trim());
  const numOf = o => parseFloat(String(o).replace(/[$,%]/g, ""));
  function buildInstance(q, fresh) {
    let base = { q: q.q, o: q.o.slice(), a: q.a, x: q.x, fresh: false };
    if (fresh && q.v && q.v.length) { const v = pickOne(q.v); base = { q: v.q, o: v.o.slice(), a: v.a, x: v.x || q.x, fresh: true }; }
    let order = base.o.map((_, i) => i);
    if (base.o.every(isNumOpt) && (ST.shuffle || base.fresh)) order.sort((i, j) => numOf(base.o[i]) - numOf(base.o[j]));
    else if (ST.shuffle || base.fresh) order = shuffle(order);
    return { id: q.id, q: base.q, o: order.map(i => base.o[i]), a: order.indexOf(base.a), x: base.x, fresh: base.fresh };
  }
  function orderIds(ids, order) {
    if (order === "bank") { const si = Object.fromEntries(SECS.map((s, i) => [s.id, i])); return ids.slice().sort((a, b) => si[QM[a].sec] - si[QM[b].sec] || (QM[a].n || 0) - (QM[b].n || 0)); }
    if (order === "random") return shuffle(ids);
    const sc = id => { const r = P.q[id]; let v = Math.random() * 0.8; if (!r || !r.a) v += 2; else { v += (1 - (r.s || 0)) * 2; if (r.fx) v += 3; } return v; };
    return ids.map(id => [id, sc(id)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }
  function startSession(o) {
    let ids = orderIds(o.ids.filter(id => QM[id]), o.order || ST.order);
    const size = o.size || ST.size;
    if (!o.keepAll && size !== "all") ids = ids.slice(0, +size);
    if (!ids.length) { toast("No questions match these settings."); return; }
    const fresh = o.fresh != null ? o.fresh : ST.fresh;
    S = { mode: o.mode, title: o.title, back: o.back || "#ex", ids, i: 0, inst: ids.map(id => buildInstance(QM[id], fresh)), ans: [], mock: !!o.mock, start: Date.now(), timerEnd: o.timer ? Date.now() + o.timer * 60000 : null, done: false, id: "s" + Date.now().toString(36) };
    track(`/${PACK.id}/start/${o.mode}${o.tag ? "/" + o.tag : ""}`, `Started: ${o.title}`, true);
    if (location.hash === "#play") render(); else location.hash = "#play";
    window.scrollTo(0, 0);
    if (S.timerEnd) { clearInterval(timerInt); timerInt = setInterval(tickTimer, 1000); }
  }
  function tickTimer() {
    if (!S || !S.timerEnd || S.done || !active) { clearInterval(timerInt); return; }
    const left = Math.max(0, S.timerEnd - Date.now()), el = $(".timer");
    if (el) { el.textContent = fmtTime(left); el.classList.toggle("low", left < 5 * 60000); }
    if (left <= 0) { clearInterval(timerInt); toast("Time's up! Your exam was submitted."); submitMock(); }
  }
  const fmtTime = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function choose(k) {
    if (!S || S.done) return;
    const it = S.inst[S.i]; if (k >= it.o.length) return;
    if (S.mock) { S.ans[S.i] = { pick: k }; if (ST.sfx) Sound.tap(); render(); return; }
    if (S.ans[S.i]) return;
    const ok = k === it.a; S.ans[S.i] = { pick: k, ok };
    const cleared = record(it.id, ok);
    if (ST.sfx) ok ? Sound.correct() : Sound.wrong();
    render();
    const btn = $(`.opt[data-k="${k}"]`);
    if (btn) { if (ok) pops(btn); else btn.classList.add("shake"); }
    if (cleared) toast("Cleared from your Fix-it deck");
    const fb = $(".feedback"); if (fb && fb.getBoundingClientRect().bottom > window.innerHeight) fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function next() {
    if (!S) return;
    if (S.mock) { if (S.i < S.ids.length - 1) { S.i++; render(); window.scrollTo(0, 0); } return; }
    if (!S.ans[S.i]) return;
    if (S.i < S.ids.length - 1) { S.i++; render(); window.scrollTo(0, 0); } else finishSession();
  }
  function finishSession() {
    if (!S || S.done) return;
    S.done = true; const n = S.ans.filter(Boolean).length, c = S.ans.filter(a => a && a.ok).length;
    if (n) { P.sessions.push({ id: S.id, t: Date.now(), mode: S.mode, title: S.title, n, c }); P.sessions = P.sessions.slice(-150); persist(); track(`/${PACK.id}/finish/${S.mode}`, `Finished: ${S.title}`, true); }
    if (ST.sfx && n) Sound.done();
    render(); window.scrollTo(0, 0);
  }
  function submitMock() {
    if (!S || !S.mock || S.done) return;
    clearInterval(timerInt);
    S.inst.forEach((it, i) => { const a = S.ans[i]; if (a) { a.ok = a.pick === it.a; record(it.id, a.ok); } else { S.ans[i] = { pick: null, ok: false }; record(it.id, false); } });
    const by = {}; S.inst.forEach((it, i) => { const s = QM[it.id].sec; by[s] = by[s] || [0, 0]; by[s][1]++; if (S.ans[i].ok) by[s][0]++; });
    const c = S.ans.filter(a => a.ok).length, N = S.ids.length;
    P.mocks.push({ id: S.id, t: Date.now(), n: N, c, by, mins: Math.round((Date.now() - S.start) / 60000) }); P.mocks = P.mocks.slice(-40);
    P.sessions.push({ id: S.id, t: Date.now(), mode: "mock", title: S.title, n: N, c }); P.sessions = P.sessions.slice(-150);
    persist(); S.done = true; if (ST.sfx) Sound.done(); render(); window.scrollTo(0, 0);
    const r = c / N, band = r === 1 ? "100" : r >= 0.9 ? "90-99" : r >= 0.75 ? "75-89" : r >= 0.55 ? "55-74" : "0-54";
    track(`/${PACK.id}/mock-score/${band}`, `Mock exam score ${band}%`, true);
  }
  function buildMock() {
    const ids = [];
    SECS.forEach(sec => {
      const k = EXAM[sec.id] || 0; if (!k) return;
      const pool = shuffle(bySec(sec.id).filter(q => !q.flag)), used = new Set(), pick = [];
      for (const q of pool) { if (pick.length >= k) break; if (!used.has(q.t)) { pick.push(q.id); used.add(q.t); } }
      for (const q of pool) { if (pick.length >= k) break; if (!pick.includes(q.id)) pick.push(q.id); }
      ids.push(...pick);
    });
    return ids;
  }

  /* ---------- UI pieces ---------- */
  const ICON = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" style="fill:currentColor"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5h6v2.5H9z"/><path d="m8.5 13 2.2 2.2L15.5 10.5"/>',
    fix: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    vol: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" style="fill:currentColor"/>',
    play: '<path d="M7 4.5v15l12-7.5z" style="fill:currentColor"/>', pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" style="fill:currentColor"/>',
    rain: '<path d="M7 15a4.5 4.5 0 1 1 1.4-8.8A5.5 5.5 0 0 1 19 8.5 3.5 3.5 0 0 1 18 15z"/><path d="m8 18-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
    wave: '<path d="M2 12c2.5-5 4.5-5 7 0s4.5 5 7 0 4.5-5 6 0"/>', keys: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v8M12 5v8M16 5v8"/>', noise: '<path d="M3 12h2l2-6 3 12 3-9 2 6 2-3h4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="m6 6 12 12M18 6 6 18"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" style="fill:currentColor"/><circle cx="15" cy="15" r="1.2" style="fill:currentColor"/><circle cx="15" cy="9" r="1.2" style="fill:currentColor"/><circle cx="9" cy="15" r="1.2" style="fill:currentColor"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>', file: '<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3v6h6"/>',
  };
  const ic = (n, cls = "", st = "") => `<svg class="${cls}" ${st ? `style="${st}"` : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  const secBadge = sid => `<span class="badge sem ${scls(sid)}"><span class="bub">${esc(secShort(sid))}</span>${esc(secName(sid))}</span>`;
  const diffBadge = d => `<span class="badge diff d${d}"><span class="pips"><i></i><i></i><i></i></span>${DIFF[d]}</span>`;
  const secNum = sid => `<span class="semnum ${scls(sid)}">${esc(secShort(sid))}</span>`;
  function ring(v, sub) {
    const r = 50, C = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${pct(v)} ${sub}"><circle class="trk" cx="60" cy="60" r="${r}" fill="none" stroke-width="12"/><circle class="val" cx="60" cy="60" r="${r}" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - v)}" transform="rotate(-90 60 60)"/><text x="60" y="62" text-anchor="middle" font-size="26">${pct(v)}</text><text class="sub" x="60" y="82" text-anchor="middle" font-size="10.5">${sub}</text></svg>`;
  }
  function snippet(s) {
    let t = String(s).replace(/<div class="tbl-wrap">[\s\S]*?<\/table><\/div>/g, " [table] ").replace(/\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}/g, "[\\cdots]").replace(/\$\$[\s\S]*?\$\$/g, " … ");
    if (MARKUP === "md") t = t.split(/\r?\n/).filter(l => !/^\s*\|/.test(l) && !/^\s*:::/.test(l)).join(" ");
    return sanitize(T(t.replace(/</g, "&lt;")));
  }
  const meter = (v, sid) => `<div class="meter ${sid ? scls(sid) : ""}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
  function toast(msg) { const w = $(".toast-wrap"); if (!w) return; const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; w.appendChild(t); setTimeout(() => t.remove(), 2600); }
  function pops(btn) {
    const cols = ["var(--good)", "var(--sun)", "var(--accent)", "var(--c-s4)", "var(--c-s0)"];
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("span"); p.className = "pop"; const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4, d = 40 + Math.random() * 40;
      p.style.cssText = `left:18px;top:50%;background:${cols[i % cols.length]};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d}px`;
      btn.appendChild(p); setTimeout(() => p.remove(), 750);
    }
  }
  const chip = (act, val, label, on, extra = "") => `<button type="button" class="chip${on ? " on" : ""}" data-act="${act}" data-v="${esc(val)}" ${extra}>${label}</button>`;

  /* ---------- routing ---------- */
  function route() { const h = (location.hash || "#home").slice(1); const parts = h.split("-"); return { r: parts[0] || "home", a: parts[1] || "", s: parts.slice(2).join("-") }; }
  const NAV = [["home", "Home", "home"], ["learn", "Learn", "book"], ["ex", "Exercises", "target"], ["diff", "By difficulty", "layers"], ["mock", "Mock exam", "clip"], ["fix", "Fix-it", "fix"], ["progress", "Progress", "chart"]];
  const MOBILE_NAV = ["home", "learn", "ex", "fix", "progress"];
  function buildNav() {
    const item = ([r, label, icon]) => `<a class="nav-i" href="#${r}" data-nav="${r}">${ic(icon)}<span>${label}</span>${r === "fix" ? '<span class="nav-count" hidden>0</span>' : ""}</a>`;
    $(".nav").innerHTML = NAV.map(item).join("");
    $(".tabbar").innerHTML = NAV.filter(n => MOBILE_NAV.includes(n[0])).map(n => item(n[0] === "ex" ? [n[0], "Practice", n[2]] : n)).join("");
  }
  function packSlot() {
    const slot = $(".packslot"); if (!slot) return;
    if (OPTS.preview) { slot.innerHTML = `<div class="banner" style="padding:8px 12px"><span class="small"><b>Preview</b></span><button type="button" class="btn sm ghost" data-act="exit-preview">Back to editor</button></div>`; return; }
    const many = (OPTS.packs || []).length > 1 || OPTS.allowFile;
    slot.innerHTML = `<button type="button" class="packswitch" ${many ? 'data-act="go-packs"' : "disabled"} title="${many ? "Change subject" : ""}">${ic("book", "", "width:20px;height:20px;flex:none;color:var(--accent-strong)")}<span class="pk"><b>${esc(PACK.title)}</b><span>${QS.length} questions${many ? " · change subject" : ""}</span></span></button>`;
  }
  function render() {
    if (!active || !PACK) return;
    const { r, a, s } = route(); const v = $("#view");
    const navKey = r === "play" ? (S && S.mock ? "mock" : S && S.mode === "fix" ? "fix" : S && S.mode === "diff" ? "diff" : "ex") : r;
    $$("[data-nav]").forEach(el => el.classList.toggle("on", el.dataset.nav === navKey || ((navKey === "diff" || navKey === "mock") && el.dataset.nav === "ex" && !!el.closest(".tabbar"))));
    let html = "";
    if (r === "learn") html = a && SEC[a] ? vLearn(a) : vLearnIndex();
    else if (r === "ex") html = vEx();
    else if (r === "diff") html = vDiff();
    else if (r === "mock") html = vMock();
    else if (r === "fix") html = vFix();
    else if (r === "progress") html = vProgress();
    else if (r === "packs") html = vPacks();
    else if (r === "play") html = S ? (S.done ? vSummary() : vPlay()) : vEx();
    else html = vHome();
    if (OPTS.preview) html = `<div class="banner"><span>You're previewing <b>${esc(PACK.title)}</b> exactly as students will see it. Progress here is kept separately.</span><button type="button" class="btn sm" data-act="exit-preview">${ic("back")}Back to editor</button></div>` + html;
    v.innerHTML = html;
    typeset(v);
    $$("[data-w]", v).forEach(el => { const fn = typeof WIDGETS !== "undefined" && WIDGETS[el.dataset.w]; const body = el.querySelector(".wbody"); if (fn && body) { try { fn(body, el); } catch (e) { body.textContent = "This visual couldn't load."; } } else el.remove(); });
    if (r === "learn" && a && s) { const t = document.getElementById("sec-" + s); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
    updateFixCount(); syncBadge(); packSlot();
  }
  function onHash() { if (!active) return; render(); trackView(); const { r, s } = route(); if (!(r === "learn" && s)) window.scrollTo(0, 0); }

  /* ---------- views ---------- */
  function vHome() {
    const rd = readiness(), tt = totals(), fx = fixIds().length, best = P.mocks.length ? P.mocks.reduce((b, m) => (m.c / m.n > b.c / b.n ? m : b)) : null;
    const st = SECS.map(s => ({ s, ...secStats(s.id) })).filter(x => x.total);
    const steps = [];
    if (fx) steps.push({ i: "fix", t: `Clear your Fix-it deck (${fx})`, d: "Questions you missed. Answer each correctly twice in a row to clear it.", act: "start-fix", sec: "" });
    if (!tt.seen && st[0]) steps.push({ i: "book", t: `Start with ${st[0].s.short} · ${st[0].s.name}`, d: "Read the theory first, then do the first exercises.", href: `#learn-${st[0].s.id}`, sec: st[0].s.id });
    const weak = st.filter(x => x.seen).sort((a, b) => a.mastery - b.mastery)[0];
    if (weak && weak.mastery < 0.88) steps.push({ i: "target", t: `Strengthen ${weak.s.short} · ${weak.s.name}`, d: `Mastery ${pct(weak.mastery)}. A smart session puts your weakest and unseen questions first.`, act: "start-sec", sec: weak.s.id });
    const fresh = st.find(x => x.seen < x.total && x.s.id !== (weak && weak.s.id));
    if (fresh && steps.length < 3) steps.push({ i: "spark", t: `New ground: ${fresh.total - fresh.seen} untried in ${fresh.s.short}`, d: `${fresh.s.name}. ${fresh.seen ? "Keep going." : "Read the Learn page first, then practise."}`, act: fresh.seen ? "start-sec" : "", href: fresh.seen ? "" : `#learn-${fresh.s.id}`, sec: fresh.s.id });
    if (tt.seen >= QS.length * 0.5 && steps.length < 4) steps.push({ i: "clip", t: "Take a mock exam", d: `${PACK.exam.total} questions in the exam format, with no feedback until you submit.`, href: "#mock", sec: "" });
    const stepHTML = steps.slice(0, 4).map(x => {
      const inner = `<span class="ic ${x.sec ? scls(x.sec) : ""}">${ic(x.i)}</span><span><b>${esc(x.t)}</b><span>${esc(x.d)}</span></span>`;
      return x.act ? `<button type="button" class="step-item" data-act="${x.act}" data-sec="${x.sec}">${inner}</button>` : `<a class="step-item" href="${x.href}" style="text-decoration:none;color:inherit">${inner}</a>`;
    }).join("");
    const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    return `<header class="pagehead"><span class="eyebrow">${esc(PACK.title)}${PACK.subtitle ? " · " + esc(PACK.subtitle) : ""}</span><h1>${greet}. Let's aim for 100.</h1>
      <p>Every question here comes from the question bank (${QS.length} questions). ${esc(PACK.exam.note || "")} Learn the method, then drill until it's automatic.</p></header>
      <section class="card hero">${ring(rd, "readiness")}<div class="stack"><div><div class="eyebrow">Exam readiness</div><h2>${level(rd)}</h2></div>
        <p class="ink2 small">Your mastery across sections, weighted like the exam. Mastery grows with correct answers and fades with misses.</p>
        <div class="grid three"><div class="tile"><span class="v tabnum">${tt.seen}<span class="small muted">/${QS.length}</span></span><span class="l">questions tried</span></div><div class="tile"><span class="v">${tt.acc == null ? "—" : pct(tt.acc)}</span><span class="l">accuracy</span></div><div class="tile"><span class="v">${best ? best.c + "/" + best.n : "—"}</span><span class="l">best mock exam</span></div></div></div></section>
      <section class="card stack"><h3>Next best steps</h3><div class="next-steps">${stepHTML || '<p class="muted">You\'re all caught up. Take a mock exam!</p>'}</div></section>
      <section class="stack"><div class="row between"><h3>Your sections</h3><a class="btn sm ghost" href="#progress">Full progress</a></div>
      <div class="grid">${st.map(x => `<div class="card semcard ${scls(x.s.id)}"><div class="top">${secNum(x.s.id)}<div><h3>${esc(x.s.name)}</h3><div class="lvl">${level(x.mastery)} · ${pct(x.mastery)}</div></div></div>${meter(x.mastery, x.s.id)}<div class="meta"><span>${x.seen}/${x.total} tried</span><span>${x.acc == null ? "no answers yet" : pct(x.acc) + " correct"}</span></div><div class="row">${PACK.learn[x.s.id] ? `<a class="btn sm ghost" href="#learn-${x.s.id}">${ic("book")}Learn</a>` : ""}<button type="button" class="btn sm" data-act="start-sec" data-sec="${x.s.id}">${ic("target")}Practice</button></div></div>`).join("")}</div></section>`;
  }
  function vLearnIndex() {
    const withNotes = SECS.filter(s => PACK.learn[s.id]);
    if (!withNotes.length) return `<header class="pagehead"><span class="eyebrow">Learn</span><h1>No study notes in this pack</h1><p>This pack only has questions. Head to the exercises.</p></header><a class="btn" href="#ex">Go to exercises</a>`;
    return `<header class="pagehead"><span class="eyebrow">Learn</span><h1>Theory, built from the question bank</h1><p>Each page teaches only what the bank tests: a picture to hang the idea on, worked examples, the traps the wrong options are built from, and a formula sheet.</p></header>
      <div class="grid two">${withNotes.map(s => { const L = PACK.learn[s.id], n = bySec(s.id).length; return `<div class="card semcard ${scls(s.id)}"><div class="top">${secNum(s.id)}<div><div class="eyebrow">${esc(L.sub || s.short)}</div><h3>${esc(L.name || s.name)}</h3></div></div><p class="ink2 small">${inl_(L.blurb || "")}</p><div class="meta"><span>${(L.topics || []).length} topics</span><span>${n} bank questions</span></div><div class="row"><a class="btn sm" href="#learn-${s.id}">${ic("book")}Open</a><button type="button" class="btn sm ghost" data-act="start-sec" data-sec="${s.id}">Practice</button></div></div>`; }).join("")}</div>`;
  }
  function vLearn(sid) {
    const L = PACK.learn[sid]; if (!L) return vLearnIndex();
    const list = SECS.filter(s => PACK.learn[s.id]), idx = list.findIndex(s => s.id === sid), prev = list[idx - 1], nxt = list[idx + 1];
    const count = tags => bySec(sid).filter(q => (tags || []).includes(q.t)).length;
    const topics = L.topics || [], patterns = L.patterns || [], sheet = L.sheet || [];
    return `<div class="row"><a class="btn sm ghost" href="#learn">${ic("back")}All sections</a></div>
      <header class="learn-hero">${secNum(sid)}<div class="pagehead"><span class="eyebrow">${esc(L.sub || SEC[sid].short)}</span><h1>${esc(L.name || SEC[sid].name)}</h1><p>${inl_(L.blurb || "")}</p></div></header>
      ${L.metaphor ? `<div class="metaphor"><span class="mi">${ic("bulb")}</span><div><div class="eyebrow" style="color:inherit">The picture to remember</div><div>${rich_(L.metaphor)}</div></div></div>` : ""}
      <nav class="toc" aria-label="Topics">${topics.map((s, i) => `<button type="button" class="chip" data-act="jump" data-id="sec-${esc(s.id)}">${i + 1}. ${inl_(s.title)}</button>`).join("")}${patterns.length ? `<button type="button" class="chip" data-act="jump" data-id="sec-patterns">Exam patterns</button>` : ""}</nav>
      ${topics.map((s, i) => { const n = count(s.tags); const body = s.html != null ? rich(s.html, "html") : rich(s.md || "", "md"); return `<section class="card lsec ${scls(sid)}" id="sec-${esc(s.id)}"><div class="stack"><h2><span class="n">${i + 1}</span>${inl_(s.title)}</h2><div class="prose">${body}</div>${n ? `<div class="row"><button type="button" class="btn sm soft" data-act="practice-tags" data-sec="${sid}" data-tags="${esc((s.tags || []).join(","))}" data-title="${esc(plain(s.title))}">${ic("target")}Practice this topic (${n} question${n === 1 ? "" : "s"})</button></div>` : ""}</div></section>`; }).join("")}
      ${patterns.length ? `<section class="card stack lsec ${scls(sid)}" id="sec-patterns"><h2>Exam patterns in the bank</h2><p class="ink2 small">Every question in the bank fits one of these patterns. Learn the recipe and the numbers won't matter.</p>
        ${patterns.map(p => { const qs = (p.qs || []).filter(id => QM[id]); return `<div class="pattern"><div class="ph"><b>${inl_(p.title)}</b>${qs.length ? `<button type="button" class="btn sm" data-act="practice-pattern" data-ids="${esc(qs.join(","))}" data-sec="${sid}" data-title="${esc(plain(p.title))}">Practice ${qs.length}</button>` : ""}</div><div>${rich_(p.recipe || "")}</div><div class="qs">Bank questions: ${qs.map(id => "Q" + esc(QM[id].n != null ? QM[id].n : id)).join(", ")}</div></div>`; }).join("")}</section>` : ""}
      ${sheet.length ? `<section class="card stack ${scls(sid)}"><h2>Formula sheet</h2><div class="formula-sheet">${sheet.map(f => `<div class="f"><span class="muted small">${inl_(f[0])}</span><span>${inl_(f[1])}</span></div>`).join("")}</div></section>` : ""}
      <div class="row between">${prev ? `<a class="btn ghost" href="#learn-${prev.id}">${ic("back")}${esc(prev.short)} · ${esc(prev.name)}</a>` : "<span></span>"}<button type="button" class="btn lg" data-act="start-sec" data-sec="${sid}">${ic("target")}Practice all ${esc(SEC[sid].short)} questions</button>${nxt ? `<a class="btn ghost" href="#learn-${nxt.id}">${esc(nxt.short)} · ${esc(nxt.name)}${ic("arrow")}</a>` : "<span></span>"}</div>`;
  }
  function optionsBar(withOrder = true) {
    const anyVar = QS.some(q => q.v && q.v.length);
    return `<div class="card flat stack" style="padding:16px 18px"><div class="row"><span class="small muted" style="min-width:150px">Questions per session</span><div class="chips">${["10", "20", "all"].map(v => chip("set-size", v, v === "all" ? "All" : v, ST.size === v)).join("")}</div></div>
      ${withOrder ? `<div class="row"><span class="small muted" style="min-width:150px">Order</span><div class="chips">${[["smart", "Smart (weak first)"], ["bank", "Bank order"], ["random", "Random"]].map(([v, l]) => chip("set-order", v, l, ST.order === v)).join("")}</div></div>` : ""}
      <div class="row"><span class="small muted" style="min-width:150px">Options</span><div class="chips">${anyVar ? chip("toggle-fresh", "", `${ic("dice", "", "width:16px;height:16px")} Fresh numbers`, ST.fresh, 'style="gap:6px"') : ""}${chip("toggle-shuffle", "", "Shuffle answer order", ST.shuffle)}</div></div>
      ${anyVar ? `<p class="small muted">Fresh numbers: calculation questions get new numbers, like the real exam. Same method, different values.</p>` : ""}</div>`;
  }
  function vEx() {
    const cnt = (sid, d) => bySec(sid).filter(q => q.d === d).length;
    return `<header class="pagehead"><span class="eyebrow">Exercises</span><h1>Multiple-choice practice by section</h1><p>Pick a section. You get instant feedback, an explanation of <i>why</i>, and anything you miss goes to your Fix-it deck.</p></header>
      ${optionsBar()}
      <div class="grid">${SECS.filter(s => bySec(s.id).length).map(s => { const x = secStats(s.id); return `<div class="card semcard ${scls(s.id)}"><div class="top">${secNum(s.id)}<div><h3>${esc(s.combined ? "Combined · " + s.name : s.name)}</h3><div class="lvl">${level(x.mastery)} · ${pct(x.mastery)}</div></div></div>${meter(x.mastery, s.id)}
        <div class="meta"><span>${x.total} questions</span><span>${cnt(s.id, 1)} easy · ${cnt(s.id, 2)} medium · ${cnt(s.id, 3)} hard</span></div>
        <div class="row"><button type="button" class="btn sm" data-act="start-sec" data-sec="${s.id}">${ic("target")}Practice</button>${PACK.learn[s.id] ? `<a class="btn sm ghost" href="#learn-${s.id}">Learn first</a>` : ""}</div></div>`; }).join("")}
        <div class="card semcard" style="--t:var(--sun-soft)"><div class="top"><span class="semnum" style="background:var(--sun);color:#3b2a00">${ic("dice", "", "width:24px;height:24px")}</span><div><h3>All sections, mixed</h3><div class="lvl">${QS.length} questions</div></div></div><p class="small ink2">Interleaving topics is harder, and it's exactly what the exam does.</p><div class="row"><button type="button" class="btn sm" data-act="start-all">${ic("target")}Practice mixed</button></div></div></div>`;
  }
  function dsems() { const ids = SECS.map(s => s.id); const cur = (ST.dsems || ids).filter(id => ids.includes(id)); return cur.length || ST.dsems ? cur : ids; }
  function vDiff() {
    const ds = dsems(), pool = QS.filter(q => ds.includes(q.sec));
    const desc = { 1: "Definitions and one-step recall: the marks you can't afford to lose.", 2: "One calculation or one conceptual distinction.", 3: "Multi-step calculations, sign traps and subtle concepts." };
    return `<header class="pagehead"><span class="eyebrow">By difficulty</span><h1>Choose your level</h1><p>Every question has a difficulty badge. Warm up on Easy, build speed on Medium, and finish with Hard to lock in the full 100.</p></header>
      <div class="card flat stack" style="padding:16px 18px"><div class="row"><span class="small muted" style="min-width:150px">Sections included</span><div class="chips">${SECS.filter(s => bySec(s.id).length).map(s => `<button type="button" class="chip ${scls(s.id)}${ds.includes(s.id) ? " on" : ""}" data-act="toggle-dsem" data-v="${s.id}"><span class="dot"></span>${esc(s.short)}</button>`).join("")}</div></div></div>
      ${optionsBar(false)}
      <div class="grid three">${[1, 2, 3].map(d => { const qs = pool.filter(q => q.d === d); let a = 0, c = 0; qs.forEach(q => { const r = P.q[q.id]; if (r) { a += r.a; c += r.c; } }); return `<div class="card stack"><div class="badges">${diffBadge(d)}</div><h3>${DIFF[d]}</h3><p class="small ink2">${desc[d]}</p><div class="meta small muted">${qs.length} questions · ${a ? pct(c / a) + " correct so far" : "not tried yet"}</div><button type="button" class="btn" data-act="start-diff" data-d="${d}" ${qs.length ? "" : "disabled"}>${ic("target")}Start ${DIFF[d].toLowerCase()}</button></div>`; }).join("")}</div>`;
  }
  function vMock() {
    const hist = P.mocks.slice().reverse();
    const parts = SECS.filter(s => EXAM[s.id]).map(s => `${EXAM[s.id]} from ${esc(s.short)}`).join(", ");
    return `<header class="pagehead"><span class="eyebrow">Mock exam</span><h1>A full practice exam</h1><p>${PACK.exam.total} questions drawn like the real paper (${parts}). You get no feedback until you submit, then a full review.</p></header>
      <div class="card stack"><div class="row"><span class="small muted" style="min-width:120px">Timer</span><div class="chips">${[[0, "Off"], [30, "30 min"], [40, "40 min"], [60, "60 min"]].map(([v, l]) => chip("set-timer", v, l, +ST.mockTimer === v)).join("")}</div></div>
        ${QS.some(q => q.v && q.v.length) ? `<div class="row"><span class="small muted" style="min-width:120px">Numbers</span><div class="chips">${chip("toggle-mockfresh", "", "Fresh numbers (recommended)", ST.mockFresh)}</div></div>` : ""}
        <div class="row"><button type="button" class="btn lg" data-act="start-mock">${ic("clip")}Start mock exam</button></div></div>
      <section class="card stack"><h3>Past attempts</h3>${hist.length ? `<div class="bars">${hist.slice(0, 10).map(m => `<div class="barrow"><div class="lab"><span class="nm">${new Date(m.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${new Date(m.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></div><div class="track" data-tip="${m.c}/${m.n} correct${m.mins ? " in " + m.mins + " min" : ""}"><div class="fill" style="width:${m.c / m.n * 100}%;background:${m.c / m.n >= 0.9 ? "var(--good)" : "var(--accent)"}"></div></div><div class="val">${m.c}/${m.n}</div></div>`).join("")}</div>` : `<p class="muted small">No attempts yet. Your scores will appear here.</p>`}</section>`;
  }
  function vFix() {
    const ids = fixIds();
    if (!ids.length) return `<header class="pagehead"><span class="eyebrow">Fix-it deck</span><h1>Nothing to fix right now</h1><p>Any question you get wrong lands here. Answer it correctly twice in a row and it leaves the deck.</p></header>
      <div class="card empty"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" style="fill:var(--good-soft)"/><path d="m25 41 10 10 21-22" style="fill:none;stroke:var(--good);stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/></svg><b>Clean slate</b><span class="small">Go practise and come back when something trips you up.</span><a class="btn" href="#ex">Go to exercises</a></div>`;
    const groups = SECS.map(s => [s, ids.filter(id => QM[id].sec === s.id)]).filter(g => g[1].length);
    return `<header class="pagehead"><span class="eyebrow">Fix-it deck</span><h1>${ids.length} question${ids.length > 1 ? "s" : ""} to fix</h1><p>These are the questions you got wrong. Each one leaves the deck after <b>two correct answers in a row</b>. That spacing is what makes it stick.</p></header>
      <div class="row"><button type="button" class="btn lg" data-act="start-fix">${ic("fix")}Start fixing (${ids.length})</button>${QS.some(q => q.v && q.v.length) ? `<button type="button" class="btn ghost" data-act="start-fix-fresh">${ic("dice", "", "width:18px;height:18px")}With fresh numbers</button>` : ""}</div>
      ${groups.map(([s, list]) => `<section class="card stack ${scls(s.id)}"><div class="row">${secNum(s.id)}<h3>${esc(s.name)}</h3></div>${list.map(id => { const q = QM[id], r = P.q[id]; const sec = secFor(q); return `<div class="pattern"><div class="ph"><div class="badges">${diffBadge(q.d)}${q.n != null ? `<span class="badge plain">Bank Q${esc(q.n)}</span>` : ""}<span class="badge plain">${esc(tagLabel(q.t))}</span></div><span class="small muted">missed ${r.w || 1}× · ${r.fs || 0}/2 to clear</span></div><div class="snip">${snippet(q.q)}</div><div class="row"><button type="button" class="btn sm" data-act="start-one" data-id="${esc(id)}">Try it now</button>${sec ? `<a class="btn sm ghost" href="#learn-${sec.sec}-${esc(sec.topic)}">Review theory</a>` : ""}<button type="button" class="btn sm ghost" data-act="unfix" data-id="${esc(id)}">I've got it, remove</button></div></div>`; }).join("")}</section>`).join("")}`;
  }
  function vProgress() {
    const rd = readiness(), tt = totals(), st = SECS.map(s => ({ s, ...secStats(s.id) })).filter(x => x.total);
    const byD = [1, 2, 3].map(d => { let a = 0, c = 0, seen = 0; QS.filter(q => q.d === d).forEach(q => { const r = P.q[q.id]; if (r && r.a) { a += r.a; c += r.c; seen++; } }); return { d, a, c, seen, tot: QS.filter(q => q.d === d).length }; });
    const tagMap = {}; QS.forEach(q => { const r = P.q[q.id]; if (!r || !r.a) return; const k = q.sec + ":" + q.t; const m = tagMap[k] || (tagMap[k] = { sec: q.sec, t: q.t, s: 0, n: 0, a: 0, c: 0 }); m.s += r.s || 0; m.n++; m.a += r.a; m.c += r.c; });
    const weak = Object.values(tagMap).map(m => ({ ...m, str: m.s / m.n })).sort((a, b) => a.str - b.str).slice(0, 6);
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); days.push({ d, v: P.days[k] || { n: 0, c: 0 } }); }
    const maxD = Math.max(1, ...days.map(x => x.v.n));
    return `<header class="pagehead"><span class="eyebrow">Progress · ${esc(PACK.title)}</span><h1>Section by section</h1><p>Mastery is a memory score for each question: it grows with each correct answer and drops sharply with a miss. Section mastery averages your questions, with harder ones weighted more.</p></header>
      <div class="grid three"><div class="tile"><span class="v">${pct(rd)}</span><span class="l">exam readiness · ${level(rd)}</span></div><div class="tile"><span class="v tabnum">${tt.seen}<span class="small muted">/${QS.length}</span></span><span class="l">questions tried</span></div><div class="tile"><span class="v">${tt.acc == null ? "—" : pct(tt.acc)}</span><span class="l">accuracy over ${tt.att} answers</span></div></div>
      <section class="card stack"><h3>Mastery by section</h3><div class="bars">${st.map(x => `<div class="barrow"><div class="lab"><span class="badge sem ${scls(x.s.id)}" style="padding:2px"><span class="bub">${esc(x.s.short)}</span></span><span class="nm">${esc(x.s.name)}</span></div><div class="track" data-tip="${esc(x.s.short)}: ${pct(x.mastery)} mastery · ${level(x.mastery)}"><div class="fill" style="width:${x.mastery * 100}%"></div></div><div class="val">${pct(x.mastery)}</div><div class="sublab">${level(x.mastery)} · ${x.acc == null ? "no answers yet" : pct(x.acc) + " correct"} · tried ${x.seen}/${x.total}</div></div>`).join("")}</div></section>
      <div class="grid two">
        <section class="card stack"><h3>Accuracy by difficulty</h3><div class="bars">${byD.map(x => `<div class="barrow"><div class="lab">${diffBadge(x.d)}</div><div class="track" data-tip="${x.a ? `${x.c}/${x.a} correct` : "no answers yet"} · ${x.seen}/${x.tot} tried"><div class="fill" style="width:${x.a ? x.c / x.a * 100 : 0}%"></div></div><div class="val">${x.a ? pct(x.c / x.a) : "—"}</div></div>`).join("")}</div></section>
        <section class="card stack"><h3>Last 14 days</h3><div class="daystrip">${days.map(x => `<div class="d ${x.v.n ? "" : "zero"}" data-tip="${x.d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${x.v.n} answers${x.v.n ? ", " + pct(x.v.c / x.v.n) + " correct" : ""}"><i style="height:${Math.max(2, x.v.n / maxD * 100)}%"></i></div>`).join("")}</div><div class="daylabels">${days.map((x, i) => `<span>${i % 2 === 1 ? "" : x.d.getDate()}</span>`).join("")}</div></section></div>
      <section class="card stack"><h3>Weakest topics</h3>${weak.length ? `<div class="next-steps">${weak.map(w => `<button type="button" class="step-item" data-act="practice-tags" data-sec="${w.sec}" data-tags="${esc(w.t)}" data-title="${esc(tagLabel(w.t))}"><span class="ic ${scls(w.sec)}"><b style="font-size:.78rem">${esc(secShort(w.sec))}</b></span><span><b>${esc(tagLabel(w.t))}</b><span>strength ${pct(w.str)} · ${w.c}/${w.a} correct · tap to practise</span></span></button>`).join("")}</div>` : `<p class="muted small">Answer a few questions and your weak spots will show up here.</p>`}</section>
      <section class="card stack"><h3>Mock exams</h3>${P.mocks.length ? `<div class="bars">${P.mocks.slice(-8).map(m => `<div class="barrow"><div class="lab"><span class="nm">${new Date(m.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div><div class="track" data-tip="${m.c}/${m.n} correct"><div class="fill" style="width:${m.c / m.n * 100}%"></div></div><div class="val">${m.c}/${m.n}</div></div>`).join("")}</div>` : `<p class="muted small">No mock exams yet. <a href="#mock">Take one</a> once you've practised each section.</p>`}</section>
      <section class="card stack"><h3>Your data</h3><div class="sync"><i></i><span>Saved on this device</span></div><p class="small ink2">Progress is kept per subject in this browser${OPTS.remote ? ", and synced privately to your Claude account when this page runs inside Claude" : ""}.</p><div class="row"><button type="button" class="btn danger sm" data-act="reset">Reset progress for this subject</button></div></section>`;
  }
  function vPacks() {
    const list = OPTS.packs || [];
    return `<header class="pagehead"><span class="eyebrow">Subjects</span><h1>Choose what to study</h1><p>Each subject is a pack built from a question bank. Your progress is kept separately for each one.</p></header>
      <div class="grid two">${list.map(p => `<button type="button" class="card packcard${PACK && p.id === PACK.id ? " sc-5" : ""}" data-act="open-pack" data-id="${esc(p.id)}"><div class="eyebrow">${esc(p.subtitle || p.subject || "")}</div><h3>${esc(p.title)}</h3><div class="pmeta"><span>${p.questions} questions</span><span>${p.sections} sections</span>${p.updated ? `<span>updated ${esc(p.updated)}</span>` : ""}</div>${PACK && p.id === PACK.id ? '<span class="badge plain">Studying now</span>' : ""}</button>`).join("")}
      ${OPTS.allowFile ? `<label class="card packcard" style="border-style:dashed"><div class="eyebrow">Have a pack file?</div><h3>${ic("file", "", "width:20px;height:20px;vertical-align:-4px")} Open a pack file</h3><div class="pmeta"><span>A .json pack someone sent you. It opens just for this visit.</span></div><input id="pack-file" type="file" accept=".json,application/json" hidden></label>` : ""}</div>`;
  }
  function preBlock(q) {
    let h = "";
    if (q.img) h += `<div class="qimg-wrap">${sanitize(`<img class="qimg" src="${esc(q.img)}" alt="${esc(q.imgAlt || "Figure for this question")}">`)}</div>`;
    if (q.pre) h += `<div class="stata"><div class="sl">${esc(q.preLabel || "Output")}</div><pre>${esc(q.pre)}</pre>${q.note ? `<div class="note">${rich_(q.note)}</div>` : ""}</div>`;
    else if (q.note) h += `<div class="note">${rich_(q.note)}</div>`;
    return h;
  }
  function qBadges(q, it) {
    return `<div class="badges">${secBadge(q.sec)}${q.also && SEC[q.also] ? `<span class="badge plain">uses ${esc(SEC[q.also].short)}</span>` : ""}${diffBadge(q.d)}${q.n != null ? `<span class="badge plain">Bank Q${esc(q.n)}</span>` : ""}${it && it.fresh ? `<span class="badge fresh">Fresh numbers</span>` : ""}${q.flag ? `<span class="badge flag">Key unverified</span>` : ""}</div>`;
  }
  const LET = "ABCDEFGH";
  function vPlay() {
    const it = S.inst[S.i], q = QM[it.id], ans = S.ans[S.i], N = S.ids.length;
    const answered = S.ans.filter(Boolean).length, c = S.ans.filter(a => a && a.ok).length, w = S.ans.filter(a => a && a.ok === false).length;
    const opts = it.o.map((o, k) => {
      let cls = "";
      if (S.mock) cls = ans && ans.pick === k ? " picked" : "";
      else if (ans) cls = k === it.a ? " right" : k === ans.pick ? " wrong" : " dim";
      return `<button type="button" class="opt${cls}" data-act="pick" data-k="${k}" ${!S.mock && ans ? "disabled" : ""} aria-label="Option ${LET[k]}"><span class="L">${LET[k]}</span><span class="T">${inl_(o)}</span></button>`;
    }).join("");
    const sec = secFor(q);
    const fb = !S.mock && ans ? `<div class="feedback ${ans.ok ? "g" : "b"}" role="status"><div class="fh">${ic(ans.ok ? "check" : "x", "", "width:22px;height:22px")}${ans.ok ? pickOne(["Correct!", "Nice one!", "Spot on!", "Yes, exactly."]) : `Not quite. The answer is ${LET[it.a]}.`}</div><div class="fx">${rich_(it.x || "")}</div>
      <div class="row">${sec ? `<a class="btn sm ghost" href="#learn-${sec.sec}-${esc(sec.topic)}">${ic("book")}Review: ${inl_(sec.title)}</a>` : ""}<button type="button" class="btn" data-act="next">${S.i < N - 1 ? "Next question" : "See results"}${ic("arrow")}</button></div></div>` : "";
    const head = S.mock
      ? `<div class="row between"><div><div class="eyebrow">${esc(S.title)}</div><h2>Question ${S.i + 1} of ${N}</h2></div><div class="row">${S.timerEnd ? `<span class="timer">${fmtTime(S.timerEnd - Date.now())}</span>` : ""}<button type="button" class="btn ${answered === N ? "" : "ghost"}" data-act="submit-mock" data-confirm="0">${answered === N ? "Submit exam" : `Submit (${answered}/${N} answered)`}</button></div></div>
         <div class="qnav">${S.ids.map((_, i) => `<button type="button" data-act="goto" data-i="${i}" class="${S.ans[i] ? "ans" : ""}${i === S.i ? " cur" : ""}" aria-label="Question ${i + 1}">${i + 1}</button>`).join("")}</div>`
      : `<div class="row between"><div><div class="eyebrow">${esc(S.title)}</div><h2>Question ${S.i + 1} of ${N}</h2></div><div class="row"><div class="scorepills"><span class="scorepill g">✓ ${c}</span><span class="scorepill b">✗ ${w}</span></div><button type="button" class="btn sm ghost" data-act="end">End session</button></div></div>`;
    return `<div class="playhead">${head}<div class="progressbar"><i style="width:${(S.mock ? answered : S.i + (ans ? 1 : 0)) / N * 100}%"></i></div></div>
      <article class="card qcard ${scls(q.sec)}">${qBadges(q, it)}${preBlock(q)}<div class="qstem">${rich_(it.q)}</div><div class="opts" role="group" aria-label="Answer options">${opts}</div>${fb}
      ${S.mock ? `<div class="row between"><button type="button" class="btn ghost" data-act="prev" ${S.i ? "" : "disabled"}>${ic("back")}Previous</button><button type="button" class="btn" data-act="next" ${S.i < N - 1 ? "" : "disabled"}>Next${ic("arrow")}</button></div>` : ""}
      <p class="small muted">Keys: <span class="kbd">A</span>–<span class="kbd">${LET[it.o.length - 1]}</span> or <span class="kbd">1</span>–<span class="kbd">${it.o.length}</span> to answer · <span class="kbd">Enter</span> for next${S.mock ? ' · <span class="kbd">←</span> previous' : ""}</p></article>`;
  }
  function vSummary() {
    const N = S.ids.length, n = S.ans.filter(Boolean).length, c = S.ans.filter(a => a && a.ok).length, wrongIds = S.inst.filter((it, i) => S.ans[i] && !S.ans[i].ok).map(it => it.id);
    const ratio = n ? c / n : 0;
    const msg = !n ? "No answers this time." : ratio === 1 ? "Perfect score. That's the 100 you're after." : ratio >= 0.85 ? "Excellent. Clean up the misses and you're there." : ratio >= 0.65 ? "Solid. Review the explanations below, then fix the misses." : "This is how learning starts. Read the explanations, review the theory, try again.";
    let by = "";
    if (S.mock) {
      const m = {}; S.inst.forEach((it, i) => { const s = QM[it.id].sec; m[s] = m[s] || [0, 0]; m[s][1]++; if (S.ans[i].ok) m[s][0]++; });
      by = `<section class="card stack"><h3>By section</h3><div class="bars">${Object.entries(m).map(([sid, v]) => `<div class="barrow"><div class="lab"><span class="badge sem ${scls(sid)}" style="padding:2px"><span class="bub">${esc(secShort(sid))}</span></span><span class="nm">${esc(secName(sid))}</span></div><div class="track"><div class="fill" style="width:${v[0] / v[1] * 100}%;background:${v[0] === v[1] ? "var(--good)" : "var(--accent)"}"></div></div><div class="val">${v[0]}/${v[1]}</div></div>`).join("")}</div></section>`;
    }
    return `<header class="pagehead"><span class="eyebrow">${esc(S.title)} · results</span><h1>${S.mock ? `${c} / ${N}` : `${c} of ${n} correct`}${S.mock ? ` <span class="muted" style="font-size:.6em">(${pct(c / N)})</span>` : ""}</h1><p>${msg}</p></header>
      <div class="row">${wrongIds.length ? `<button type="button" class="btn" data-act="retry-wrong" data-ids="${esc(wrongIds.join(","))}">${ic("fix")}Practice my ${wrongIds.length} miss${wrongIds.length > 1 ? "es" : ""} again</button>` : ""}<a class="btn ghost" href="${S.mock ? "#mock" : S.back}">${ic("back")}Back</a><a class="btn ghost" href="#progress">${ic("chart")}See progress</a></div>
      ${by}
      <section class="stack"><h3>Review</h3><div class="revlist">${S.inst.map((it, i) => { const a = S.ans[i], q = QM[it.id]; const mk = !a ? "s" : a.ok ? "g" : "b"; return `<details class="revitem"${a && !a.ok ? " open" : ""}><summary><span class="mk ${mk}">${mk === "g" ? "✓" : mk === "b" ? "✗" : "–"}</span><span class="snip">${snippet(it.q)}</span></summary><div class="rb">${qBadges(q, it)}${preBlock(q)}<div class="qstem">${rich_(it.q)}</div><div class="opts">${it.o.map((o, k) => `<div class="opt${k === it.a ? " right" : a && a.pick === k ? " wrong" : " dim"}"><span class="L">${LET[k]}</span><span class="T">${inl_(o)}</span></div>`).join("")}</div><div class="feedback ${a && a.ok ? "g" : "b"}"><div class="fx">${rich_(it.x || "")}</div></div></div></details>`; }).join("")}</div></section>`;
  }

  /* ---------- actions ---------- */
  const ACT = {
    "start-sec": el => { const s = el.dataset.sec; if (!SEC[s]) return; startSession({ mode: "sec", tag: s, title: `${SEC[s].short} · ${SEC[s].name}`, ids: bySec(s).map(q => q.id), back: "#ex" }); },
    "start-all": () => startSession({ mode: "all", title: "All sections, mixed", ids: QS.map(q => q.id) }),
    "start-diff": el => { const d = +el.dataset.d, ds = dsems(); startSession({ mode: "diff", tag: DIFF[d].toLowerCase(), title: `${DIFF[d]} questions`, ids: QS.filter(q => q.d === d && ds.includes(q.sec)).map(q => q.id), back: "#diff" }); },
    "start-fix": () => startSession({ mode: "fix", title: "Fix-it deck", ids: fixIds(), keepAll: true, order: "smart", back: "#fix", fresh: false }),
    "start-fix-fresh": () => startSession({ mode: "fix", title: "Fix-it deck · fresh numbers", ids: fixIds(), keepAll: true, order: "smart", back: "#fix", fresh: true }),
    "start-one": el => startSession({ mode: "fix", title: "Fix-it", ids: [el.dataset.id], keepAll: true, back: "#fix", fresh: false }),
    "start-mock": () => startSession({ mode: "mock", mock: true, title: `Mock exam · ${PACK.title}`, ids: buildMock(), keepAll: true, order: "bank", timer: +ST.mockTimer || 0, fresh: ST.mockFresh, back: "#mock" }),
    "practice-tags": el => { const s = el.dataset.sec, tags = el.dataset.tags.split(","); startSession({ mode: "topic", tag: s, title: `${secShort(s)} · ${el.dataset.title}`, ids: bySec(s).filter(q => tags.includes(q.t)).map(q => q.id), keepAll: true, back: location.hash || "#learn" }); },
    "practice-pattern": el => { const s = el.dataset.sec; startSession({ mode: "pattern", tag: s, title: `${secShort(s)} · ${el.dataset.title}`, ids: el.dataset.ids.split(","), keepAll: true, order: "bank", back: `#learn-${s}` }); },
    "retry-wrong": el => startSession({ mode: "fix", title: "Retry misses", ids: el.dataset.ids.split(","), keepAll: true, back: S ? S.back : "#ex" }),
    pick: el => choose(+el.dataset.k),
    next: () => next(),
    prev: () => { if (S && S.i > 0) { S.i--; render(); window.scrollTo(0, 0); } },
    goto: el => { S.i = +el.dataset.i; render(); },
    end: () => finishSession(),
    "submit-mock": el => { const N = S.ids.length, answered = S.ans.filter(Boolean).length; if (answered < N && el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = `${N - answered} unanswered. Tap again to submit`; el.classList.remove("ghost"); return; } submitMock(); },
    jump: el => { const t = document.getElementById(el.dataset.id); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); },
    unfix: el => { const r = P.q[el.dataset.id]; if (r) { r.fx = 0; r.fs = 0; persist(); } render(); toast("Removed from Fix-it"); },
    reset: el => { if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "Tap again to erase this subject's progress"; return; } P = freshP(); persist(); render(); toast("Progress reset"); },
    "set-size": el => { ST.size = el.dataset.v; saveST(); render(); },
    "set-order": el => { ST.order = el.dataset.v; saveST(); render(); },
    "toggle-fresh": () => { ST.fresh = !ST.fresh; saveST(); render(); },
    "toggle-shuffle": () => { ST.shuffle = !ST.shuffle; saveST(); render(); },
    "toggle-dsem": el => { const v = el.dataset.v, cur = dsems(); ST.dsems = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]; saveST(); render(); },
    "set-timer": el => { ST.mockTimer = +el.dataset.v; saveST(); render(); },
    "toggle-mockfresh": () => { ST.mockFresh = !ST.mockFresh; saveST(); render(); },
    "go-packs": () => { location.hash = "#packs"; },
    "open-pack": async el => { const e = (OPTS.packs || []).find(x => x.id === el.dataset.id); if (!e) return; if (PACK && e.id === PACK.id) { location.hash = "#home"; return; } try { const p = e._pack || normalizePack(await OPTS.loadPack(e.id)); switchPack(p); } catch (err) { toast("Couldn't open that subject. Check your connection and try again."); } },
    "exit-preview": () => { if (OPTS.preview && OPTS.preview.onExit) OPTS.preview.onExit(); },
  };

  /* ---------- top bar: music, sound, theme ---------- */
  function musicUI() {
    const pill = $(".musicpill"), pop = $(".popover"); if (!pill || !pop) return;
    const playing = Sound.playing(), st = Sound.STATIONS[ST.station] || Sound.STATIONS.pads;
    pill.classList.toggle("playing", playing);
    pill.innerHTML = `<span class="eq">${playing ? '<span class="eqbars"><i></i><i></i><i></i></span>' : ic("music")}</span><span class="mlabel">${playing ? esc(st.name) : "Ambient music"}</span>`;
    pop.innerHTML = `<div class="row between"><b>Ambient music</b><button type="button" class="btn sm ${playing ? "ghost" : ""}" id="mus-toggle">${ic(playing ? "pause" : "play")}${playing ? "Pause" : "Play"}</button></div>
      <div class="stack" style="gap:8px">${Object.entries(Sound.STATIONS).map(([id, s]) => `<button type="button" class="station${ST.station === id ? " on" : ""}" data-station="${id}"><span class="si">${ic({ pads: "wave", rain: "rain", lofi: "keys", brown: "noise" }[id])}</span><span><b>${s.name}</b><span>${s.desc}</span></span></button>`).join("")}</div>
      <label class="rng small" style="display:grid;gap:2px">Music volume<input id="mus-vol" type="range" min="0" max="1" step="0.05" value="${ST.musicVol}"></label>
      <hr class="soft"><div class="row between"><b class="small">Answer sounds</b><button type="button" class="chip${ST.sfx ? " on" : ""}" id="sfx-toggle">${ST.sfx ? "On" : "Off"}</button></div>
      <label class="rng small" style="display:grid;gap:2px">Sound effects volume<input id="sfx-vol" type="range" min="0" max="1" step="0.05" value="${ST.sfxVol}"></label>`;
    const music = id => track(`/music/${id}`, `Music: ${Sound.STATIONS[id].name}`, true);
    $("#mus-toggle").onclick = () => { if (Sound.playing()) Sound.stop(); else { Sound.setMusicVol(ST.musicVol); Sound.play(ST.station); music(ST.station); } musicUI(); };
    $$("[data-station]", pop).forEach(b => b.onclick = () => { ST.station = b.dataset.station; saveST(); Sound.setMusicVol(ST.musicVol); Sound.play(ST.station); music(ST.station); musicUI(); });
    $("#mus-vol").oninput = e => { ST.musicVol = +e.target.value; saveST(); Sound.setMusicVol(ST.musicVol); };
    $("#sfx-toggle").onclick = () => { ST.sfx = !ST.sfx; saveST(); sfxBtn(); musicUI(); if (ST.sfx) Sound.correct(); };
    $("#sfx-vol").onchange = e => { ST.sfxVol = +e.target.value; saveST(); Sound.setSfxVol(ST.sfxVol); if (ST.sfx) Sound.correct(); };
  }
  function sfxBtn() { const b = $("#sfx-btn"); if (!b) return; b.innerHTML = ic(ST.sfx ? "vol" : "mute"); b.classList.toggle("off", !ST.sfx); b.setAttribute("aria-label", ST.sfx ? "Answer sounds on" : "Answer sounds off"); b.title = b.getAttribute("aria-label"); }
  function themeBtn() { const b = $("#theme-btn"), t = ST.theme; if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); if (!b) return; b.innerHTML = ic(t === "dark" ? "moon" : t === "light" ? "sun" : "auto"); b.title = t ? `${t[0].toUpperCase() + t.slice(1)} theme` : "Theme follows your system"; b.setAttribute("aria-label", b.title); }

  function bootOnce() {
    if (booted) return; booted = true;
    buildNav();
    Sound.setSfxVol(ST.sfxVol); Sound.setMusicVol(ST.musicVol);
    sfxBtn(); themeBtn(); musicUI();
    $(".musicpill").onclick = e => { e.stopPropagation(); const p = $(".popover"); p.hidden = !p.hidden; if (!p.hidden) musicUI(); };
    $("#sfx-btn").onclick = () => { ST.sfx = !ST.sfx; saveST(); sfxBtn(); if (ST.sfx) Sound.correct(); toast(ST.sfx ? "Answer sounds on" : "Answer sounds off"); };
    $("#theme-btn").onclick = () => { ST.theme = ST.theme === "" ? "light" : ST.theme === "light" ? "dark" : ""; saveST(); themeBtn(); };
    document.addEventListener("click", e => {
      if (!active) return;
      const p = $(".popover"); if (p && !p.hidden && !e.target.closest(".pop-wrap")) p.hidden = true;
      const el = e.target.closest("[data-act]"); if (!el || el.disabled || !el.closest(".player-root")) return;
      const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); }
    });
    document.addEventListener("change", e => {
      if (!active || e.target.id !== "pack-file" || !e.target.files[0]) return;
      const f = e.target.files[0]; f.text().then(t => { try { switchPack(normalizePack(JSON.parse(t)), true); toast(`Opened ${f.name}`); } catch (err) { toast("That file isn't a valid study pack."); } });
    });
    document.addEventListener("keydown", e => {
      if (!active || route().r !== "play" || !S || S.done) return;
      if (e.target.closest("input,select,textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase(), it = S.inst[S.i], letters = "abcdefgh";
      if (letters.includes(k) && k.length === 1 && letters.indexOf(k) < it.o.length) { e.preventDefault(); choose(letters.indexOf(k)); }
      else if (/^[1-8]$/.test(k) && +k <= it.o.length) { e.preventDefault(); choose(+k - 1); }
      else if (k === "enter" || k === "arrowright") { if (e.target.closest("button") && k === "enter") return; e.preventDefault(); next(); }
      else if (k === "arrowleft" && S.mock && S.i > 0) { e.preventDefault(); S.i--; render(); }
    });
    let tipEl = null;
    document.addEventListener("mouseover", e => { if (!active) return; const t = e.target.closest("[data-tip]"); if (!t) { if (tipEl) tipEl.hidden = true; return; } if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl); } tipEl.textContent = t.dataset.tip; tipEl.hidden = false; });
    document.addEventListener("mousemove", e => { if (tipEl && !tipEl.hidden) { tipEl.style.left = Math.min(window.innerWidth - 270, e.clientX + 14) + "px"; tipEl.style.top = (e.clientY + 16) + "px"; } });
    window.addEventListener("hashchange", onHash);
  }
  function switchPack(p, fromFile) {
    S = null; clearInterval(timerInt);
    loadPackState(p); openProgress();
    if (!OPTS.preview && !fromFile) { ST.lastPack = p.id; saveST(); }
    if (fromFile && !(OPTS.packs || []).some(x => x.id === p.id)) OPTS.packs = [...(OPTS.packs || []), { id: p.id, title: p.title, subtitle: p.subtitle, questions: p.questions.length, sections: p.sections.length, _pack: p }];
    if (location.hash !== "#home") location.hash = "#home"; else { render(); trackView(); }
    window.scrollTo(0, 0);
  }
  function start(pack, opts = {}) {
    OPTS = Object.assign({}, opts);
    active = true; bootOnce();
    const p = normalizePack(pack);
    S = null; clearInterval(timerInt);
    loadPackState(p); openProgress();
    if (!OPTS.preview) { ST.lastPack = p.id; saveST(); }
    const r = route().r;
    if (OPTS.preview || r === "play" || (r === "learn" && route().a && !SEC[route().a])) location.hash = "#home";
    render(); trackView();
  }
  function stop() { active = false; S = null; clearInterval(timerInt); try { Sound.stop(); } catch (e) { } }
  return { start, stop, normalizePack, toast };
})();
