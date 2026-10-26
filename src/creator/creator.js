/* Study Pack Creator: build packs from a question bank with Claude, review them, preview, export. */
const Creator = (() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = escHtml;
  const L = Pipeline.letters, P = Pipeline.prompts;
  const clone = o => JSON.parse(JSON.stringify(o));
  const slug = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "pack";
  const plainSnip = (s, n) => String(s || "").replace(/\|/g, " ").replace(/\$+/g, "").replace(/\\[a-zA-Z]+/g, " ").replace(/[{}*_#>`]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
  const STAGES = [["extract", "Find the questions"], ["sections", "Organise into sections"], ["solve", "Solve & explain"], ["verify", "Double-check every answer"], ["adjudicate", "Settle disagreements"], ["learn", "Write Learn pages"]];
  const STAGE_IX = Object.fromEntries(STAGES.map((s, i) => [s[0], i]));

  let db = null, uid = null, sample = null, limits = null, downloads = null, ready = false;
  let packs = [], D = null, SRC = null, run = null, view = "library", tab = "questions", editing = null;
  let filters = { sec: "", flagged: false, text: "" }, pendingFiles = null, notice = "";

  /* ---------- persistence ---------- */
  const metaRef = id => db.doc(`data/users/${uid}/pack-${id}`);
  const qCol = id => metaRef(id).collection("questions");
  const lCol = id => metaRef(id).collection("learn");
  let wq = Promise.resolve();
  function write(fn) { wq = wq.then(fn).catch(e => { console.warn("save failed", e); flash(e && e.code === "quota_exceeded" ? "Storage is full: delete an old pack to make room." : "A change couldn't be saved. Check your connection."); }); return wq; }
  function saveMeta() { if (!D) return; D.meta.updatedAt = Date.now(); const m = clone(D.meta); return write(() => metaRef(m.id).set(m)); }
  function saveQ(q) { const c = clone(q), id = D.meta.id; return write(() => qCol(id).doc(c.id).set(c)); }
  function saveLearn(sid) { const c = clone(D.learn[sid]), id = D.meta.id; return write(() => lCol(id).doc(sid).set(c)); }
  function log(line) { D.meta.log = [...(D.meta.log || []), `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}  ${line}`].slice(-40); }

  async function loadList() {
    const snap = await db.collection(`data/users/${uid}`).get();
    packs = snap.docs.filter(d => d.id.startsWith("pack-") && d.exists).map(d => d.data()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  async function openPack(id) {
    const m = await metaRef(id).get(); if (!m.exists) { flash("That pack no longer exists."); return; }
    const [qs, ls] = await Promise.all([qCol(id).limit(1000).get(), lCol(id).get()]);
    D = { meta: m.data(), qs: qs.docs.map(d => d.data()).sort((a, b) => a.order - b.order), learn: Object.fromEntries(ls.docs.map(d => [d.id, d.data()])) };
    SRC = null; editing = null; tab = "questions"; filters = { sec: "", flagged: false, text: "" }; view = "pack"; render();
  }
  async function deletePack(id) {
    const [qs, ls] = await Promise.all([qCol(id).limit(1000).get(), lCol(id).get()]);
    for (const d of qs.docs) await write(() => qCol(id).doc(d.id).delete());
    for (const d of ls.docs) await write(() => lCol(id).doc(d.id).delete());
    await write(() => metaRef(id).delete());
    await loadList(); render(); flash("Pack deleted.");
  }

  /* ---------- helpers ---------- */
  const secById = id => (D.meta.sections || []).find(s => s.id === id);
  const secName = id => (secById(id) || {}).name || "";
  const tier = kind => { const max = D.meta.settings.accuracy === "max"; return kind === "adjudicate" ? "complex" : kind === "learn" ? "default" : max ? "complex" : "default"; };
  const flagOf = q => q.flag || (q.solved && q.answer == null ? "unverified" : "");
  function flash(msg) { notice = msg; const el = $("#c-notice"); if (el) { el.textContent = msg; el.hidden = !msg; } clearTimeout(flash.t); flash.t = setTimeout(() => { notice = ""; const e2 = $("#c-notice"); if (e2) e2.hidden = true; }, 5000); }
  function errCopy(e) {
    const c = e && e.code;
    return ({ rate_limited: "Claude says you've hit a usage or rate limit. Wait a while, then press Continue.", not_granted: "This page isn't allowed to use Claude. Allow it in the artifact's permissions, then Continue.", sampling_disabled: "Claude isn't available for this account right now.", invalid_json: "Claude's reply couldn't be read as data (it may have been cut off). Continue tries again with smaller batches; Skip moves past this part.", prompt_too_large: "This part was too big to send in one request. Continue tries again with smaller batches.", refused: "Claude declined this part of the bank. Skip it, or edit those questions by hand.", upstream_error: "A temporary connection problem. Press Continue to try again.", empty_completion: "Claude returned nothing for this part. Continue tries again; Skip moves on.", session_expired: "Your Claude session expired. Sign in again, then Continue.", image_rejected: "One of the page images was rejected. Skip this part or re-export the PDF.", no_questions: "No multiple-choice questions were found. Check that the file is the question bank, or add notes for the AI and start again." }[c]) || (e && e.message) || "Something went wrong.";
  }
  async function ask(prompt, opts) {
    if (!sample) { const e = new Error("Claude isn't available on this page."); e.code = "sampling_disabled"; throw e; }
    D.meta.calls = (D.meta.calls || 0) + 1;
    return sample.json(prompt, Object.assign({ signal: run.ctl.signal, cache: false }, opts));
  }
  async function pool(items, size, worker) {
    let i = 0, err = null;
    const runner = async () => { while (!err && !run.stopped && i < items.length) { const it = items[i++]; try { await worker(it); } catch (e) { err = err || e; } } };
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, runner));
    if (err) throw err;
  }
  const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
  const imgsFor = qs => { const blobs = [], no = {}; qs.forEach(q => { if (q.img && blobs.length < ((limits && limits.images && limits.images.maxCount) || 0)) { blobs.push(Pipeline.dataUrlToBlob(q.img)); no[q.id] = blobs.length; } }); return { blobs, no }; };

  /* ---------- stages ---------- */
  async function stageExtract() {
    const pages = SRC.pages, n = pages.length, canImg = !!(limits && limits.images) && D.meta.settings.images !== false;
    const hasImg = canImg && pages.some(p => p.blob);
    const per = hasImg ? Math.max(1, Math.min(3, (limits.images.maxCount || 4) - 1)) : 2;
    const chunks = []; for (let k = 0; k < n; k += per) chunks.push({ start: k, end: Math.min(k + per, n) });
    const prog = D.meta.prog.extract || (D.meta.prog.extract = { next: 0, ctx: { lastSection: null, lastNum: null }, notes: "" });
    prog.total = chunks.length;
    for (let ci = prog.next; ci < chunks.length; ci++) {
      if (run.stopped) return;
      const ch = chunks[ci], news = pages.slice(ch.start, ch.end), look = pages[ch.end] || null;
      const imgPages = hasImg ? [...news, look].filter(p => p && p.blob) : [];
      status(`Finding questions: ${ch.start + 1 === ch.end ? "part " + ch.end : `parts ${ch.start + 1}–${ch.end}`} of ${n}`);
      const prompt = P.pExtract({ subject: D.meta.subject, notes: D.meta.notes, images: imgPages.length > 0, newLabels: imgPages.filter(p => p !== look).map(p => p.label), lookLabel: look && imgPages.includes(look) ? look.label : null, lastSection: prog.ctx.lastSection, lastNum: prog.ctx.lastNum, texts: [...news.map(p => ({ kind: "NEW", label: p.label, text: (p.text || "").slice(0, 7000) })), ...(look ? [{ kind: "LOOKAHEAD", label: look.label, text: (look.text || "").slice(0, 2500) }] : [])] });
      const res = await ask(prompt, { images: imgPages.length ? imgPages.map(p => p.blob) : undefined, modelTier: "default" });
      const found = Array.isArray(res && res.questions) ? res.questions : [];
      let last = prog.ctx.lastNum;
      for (const r of found) {
        if (!r || !r.stem) continue;
        const id = "q" + String(D.meta.nextId = (D.meta.nextId || 0) + 1).padStart(4, "0");
        const q = { id, order: D.meta.nextId, num: r.num != null ? String(r.num) : "", secHeading: r.section || prog.ctx.lastSection || "", stem: String(r.stem), options: Array.isArray(r.options) ? r.options.map(String).slice(0, 8) : [], given: /^[A-H]$/i.test(String(r.given || "")) ? String(r.given).toUpperCase() : null, pre: r.pre ? String(r.pre) : "", preLabel: r.preLabel ? String(r.preLabel) : "", img: "", source: news.map(p => p.label).join(", ") };
        if (r.figure && hasImg) { const pg = imgPages[(r.figure.image | 0) - 1]; if (pg) { try { q.img = await Pipeline.cropFigure(pg, r.figure.box) || ""; } catch (e) { } } }
        D.qs.push(q); saveQ(q); last = q.num || last;
      }
      prog.ctx = { lastSection: res && res.section != null ? res.section : prog.ctx.lastSection, lastNum: last };
      if (res && res.notes) prog.notes = (prog.notes + " " + res.notes).trim().slice(0, 2000);
      prog.next = ci + 1; log(`${news.map(p => p.label).join(", ")}: ${found.length} question${found.length === 1 ? "" : "s"}`); saveMeta(); renderLive();
    }
    if (!D.qs.length) { const e = new Error("no questions"); e.code = "no_questions"; throw e; }
    D.meta.bankNotes = prog.notes; D.meta.stage = "sections"; log(`Found ${D.qs.length} questions in total.`); saveMeta();
  }
  async function stageSections() {
    status("Organising questions into sections");
    const items = D.qs.map(q => ({ id: q.id, h: q.secHeading || null, s: plainSnip(q.stem, 130) }));
    const res = await ask(P.pSections({ subject: D.meta.subject, notes: [D.meta.notes, D.meta.bankNotes].filter(Boolean).join(" "), examTotal: D.meta.settings.examTotal || 20, items }), { modelTier: "default" });
    const secs = (res && Array.isArray(res.sections) ? res.sections : []).filter(s => s && Array.isArray(s.questions));
    if (!secs.length) { const e = new Error("no sections"); e.code = "invalid_json"; throw e; }
    const map = {}, shortToId = {};
    const sections = secs.map((s, i) => {
      const id = "s" + (i + 1); let short = String(s.short || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 5) || "S" + (i + 1);
      if (Object.keys(shortToId).includes(short)) short = "S" + (i + 1);
      shortToId[short] = id; shortToId[String(s.short || "")] = id; shortToId[String(s.name || "")] = id;
      s.questions.forEach(qid => { if (!map[qid]) map[qid] = id; });
      return { id, short, name: String(s.name || `Section ${i + 1}`).slice(0, 60), combined: !!s.combined };
    });
    let prev = sections[0].id;
    D.qs.forEach(q => { q.sec = map[q.id] || prev; prev = q.sec; saveQ(q); });
    const used = sections.filter(s => D.qs.some(q => q.sec === s.id));
    const total = Math.max(5, Math.min(100, +(res.exam && res.exam.total) || D.meta.settings.examTotal || 20)), per = {};
    Object.entries((res.exam && res.exam.perSection) || {}).forEach(([k, v]) => { const id = shortToId[k]; if (id && +v > 0) per[id] = Math.round(+v); });
    if (!Object.keys(per).length) used.forEach((s, i) => { per[s.id] = Math.floor(total / used.length) + (i < total % used.length ? 1 : 0); });
    D.meta.sections = used;
    D.meta.exam = { total: Object.values(per).reduce((a, b) => a + b, 0) || total, perSection: per, note: String((res.exam && res.exam.note) || `${total} multiple-choice questions.`) };
    if (!D.meta.subject && res.subject) D.meta.subject = String(res.subject).slice(0, 60);
    D.meta.stage = "solve"; log(`${used.length} sections: ${used.map(s => s.short).join(", ")}.`); saveMeta();
  }
  async function stageSolve() {
    const B = D.meta.prog.solveBatch || 6;
    const pending = D.qs.filter(q => !q.solved && !q.deleted);
    const total = D.qs.filter(q => !q.deleted).length;
    const tasks = chunk(pending, B);
    await pool(tasks, 2, async batch => {
      const { blobs, no } = imgsFor(batch);
      const tags = Object.entries(D.meta.tags || {}).slice(0, 120).map(([k, v]) => `${k} (${v})`);
      status(`Solving & explaining: ${D.qs.filter(q => q.solved).length} of ${total} done`);
      let res;
      try { res = await ask(P.pSolve({ subject: D.meta.subject, notes: D.meta.notes, tags, nVariants: D.meta.settings.variants === false ? 0 : 2, items: batch.map(q => Pipeline.qBlock({ ...q, secName: secName(q.sec) }, true, no[q.id])) }), { images: blobs.length ? blobs : undefined, modelTier: tier("solve") }); }
      catch (e) { if (e && (e.code === "invalid_json" || e.code === "prompt_too_large")) D.meta.prog.solveBatch = Math.max(2, Math.floor(B / 2)); throw e; }
      const byId = Object.fromEntries((Array.isArray(res) ? res : []).filter(r => r && r.id).map(r => [String(r.id), r]));
      for (const q of batch) {
        const r = byId[q.id];
        if (!r) { q.solveTries = (q.solveTries || 0) + 1; if (q.solveTries >= 2) { q.solved = true; q.answer = q.given ? L.indexOf(q.given) : null; q.flag = "unverified"; q.explanation = q.explanation || ""; } saveQ(q); continue; }
        if (Array.isArray(r.options) && r.options.length >= 2 && q.options.length < 2) { q.options = r.options.map(String).slice(0, 8); q.wroteOptions = true; }
        const ai = L.indexOf(String(r.answer || "").trim().toUpperCase().slice(0, 1));
        const gi = q.given ? L.indexOf(q.given) : -1;
        q.aiAnswer = ai >= 0 && ai < q.options.length ? ai : null;
        q.answer = gi >= 0 && gi < q.options.length ? gi : q.aiAnswer;
        q.confidence = ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "medium";
        q.explanation = String(r.explanation || "");
        q.difficulty = [1, 2, 3].includes(+r.difficulty) ? +r.difficulty : 2;
        q.tag = slug(r.tag || r.tagLabel || "general").slice(0, 30) || "general";
        D.meta.tags = D.meta.tags || {}; if (!D.meta.tags[q.tag]) D.meta.tags[q.tag] = String(r.tagLabel || q.tag).slice(0, 40);
        const vs = Array.isArray(r.variants) ? r.variants : [];
        q.variants = vs.filter(Pipeline.checkVariant).map(v => ({ q: String(v.stem), o: v.options.map(String), a: 0, x: String(v.explanation || "") })).filter(v => v.q && v.o.length >= 2);
        q.variantsDropped = vs.length - q.variants.length;
        q.solved = q.answer != null; if (!q.solved) q.solveTries = (q.solveTries || 0) + 1;
        if (q.solveTries >= 2 && !q.solved) { q.solved = true; q.flag = "unverified"; }
        saveQ(q);
      }
      saveMeta(); renderLive();
    });
    if (run.stopped) return;
    if (D.qs.some(q => !q.solved && !q.deleted)) return;
    D.meta.stage = "verify"; log(`Solved ${D.qs.filter(q => q.solved).length} questions.`); saveMeta();
  }
  async function stageVerify() {
    const B = D.meta.prog.verifyBatch || 10;
    const pending = D.qs.filter(q => q.solved && !q.deleted && q.answer != null && !q.verify);
    const total = D.qs.filter(q => q.solved && q.answer != null && !q.deleted).length;
    await pool(chunk(pending, B), 2, async batch => {
      const { blobs, no } = imgsFor(batch);
      status(`Double-checking answers blind: ${D.qs.filter(q => q.verify).length} of ${total}`);
      let res;
      try { res = await ask(P.pVerify({ subject: D.meta.subject, items: batch.map(q => Pipeline.qBlock(q, false, no[q.id])) }), { images: blobs.length ? blobs : undefined, modelTier: tier("verify") }); }
      catch (e) { if (e && (e.code === "invalid_json" || e.code === "prompt_too_large")) D.meta.prog.verifyBatch = Math.max(3, Math.floor(B / 2)); throw e; }
      const byId = Object.fromEntries((Array.isArray(res) ? res : []).filter(r => r && r.id).map(r => [String(r.id), r]));
      for (const q of batch) {
        const r = byId[q.id];
        if (!r) { q.verifyTries = (q.verifyTries || 0) + 1; if (q.verifyTries >= 2) q.verify = { a: null, c: "low" }; saveQ(q); continue; }
        const a = L.indexOf(String(r.answer || "").trim().toUpperCase().slice(0, 1));
        q.verify = { a: a >= 0 && a < q.options.length ? a : null, c: ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "medium" };
        saveQ(q);
      }
      saveMeta(); renderLive();
    });
    if (run.stopped || D.qs.some(q => q.solved && !q.deleted && q.answer != null && !q.verify)) return;
    const agree = D.qs.filter(q => q.verify && q.verify.a === q.answer).length;
    D.meta.stage = "adjudicate"; log(`Blind re-solve agreed on ${agree} of ${total} answers.`); saveMeta();
  }
  const needsAdj = q => {
    if (q.deleted || !q.solved || q.adjudicated || !q.verify) return false;
    const gi = q.given ? L.indexOf(q.given) : -1;
    if (gi >= 0) return q.aiAnswer !== gi || q.verify.a !== gi;
    return q.verify.a !== q.answer || (q.confidence === "low" && q.verify.c === "low");
  };
  async function stageAdjudicate() {
    const pending = D.qs.filter(needsAdj), total = pending.length;
    let done = 0;
    await pool(chunk(pending, 5), 2, async batch => {
      const { blobs, no } = imgsFor(batch);
      status(`Settling disagreements with the strongest model: ${done} of ${total}`);
      const res = await ask(P.pAdjudicate({ subject: D.meta.subject, items: batch.map(q => Pipeline.qBlock(q, false, no[q.id])) }), { images: blobs.length ? blobs : undefined, modelTier: "complex" });
      const byId = Object.fromEntries((Array.isArray(res) ? res : []).filter(r => r && r.id).map(r => [String(r.id), r]));
      for (const q of batch) {
        const r = byId[q.id]; done++;
        const adj = r ? L.indexOf(String(r.answer || "").trim().toUpperCase().slice(0, 1)) : -1;
        const gi = q.given ? L.indexOf(q.given) : -1;
        if (adj < 0 || adj >= q.options.length) { q.flag = "unverified"; q.adjudicated = true; saveQ(q); continue; }
        q.adj = { a: adj, c: r.confidence || "medium", x: String(r.explanation || "") };
        if (gi >= 0) {
          if (adj === gi) q.flag = ""; else { q.flag = "key-conflict"; }
        } else {
          const votes = [q.answer, q.verify.a, adj], count = a => votes.filter(v => v === a).length;
          if (count(adj) >= 2 && adj !== q.answer) { q.answer = adj; q.explanation = q.adj.x || q.explanation; q.flag = ""; }
          else if (count(q.answer) >= 2) q.flag = q.confidence === "low" && r.confidence === "low" ? "unverified" : "";
          else { q.answer = adj; q.explanation = q.adj.x || q.explanation; q.flag = "unverified"; }
        }
        q.adjudicated = true; saveQ(q);
      }
      saveMeta(); renderLive();
    });
    if (run.stopped || D.qs.some(needsAdj)) return;
    const flagged = D.qs.filter(q => !q.deleted && flagOf(q)).length;
    D.meta.stage = D.meta.settings.learn === false ? "done" : "learn"; log(`Checked ${total} disagreement${total === 1 ? "" : "s"}; ${flagged} question${flagged === 1 ? "" : "s"} flagged for your review.`); saveMeta();
  }
  function normalizeLearn(res, sid) {
    const qs = D.qs.filter(q => q.sec === sid && !q.deleted), ids = new Set(qs.map(q => q.id)), tagset = new Set(qs.map(q => q.tag));
    const seen = new Set();
    const topics = (Array.isArray(res && res.topics) ? res.topics : []).filter(t => t && t.title && t.md).map((t, i) => { let id = slug(t.title).slice(0, 30) || "t" + i; while (seen.has(id)) id += "-2"; seen.add(id); return { id, title: String(t.title).slice(0, 90), tags: (Array.isArray(t.tags) ? t.tags : []).map(x => slug(x)).filter(x => tagset.has(x)), md: String(t.md) }; });
    const used = new Set();
    const patterns = (Array.isArray(res && res.patterns) ? res.patterns : []).map(p => ({ title: String((p && p.title) || "Questions"), qs: (Array.isArray(p && p.questions) ? p.questions : []).map(String).filter(id => ids.has(id) && !used.has(id) && used.add(id)), recipe: String((p && p.recipe) || "") })).filter(p => p.qs.length);
    const left = qs.filter(q => !used.has(q.id)).map(q => q.id);
    if (left.length) patterns.push({ title: "Other questions", qs: left, recipe: "" });
    const sheet = (Array.isArray(res && res.sheet) ? res.sheet : []).filter(r => Array.isArray(r) && r.length >= 2).map(r => [String(r[0]), String(r[1])]);
    return { blurb: String((res && res.blurb) || ""), metaphor: String((res && res.metaphor) || ""), topics, patterns, sheet };
  }
  function learnItems(sid) {
    const qs = D.qs.filter(q => q.sec === sid && !q.deleted && q.answer != null), cap = qs.length > 50 ? 320 : 700;
    return qs.map(q => ({ id: q.id, tag: q.tag, question: plainSnip(q.stem, cap) + (q.pre ? " [with software output]" : ""), correct: String(q.options[q.answer] || ""), explanation: String(q.explanation || "").slice(0, 400) }));
  }
  async function genLearn(sid) {
    const sec = secById(sid), tags = [...new Set(D.qs.filter(q => q.sec === sid).map(q => q.tag))];
    const res = await ask(P.pLearn({ subject: D.meta.subject, name: sec.name, tags, notes: D.meta.notes, items: learnItems(sid) }), { modelTier: tier("learn") });
    D.learn[sid] = normalizeLearn(res, sid); saveLearn(sid);
  }
  async function stageLearn() {
    const pending = (D.meta.sections || []).filter(s => !D.learn[s.id] && !(D.meta.prog.learnSkip || []).includes(s.id) && D.qs.some(q => q.sec === s.id));
    await pool(pending, 2, async s => { status(`Writing Learn pages: ${s.short} · ${s.name}`); await genLearn(s.id); log(`Learn page written for ${s.short}.`); saveMeta(); renderLive(); });
    if (run.stopped) return;
    D.meta.stage = "done"; log("Pack ready. Review the flagged questions, then preview and export."); saveMeta();
  }

  /* ---------- running ---------- */
  let statusText = "";
  function status(t) { statusText = t; const el = $("#c-status"); if (el) el.textContent = t; }
  async function ensureSource() {
    if (SRC && SRC.sig === D.meta.source.sig) return true;
    if (pendingFiles && sigOf(pendingFiles) === D.meta.source.sig) {
      status("Reading your files…");
      const pages = await Pipeline.readFiles(pendingFiles, t => status(t));
      SRC = { sig: D.meta.source.sig, pages }; pendingFiles = null;
      if (!D.meta.source.parts) { D.meta.source.parts = pages.length; log(`Read ${pages.length} page${pages.length === 1 ? "" : "s"}.`); saveMeta(); }
      return true;
    }
    D.meta.needFiles = true; return false;
  }
  const sigOf = files => [...files].map(f => `${f.name}:${f.size}`).join("|");
  async function runPipeline() {
    if (run || !D) return;
    run = { ctl: new AbortController(), stopped: false };
    D.meta.lastError = null; D.meta.needFiles = false; renderLive();
    try {
      const progressSig = () => [D.qs.filter(q => q.solved).length, D.qs.filter(q => q.verify).length, D.qs.filter(q => q.adjudicated).length, Object.keys(D.learn).length, (D.meta.prog.learnSkip || []).length, D.meta.prog.extract ? D.meta.prog.extract.next : 0].join("/");
      while (D.meta.stage !== "done" && !run.stopped) {
        const st = D.meta.stage, before = st, sigBefore = progressSig();
        if (st === "extract") { if (!(await ensureSource())) break; await stageExtract(); }
        else if (st === "sections") await stageSections();
        else if (st === "solve") await stageSolve();
        else if (st === "verify") await stageVerify();
        else if (st === "adjudicate") await stageAdjudicate();
        else if (st === "learn") await stageLearn();
        else D.meta.stage = "done";
        if (D.meta.stage === before && !run.stopped && progressSig() === sigBefore) break;
      }
    } catch (e) {
      if (!(e && e.code === "cancelled")) { D.meta.lastError = { code: (e && e.code) || "error", message: (e && e.message) || String(e), stage: D.meta.stage }; log(`Stopped: ${errCopy(e)}`); }
    } finally { saveMeta(); run = null; status(""); render(); }
  }
  function stopRun() { if (!run) return; run.stopped = true; try { run.ctl.abort(); } catch (e) { } log("Stopped by you. Press Continue to pick up from here."); }
  function skipCurrent() {
    const st = D.meta.stage;
    if (st === "extract") { const p = D.meta.prog.extract; if (p) { p.next++; log("Skipped one part of the file."); } }
    else if (st === "solve") { const q = D.qs.find(x => !x.solved && !x.deleted); if (q) { q.solved = true; q.answer = q.given ? L.indexOf(q.given) : null; q.flag = "unverified"; saveQ(q); log(`Skipped solving ${q.id}.`); } }
    else if (st === "verify") { const q = D.qs.find(x => x.solved && !x.deleted && x.answer != null && !x.verify); if (q) { q.verify = { a: null, c: "low" }; saveQ(q); } }
    else if (st === "adjudicate") { const q = D.qs.find(needsAdj); if (q) { q.adjudicated = true; q.flag = "unverified"; saveQ(q); } }
    else if (st === "learn") { const s = (D.meta.sections || []).find(x => !D.learn[x.id] && !(D.meta.prog.learnSkip || []).includes(x.id)); if (s) { D.meta.prog.learnSkip = [...(D.meta.prog.learnSkip || []), s.id]; log(`Skipped the Learn page for ${s.short}.`); } }
    else if (st === "sections") { const s = { id: "s1", short: "S1", name: "All questions", combined: false }; D.meta.sections = [s]; D.qs.forEach(q => { q.sec = "s1"; saveQ(q); }); D.meta.exam = { total: D.meta.settings.examTotal || 20, perSection: { s1: D.meta.settings.examTotal || 20 }, note: "" }; D.meta.stage = "solve"; }
    D.meta.lastError = null; saveMeta(); runPipeline();
  }

  /* ---------- pack assembly ---------- */
  function buildPack() {
    const m = D.meta, secs = m.sections || [], order = Object.fromEntries(secs.map((s, i) => [s.id, i]));
    const qs = D.qs.filter(q => !q.deleted && q.solved && q.answer != null && q.options.length >= 2 && order[q.sec] != null).sort((a, b) => order[a.sec] - order[b.sec] || a.order - b.order);
    const ids = new Set(qs.map(q => q.id)), counter = {};
    const questions = qs.map(q => {
      counter[q.sec] = (counter[q.sec] || 0) + 1;
      const o = { id: q.id, sec: q.sec, n: q.num || counter[q.sec], d: q.difficulty || 2, t: q.tag || "general", q: q.stem, o: q.options, a: q.answer, x: q.explanation || "" };
      if (q.pre) { o.pre = q.pre; o.preLabel = q.preLabel || "Output"; }
      if (q.img) o.img = q.img;
      if (flagOf(q)) o.flag = "unverified";
      if (q.variants && q.variants.length) o.v = q.variants;
      return o;
    });
    const learn = {};
    secs.forEach(s => { const l = D.learn[s.id]; if (l) learn[s.id] = { name: s.name, sub: s.short, blurb: l.blurb, metaphor: l.metaphor, topics: l.topics, patterns: (l.patterns || []).map(p => ({ title: p.title, qs: p.qs.filter(id => ids.has(id)), recipe: p.recipe })).filter(p => p.qs.length), sheet: l.sheet }; });
    const usedSecs = secs.filter(s => questions.some(q => q.sec === s.id));
    const per = {}; usedSecs.forEach(s => { if ((m.exam.perSection || {})[s.id]) per[s.id] = m.exam.perSection[s.id]; });
    return { format: "studypack/1", id: slug(m.slug || m.title), title: m.title, subtitle: m.subtitle || "", subject: m.subject || "", markup: "md", updated: new Date().toISOString().slice(0, 10), exam: { total: Object.values(per).reduce((a, b) => a + b, 0), perSection: per, note: m.exam.note || "" }, sections: usedSecs.map(s => ({ id: s.id, short: s.short, name: s.name, combined: !!s.combined })), tags: m.tags || {}, learn, questions };
  }
  function preview() {
    let pack; try { pack = buildPack(); if (!pack.questions.length) throw new Error("No finished questions yet."); } catch (e) { flash(e.message); return; }
    $("#creator-root").hidden = true; $(".player-root").hidden = false; document.body.classList.add("previewing");
    StudyPlayer.start(pack, { preview: { onExit: exitPreview }, packs: [] });
  }
  function exitPreview() { StudyPlayer.stop(); $(".player-root").hidden = true; $("#creator-root").hidden = false; document.body.classList.remove("previewing"); history.replaceState(null, "", location.pathname + location.search); render(); window.scrollTo(0, 0); }
  async function exportPack() {
    const pack = buildPack(); if (!pack.questions.length) { flash("No finished questions to export yet."); return; }
    const data = JSON.stringify(pack), filename = `${pack.id}.json`;
    if (downloads) {
      try { await downloads.save({ filename, data }); D.meta.exportedAt = Date.now(); saveMeta(); showPublish(filename); return; }
      catch (e) { if (e && e.code === "declined") return; }
    }
    try { await navigator.clipboard.writeText(data); flash(`Couldn't save a file here, so the pack JSON was copied to your clipboard. Paste it into a file named ${filename}.`); showPublish(filename); }
    catch (e) { flash("Saving isn't available in this view. Open the artifact in claude.ai to export."); }
  }
  function showPublish(filename) { const el = $("#c-publish"); if (el) { el.hidden = false; $("#c-pubname").textContent = filename; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); } }

  /* ---------- views ---------- */
  const badge = (t, cls = "plain") => `<span class="badge ${cls}">${t}</span>`;
  const secBadge = sid => { const s = secById(sid); if (!s) return badge("No section"); const i = (D.meta.sections || []).indexOf(s); return `<span class="badge sem sc-${i % 8}"><span class="bub">${esc(s.short)}</span>${esc(s.name)}</span>`; };
  const flagBadge = q => { const f = flagOf(q); return f === "key-conflict" ? badge("Key disagrees with Claude", "flag") : f ? badge("Needs review", "flag") : ""; };
  function vLibrary() {
    return `<header class="pagehead"><span class="eyebrow">Study Pack Creator</span><h1>Turn a question bank into a study pack</h1><p>Upload a question bank. Claude finds every question, solves it, checks each answer a second time blind, writes explanations and Learn pages, and makes fresh-number versions of calculation questions. You review it, preview it as a student, then export it for your site.</p></header>
      ${!sample ? `<div class="note">Claude isn't available in this view, so you can review and export packs but not build new ones. Open this page in claude.ai while signed in.</div>` : ""}
      <div class="row"><button type="button" class="btn lg" data-c="new" ${sample ? "" : "disabled"}>${"+"} New pack</button></div>
      <section class="stack"><h3>Your packs</h3>${packs.length ? `<div class="grid two">${packs.map(p => `<div class="card stack"><div class="eyebrow">${esc(p.subject || "")}</div><h3>${esc(p.title)}</h3><div class="pmeta small muted">${p.counts ? `${p.counts.questions} questions · ${p.counts.flagged} need review · ` : ""}${p.stage === "done" ? "Ready" : "In progress: " + esc((STAGES[STAGE_IX[p.stage]] || ["", ""])[1])} · updated ${new Date(p.updatedAt).toLocaleDateString()}</div><div class="row"><button type="button" class="btn sm" data-c="open" data-id="${esc(p.id)}">Open</button><button type="button" class="btn sm danger" data-c="delete" data-id="${esc(p.id)}" data-confirm="0">Delete</button></div></div>`).join("")}</div>` : `<div class="card empty"><b>No packs yet</b><span class="small">Start with a PDF of your question bank. Word files, text and photos of pages work too.</span></div>`}</section>`;
  }
  function vNew() {
    const maxImg = limits && limits.images ? limits.images.maxCount : 0;
    return `<div class="row"><button type="button" class="btn sm ghost" data-c="library">← Your packs</button></div>
      <header class="pagehead"><span class="eyebrow">New pack</span><h1>Upload your question bank</h1><p>PDF works best, because Claude reads each page as an image, so maths, tables and software output come through properly. Word, text and photos of pages work too.</p></header>
      <form class="card stack" id="c-newform" novalidate>
        <div class="grid two"><label class="fld">Pack title<input id="c-title" required placeholder="e.g. Econometrics Midterm"></label><label class="fld">Subtitle (optional)<input id="c-subtitle" placeholder="e.g. WIUT · 5ECON012C"></label></div>
        <label class="fld">Subject (optional, helps Claude)<input id="c-subject" placeholder="e.g. Econometrics"></label>
        <label class="drop" id="c-drop"><input id="c-files" type="file" multiple accept=".pdf,.docx,.txt,.md,image/*" hidden><b>Choose files</b><span class="small muted">or drop them here · PDF, Word (.docx), text, or page photos</span><span class="small" id="c-filelist"></span></label>
        <label class="fld">Notes for Claude (optional)<textarea id="c-notes" rows="3" placeholder="e.g. The exam has 20 MCQs, 2–3 per topic. Sections are the 'Week' headings. There's no answer key."></textarea></label>
        <div class="grid two">
          <label class="fld">Questions in a mock exam<input id="c-examtotal" type="number" min="5" max="100" value="20"></label>
          <fieldset class="fld"><legend>Answer checking</legend><label class="radio"><input type="radio" name="c-acc" value="standard" checked> Standard: solve, re-solve blind, strongest model settles disagreements</label><label class="radio"><input type="radio" name="c-acc" value="max"> Maximum: strongest model for every step (uses more of your Claude usage)</label></fieldset>
        </div>
        <fieldset class="fld"><legend>Also make</legend><label class="radio"><input type="checkbox" id="c-learn" checked> Learn pages for each section</label><label class="radio"><input type="checkbox" id="c-variants" checked> Fresh-number variants for calculation questions</label><label class="radio"><input type="checkbox" id="c-images" ${maxImg ? "checked" : "disabled"}> Read pages as images and keep figures${maxImg ? "" : " (not available in this view)"}</label></fieldset>
        <p class="small muted">This runs on your own Claude account. Expect roughly one request per 3 pages to find the questions, one per 6 questions to solve them, one per 10 to double-check, a few to settle disagreements, and one per section for notes. A 20-page bank with 200 questions is about 80 requests and 20–40 minutes. You can stop and continue at any time.</p>
        <div class="row"><button type="submit" class="btn lg">Build pack</button><span class="small" style="color:var(--bad)" id="c-formerr"></span></div>
      </form>`;
  }
  function stagePanel() {
    const m = D.meta, cur = STAGE_IX[m.stage] != null ? STAGE_IX[m.stage] : STAGES.length;
    if (m.stage === "done" && !run) return "";
    const err = m.lastError;
    return `<section class="card stack" id="c-stages"><div class="row between"><h3>${run ? "Building your pack" : err ? "Paused: needs your attention" : m.needFiles ? "Re-attach your files to continue" : "Paused"}</h3><span class="small muted">${m.calls || 0} Claude requests so far</span></div>
      <ol class="stages">${STAGES.map(([k, label], i) => { if (k === "learn" && m.settings.learn === false) return ""; const st = i < cur ? "done" : i === cur ? (run ? "run" : "wait") : "todo"; return `<li class="${st}"><span class="dotst"></span>${label}${k === "extract" && m.prog.extract && m.prog.extract.total ? ` <span class="muted small">(${Math.min(m.prog.extract.next, m.prog.extract.total)}/${m.prog.extract.total})</span>` : ""}${k === "solve" && i <= cur ? ` <span class="muted small">(${D.qs.filter(q => q.solved).length}/${D.qs.filter(q => !q.deleted).length})</span>` : ""}</li>`; }).join("")}</ol>
      <div class="small" id="c-status" aria-live="polite">${esc(statusText)}</div>
      ${err && !run ? `<div class="callout trap"><div class="ct">Stopped</div><div>${esc(errCopy(err))}</div></div>` : ""}
      ${m.needFiles && !run ? `<label class="drop"><input id="c-refiles" type="file" multiple accept=".pdf,.docx,.txt,.md,image/*" hidden><b>Choose the same files again</b><span class="small muted">${esc((m.source.files || []).map(f => f.name).join(", "))}</span></label>` : ""}
      <div class="row">${run ? `<button type="button" class="btn ghost" data-c="stop">Stop</button>` : `<button type="button" class="btn" data-c="continue" ${sample ? "" : "disabled"}>Continue</button>${err ? `<button type="button" class="btn ghost" data-c="skip">Skip this part</button>` : ""}`}</div>
      <details class="small"><summary>Activity log</summary><pre class="clog">${esc((m.log || []).slice().reverse().join("\n"))}</pre></details></section>`;
  }
  function vPack() {
    const m = D.meta, live = D.qs.filter(q => !q.deleted), flagged = live.filter(flagOf).length;
    m.counts = { questions: live.length, flagged };
    const tabs = [["questions", `Questions (${live.length})`], ["learn", "Learn pages"], ["settings", "Settings"]];
    return `<div class="row"><button type="button" class="btn sm ghost" data-c="library">← Your packs</button></div>
      <header class="pagehead"><span class="eyebrow">${esc(m.subject || "Study pack")}</span><h1>${esc(m.title)}</h1><p>${live.length} questions · ${(m.sections || []).length} sections · ${flagged ? `<b>${flagged} need your review</b>` : "nothing flagged"}${m.exportedAt ? ` · exported ${new Date(m.exportedAt).toLocaleDateString()}` : ""}</p></header>
      <div id="c-stagewrap">${stagePanel()}</div>
      <div class="row"><button type="button" class="btn" data-c="preview" ${live.some(q => q.solved) ? "" : "disabled"}>Preview as a student</button><button type="button" class="btn ghost" data-c="export" ${m.stage === "done" ? "" : "disabled"}>Export pack</button></div>
      <section class="card stack" id="c-publish" hidden><h3>Publish it on your site</h3><ol class="small"><li>Open <b>github.com/alcoder06/Econometrics-midterm</b>, go into the <b>packs</b> folder and choose <b>Add file → Upload files</b>.</li><li>Drop in <b id="c-pubname"></b> and commit.</li><li>About a minute later it appears on the site under <b>Change subject</b>.</li></ol><p class="small muted">Or tell Claude Code: "publish the pack in my Downloads folder", and it will commit it for you.</p></section>
      <nav class="chips" aria-label="Sections of the editor">${tabs.map(([k, l]) => `<button type="button" class="chip${tab === k ? " on" : ""}" data-c="tab" data-v="${k}">${l}</button>`).join("")}</nav>
      <div id="c-tab">${tab === "learn" ? vLearnTab() : tab === "settings" ? vSettings() : vQuestions()}</div>`;
  }
  function vQuestions() {
    const secs = D.meta.sections || [];
    let list = D.qs.filter(q => !q.deleted);
    if (filters.sec) list = list.filter(q => q.sec === filters.sec);
    if (filters.flagged) list = list.filter(flagOf);
    if (filters.text) { const t = filters.text.toLowerCase(); list = list.filter(q => (q.stem + " " + q.options.join(" ")).toLowerCase().includes(t)); }
    return `<div class="row"><div class="chips">${`<button type="button" class="chip${!filters.sec ? " on" : ""}" data-c="fsec" data-v="">All</button>`}${secs.map((s, i) => `<button type="button" class="chip sc-${i % 8}${filters.sec === s.id ? " on" : ""}" data-c="fsec" data-v="${s.id}"><span class="dot"></span>${esc(s.short)}</button>`).join("")}<button type="button" class="chip${filters.flagged ? " on" : ""}" data-c="fflag">Needs review</button></div><input id="c-search" type="search" placeholder="Search questions" value="${esc(filters.text)}" style="flex:1 1 180px;min-width:0"></div>
      ${list.length ? `<div class="qlist">${list.map(q => qRow(q)).join("")}</div>` : `<p class="muted small">${D.qs.length ? "No questions match." : "Questions will appear here as they're found."}</p>`}`;
  }
  function qRow(q) {
    const open = editing === q.id;
    return `<div class="qrow${open ? " open" : ""}" id="row-${q.id}"><button type="button" class="qhead" data-c="edit" data-id="${q.id}"><span class="badges">${q.sec ? secBadge(q.sec) : ""}${q.difficulty ? `<span class="badge diff d${q.difficulty}"><span class="pips"><i></i><i></i><i></i></span>${["", "Easy", "Medium", "Hard"][q.difficulty]}</span>` : ""}${q.num ? badge("Q" + esc(q.num)) : ""}${!q.solved ? badge("Not solved yet") : ""}${flagBadge(q)}${q.variants && q.variants.length ? badge(`${q.variants.length} variants`, "fresh") : ""}${q.img ? badge("Figure") : ""}</span><span class="snip">${sanitize(T(plainSnip(q.stem, 160).replace(/</g, "&lt;")))}</span></button>${open ? qEditor(q) : ""}</div>`;
  }
  function qEditor(q) {
    const secs = D.meta.sections || [], f = flagOf(q);
    const why = q.given != null && q.adj && q.adj.a !== L.indexOf(q.given) ? `The bank's answer key says <b>${q.given}</b>, but Claude's strongest check says <b>${L[q.adj.a]}</b>: "${esc(q.adj.x)}"` : f ? "The solvers didn't agree, or weren't confident. Check the answer below." : "";
    return `<div class="qedit stack">
      ${why ? `<div class="callout trap"><div class="ct">Why this is flagged</div><div>${why}</div></div>` : ""}
      <div class="grid two"><label class="fld">Section<select id="e-sec">${secs.map(s => `<option value="${s.id}"${q.sec === s.id ? " selected" : ""}>${esc(s.short)} · ${esc(s.name)}</option>`).join("")}</select></label>
      <label class="fld">Difficulty<select id="e-diff">${[1, 2, 3].map(d => `<option value="${d}"${q.difficulty === d ? " selected" : ""}>${["", "Easy", "Medium", "Hard"][d]}</option>`).join("")}</select></label></div>
      <label class="fld">Topic tag<input id="e-tag" value="${esc(q.tag || "")}" list="e-tags"><datalist id="e-tags">${Object.entries(D.meta.tags || {}).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</datalist></label>
      <label class="fld">Question<textarea id="e-stem" rows="4">${esc(q.stem)}</textarea></label>
      <div class="fld"><span>Options (select the correct one)</span>${q.options.map((o, i) => `<div class="optedit"><input type="radio" name="e-ans" value="${i}"${q.answer === i ? " checked" : ""} aria-label="Option ${L[i]} is correct"><b>${L[i]}</b><textarea class="e-opt" rows="1">${esc(o)}</textarea><button type="button" class="btn sm ghost" data-c="optdel" data-i="${i}" ${q.options.length <= 2 ? "disabled" : ""}>Remove</button></div>`).join("")}<button type="button" class="btn sm ghost" data-c="optadd" ${q.options.length >= 8 ? "disabled" : ""}>Add option</button></div>
      <label class="fld">Explanation<textarea id="e-x" rows="3">${esc(q.explanation || "")}</textarea></label>
      <div class="grid two"><label class="fld">Output label<input id="e-prelabel" value="${esc(q.preLabel || "")}" placeholder="e.g. Stata output"></label><label class="fld">Output / code (shown as monospace)<textarea id="e-pre" rows="2" class="mono">${esc(q.pre || "")}</textarea></label></div>
      <div class="fld"><span>Figure</span>${q.img ? `<img class="qimg" src="${q.img}" alt="Figure" style="max-width:420px">` : '<span class="muted small">None</span>'}<div class="row"><label class="btn sm ghost">Upload image<input id="e-img" type="file" accept="image/*" hidden></label>${q.img ? `<button type="button" class="btn sm ghost" data-c="imgdel">Remove figure</button>` : ""}</div></div>
      <label class="radio"><input type="checkbox" id="e-flag"${f ? " checked" : ""}> Mark as unverified (students see a "Key unverified" badge)</label>
      ${q.variants && q.variants.length ? `<details><summary class="small">${q.variants.length} fresh-number variants (arithmetic checked)</summary>${q.variants.map((v, i) => `<div class="pattern"><div class="small">${rich(v.q, "md")}</div><div class="small"><b>Answer:</b> ${richInline(v.o[v.a], "md")}</div><button type="button" class="btn sm ghost" data-c="vardel" data-i="${i}">Delete variant</button></div>`).join("")}</details>` : ""}
      <div class="fld"><span>Student preview</span><div class="card flat qprev" id="e-prev"></div></div>
      <div class="row"><button type="button" class="btn" data-c="qsave">Save</button><button type="button" class="btn ghost" data-c="qrecheck" ${sample ? "" : "disabled"}>Ask Claude to re-check</button><button type="button" class="btn sm danger" data-c="qdel" data-confirm="0">Delete question</button><button type="button" class="btn sm ghost" data-c="edit" data-id="${q.id}">Close</button></div>
      <div id="e-recheck"></div></div>`;
  }
  function vLearnTab() {
    const secs = (D.meta.sections || []);
    if (!secs.length) return `<p class="muted small">Learn pages are written after the questions are organised into sections.</p>`;
    return secs.map((s, i) => { const l = D.learn[s.id]; return `<section class="card stack sc-${i % 8}"><div class="row between"><h3><span class="badge sem sc-${i % 8}"><span class="bub">${esc(s.short)}</span>${esc(s.name)}</span></h3><div class="row">${l ? `<button type="button" class="btn sm ghost" data-c="ledit" data-id="${s.id}">Edit</button>` : ""}<button type="button" class="btn sm ${l ? "ghost" : ""}" data-c="lgen" data-id="${s.id}" ${sample && !run ? "" : "disabled"}>${l ? "Rewrite with Claude" : "Write with Claude"}</button></div></div>
      ${l ? `<div class="prose"><p class="ink2">${richInline(l.blurb, "md")}</p>${l.metaphor ? `<div class="metaphor" style="grid-template-columns:1fr"><div>${rich(l.metaphor, "md")}</div></div>` : ""}${l.topics.map(t => `<h4>${richInline(t.title, "md")}</h4>${rich(t.md, "md")}`).join("")}</div><details class="small"><summary>${l.patterns.length} exam patterns · ${l.sheet.length} formula-sheet rows</summary>${l.patterns.map(p => `<div class="pattern"><b>${richInline(p.title, "md")}</b><div>${rich(p.recipe, "md")}</div><div class="qs">${p.qs.length} questions</div></div>`).join("")}</details>` : `<p class="muted small">No Learn page for this section yet.</p>`}
      <div id="ledit-${s.id}"></div></section>`; }).join("");
  }
  function learnEditor(sid) {
    const l = D.learn[sid];
    return `<div class="stack qedit"><label class="fld">Blurb<textarea id="l-blurb" rows="2">${esc(l.blurb)}</textarea></label><label class="fld">The picture to remember<textarea id="l-meta" rows="3">${esc(l.metaphor)}</textarea></label>
      ${l.topics.map((t, i) => `<div class="pattern"><label class="fld">Topic ${i + 1} title<input class="l-ttitle" value="${esc(t.title)}"></label><label class="fld">Text (Markdown + $maths$)<textarea class="l-tmd" rows="8">${esc(t.md)}</textarea></label></div>`).join("")}
      <div class="row"><button type="button" class="btn" data-c="lsave" data-id="${sid}">Save Learn page</button><button type="button" class="btn ghost" data-c="lcancel" data-id="${sid}">Cancel</button></div></div>`;
  }
  function vSettings() {
    const m = D.meta, secs = m.sections || [];
    return `<form class="card stack" id="c-settings" novalidate>
      <div class="grid two"><label class="fld">Title<input id="s-title" value="${esc(m.title)}"></label><label class="fld">Subtitle<input id="s-subtitle" value="${esc(m.subtitle || "")}"></label></div>
      <div class="grid two"><label class="fld">Subject<input id="s-subject" value="${esc(m.subject || "")}"></label><label class="fld">File name / id on the site<input id="s-slug" value="${esc(m.slug || slug(m.title))}"></label></div>
      <label class="fld">Exam description shown to students<input id="s-note" value="${esc((m.exam && m.exam.note) || "")}"></label>
      <div class="fld"><span>Sections and mock-exam blueprint (questions drawn from each)</span>${secs.map(s => `<div class="optedit" style="grid-template-columns:90px minmax(0,1fr) 90px auto"><input class="s-short" data-id="${s.id}" value="${esc(s.short)}" aria-label="Short code"><input class="s-name" data-id="${s.id}" value="${esc(s.name)}" aria-label="Name"><input class="s-per" data-id="${s.id}" type="number" min="0" max="50" value="${(m.exam && m.exam.perSection && m.exam.perSection[s.id]) || 0}" aria-label="Questions in mock exam"><label class="radio small"><input type="checkbox" class="s-comb" data-id="${s.id}"${s.combined ? " checked" : ""}> combined</label></div>`).join("")}</div>
      <label class="fld">Notes for Claude (used when re-writing)<textarea id="s-notes" rows="2">${esc(m.notes || "")}</textarea></label>
      <div class="row"><button type="submit" class="btn">Save settings</button></div></form>`;
  }
  function render() {
    const root = $("#creator-main"); if (!root) return;
    if (!ready) { root.innerHTML = `<div class="card empty"><b>Loading…</b></div>`; return; }
    if (!db || !uid) { root.innerHTML = `<header class="pagehead"><span class="eyebrow">Study Pack Creator</span><h1>Open this page in Claude</h1><p>The creator saves your packs in your Claude account and uses Claude to read the bank, so it only works inside claude.ai while you're signed in.</p></header>`; return; }
    root.innerHTML = view === "new" ? vNew() : view === "pack" && D ? vPack() : vLibrary();
    typeset(root);
    if (editing) previewQ();
    $("#c-notice").hidden = !notice; $("#c-notice").textContent = notice;
  }
  let liveT = null;
  function renderLive() {
    if (liveT) return;
    liveT = setTimeout(() => {
      liveT = null; if (view !== "pack" || !D) return;
      const w = $("#c-stagewrap"); if (w) { w.innerHTML = stagePanel(); status(statusText); }
      if (tab === "questions" && !editing) { const t = $("#c-tab"); if (t && !t.contains(document.activeElement)) { t.innerHTML = vQuestions(); typeset(t); } }
    }, 600);
  }

  /* ---------- question editing ---------- */
  function readEditor(q) {
    const opts = $$(".e-opt").map(t => t.value);
    const pick = $('input[name="e-ans"]:checked');
    return Object.assign({}, q, { sec: $("#e-sec").value, difficulty: +$("#e-diff").value, tag: slug($("#e-tag").value || q.tag || "general").slice(0, 30), stem: $("#e-stem").value, options: opts, answer: pick ? +pick.value : q.answer, explanation: $("#e-x").value, pre: $("#e-pre").value, preLabel: $("#e-prelabel").value, flag: $("#e-flag").checked ? (q.flag || "unverified") : "" });
  }
  function previewQ() {
    const q0 = D.qs.find(x => x.id === editing), el = $("#e-prev"); if (!q0 || !el) return;
    const q = readEditor(q0);
    el.innerHTML = `${q.pre ? `<div class="stata"><div class="sl">${esc(q.preLabel || "Output")}</div><pre>${esc(q.pre)}</pre></div>` : ""}<div class="qstem">${rich(q.stem, "md")}</div><div class="opts">${q.options.map((o, i) => `<div class="opt${i === q.answer ? " right" : ""}"><span class="L">${L[i]}</span><span class="T">${richInline(o, "md")}</span></div>`).join("")}</div><div class="feedback g"><div class="fx">${rich(q.explanation, "md")}</div></div>`;
    typeset(el);
  }
  async function recheck(q) {
    const out = $("#e-recheck"); out.innerHTML = `<div class="note">Claude is solving this question carefully…</div>`;
    const cur = readEditor(q);
    const ctl = new AbortController(); const prev = run; run = run || { ctl, stopped: false };
    try {
      const { blobs, no } = imgsFor([cur]);
      const res = await sample.json(P.pAdjudicate({ subject: D.meta.subject, items: [Pipeline.qBlock(cur, false, no[cur.id])] }), { images: blobs.length ? blobs : undefined, modelTier: "complex", cache: false, signal: ctl.signal });
      D.meta.calls = (D.meta.calls || 0) + 1; saveMeta();
      const r = Array.isArray(res) ? res[0] : res, a = r ? L.indexOf(String(r.answer || "").toUpperCase().slice(0, 1)) : -1;
      if (a < 0) throw new Error("no answer");
      out.innerHTML = `<div class="callout key"><div class="ct">Claude's answer: ${L[a]}${a === cur.answer ? " (matches yours)" : " (different from yours)"}</div><div>${rich(String(r.explanation || ""), "md")}</div><div class="row">${a !== cur.answer ? `<button type="button" class="btn sm" data-c="recheck-apply" data-a="${a}">Use ${L[a]} and this explanation</button>` : `<button type="button" class="btn sm" data-c="recheck-apply" data-a="${a}">Use this explanation</button>`}</div></div>`;
      out.dataset.x = String(r.explanation || ""); typeset(out);
    } catch (e) { out.innerHTML = `<div class="callout trap"><div class="ct">Couldn't re-check</div><div>${esc(errCopy(e))}</div></div>`; }
    finally { if (!prev) run = null; }
  }

  /* ---------- events ---------- */
  function on(act, el, e) {
    switch (act) {
      case "new": view = "new"; render(); break;
      case "library": view = "library"; D = null; editing = null; loadList().then(render); break;
      case "open": openPack(el.dataset.id); break;
      case "delete": if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "Tap again to delete"; return; } deletePack(el.dataset.id); break;
      case "tab": tab = el.dataset.v; editing = null; render(); break;
      case "continue": runPipeline(); break;
      case "stop": stopRun(); break;
      case "skip": skipCurrent(); break;
      case "preview": preview(); break;
      case "export": exportPack(); break;
      case "fsec": filters.sec = el.dataset.v; render(); break;
      case "fflag": filters.flagged = !filters.flagged; render(); break;
      case "edit": editing = editing === el.dataset.id ? null : el.dataset.id; render(); if (editing) { const r = $("#row-" + editing); if (r) r.scrollIntoView({ block: "nearest" }); } break;
      case "optadd": { const q = D.qs.find(x => x.id === editing); Object.assign(q, readEditor(q)); q.options.push(""); render(); break; }
      case "optdel": { const q = D.qs.find(x => x.id === editing); Object.assign(q, readEditor(q)); const i = +el.dataset.i; q.options.splice(i, 1); if (q.answer === i) q.answer = null; else if (q.answer > i) q.answer--; render(); break; }
      case "imgdel": { const q = D.qs.find(x => x.id === editing); Object.assign(q, readEditor(q)); q.img = ""; render(); break; }
      case "vardel": { const q = D.qs.find(x => x.id === editing); q.variants.splice(+el.dataset.i, 1); saveQ(q); render(); break; }
      case "qsave": { const q = D.qs.find(x => x.id === editing); const nq = readEditor(q); if (nq.options.filter(o => o.trim()).length < 2 || nq.answer == null) { flash("A question needs at least two options and a correct answer."); return; } nq.options = nq.options.map(o => o.trim()); nq.solved = true; nq.edited = true; Object.assign(q, nq); saveQ(q); saveMeta(); editing = null; render(); flash("Saved."); break; }
      case "qdel": if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "Tap again to delete"; return; } { const q = D.qs.find(x => x.id === editing); q.deleted = true; saveQ(q); saveMeta(); editing = null; render(); } break;
      case "qrecheck": recheck(D.qs.find(x => x.id === editing)); break;
      case "recheck-apply": { const q = D.qs.find(x => x.id === editing); Object.assign(q, readEditor(q)); q.answer = +el.dataset.a; q.explanation = $("#e-recheck").dataset.x || q.explanation; q.flag = ""; q.solved = true; saveQ(q); saveMeta(); render(); flash("Updated from Claude's re-check."); break; }
      case "lgen": { const sid = el.dataset.id; if (run) return; run = { ctl: new AbortController(), stopped: false }; el.disabled = true; el.textContent = "Writing…"; genLearn(sid).then(() => flash("Learn page written.")).catch(err => flash(errCopy(err))).finally(() => { run = null; saveMeta(); render(); }); break; }
      case "ledit": { const box = $("#ledit-" + el.dataset.id); box.innerHTML = learnEditor(el.dataset.id); break; }
      case "lcancel": $("#ledit-" + el.dataset.id).innerHTML = ""; break;
      case "lsave": { const sid = el.dataset.id, l = D.learn[sid]; l.blurb = $("#l-blurb").value; l.metaphor = $("#l-meta").value; const tt = $$(".l-ttitle"), tm = $$(".l-tmd"); l.topics.forEach((t, i) => { t.title = tt[i].value; t.md = tm[i].value; }); saveLearn(sid); render(); flash("Learn page saved."); break; }
    }
  }
  function bind() {
    document.addEventListener("click", e => {
      const el = e.target.closest("[data-c]"); if (!el || el.disabled || !el.closest("#creator-root")) return;
      e.preventDefault(); on(el.dataset.c, el, e);
    });
    document.addEventListener("input", e => {
      if (!e.target.closest("#creator-root")) return;
      if (e.target.id === "c-search") { filters.text = e.target.value; clearTimeout(bind.t); bind.t = setTimeout(() => { const t = $("#c-tab"); t.innerHTML = vQuestions(); typeset(t); const s = $("#c-search"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 250); }
      else if (e.target.closest(".qedit") && editing) { clearTimeout(bind.p); bind.p = setTimeout(previewQ, 300); }
    });
    document.addEventListener("change", async e => {
      if (!e.target.closest("#creator-root")) return;
      if (e.target.id === "c-files") showFiles(e.target.files);
      if (e.target.id === "c-refiles" && e.target.files.length) {
        if (sigOf(e.target.files) !== D.meta.source.sig) { flash("Those aren't the same files (names or sizes differ). Choose the original files."); return; }
        pendingFiles = [...e.target.files]; D.meta.needFiles = false; runPipeline();
      }
      if (e.target.id === "e-img" && e.target.files[0]) {
        const q = D.qs.find(x => x.id === editing); Object.assign(q, readEditor(q));
        const pg = { blob: e.target.files[0] }; q.img = await Pipeline.cropFigure(pg, [0, 0, 1, 1]) || ""; if (!q.img) flash("That image is too large; try a smaller one."); render();
      }
    });
    document.addEventListener("submit", e => {
      if (e.target.id === "c-newform") { e.preventDefault(); startNew(); }
      if (e.target.id === "c-settings") { e.preventDefault(); saveSettings(); }
    });
    document.addEventListener("dragover", e => { const d = e.target.closest && e.target.closest("#c-drop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
    document.addEventListener("dragleave", e => { const d = e.target.closest && e.target.closest("#c-drop"); if (d) d.classList.remove("over"); });
    document.addEventListener("drop", e => { const d = e.target.closest && e.target.closest("#c-drop"); if (!d) return; e.preventDefault(); d.classList.remove("over"); const inp = $("#c-files"); try { inp.files = e.dataTransfer.files; } catch (err) { } showFiles(e.dataTransfer.files); droppedFiles = [...e.dataTransfer.files]; });
    window.addEventListener("beforeunload", e => { if (run) { e.preventDefault(); e.returnValue = ""; } });
  }
  let droppedFiles = null;
  function showFiles(files) { const el = $("#c-filelist"); if (el) el.textContent = [...files].map(f => `${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)`).join(" · "); }
  function startNew() {
    const title = $("#c-title").value.trim(), files = $("#c-files").files.length ? [...$("#c-files").files] : droppedFiles || [];
    const errEl = $("#c-formerr");
    if (!title) { errEl.textContent = "Give the pack a title."; $("#c-title").focus(); return; }
    if (!files.length) { errEl.textContent = "Choose at least one file."; return; }
    const id = slug(title) + "-" + Date.now().toString(36).slice(-4);
    D = { meta: { id, slug: slug(title), title, subtitle: $("#c-subtitle").value.trim(), subject: $("#c-subject").value.trim(), notes: $("#c-notes").value.trim(), createdAt: Date.now(), updatedAt: Date.now(), stage: "extract", prog: {}, calls: 0, log: [], tags: {}, sections: [], exam: null, settings: { accuracy: ($('input[name="c-acc"]:checked') || {}).value || "standard", examTotal: +$("#c-examtotal").value || 20, learn: $("#c-learn").checked, variants: $("#c-variants").checked, images: $("#c-images").checked }, source: { sig: sigOf(files), files: files.map(f => ({ name: f.name, size: f.size })) }, nextId: 0 }, qs: [], learn: {} };
    pendingFiles = files; droppedFiles = null; view = "pack"; tab = "questions"; editing = null;
    log(`Started with ${files.map(f => f.name).join(", ")}.`); saveMeta(); render(); runPipeline();
  }
  function saveSettings() {
    const m = D.meta;
    m.title = $("#s-title").value.trim() || m.title; m.subtitle = $("#s-subtitle").value.trim(); m.subject = $("#s-subject").value.trim(); m.slug = slug($("#s-slug").value || m.title); m.notes = $("#s-notes").value.trim();
    m.exam = m.exam || { perSection: {} }; m.exam.note = $("#s-note").value.trim();
    $$(".s-short").forEach(i => { const s = secById(i.dataset.id); if (s) s.short = i.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 5) || s.short; });
    $$(".s-name").forEach(i => { const s = secById(i.dataset.id); if (s) s.name = i.value.trim() || s.name; });
    $$(".s-comb").forEach(i => { const s = secById(i.dataset.id); if (s) s.combined = i.checked; });
    m.exam.perSection = {}; $$(".s-per").forEach(i => { const v = Math.max(0, Math.min(50, +i.value || 0)); if (v) m.exam.perSection[i.dataset.id] = v; });
    m.exam.total = Object.values(m.exam.perSection).reduce((a, b) => a + b, 0);
    saveMeta(); render(); flash("Settings saved.");
  }

  async function init() {
    bind(); render();
    try {
      if (window.claude && typeof window.claude.use === "function") {
        const [d, u, s, dl] = await Promise.all(["db", "user", "sample", "downloads"].map(n => window.claude.use(n).catch(() => null)));
        db = d; sample = s; downloads = dl; uid = u ? await u.id() : null;
        if (sample) limits = await sample.limits().catch(() => null);
        if (db && uid) await loadList();
      }
    } catch (e) { console.warn(e); }
    ready = true; render();
  }
  return { init };
})();
