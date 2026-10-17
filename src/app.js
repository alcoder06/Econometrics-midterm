/* App core: text/math rendering, progress tracking + sync, quiz engine, views. */

/* ---------- text & math (global: used by widgets too) ---------- */
function md(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(>"“])\*(?!\s)([^*<>]+?)\*(?![\w*])/g, "$1<i>$2</i>");
}
function escMath(m) { return m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function T(s) {
  if (!s) return "";
  s = String(s).replace(/\\\$/g, "\u0001");
  return s.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g).map(p => {
    if (p.startsWith("$$") && p.endsWith("$$") && p.length > 4) return "\\[" + escMath(p.slice(2, -2)) + "\\]";
    if (p.startsWith("$") && p.endsWith("$") && p.length > 1) return "\\(" + escMath(p.slice(1, -1)) + "\\)";
    return md(p);
  }).join("").replace(/\u0001/g, "&#36;");
}
function typeset(el) {
  if (!el || typeof window.renderMathInElement !== "function") return;
  try {
    window.renderMathInElement(el, { delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }], throwOnError: false, ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option", "svg"] });
  } catch (e) { /* math stays as source text */ }
}

(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const pct = v => Math.round(v * 100) + "%";
  const plain = s => String(s).replace(/\$([^$]*)\$/g, (m, g) => g.replace(/\\hat\\beta/g, "β̂").replace(/\\Omega/g, "Ω").replace(/\\sigma/g, "σ").replace(/\\mid/g, "|").replace(/\\operatorname\{([^}]*)\}/g, "$1").replace(/\^2/g, "²").replace(/\\[a-zA-Z]+/g, "").replace(/[{}_]/g, "")).replace(/\s+/g, " ").trim();

  /* ---------- data ---------- */
  const SEMS = [
    { id: "s0", short: "S0", name: "Matrix toolkit" }, { id: "s1", short: "S1", name: "Expected value" },
    { id: "s2", short: "S2", name: "OLS in matrices" }, { id: "s3", short: "S3", name: "Standard errors" },
    { id: "s4", short: "S4", name: "Controls & fit" }, { id: "s5", short: "S5", name: "Dummies & forms" },
    { id: "mix", short: "MIX", name: "Stata & combined" },
  ];
  const SEM = Object.fromEntries(SEMS.map(s => [s.id, s]));
  const EXAM_SLOTS = { s0: 3, s1: 3, s2: 3, s3: 3, s4: 3, s5: 3, mix: 2 };
  const DIFF = { 1: "Easy", 2: "Medium", 3: "Hard" };
  const DW = { 1: 1, 2: 1.3, 3: 1.6 };
  const TAGS = { dims: "Dimensions", ops: "Adding & scaling", mult: "Matrix multiplication", transpose: "Transpose", inner: "Inner product", span: "Span & independence", rank: "Rank", inverse: "Identity & inverse", datatypes: "Data types & terms", ev: "Expected value", linearity: "Linearity of E", joint: "Marginal probability", condprob: "Conditional probability", condev: "Conditional expectation", lie: "Iterated expectations", cef: "Error term", causal: "Causality", setup: "Model & dimensions", residual: "Error vs residual", objective: "OLS objective", calculus: "Matrix derivatives", derivation: "Deriving β̂", fullrank: "Full rank", unbiased: "Unbiasedness", residprops: "Residual properties", omega: "Ω and ee′", varrules: "Variance rules", vcov: "Var(β̂) sandwich", sigma2: "σ̂² and se", se: "Meaning of se", ttest: "t-tests & p-values", hetero: "Heteroskedasticity", fwl: "FWL", controls: "Adding controls", dag: "Causal diagrams", r2: "R²", adjr2: "Adjusted R²", ftest: "Overall F", partialf: "Partial F", dummies: "Dummies", interact2: "Dummy interactions", did: "Diff-in-diff", interactc: "Different slopes", rdd: "RDD", scaling: "Units & scaling", logs: "Logs", std: "Standardized", "stata-read": "Reading output", "stata-logs": "Log coefficients", "stata-interact": "Interactions", "stata-ftest": "F tests", "stata-fwl": "FWL", "stata-std": "Standardized output", "stata-did": "DiD output", "stata-rdd": "RDD output", "stata-controls": "Adding controls", "stata-dummy": "Dummy coefficients" };
  const QS = BANK.map(b => ({ id: `${b.sem}-${b.n}`, sem: b.sem, n: b.n, d: b.d, t: b.t, q: b.q, o: b.o, a: "abcd".indexOf(b.a), x: b.x, so: b.so, cmd: b.cmd, flag: b.flag, rel: b.rel, gen: GEN[`${b.sem}-${b.n}`] }));
  const QM = Object.fromEntries(QS.map(q => [q.id, q]));
  const bySem = sem => QS.filter(q => q.sem === sem);
  const TAG2SEC = {};
  LEARN.forEach(L => L.sections.forEach(s => s.tags.forEach(t => { const k = (L.id === "mix" ? "mix" : L.id) + ":" + t; if (!TAG2SEC[k]) TAG2SEC[k] = { sem: L.id, sec: s.id, title: s.title }; })));
  const secFor = q => TAG2SEC[q.sem + ":" + q.t];

  /* ---------- storage ---------- */
  const LS_P = "econprep.progress.v1", LS_S = "econprep.settings.v1";
  const lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const freshP = () => ({ v: 1, q: {}, sessions: [], mocks: [], days: {}, updatedAt: 0 });
  let P = Object.assign(freshP(), lsGet(LS_P) || {});
  const DEF = { sfx: true, sfxVol: 0.6, musicVol: 0.35, station: "pads", shuffle: true, fresh: false, size: "10", order: "smart", theme: "", dsems: ["s0", "s1", "s2", "s3", "s4", "s5", "mix"], mockTimer: 0, mockFresh: true };
  let ST = Object.assign({}, DEF, lsGet(LS_S) || {});
  const saveST = () => lsSet(LS_S, ST);

  const remote = { ref: null, on: false, writing: false, again: false, timer: null, retried: false };
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
  async function initRemote() {
    try {
      if (!window.claude || typeof window.claude.use !== "function") return;
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id(); if (!uid) return;
      remote.ref = db.doc("data/users/" + uid + "/progress");
      const snap = await remote.ref.get();
      if (snap.exists) { P = merge(P, snap.data() || {}); lsSet(LS_P, P); }
      remote.on = true; syncBadge(); updateFixCount();
      if (Object.keys(P.q).length) scheduleRemote();
      if (route().r !== "play") render();
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
      else if (code === "quota_exceeded") { toast("Couldn't sync: the progress store is full. Your progress is still saved on this device."); }
    }
    remote.writing = false; syncBadge();
    if (remote.again) { remote.again = false; scheduleRemote(); }
  }
  function persist() { P.updatedAt = Date.now(); lsSet(LS_P, P); scheduleRemote(); }
  function syncBadge() { $$(".sync").forEach(el => { el.classList.toggle("on", remote.on); el.querySelector("span").textContent = remote.on ? "Synced to your account" : "Saved on this device"; }); }

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
  function semStats(sem) {
    let w = 0, ws = 0, seen = 0, att = 0, cor = 0; const qs = bySem(sem);
    qs.forEach(q => { const r = P.q[q.id]; w += DW[q.d]; if (r && r.a) { seen++; att += r.a; cor += r.c; ws += DW[q.d] * (r.s || 0); } });
    return { total: qs.length, seen, att, cor, acc: att ? cor / att : null, mastery: w ? ws / w : 0 };
  }
  const level = m => m >= 0.88 ? "Exam-ready" : m >= 0.7 ? "Strong" : m >= 0.45 ? "Getting solid" : m >= 0.2 ? "Warming up" : "Just starting";
  function readiness() { let tw = 0, s = 0; Object.entries(EXAM_SLOTS).forEach(([k, w]) => { tw += w; s += w * semStats(k).mastery; }); return s / tw; }
  const fixIds = () => QS.filter(q => P.q[q.id] && P.q[q.id].fx).map(q => q.id);
  function totals() { let att = 0, cor = 0, seen = 0; QS.forEach(q => { const r = P.q[q.id]; if (r && r.a) { seen++; att += r.a; cor += r.c; } }); return { att, cor, seen, acc: att ? cor / att : null }; }
  function updateFixCount() { const n = fixIds().length; $$(".nav-count").forEach(el => { el.textContent = n; el.hidden = n === 0; }); }

  /* ---------- anonymous usage counts (GoatCounter; present only on the public GitHub Pages build) ---------- */
  function track(path, title, event) {
    let tries = 0;
    const send = () => {
      const gc = window.goatcounter;
      if (gc && typeof gc.count === "function") { try { gc.count({ path, title: title || path, event: !!event }); } catch (e) { } }
      else if (document.querySelector("script[data-goatcounter]") && tries++ < 40) setTimeout(send, 250);
    };
    send();
  }
  const VIEW_PATH = { home: "/home", learn: "/learn", ex: "/exercises", diff: "/difficulty", mock: "/mock-exam", fix: "/fix-it", progress: "/progress" };
  function trackView() {
    const { r, a } = route();
    if (!VIEW_PATH[r]) return;
    const path = r === "learn" && a ? `/learn/${a}` : VIEW_PATH[r];
    track(path, r === "learn" && a && SEM[a] ? `Learn · ${SEM[a].short} ${SEM[a].name}` : path.slice(1));
  }

  /* ---------- quiz engine ---------- */
  let S = null, timerInt = null;
  const isNumOpt = o => /^\$-?[\d.,]+\$$/.test(o.trim());
  function buildInstance(q, fresh) {
    let base = { q: q.q, o: q.o.slice(), a: q.a, x: q.x, fresh: false };
    if (fresh && q.gen) { try { const g = q.gen(); if (g && g.o && g.o.length === 4) base = { q: g.q, o: g.o, a: 0, x: g.x, fresh: true }; } catch (e) { /* keep bank version */ } }
    let order = [0, 1, 2, 3];
    if (base.o.every(isNumOpt) && (ST.shuffle || base.fresh)) order.sort((i, j) => parseFloat(base.o[i].replace(/[$,]/g, "")) - parseFloat(base.o[j].replace(/[$,]/g, "")));
    else if (ST.shuffle || base.fresh) order = shuffle(order);
    return { id: q.id, q: base.q, o: order.map(i => base.o[i]), a: order.indexOf(base.a), x: base.x, fresh: base.fresh };
  }
  function orderIds(ids, order) {
    if (order === "bank") return ids.slice().sort((a, b) => { const A = QM[a], B = QM[b]; return SEMS.findIndex(s => s.id === A.sem) - SEMS.findIndex(s => s.id === B.sem) || A.n - B.n; });
    if (order === "random") return shuffle(ids);
    const sc = id => { const r = P.q[id]; let v = Math.random() * 0.8; if (!r || !r.a) v += 2; else { v += (1 - (r.s || 0)) * 2; if (r.fx) v += 3; } return v; };
    return ids.map(id => [id, sc(id)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  }
  function startSession(o) {
    let ids = orderIds(o.ids, o.order || ST.order);
    const size = o.size || ST.size;
    if (!o.keepAll && size !== "all") ids = ids.slice(0, +size);
    if (!ids.length) { toast("No questions match these settings."); return; }
    const fresh = o.fresh != null ? o.fresh : ST.fresh;
    S = { mode: o.mode, title: o.title, back: o.back || "#ex", ids, i: 0, inst: ids.map(id => buildInstance(QM[id], fresh)), ans: [], mock: !!o.mock, start: Date.now(), timerEnd: o.timer ? Date.now() + o.timer * 60000 : null, done: false, id: "s" + Date.now().toString(36) };
    track(`start/${o.mode}${o.tag ? "/" + o.tag : ""}`, `Started: ${o.title}`, true);
    if (location.hash === "#play") render(); else location.hash = "#play";
    window.scrollTo(0, 0);
    if (S.timerEnd) { clearInterval(timerInt); timerInt = setInterval(tickTimer, 1000); }
  }
  function tickTimer() {
    if (!S || !S.timerEnd || S.done) { clearInterval(timerInt); return; }
    const left = Math.max(0, S.timerEnd - Date.now()), el = $(".timer");
    if (el) { el.textContent = fmtTime(left); el.classList.toggle("low", left < 5 * 60000); }
    if (left <= 0) { clearInterval(timerInt); toast("Time's up! Your exam was submitted."); submitMock(); }
  }
  const fmtTime = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function choose(k) {
    if (!S || S.done) return;
    const it = S.inst[S.i];
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
    if (n) { P.sessions.push({ id: S.id, t: Date.now(), mode: S.mode, title: S.title, n, c }); P.sessions = P.sessions.slice(-150); persist(); track(`finish/${S.mode}`, `Finished: ${S.title}`, true); }
    if (ST.sfx && n) Sound.done();
    render(); window.scrollTo(0, 0);
  }
  function submitMock() {
    if (!S || !S.mock || S.done) return;
    clearInterval(timerInt);
    S.inst.forEach((it, i) => { const a = S.ans[i]; if (a) { a.ok = a.pick === it.a; record(it.id, a.ok); } else { S.ans[i] = { pick: null, ok: false }; record(it.id, false); } });
    const by = {}; S.inst.forEach((it, i) => { const sem = QM[it.id].sem; by[sem] = by[sem] || [0, 0]; by[sem][1]++; if (S.ans[i].ok) by[sem][0]++; });
    const c = S.ans.filter(a => a.ok).length;
    P.mocks.push({ id: S.id, t: Date.now(), n: S.ids.length, c, by, mins: Math.round((Date.now() - S.start) / 60000) }); P.mocks = P.mocks.slice(-40);
    P.sessions.push({ id: S.id, t: Date.now(), mode: "mock", title: S.title, n: S.ids.length, c }); P.sessions = P.sessions.slice(-150);
    persist(); S.done = true; if (ST.sfx) Sound.done(); render(); window.scrollTo(0, 0);
    const band = c === 20 ? "20" : c >= 18 ? "18-19" : c >= 15 ? "15-17" : c >= 11 ? "11-14" : "0-10";
    track(`mock-score/${band}`, `Mock exam score ${band} of 20`, true);
  }
  function buildMock() {
    const ids = [];
    Object.entries(EXAM_SLOTS).forEach(([sem, k]) => {
      const pool = shuffle(bySem(sem).filter(q => !q.flag)), used = new Set(), pick = [];
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
  };
  const ic = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  const semBadge = sem => `<span class="badge sem sem-${sem}"><span class="bub">${SEM[sem].short}</span>${esc(SEM[sem].name)}</span>`;
  const diffBadge = d => `<span class="badge diff d${d}"><span class="pips"><i></i><i></i><i></i></span>${DIFF[d]}</span>`;
  const semNum = sem => `<span class="semnum sem-${sem}">${SEM[sem].short}</span>`;
  function ring(v, sub) {
    const r = 50, C = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${pct(v)} ${sub}"><circle class="trk" cx="60" cy="60" r="${r}" fill="none" stroke-width="12"/><circle class="val" cx="60" cy="60" r="${r}" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - v)}" transform="rotate(-90 60 60)"/><text x="60" y="62" text-anchor="middle" font-size="26">${pct(v)}</text><text class="sub" x="60" y="82" text-anchor="middle" font-size="10.5">${sub}</text></svg>`;
  }
  function snippet(s) { return T(s.replace(/<div class="tbl-wrap">[\s\S]*?<\/table><\/div>/g, " [table] ").replace(/\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}/g, "[\\cdots]").replace(/\$\$[\s\S]*?\$\$/g, " … ")); }
  const meter = (v, sem) => `<div class="meter ${sem ? "sem-" + sem : ""}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
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
  function render() {
    const { r, a, s } = route(); const v = $("#view");
    const navKey = r === "play" ? (S && S.mock ? "mock" : S && S.mode === "fix" ? "fix" : S && S.mode === "diff" ? "diff" : "ex") : r;
    $$("[data-nav]").forEach(el => el.classList.toggle("on", el.dataset.nav === navKey || (navKey === "diff" || navKey === "mock") && el.dataset.nav === "ex" && el.closest(".tabbar")));
    let html = "";
    if (r === "learn") html = a ? vLearn(a) : vLearnIndex();
    else if (r === "ex") html = vEx();
    else if (r === "diff") html = vDiff();
    else if (r === "mock") html = vMock();
    else if (r === "fix") html = vFix();
    else if (r === "progress") html = vProgress();
    else if (r === "play") html = S ? (S.done ? vSummary() : vPlay()) : vEx();
    else html = vHome();
    v.innerHTML = html;
    typeset(v);
    $$("[data-w]", v).forEach(el => { const fn = WIDGETS[el.dataset.w]; if (fn) { try { fn(el.querySelector(".wbody"), el); } catch (e) { el.querySelector(".wbody").textContent = "This visual couldn't load."; } } });
    if (r === "learn" && a && s) { const t = document.getElementById("sec-" + s); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 30); }
    else if (r !== "play") { /* keep scroll for in-page re-renders */ }
    updateFixCount(); syncBadge();
    document.title = "Econometrics Midterm Prep";
  }
  window.addEventListener("hashchange", () => { render(); trackView(); const { r, s } = route(); if (!(r === "learn" && s)) window.scrollTo(0, 0); });

  /* ---------- views ---------- */
  function vHome() {
    const rd = readiness(), tt = totals(), fx = fixIds().length, best = P.mocks.length ? Math.max(...P.mocks.map(m => m.c)) : null;
    const st = SEMS.map(s => ({ s, ...semStats(s.id) }));
    const steps = [];
    if (fx) steps.push({ i: "fix", t: `Clear your Fix-it deck (${fx})`, d: "Questions you missed. Answer each correctly twice in a row to clear it.", act: "start-fix", sem: "" });
    if (!tt.seen) steps.push({ i: "book", t: "Start with S0 · Matrix toolkit", d: "Ten minutes of theory, then the first exercises.", href: "#learn-s0", sem: "s0" });
    const weak = st.filter(x => x.seen).sort((a, b) => a.mastery - b.mastery)[0];
    if (weak && weak.mastery < 0.88) steps.push({ i: "target", t: `Strengthen ${weak.s.short} · ${weak.s.name}`, d: `Mastery ${pct(weak.mastery)}. A smart session puts your weakest and unseen questions first.`, act: "start-sem", sem: weak.s.id });
    const fresh = st.find(x => x.seen < x.total && x.s.id !== (weak && weak.s.id));
    if (fresh && steps.length < 3) steps.push({ i: "spark", t: `New ground: ${fresh.total - fresh.seen} untried in ${fresh.s.short}`, d: `${fresh.s.name}. ${fresh.seen ? "Keep going." : "Read the Learn page first, then practise."}`, act: fresh.seen ? "start-sem" : "", href: fresh.seen ? "" : `#learn-${fresh.s.id}`, sem: fresh.s.id });
    if (tt.seen >= QS.length * 0.5 && steps.length < 4) steps.push({ i: "clip", t: "Take a mock exam", d: "20 questions in the real format, with no feedback until you submit.", href: "#mock", sem: "" });
    const stepHTML = steps.slice(0, 4).map(x => {
      const inner = `<span class="ic ${x.sem ? "sem-" + x.sem : ""}">${ic(x.i)}</span><span><b>${x.t}</b><span>${x.d}</span></span>`;
      return x.act ? `<button type="button" class="step-item" data-act="${x.act}" data-sem="${x.sem}">${inner}</button>` : `<a class="step-item" href="${x.href}" style="text-decoration:none;color:inherit">${inner}</a>`;
    }).join("");
    const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    return `<header class="pagehead"><span class="eyebrow">Econometrics · midterm · 20 multiple-choice questions</span><h1>${greet}. Let's aim for 100.</h1>
      <p>Every question here comes from your question bank (${QS.length} questions). The exam draws 2–3 per topic and may change the numbers, so learn the method, then drill until the method is automatic.</p></header>
      <section class="card hero">${ring(rd, "readiness")}<div class="stack"><div><div class="eyebrow">Exam readiness</div><h2>${level(rd)}</h2></div>
        <p class="ink2 small">Your mastery across seminars, weighted like the exam (3 questions from each seminar + 2 Stata). Mastery grows with correct answers and fades with misses.</p>
        <div class="grid three"><div class="tile"><span class="v tabnum">${tt.seen}<span class="small muted">/${QS.length}</span></span><span class="l">questions tried</span></div><div class="tile"><span class="v">${tt.acc == null ? "—" : pct(tt.acc)}</span><span class="l">accuracy</span></div><div class="tile"><span class="v">${best == null ? "—" : best + "/20"}</span><span class="l">best mock exam</span></div></div></div></section>
      <section class="card stack"><h3>Next best steps</h3><div class="next-steps">${stepHTML || '<p class="muted">You\'re all caught up. Take a mock exam!</p>'}</div></section>
      <section class="stack"><div class="row between"><h3>Your seminars</h3><a class="btn sm ghost" href="#progress">Full progress</a></div>
      <div class="grid">${st.map(x => `<div class="card semcard sem-${x.s.id}"><div class="top">${semNum(x.s.id)}<div><h3>${x.s.name}</h3><div class="lvl">${level(x.mastery)} · ${pct(x.mastery)}</div></div></div>${meter(x.mastery, x.s.id)}<div class="meta"><span>${x.seen}/${x.total} tried</span><span>${x.acc == null ? "no answers yet" : pct(x.acc) + " correct"}</span></div><div class="row"><a class="btn sm ghost" href="#learn-${x.s.id}">${ic("book")}Learn</a><button type="button" class="btn sm" data-act="start-sem" data-sem="${x.s.id}">${ic("target")}Practice</button></div></div>`).join("")}</div></section>`;
  }

  function vLearnIndex() {
    return `<header class="pagehead"><span class="eyebrow">Learn</span><h1>Theory, built from the question bank</h1><p>Each page teaches only what the bank tests: a picture to hang the idea on, worked examples with the bank's own numbers, the traps the wrong options are built from, and a formula sheet.</p></header>
      <div class="grid two">${LEARN.map(L => { const n = bySem(L.id).length; return `<div class="card semcard sem-${L.id}"><div class="top">${semNum(L.id)}<div><div class="eyebrow">${L.sub}</div><h3>${L.name}</h3></div></div><p class="ink2 small">${T(L.blurb)}</p><div class="meta"><span>${L.sections.length} topics</span><span>${n} bank questions</span></div><div class="row"><a class="btn sm" href="#learn-${L.id}">${ic("book")}Open</a><button type="button" class="btn sm ghost" data-act="start-sem" data-sem="${L.id}">Practice</button></div></div>`; }).join("")}</div>`;
  }
  function vLearn(sem) {
    const L = LEARN.find(x => x.id === sem); if (!L) return vLearnIndex();
    const idx = LEARN.indexOf(L), prev = LEARN[idx - 1], nxt = LEARN[idx + 1];
    const count = tags => bySem(sem).filter(q => tags.includes(q.t)).length;
    return `<div class="row"><a class="btn sm ghost" href="#learn">${ic("back")}All seminars</a></div>
      <header class="learn-hero">${semNum(sem)}<div class="pagehead"><span class="eyebrow">${L.sub}</span><h1>${L.name}</h1><p>${T(L.blurb)}</p></div></header>
      <div class="metaphor"><span class="mi">${ic("bulb")}</span><div><div class="eyebrow" style="color:inherit">The picture to remember</div><div>${T(L.metaphor)}</div></div></div>
      <nav class="toc" aria-label="Topics">${L.sections.map((s, i) => `<button type="button" class="chip" data-act="jump" data-id="sec-${s.id}">${i + 1}. ${T(s.title)}</button>`).join("")}<button type="button" class="chip" data-act="jump" data-id="sec-patterns">Exam patterns</button></nav>
      ${L.sections.map((s, i) => { const n = count(s.tags); return `<section class="card lsec sem-${sem}" id="sec-${s.id}"><div class="stack"><h2><span class="n">${i + 1}</span>${T(s.title)}</h2><div class="prose">${T(s.html)}</div>${n ? `<div class="row"><button type="button" class="btn sm soft" data-act="practice-tags" data-sem="${sem}" data-tags="${s.tags.join(",")}" data-title="${esc(plain(s.title))}">${ic("target")}Practice this topic (${n} questions)</button></div>` : ""}</div></section>`; }).join("")}
      <section class="card stack lsec sem-${sem}" id="sec-patterns"><h2>Exam patterns in the bank</h2><p class="ink2 small">Every question in the bank fits one of these patterns. Learn the recipe and the numbers won't matter.</p>
        ${L.patterns.map(p => `<div class="pattern"><div class="ph"><b>${T(p.title)}</b><button type="button" class="btn sm" data-act="practice-pattern" data-sem="${sem}" data-qs="${p.qs.join(",")}" data-title="${esc(plain(p.title))}">Practice ${p.qs.length}</button></div><div>${T(p.recipe)}</div><div class="qs">Bank questions: ${p.qs.map(n => "Q" + n).join(", ")}</div></div>`).join("")}</section>
      <section class="card stack sem-${sem}"><h2>Formula sheet</h2><div class="formula-sheet">${L.sheet.map(f => `<div class="f"><span class="muted small">${T(f[0])}</span><span>${T(f[1])}</span></div>`).join("")}</div></section>
      <div class="row between">${prev ? `<a class="btn ghost" href="#learn-${prev.id}">${ic("back")}${SEM[prev.id].short} · ${prev.name}</a>` : "<span></span>"}<button type="button" class="btn lg" data-act="start-sem" data-sem="${sem}">${ic("target")}Practice all ${SEM[sem].short} questions</button>${nxt ? `<a class="btn ghost" href="#learn-${nxt.id}">${SEM[nxt.id].short} · ${nxt.name}${ic("arrow")}</a>` : "<span></span>"}</div>`;
  }

  function optionsBar(withOrder = true) {
    return `<div class="card flat stack" style="padding:16px 18px"><div class="row"><span class="small muted" style="min-width:150px">Questions per session</span><div class="chips">${["10", "20", "all"].map(v => chip("set-size", v, v === "all" ? "All" : v, ST.size === v)).join("")}</div></div>
      ${withOrder ? `<div class="row"><span class="small muted" style="min-width:150px">Order</span><div class="chips">${[["smart", "Smart (weak first)"], ["bank", "Bank order"], ["random", "Random"]].map(([v, l]) => chip("set-order", v, l, ST.order === v)).join("")}</div></div>` : ""}
      <div class="row"><span class="small muted" style="min-width:150px">Options</span><div class="chips">${chip("toggle-fresh", "", `${ic("dice")} Fresh numbers`, ST.fresh, 'style="gap:6px"').replace("<svg ", '<svg style="width:16px;height:16px" ')}${chip("toggle-shuffle", "", "Shuffle answer order", ST.shuffle)}</div></div>
      <p class="small muted">Fresh numbers: calculation questions get new numbers each time, like the real exam. Same method, different values.</p></div>`;
  }
  function vEx() {
    const cnt = (sem, d) => bySem(sem).filter(q => q.d === d).length;
    return `<header class="pagehead"><span class="eyebrow">Exercises</span><h1>Multiple-choice practice by seminar</h1><p>Pick a seminar. You get instant feedback, an explanation of <i>why</i>, and anything you miss goes to your Fix-it deck.</p></header>
      ${optionsBar()}
      <div class="grid">${SEMS.map(s => { const x = semStats(s.id); return `<div class="card semcard sem-${s.id}"><div class="top">${semNum(s.id)}<div><h3>${s.id === "mix" ? "Combined · Stata output" : s.name}</h3><div class="lvl">${level(x.mastery)} · ${pct(x.mastery)}</div></div></div>${meter(x.mastery, s.id)}
        <div class="meta"><span>${x.total} questions</span><span>${cnt(s.id, 1)} easy · ${cnt(s.id, 2)} medium · ${cnt(s.id, 3)} hard</span></div>
        <div class="row"><button type="button" class="btn sm" data-act="start-sem" data-sem="${s.id}">${ic("target")}Practice</button><a class="btn sm ghost" href="#learn-${s.id}">Learn first</a></div></div>`; }).join("")}
        <div class="card semcard" style="--t:var(--sun-soft)"><div class="top"><span class="semnum" style="background:var(--sun);color:#3b2a00">${ic("dice").replace("<svg ", '<svg style="width:24px;height:24px" ')}</span><div><h3>All seminars, mixed</h3><div class="lvl">${QS.length} questions</div></div></div><p class="small ink2">Interleaving topics is harder, and it's exactly what the exam does.</p><div class="row"><button type="button" class="btn sm" data-act="start-all">${ic("target")}Practice mixed</button></div></div></div>`;
  }
  function vDiff() {
    const pool = QS.filter(q => ST.dsems.includes(q.sem));
    const desc = { 1: "Definitions and one-step recall: the marks you can't afford to lose.", 2: "One calculation or one conceptual distinction.", 3: "Multi-step calculations, sign traps and subtle concepts." };
    return `<header class="pagehead"><span class="eyebrow">By difficulty</span><h1>Choose your level</h1><p>Every question has a difficulty badge. Warm up on Easy, build speed on Medium, and finish with Hard to lock in the full 100.</p></header>
      <div class="card flat stack" style="padding:16px 18px"><div class="row"><span class="small muted" style="min-width:150px">Seminars included</span><div class="chips">${SEMS.map(s => `<button type="button" class="chip sem-${s.id}${ST.dsems.includes(s.id) ? " on" : ""}" data-act="toggle-dsem" data-v="${s.id}"><span class="dot"></span>${s.short}</button>`).join("")}</div></div></div>
      ${optionsBar(false)}
      <div class="grid three">${[1, 2, 3].map(d => { const qs = pool.filter(q => q.d === d); let a = 0, c = 0; qs.forEach(q => { const r = P.q[q.id]; if (r) { a += r.a; c += r.c; } }); return `<div class="card stack"><div class="badges">${diffBadge(d)}</div><h3>${DIFF[d]}</h3><p class="small ink2">${desc[d]}</p><div class="meta small muted">${qs.length} questions · ${a ? pct(c / a) + " correct so far" : "not tried yet"}</div><button type="button" class="btn" data-act="start-diff" data-d="${d}" ${qs.length ? "" : "disabled"}>${ic("target")}Start ${DIFF[d].toLowerCase()}</button></div>`; }).join("")}</div>`;
  }
  function vMock() {
    const hist = P.mocks.slice().reverse();
    return `<header class="pagehead"><span class="eyebrow">Mock exam</span><h1>A full practice midterm</h1><p>20 questions, drawn like the real paper: 3 from each seminar (S0–S5) plus 2 Stata-output questions. You get no feedback until you submit, then a full review.</p></header>
      <div class="card stack"><div class="row"><span class="small muted" style="min-width:120px">Timer</span><div class="chips">${[[0, "Off"], [30, "30 min"], [40, "40 min"], [60, "60 min"]].map(([v, l]) => chip("set-timer", v, l, +ST.mockTimer === v)).join("")}</div></div>
        <div class="row"><span class="small muted" style="min-width:120px">Numbers</span><div class="chips">${chip("toggle-mockfresh", "", "Fresh numbers (recommended)", ST.mockFresh)}</div></div>
        <div class="row"><button type="button" class="btn lg" data-act="start-mock">${ic("clip")}Start mock exam</button></div></div>
      <section class="card stack"><h3>Past attempts</h3>${hist.length ? `<div class="bars">${hist.slice(0, 10).map(m => `<div class="barrow"><div class="lab"><span class="nm">${new Date(m.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${new Date(m.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></div><div class="track" data-tip="${m.c}/${m.n} correct${m.mins ? " in " + m.mins + " min" : ""}"><div class="fill" style="width:${m.c / m.n * 100}%;background:${m.c / m.n >= 0.9 ? "var(--good)" : "var(--accent)"}"></div></div><div class="val">${m.c}/${m.n}</div></div>`).join("")}</div>` : `<p class="muted small">No attempts yet. Your scores will appear here.</p>`}</section>`;
  }
  function vFix() {
    const ids = fixIds();
    if (!ids.length) return `<header class="pagehead"><span class="eyebrow">Fix-it deck</span><h1>Nothing to fix right now</h1><p>Any question you get wrong lands here. Answer it correctly twice in a row and it leaves the deck.</p></header>
      <div class="card empty"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" style="fill:var(--good-soft)"/><path d="m25 41 10 10 21-22" style="fill:none;stroke:var(--good);stroke-width:6;stroke-linecap:round;stroke-linejoin:round"/></svg><b>Clean slate</b><span class="small">Go practise and come back when something trips you up.</span><a class="btn" href="#ex">Go to exercises</a></div>`;
    const groups = SEMS.map(s => [s, ids.filter(id => QM[id].sem === s.id)]).filter(g => g[1].length);
    return `<header class="pagehead"><span class="eyebrow">Fix-it deck</span><h1>${ids.length} question${ids.length > 1 ? "s" : ""} to fix</h1><p>These are the questions you got wrong. Each one leaves the deck after <b>two correct answers in a row</b>. That spacing is what makes it stick.</p></header>
      <div class="row"><button type="button" class="btn lg" data-act="start-fix">${ic("fix")}Start fixing (${ids.length})</button><button type="button" class="btn ghost" data-act="start-fix-fresh">${ic("dice").replace("<svg ", '<svg style="width:18px;height:18px" ')}With fresh numbers</button></div>
      ${groups.map(([s, list]) => `<section class="card stack sem-${s.id}"><div class="row">${semNum(s.id)}<h3>${s.name}</h3></div>${list.map(id => { const q = QM[id], r = P.q[id]; const sec = secFor(q); return `<div class="pattern"><div class="ph"><div class="badges">${diffBadge(q.d)}<span class="badge plain">Bank Q${q.n}</span><span class="badge plain">${esc(TAGS[q.t] || q.t)}</span></div><span class="small muted">missed ${r.w || 1}× · ${r.fs || 0}/2 to clear</span></div><div class="snip">${snippet(q.q)}</div><div class="row"><button type="button" class="btn sm" data-act="start-one" data-id="${id}">Try it now</button>${sec ? `<a class="btn sm ghost" href="#learn-${sec.sem}-${sec.sec}">Review theory</a>` : ""}<button type="button" class="btn sm ghost" data-act="unfix" data-id="${id}">I've got it, remove</button></div></div>`; }).join("")}</section>`).join("")}`;
  }
  function vProgress() {
    const rd = readiness(), tt = totals(), st = SEMS.map(s => ({ s, ...semStats(s.id) }));
    const byD = [1, 2, 3].map(d => { let a = 0, c = 0, seen = 0; QS.filter(q => q.d === d).forEach(q => { const r = P.q[q.id]; if (r && r.a) { a += r.a; c += r.c; seen++; } }); return { d, a, c, seen, tot: QS.filter(q => q.d === d).length }; });
    const tagMap = {}; QS.forEach(q => { const r = P.q[q.id]; if (!r || !r.a) return; const k = q.sem + ":" + q.t; const m = tagMap[k] || (tagMap[k] = { sem: q.sem, t: q.t, s: 0, n: 0, a: 0, c: 0 }); m.s += r.s || 0; m.n++; m.a += r.a; m.c += r.c; });
    const weak = Object.values(tagMap).map(m => ({ ...m, str: m.s / m.n })).sort((a, b) => a.str - b.str).slice(0, 6);
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dayKey(d); days.push({ d, v: P.days[k] || { n: 0, c: 0 } }); }
    const maxD = Math.max(1, ...days.map(x => x.v.n));
    return `<header class="pagehead"><span class="eyebrow">Progress</span><h1>Seminar by seminar</h1><p>Mastery is a memory score for each question: it grows with each correct answer and drops sharply with a miss. Seminar mastery averages your questions, with harder ones weighted more.</p></header>
      <div class="grid three"><div class="tile"><span class="v">${pct(rd)}</span><span class="l">exam readiness · ${level(rd)}</span></div><div class="tile"><span class="v tabnum">${tt.seen}<span class="small muted">/${QS.length}</span></span><span class="l">questions tried</span></div><div class="tile"><span class="v">${tt.acc == null ? "—" : pct(tt.acc)}</span><span class="l">accuracy over ${tt.att} answers</span></div></div>
      <section class="card stack"><h3>Mastery by seminar</h3><div class="bars">${st.map(x => `<div class="barrow"><div class="lab"><span class="badge sem sem-${x.s.id}" style="padding:2px"><span class="bub">${x.s.short}</span></span><span class="nm">${x.s.name}</span></div><div class="track" data-tip="${x.s.short}: ${pct(x.mastery)} mastery · ${level(x.mastery)}"><div class="fill" style="width:${x.mastery * 100}%"></div></div><div class="val">${pct(x.mastery)}</div><div class="sublab">${level(x.mastery)} · ${x.acc == null ? "no answers yet" : pct(x.acc) + " correct"} · tried ${x.seen}/${x.total}</div></div>`).join("")}</div></section>
      <div class="grid two">
        <section class="card stack"><h3>Accuracy by difficulty</h3><div class="bars">${byD.map(x => `<div class="barrow"><div class="lab">${diffBadge(x.d)}</div><div class="track" data-tip="${x.a ? `${x.c}/${x.a} correct` : "no answers yet"} · ${x.seen}/${x.tot} tried"><div class="fill" style="width:${x.a ? x.c / x.a * 100 : 0}%"></div></div><div class="val">${x.a ? pct(x.c / x.a) : "—"}</div></div>`).join("")}</div></section>
        <section class="card stack"><h3>Last 14 days</h3><div class="daystrip">${days.map(x => `<div class="d ${x.v.n ? "" : "zero"}" data-tip="${x.d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${x.v.n} answers${x.v.n ? ", " + pct(x.v.c / x.v.n) + " correct" : ""}"><i style="height:${Math.max(2, x.v.n / maxD * 100)}%"></i></div>`).join("")}</div><div class="daylabels">${days.map((x, i) => `<span>${i % 2 === 1 ? "" : x.d.getDate()}</span>`).join("")}</div></section></div>
      <section class="card stack"><h3>Weakest topics</h3>${weak.length ? `<div class="next-steps">${weak.map(w => `<button type="button" class="step-item" data-act="practice-tags" data-sem="${w.sem}" data-tags="${w.t}" data-title="${esc(TAGS[w.t] || w.t)}"><span class="ic sem-${w.sem}"><b style="font-size:.78rem">${SEM[w.sem].short}</b></span><span><b>${esc(TAGS[w.t] || w.t)}</b><span>strength ${pct(w.str)} · ${w.c}/${w.a} correct · tap to practise</span></span></button>`).join("")}</div>` : `<p class="muted small">Answer a few questions and your weak spots will show up here.</p>`}</section>
      <section class="card stack"><h3>Mock exams</h3>${P.mocks.length ? `<div class="bars">${P.mocks.slice(-8).map(m => `<div class="barrow"><div class="lab"><span class="nm">${new Date(m.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div><div class="track" data-tip="${m.c}/${m.n} correct"><div class="fill" style="width:${m.c / m.n * 100}%"></div></div><div class="val">${m.c}/${m.n}</div></div>`).join("")}</div>` : `<p class="muted small">No mock exams yet. <a href="#mock">Take one</a> once you've practised each seminar.</p>`}</section>
      <section class="card stack"><h3>Your data</h3><div class="sync"><i></i><span>Saved on this device</span></div><p class="small ink2">When this page runs inside Claude, progress is stored privately in your account, so it follows you across devices. A copy is always kept in this browser too.</p><div class="row"><button type="button" class="btn danger sm" data-act="reset">Reset all progress</button></div></section>`;
  }

  function stataBlock(q) {
    if (q.so && typeof STATA_OUT !== "undefined" && STATA_OUT[q.so]) return `<div class="stata"><div class="sl">Stata output</div><pre>${esc(STATA_OUT[q.so])}</pre></div>`;
    if (q.cmd) return `<div class="stata"><div class="sl">Stata commands</div><pre>${esc(q.cmd)}</pre><div class="note">${q.flag ? "Your FoS.DTA file wasn't available, so there's no output to show and this answer key is <b>inferred</b>. Run the command in Stata to confirm it. In the exam the output screenshot will be given." : "The FoS output isn't shown (dataset not available), but the answer follows from FWL and the 0.219 → 0.097 numbers in Seminar 4 Q5."}</div></div>`;
    return "";
  }
  function qBadges(q, it) {
    return `<div class="badges">${semBadge(q.sem)}${q.rel ? `<span class="badge plain">uses ${SEM[q.rel].short}</span>` : ""}${diffBadge(q.d)}<span class="badge plain">Bank Q${q.n}</span>${it && it.fresh ? `<span class="badge fresh">Fresh numbers</span>` : ""}${q.flag ? `<span class="badge flag">Key unverified</span>` : ""}</div>`;
  }
  function vPlay() {
    const it = S.inst[S.i], q = QM[it.id], ans = S.ans[S.i], N = S.ids.length;
    const answered = S.ans.filter(Boolean).length, c = S.ans.filter(a => a && a.ok).length, w = S.ans.filter(a => a && a.ok === false).length;
    const L = "ABCD";
    const opts = it.o.map((o, k) => {
      let cls = "";
      if (S.mock) cls = ans && ans.pick === k ? " picked" : "";
      else if (ans) cls = k === it.a ? " right" : k === ans.pick ? " wrong" : " dim";
      return `<button type="button" class="opt${cls}" data-act="pick" data-k="${k}" ${!S.mock && ans ? "disabled" : ""} aria-label="Option ${L[k]}"><span class="L">${L[k]}</span><span class="T">${T(o)}</span></button>`;
    }).join("");
    const sec = secFor(q);
    const fb = !S.mock && ans ? `<div class="feedback ${ans.ok ? "g" : "b"}" role="status"><div class="fh">${ic(ans.ok ? "check" : "x").replace("<svg ", '<svg style="width:22px;height:22px" ')}${ans.ok ? pick(["Correct!", "Nice one!", "Spot on!", "Yes, exactly."]) : `Not quite. The answer is ${L[it.a]}.`}</div><div class="fx">${T(it.x)}</div>
      <div class="row">${sec ? `<a class="btn sm ghost" href="#learn-${sec.sem}-${sec.sec}">${ic("book")}Review: ${T(sec.title)}</a>` : ""}<button type="button" class="btn" data-act="next">${S.i < N - 1 ? "Next question" : "See results"}${ic("arrow")}</button></div></div>` : "";
    const head = S.mock
      ? `<div class="row between"><div><div class="eyebrow">${esc(S.title)}</div><h2>Question ${S.i + 1} of ${N}</h2></div><div class="row">${S.timerEnd ? `<span class="timer">${fmtTime(S.timerEnd - Date.now())}</span>` : ""}<button type="button" class="btn ${answered === N ? "" : "ghost"}" data-act="submit-mock" data-confirm="0">${answered === N ? "Submit exam" : `Submit (${answered}/${N} answered)`}</button></div></div>
         <div class="qnav">${S.ids.map((_, i) => `<button type="button" data-act="goto" data-i="${i}" class="${S.ans[i] ? "ans" : ""}${i === S.i ? " cur" : ""}" aria-label="Question ${i + 1}">${i + 1}</button>`).join("")}</div>`
      : `<div class="row between"><div><div class="eyebrow">${esc(S.title)}</div><h2>Question ${S.i + 1} of ${N}</h2></div><div class="row"><div class="scorepills"><span class="scorepill g">✓ ${c}</span><span class="scorepill b">✗ ${w}</span></div><button type="button" class="btn sm ghost" data-act="end">End session</button></div></div>`;
    return `<div class="playhead">${head}<div class="progressbar"><i style="width:${(S.mock ? answered : S.i + (ans ? 1 : 0)) / N * 100}%"></i></div></div>
      <article class="card qcard sem-${q.sem}">${qBadges(q, it)}${stataBlock(q)}<div class="qstem">${T(it.q)}</div><div class="opts" role="group" aria-label="Answer options">${opts}</div>${fb}
      ${S.mock ? `<div class="row between"><button type="button" class="btn ghost" data-act="prev" ${S.i ? "" : "disabled"}>${ic("back")}Previous</button><button type="button" class="btn" data-act="next" ${S.i < N - 1 ? "" : "disabled"}>Next${ic("arrow")}</button></div>` : ""}
      <p class="small muted">Keys: <span class="kbd">A</span>–<span class="kbd">D</span> or <span class="kbd">1</span>–<span class="kbd">4</span> to answer · <span class="kbd">Enter</span> for next${S.mock ? " · <span class=\"kbd\">←</span> previous" : ""}</p></article>`;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function vSummary() {
    const N = S.ids.length, n = S.ans.filter(Boolean).length, c = S.ans.filter(a => a && a.ok).length, wrongIds = S.inst.filter((it, i) => S.ans[i] && !S.ans[i].ok).map(it => it.id);
    const ratio = n ? c / n : 0;
    const msg = !n ? "No answers this time." : ratio === 1 ? "Perfect score. That's the 100 you're after." : ratio >= 0.85 ? "Excellent. Clean up the misses and you're there." : ratio >= 0.65 ? "Solid. Review the explanations below, then fix the misses." : "This is how learning starts. Read the explanations, review the theory, try again.";
    const L = "ABCD";
    let by = "";
    if (S.mock) {
      const m = {}; S.inst.forEach((it, i) => { const sem = QM[it.id].sem; m[sem] = m[sem] || [0, 0]; m[sem][1]++; if (S.ans[i].ok) m[sem][0]++; });
      by = `<section class="card stack"><h3>By seminar</h3><div class="bars">${Object.entries(m).map(([sem, v]) => `<div class="barrow"><div class="lab"><span class="badge sem sem-${sem}" style="padding:2px"><span class="bub">${SEM[sem].short}</span></span><span class="nm">${SEM[sem].name}</span></div><div class="track"><div class="fill" style="width:${v[0] / v[1] * 100}%;background:${v[0] === v[1] ? "var(--good)" : "var(--accent)"}"></div></div><div class="val">${v[0]}/${v[1]}</div></div>`).join("")}</div></section>`;
    }
    return `<header class="pagehead"><span class="eyebrow">${esc(S.title)} · results</span><h1>${S.mock ? `${c} / ${N}` : `${c} of ${n} correct`}${S.mock ? ` <span class="muted" style="font-size:.6em">(${pct(c / N)})</span>` : ""}</h1><p>${msg}</p></header>
      <div class="row">${wrongIds.length ? `<button type="button" class="btn" data-act="retry-wrong" data-ids="${wrongIds.join(",")}">${ic("fix")}Practice my ${wrongIds.length} miss${wrongIds.length > 1 ? "es" : ""} again</button>` : ""}<a class="btn ghost" href="${S.mock ? "#mock" : S.back}">${ic("back")}Back</a><a class="btn ghost" href="#progress">${ic("chart")}See progress</a></div>
      ${by}
      <section class="stack"><h3>Review</h3><div class="revlist">${S.inst.map((it, i) => { const a = S.ans[i], q = QM[it.id]; const mk = !a ? "s" : a.ok ? "g" : "b"; return `<details class="revitem"${a && !a.ok ? " open" : ""}><summary><span class="mk ${mk}">${mk === "g" ? "✓" : mk === "b" ? "✗" : "–"}</span><span class="snip">${snippet(it.q)}</span></summary><div class="rb">${qBadges(q, it)}${stataBlock(q)}<div class="qstem">${T(it.q)}</div><div class="opts">${it.o.map((o, k) => `<div class="opt${k === it.a ? " right" : a && a.pick === k ? " wrong" : " dim"}"><span class="L">${L[k]}</span><span class="T">${T(o)}</span></div>`).join("")}</div><div class="feedback ${a && a.ok ? "g" : "b"}"><div class="fx">${T(it.x)}</div></div></div></details>`; }).join("")}</div></section>`;
  }

  /* ---------- actions ---------- */
  const ACT = {
    "start-sem": el => { const sem = el.dataset.sem; startSession({ mode: "sem", tag: sem, title: `${SEM[sem].short} · ${sem === "mix" ? "Combined · Stata output" : SEM[sem].name}`, ids: bySem(sem).map(q => q.id), back: "#ex" }); },
    "start-all": () => startSession({ mode: "all", title: "All seminars, mixed", ids: QS.map(q => q.id) }),
    "start-diff": el => { const d = +el.dataset.d; startSession({ mode: "diff", tag: DIFF[d].toLowerCase(), title: `${DIFF[d]} questions`, ids: QS.filter(q => q.d === d && ST.dsems.includes(q.sem)).map(q => q.id), back: "#diff" }); },
    "start-fix": () => startSession({ mode: "fix", title: "Fix-it deck", ids: fixIds(), keepAll: true, order: "smart", back: "#fix", fresh: false }),
    "start-fix-fresh": () => startSession({ mode: "fix", title: "Fix-it deck · fresh numbers", ids: fixIds(), keepAll: true, order: "smart", back: "#fix", fresh: true }),
    "start-one": el => startSession({ mode: "fix", title: "Fix-it", ids: [el.dataset.id], keepAll: true, back: "#fix", fresh: false }),
    "start-mock": () => startSession({ mode: "mock", mock: true, title: "Mock midterm", ids: buildMock(), keepAll: true, order: "bank", timer: +ST.mockTimer || 0, fresh: ST.mockFresh, back: "#mock" }),
    "practice-tags": el => { const sem = el.dataset.sem, tags = el.dataset.tags.split(","); startSession({ mode: "topic", tag: sem, title: `${SEM[sem].short} · ${el.dataset.title}`, ids: bySem(sem).filter(q => tags.includes(q.t)).map(q => q.id), keepAll: true, back: location.hash || "#learn" }); },
    "practice-pattern": el => { const sem = el.dataset.sem; startSession({ mode: "pattern", tag: sem, title: `${SEM[sem].short} · ${el.dataset.title}`, ids: el.dataset.qs.split(",").map(n => `${sem}-${n}`).filter(id => QM[id]), keepAll: true, order: "bank", back: `#learn-${sem}` }); },
    "retry-wrong": el => startSession({ mode: "fix", title: "Retry misses", ids: el.dataset.ids.split(","), keepAll: true, back: S ? S.back : "#ex" }),
    pick: el => choose(+el.dataset.k),
    next: () => next(),
    prev: () => { if (S && S.i > 0) { S.i--; render(); window.scrollTo(0, 0); } },
    goto: el => { S.i = +el.dataset.i; render(); },
    end: () => finishSession(),
    "submit-mock": el => { const N = S.ids.length, answered = S.ans.filter(Boolean).length; if (answered < N && el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = `${N - answered} unanswered. Tap again to submit`; el.classList.remove("ghost"); return; } submitMock(); },
    jump: el => { const t = document.getElementById(el.dataset.id); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); },
    unfix: el => { const r = P.q[el.dataset.id]; if (r) { r.fx = 0; r.fs = 0; persist(); } render(); toast("Removed from Fix-it"); },
    reset: el => { if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "Tap again to erase all progress"; return; } P = freshP(); persist(); render(); toast("Progress reset"); },
    "set-size": el => { ST.size = el.dataset.v; saveST(); render(); },
    "set-order": el => { ST.order = el.dataset.v; saveST(); render(); },
    "toggle-fresh": () => { ST.fresh = !ST.fresh; saveST(); render(); },
    "toggle-shuffle": () => { ST.shuffle = !ST.shuffle; saveST(); render(); },
    "toggle-dsem": el => { const v = el.dataset.v; ST.dsems = ST.dsems.includes(v) ? ST.dsems.filter(x => x !== v) : [...ST.dsems, v]; saveST(); render(); },
    "set-timer": el => { ST.mockTimer = +el.dataset.v; saveST(); render(); },
    "toggle-mockfresh": () => { ST.mockFresh = !ST.mockFresh; saveST(); render(); },
  };
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); }
  });
  document.addEventListener("keydown", e => {
    if (route().r !== "play" || !S || S.done) return;
    if (e.target.closest("input,select,textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase(), map = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
    if (k in map) { e.preventDefault(); choose(map[k]); }
    else if (k === "enter" || k === "arrowright") { if (e.target.closest("button") && k === "enter") return; e.preventDefault(); next(); }
    else if (k === "arrowleft" && S.mock && S.i > 0) { e.preventDefault(); S.i--; render(); }
  });

  /* ---------- tooltips ---------- */
  let tipEl = null;
  document.addEventListener("mouseover", e => { const t = e.target.closest("[data-tip]"); if (!t) { if (tipEl) tipEl.hidden = true; return; } if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl); } tipEl.textContent = t.dataset.tip; tipEl.hidden = false; });
  document.addEventListener("mousemove", e => { if (tipEl && !tipEl.hidden) { tipEl.style.left = Math.min(window.innerWidth - 270, e.clientX + 14) + "px"; tipEl.style.top = (e.clientY + 16) + "px"; } });

  /* ---------- top bar: music, sound, theme ---------- */
  function musicUI() {
    const playing = Sound.playing(), st = Sound.STATIONS[ST.station];
    const pill = $(".musicpill"); pill.classList.toggle("playing", playing);
    pill.innerHTML = `<span class="eq">${playing ? '<span class="eqbars"><i></i><i></i><i></i></span>' : ic("music")}</span><span class="mlabel">${playing ? esc(st.name) : "Ambient music"}</span>`;
    const pop = $(".popover");
    pop.innerHTML = `<div class="row between"><b>Ambient music</b><button type="button" class="btn sm ${playing ? "ghost" : ""}" id="mus-toggle">${ic(playing ? "pause" : "play")}${playing ? "Pause" : "Play"}</button></div>
      <div class="stack" style="gap:8px">${Object.entries(Sound.STATIONS).map(([id, s]) => `<button type="button" class="station${ST.station === id ? " on" : ""}" data-station="${id}"><span class="si">${ic({ pads: "wave", rain: "rain", lofi: "keys", brown: "noise" }[id])}</span><span><b>${s.name}</b><span>${s.desc}</span></span></button>`).join("")}</div>
      <label class="rng small" style="display:grid;gap:2px">Music volume<input id="mus-vol" type="range" min="0" max="1" step="0.05" value="${ST.musicVol}"></label>
      <hr class="soft"><div class="row between"><b class="small">Answer sounds</b><button type="button" class="chip${ST.sfx ? " on" : ""}" id="sfx-toggle">${ST.sfx ? "On" : "Off"}</button></div>
      <label class="rng small" style="display:grid;gap:2px">Sound effects volume<input id="sfx-vol" type="range" min="0" max="1" step="0.05" value="${ST.sfxVol}"></label>`;
    $("#mus-toggle").onclick = () => { if (Sound.playing()) Sound.stop(); else { Sound.setMusicVol(ST.musicVol); Sound.play(ST.station); track(`music/${ST.station}`, `Music: ${Sound.STATIONS[ST.station].name}`, true); } musicUI(); };
    $$("[data-station]", pop).forEach(b => b.onclick = () => { ST.station = b.dataset.station; saveST(); Sound.setMusicVol(ST.musicVol); Sound.play(ST.station); track(`music/${ST.station}`, `Music: ${Sound.STATIONS[ST.station].name}`, true); musicUI(); });
    $("#mus-vol").oninput = e => { ST.musicVol = +e.target.value; saveST(); Sound.setMusicVol(ST.musicVol); };
    $("#sfx-toggle").onclick = () => { ST.sfx = !ST.sfx; saveST(); sfxBtn(); musicUI(); if (ST.sfx) Sound.correct(); };
    $("#sfx-vol").onchange = e => { ST.sfxVol = +e.target.value; saveST(); Sound.setSfxVol(ST.sfxVol); if (ST.sfx) Sound.correct(); };
  }
  function sfxBtn() { const b = $("#sfx-btn"); b.innerHTML = ic(ST.sfx ? "vol" : "mute"); b.classList.toggle("off", !ST.sfx); b.setAttribute("aria-label", ST.sfx ? "Answer sounds on" : "Answer sounds off"); b.title = b.getAttribute("aria-label"); }
  function themeBtn() { const b = $("#theme-btn"), t = ST.theme; if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); b.innerHTML = ic(t === "dark" ? "moon" : t === "light" ? "sun" : "auto"); b.title = t ? `${t[0].toUpperCase() + t.slice(1)} theme` : "Theme follows your system"; b.setAttribute("aria-label", b.title); }

  function init() {
    buildNav();
    Sound.setSfxVol(ST.sfxVol); Sound.setMusicVol(ST.musicVol);
    sfxBtn(); themeBtn(); musicUI();
    $(".musicpill").onclick = e => { e.stopPropagation(); const p = $(".popover"); p.hidden = !p.hidden; if (!p.hidden) musicUI(); };
    document.addEventListener("click", e => { const p = $(".popover"); if (p && !p.hidden && !e.target.closest(".pop-wrap")) p.hidden = true; });
    $("#sfx-btn").onclick = () => { ST.sfx = !ST.sfx; saveST(); sfxBtn(); if (ST.sfx) Sound.correct(); toast(ST.sfx ? "Answer sounds on" : "Answer sounds off"); };
    $("#theme-btn").onclick = () => { ST.theme = ST.theme === "" ? "light" : ST.theme === "light" ? "dark" : ""; saveST(); themeBtn(); };
    render(); initRemote(); trackView();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
