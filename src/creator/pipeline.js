/* Creator pipeline: read source files, then run the AI stages through the `sample` capability.
   Stages: extract → sections → solve → verify → adjudicate → learn. Each stage only processes
   items that are not done yet, so "Continue" after a stop or error picks up where it left off. */
const Pipeline = (() => {
  "use strict";

  /* ---------- safe arithmetic for checking numeric variants (no eval) ---------- */
  function evalExpr(src) {
    const s = String(src).replace(/\s+/g, "").replace(/[×·]/g, "*").replace(/[−–]/g, "-").replace(/\*\*/g, "^").replace(/÷/g, "/");
    let i = 0;
    const peek = () => s[i];
    const fail = () => { throw new Error("bad expression"); };
    function num() { const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i); if (!m) fail(); i += m[0].length; return parseFloat(m[0]); }
    function prim() {
      if (peek() === "(") { i++; const v = expr(); if (s[i++] !== ")") fail(); return v; }
      const fm = s.slice(i).match(/^(sqrt|ln|log|exp|abs|pi|e)(?![a-z])/i);
      if (fm) {
        i += fm[1].length; const f = fm[1].toLowerCase();
        if (f === "pi") return Math.PI; if (f === "e") return Math.E;
        if (s[i++] !== "(") fail(); const v = expr(); if (s[i++] !== ")") fail();
        return { sqrt: Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs }[f](v);
      }
      return num();
    }
    function unary() { if (peek() === "-") { i++; return -unary(); } if (peek() === "+") { i++; return unary(); } return prim(); }
    function pow() { const b = unary(); if (peek() === "^") { i++; return Math.pow(b, pow()); } return b; }
    function term() { let v = pow(); while (peek() === "*" || peek() === "/") { const op = s[i++], r = pow(); v = op === "*" ? v * r : v / r; } return v; }
    function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const op = s[i++], r = term(); v = op === "+" ? v + r : v - r; } return v; }
    const v = expr(); if (i !== s.length || !isFinite(v)) fail(); return v;
  }
  function optNumber(o) {
    const t = String(o).replace(/\\\$/g, "").replace(/\$/g, "").replace(/\{,\}/g, "").replace(/\\,/g, "").replace(/\\%/g, "%").replace(/[−–]/g, "-").replace(/(\d),(?=\d{3}\b)/g, "$1");
    const m = t.match(/-?\d+(?:\.(\d+))?/); if (!m) return null;
    return { v: parseFloat(m[0]), dp: m[1] ? m[1].length : 0 };
  }
  function checkVariant(v) {
    if (!v || !v.check || !Array.isArray(v.options) || !v.options.length) return false;
    let target; try { target = evalExpr(v.check); } catch (e) { return false; }
    const n = optNumber(v.options[0]); if (!n) return false;
    const tol = Math.max(0.5 * Math.pow(10, -n.dp) * 1.0001, 0.005 * Math.abs(target));
    return Math.abs(Math.abs(n.v) - Math.abs(target)) <= tol || Math.abs(n.v - target) <= tol;
  }

  /* ---------- reading files ---------- */
  async function renderPdf(file, onProgress) {
    const pdfjs = window.pdfjsLib; if (!pdfjs) throw new Error("The PDF reader didn't load. Check your connection and reload the page.");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: false }).promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 }), scale = Math.min(3, 1500 / base.width);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement("canvas"); canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
      let text = "";
      try { const tc = await page.getTextContent(); text = tc.items.map(it => it.str + (it.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n"); } catch (e) { }
      pages.push({ label: `${file.name} p.${n}`, blob, text, w: canvas.width, h: canvas.height });
      onProgress && onProgress(n, doc.numPages);
    }
    return pages;
  }
  async function imagePage(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.88));
    return { label: file.name, blob, text: "", w: c.width, h: c.height };
  }
  function textPages(name, text) {
    const paras = String(text).replace(/\r/g, "").split(/\n{2,}/), out = []; let cur = "";
    for (const p of paras) { if ((cur + "\n\n" + p).length > 6000 && cur) { out.push(cur); cur = p; } else cur = cur ? cur + "\n\n" + p : p; }
    if (cur.trim()) out.push(cur);
    return out.map((t, i) => ({ label: `${name} part ${i + 1}`, blob: null, text: t }));
  }
  async function readFiles(files, onProgress) {
    let pages = [];
    for (const f of files) {
      const name = f.name.toLowerCase();
      if (name.endsWith(".pdf") || f.type === "application/pdf") pages = pages.concat(await renderPdf(f, (n, t) => onProgress && onProgress(`Reading ${f.name}: page ${n} of ${t}`)));
      else if (/\.(png|jpe?g|webp|gif)$/.test(name) || f.type.startsWith("image/")) { pages.push(await imagePage(f)); onProgress && onProgress(`Read ${f.name}`); }
      else if (name.endsWith(".docx")) {
        if (!window.mammoth) throw new Error("The Word reader didn't load. Check your connection and reload the page.");
        const res = await window.mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
        pages = pages.concat(textPages(f.name, res.value)); onProgress && onProgress(`Read ${f.name}`);
      } else { pages = pages.concat(textPages(f.name, await f.text())); onProgress && onProgress(`Read ${f.name}`); }
    }
    return pages;
  }
  async function cropFigure(page, box) {
    if (!page || !page.blob || !Array.isArray(box) || box.length !== 4) return null;
    let [x0, y0, x1, y1] = box.map(Number); if ([x0, y0, x1, y1].some(v => !isFinite(v))) return null;
    if (x0 > 1 || y0 > 1 || x1 > 1 || y1 > 1) { x0 /= 1000; y0 /= 1000; x1 /= 1000; y1 /= 1000; }
    const pad = 0.015; x0 = Math.max(0, Math.min(x0, x1) - pad); y0 = Math.max(0, Math.min(y0, y1) - pad); x1 = Math.min(1, Math.max(x0, x1) + pad); y1 = Math.min(1, Math.max(y0, y1) + pad);
    if (x1 - x0 < 0.03 || y1 - y0 < 0.02) return null;
    const bmp = await createImageBitmap(page.blob);
    const sx = x0 * bmp.width, sy = y0 * bmp.height, sw = (x1 - x0) * bmp.width, sh = (y1 - y0) * bmp.height;
    const scale = Math.min(1, 1000 / sw);
    const c = document.createElement("canvas"); c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    let url = c.toDataURL("image/jpeg", 0.85);
    if (url.length > 180000) url = c.toDataURL("image/jpeg", 0.6);
    return url.length > 220000 ? null : url;
  }
  const dataUrlToBlob = u => { const [h, b] = u.split(","); const bin = atob(b); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: (h.match(/data:([^;]+)/) || [])[1] || "image/jpeg" }); };

  /* ---------- prompts ---------- */
  const MATH_RULES = `Write ALL mathematics in LaTeX inside $...$ (inline) or $$...$$ (display); matrices as \\begin{bmatrix} ... \\end{bmatrix}. Write a literal dollar sign (money) as \\$. Tables as Markdown pipe tables. **bold** and *italic* are allowed. No HTML. Remember that inside JSON strings every backslash is written twice (\\\\frac, \\\\beta).`;
  const letters = "ABCDEFGH";
  function pExtract(ctx) {
    return `You are digitizing a multiple-choice question bank for a study app${ctx.subject ? ` (subject: ${ctx.subject})` : ""}.

${ctx.images ? `The attached images are, in order: ${ctx.newLabels.map((l, i) => `image ${i + 1} = NEW page "${l}"`).join("; ")}${ctx.lookLabel ? `; image ${ctx.newLabels.length + 1} = LOOKAHEAD page "${ctx.lookLabel}"` : ""}.` : "The source text follows."}
${ctx.texts.map(t => `=== ${t.kind} PAGE "${t.label}" (text layer; may be garbled for maths${ctx.images ? ", trust the image" : ""}) ===\n${t.text || "(no text layer)"}`).join("\n\n")}

Context from earlier pages: section heading in force = ${JSON.stringify(ctx.lastSection || null)}; last question number seen = ${JSON.stringify(ctx.lastNum || null)}.
${ctx.notes ? `Notes from the person who owns this bank: ${ctx.notes}\n` : ""}
Extract every question that STARTS on a NEW page. Skip any question that starts on the LOOKAHEAD page, but if a question that starts on a NEW page continues onto the LOOKAHEAD page, include all of it.

Rules:
- Copy each question faithfully, including any data table it gives. ${MATH_RULES}
- "options": the answer options in their original order, without their letter labels. If the question has no options (open question), give [].
- "given": the correct option letter ONLY if the page itself shows it (answer key, marked/highlighted option); otherwise null. Never guess.
- "pre": console or software output (Stata, R, Python, SPSS…) or commands the student must run, copied verbatim with spacing kept; "preLabel" like "Stata output" or "Stata commands". Otherwise null.
- "figure": only if the question needs a picture that can't be written as text (graph, diagram, photo): {"image": <attached image number>, "box": [x0, y0, x1, y1]} as fractions 0–1 of that page's width and height, covering the whole figure. Otherwise null.
- "section": the heading the question sits under (e.g. "Week 3: Standard Errors"), or null.
- "notes": any bank-wide instructions you see on these pages (exam format, number of questions, marking), else "".
Reply with only JSON:
{"section": "<heading in force at the end of the NEW pages, or null>", "notes": "", "questions": [{"num": "7", "section": "Week 3: Standard Errors", "stem": "...", "options": ["...", "..."], "given": null, "pre": null, "preLabel": null, "figure": null}]}`;
  }
  function pSections(ctx) {
    return `Here are the questions extracted from a question bank${ctx.subject ? ` for ${ctx.subject}` : ""}, with the section heading each one was found under (h) and the start of its text (s).
${ctx.notes ? `Bank and owner notes: ${ctx.notes}\n` : ""}
Group them into the sections a study app should use:
- If the bank has clear headings, use them as sections in their original order. Give each a short code of at most 4 characters (S1, S2, … or the bank's own, like W3) and a clean name of 2–5 words.
- If there are no headings, create 3–8 topic sections by subject matter, in a sensible teaching order.
- A mixed section that combines topics (for example software-output questions) stays its own section with "combined": true.
- Every question id goes in exactly one section.
Also propose the mock-exam blueprint: "total" questions (use the exam format from the notes if given, else ${ctx.examTotal}) and how many to draw from each section, and a one-sentence "note" describing the exam format to students.
Also give the overall "subject" in 1–4 words.

Questions:
${ctx.items.map(q => JSON.stringify(q)).join("\n")}

Reply with only JSON:
{"subject": "...", "sections": [{"short": "S1", "name": "...", "combined": false, "questions": ["q0001", "q0002"]}], "exam": {"total": 20, "perSection": {"S1": 3}, "note": "..."}}`;
  }
  function qBlock(q, withGiven, imgNo) {
    const o = {}; (q.options || []).forEach((t, i) => { o[letters[i]] = t; });
    const b = { id: q.id, section: q.secName || undefined, question: q.stem, options: o };
    if (q.pre) b[q.preLabel || "output"] = q.pre;
    if (imgNo) b.image = `attached image ${imgNo}`;
    if (withGiven && q.given) b.answerKey = q.given;
    return b;
  }
  function pSolve(ctx) {
    return `You are an expert tutor and examiner in ${ctx.subject || "this subject"}. Students will use your work to prepare for an exam built from this question bank, where the numbers may be changed.
${ctx.notes ? `Notes from the bank's owner: ${ctx.notes}\n` : ""}
For each multiple-choice question below:
1. Work out the correct option carefully.
2. "explanation": 1–3 sentences in plain words: why the right answer is right, with the key working for calculations, and the trap behind the most tempting wrong option. ${MATH_RULES}
3. "difficulty": 1 = recall or a definition, 2 = one calculation or one concept distinction, 3 = multi-step calculation or a subtle trap.
4. "tag": a short kebab-case topic id and "tagLabel" of 1–3 words. Reuse these existing tags when one fits: ${ctx.tags.length ? ctx.tags.join(", ") : "(none yet)"}.
5. If the answer depends on numbers given in the question (a calculation), write ${ctx.nVariants} "variants": the same question with different realistic numbers and the same method. Each variant: "stem", "options" (4 options, the CORRECT one first, the others built from typical mistakes), "explanation" with the working, and "check": an arithmetic expression using only numbers, + - * / ^, parentheses, sqrt(), ln(), exp() that evaluates to the number in the correct option. Otherwise "variants": [].
If a question has an "answerKey", check it; if you're sure it's wrong, give your own answer and set "disagree": true.
If a question has no options, write 4 options yourself (one correct) in "options" and set "wroteOptions": true; otherwise "options": null.

Questions:
${ctx.items.map(q => JSON.stringify(q)).join("\n")}

Reply with only a JSON array, one object per question:
[{"id": "q0012", "answer": "B", "confidence": "high", "explanation": "...", "difficulty": 2, "tag": "t-tests", "tagLabel": "t-tests", "disagree": false, "options": null, "wroteOptions": false, "variants": []}]`;
  }
  function pVerify(ctx) {
    return `Answer each multiple-choice question below${ctx.subject ? ` (${ctx.subject})` : ""}. Work each one out carefully and independently.
Questions:
${ctx.items.map(q => JSON.stringify(q)).join("\n")}

Reply with only a JSON array: [{"id": "q0001", "answer": "C", "confidence": "high"}] where confidence is high, medium or low.`;
  }
  function pAdjudicate(ctx) {
    return `You are the senior examiner${ctx.subject ? ` for ${ctx.subject}` : ""}. Two independent solvers disagreed on these multiple-choice questions, so solve each one yourself, very carefully, step by step in your head.
For each: "answer" (letter), "confidence" (high, medium or low), and "explanation": 1–3 plain sentences a student can learn from (why it's right, the key working, and the trap). ${MATH_RULES}
Questions:
${ctx.items.map(q => JSON.stringify(q)).join("\n")}

Reply with only a JSON array: [{"id": "q0001", "answer": "C", "confidence": "high", "explanation": "..."}]`;
  }
  function pLearn(ctx) {
    return `You are writing the study notes for one section of an exam-prep site${ctx.subject ? ` for ${ctx.subject}` : ""}: section "${ctx.name}". Students must be able to answer every question below; the exam reuses them with changed numbers.
Write notes built ONLY around what these questions test, for a learner: plain words, explain *why* and not only *what*, use the bank's own numbers in worked examples, and name the traps the wrong options are built on.
- "blurb": 1–2 sentences on what this section is about.
- "metaphor": one vivid everyday picture that makes the core idea stick (2–3 sentences, **bold** the key words).
- "topics": 3–9 topics in teaching order. Each: "title" (short), "tags" (which of these question tags it covers: ${ctx.tags.join(", ")}), "md": the explanation in the dialect below, 80–250 words, with at least one worked example or :::trap callout where it helps.
- "patterns": group the questions by solving method. Every question id appears in exactly one pattern: {"title", "questions": [ids], "recipe": "how to solve this type, 1–2 sentences"}.
- "sheet": 3–8 formula-sheet rows ["label", "formula or rule"].
Dialect for "md": paragraphs, "- " bullets, "1. " numbered lists, pipe tables, ### subheadings, and callouts written as
:::key Title
text
:::
(kinds: key, trap, example). ${MATH_RULES}
${ctx.notes ? `Owner notes: ${ctx.notes}\n` : ""}
Questions (with the correct answer and explanation):
${ctx.items.map(q => JSON.stringify(q)).join("\n")}

Reply with only JSON: {"blurb": "...", "metaphor": "...", "topics": [{"title": "...", "tags": ["..."], "md": "..."}], "patterns": [{"title": "...", "questions": ["q0001"], "recipe": "..."}], "sheet": [["...", "..."]]}`;
  }

  return { evalExpr, optNumber, checkVariant, readFiles, cropFigure, dataUrlToBlob, qBlock, letters, prompts: { pExtract, pSections, pSolve, pVerify, pAdjudicate, pLearn } };
})();
