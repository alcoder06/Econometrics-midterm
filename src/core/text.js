/* Text pipeline shared by the player and the creator.
   Pack text is either "html" (hand-written packs) or "md" (AI-written packs, a small Markdown dialect).
   Maths is $...$ / $$...$$ (KaTeX); a literal dollar is \$. Everything is sanitized before it reaches the DOM. */
const R = String.raw;
const M = rows => R`\begin{bmatrix}` + rows.map(r => r.join(" & ")).join(R` \\ `) + R`\end{bmatrix}`;
const V = arr => M(arr.map(v => [v]));
const escHtml = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function escMath(m) { return m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* inline markdown used inside html-markup packs */
function md(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[\s(>"“])\*(?!\s)([^*<>]+?)\*(?![\w*])/g, "$1<i>$2</i>");
}
/* html-markup text: convert maths delimiters, apply inline markdown */
function T(s) {
  if (!s) return "";
  s = String(s).replace(/\\\$/g, "\u0001");
  return s.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g).map(p => {
    if (p.startsWith("$$") && p.endsWith("$$") && p.length > 4) return "\\[" + escMath(p.slice(2, -2)) + "\\]";
    if (p.startsWith("$") && p.endsWith("$") && p.length > 1) return "\\(" + escMath(p.slice(1, -1)) + "\\)";
    return md(p);
  }).join("").replace(/\u0001/g, "&#36;");
}

/* md-markup text: paragraphs, **bold**, *italic*, `code`, lists, pipe tables, ### headings,
   and callouts  :::key Title / :::trap / :::example ... :::  — no raw HTML is passed through. */
function renderMd(src) {
  if (src == null || src === "") return "";
  const math = [];
  let s = String(src).replace(/\\\$/g, "\u0001");
  s = s.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (m, d, i) => {
    math.push(d != null ? "\\[" + escMath(d) + "\\]" : "\\(" + escMath(i) + "\\)");
    return "\u0002" + (math.length - 1) + "\u0003";
  });
  s = escHtml(s);
  const inline = t => t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const KINDS = { key: ["key", "Key idea"], trap: ["trap", "Exam trap"], example: ["ex", "Example"], ex: ["ex", "Example"], note: ["ex", "Note"] };
  function blocks(lines) {
    const out = []; let i = 0;
    const isStart = l => /^\s*:::/.test(l) || /^\s*\|/.test(l) || /^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^\s*#{1,4}\s/.test(l);
    while (i < lines.length) {
      const L = lines[i];
      if (!L.trim()) { i++; continue; }
      let m;
      if ((m = L.match(/^\s*:::\s*([a-zA-Z]+)\s*(.*)$/))) {
        const k = KINDS[m[1].toLowerCase()] || KINDS.note; const inner = []; i++;
        while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) inner.push(lines[i++]);
        i++;
        out.push(`<div class="callout ${k[0]}"><div class="ct">${inline(m[2].trim() || k[1])}</div><div>${blocks(inner)}</div></div>`);
      } else if (/^\s*#{1,4}\s/.test(L)) {
        out.push(`<h4>${inline(L.replace(/^\s*#{1,4}\s+/, ""))}</h4>`); i++;
      } else if (/^\s*\|/.test(L)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = r => r.trim().replace(/\\\|/g, "\u0004").replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => inline(c.trim().replace(/\u0004/g, "|")));
        const isSep = r => /-/.test(r) && !/[^\s|:\-]/.test(r);
        const realBody = rows.filter(r => !isSep(r));
        if (realBody.length) {
          const [h, ...rest] = realBody;
          out.push(`<div class="tbl-wrap"><table class="t"><tr>${cells(h).map(c => `<th>${c}</th>`).join("")}</tr>${rest.map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`);
        }
      } else if (/^\s*[-*]\s+/.test(L) || /^\s*\d+[.)]\s+/.test(L)) {
        const ordered = /^\s*\d/.test(L), items = [];
        while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
          let t = lines[i++].replace(/^\s*(?:[-*]|\d+[.)])\s+/, "");
          while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !isStart(lines[i])) t += " " + lines[i++].trim();
          items.push(`<li>${inline(t)}</li>`);
        }
        out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      } else {
        const para = [];
        while (i < lines.length && lines[i].trim() && !(para.length && isStart(lines[i]))) para.push(lines[i++]);
        out.push(`<p>${inline(para.join(" "))}</p>`);
      }
    }
    return out.join("");
  }
  return blocks(s.split(/\r?\n/)).replace(/\u0002(\d+)\u0003/g, (m, k) => math[+k]).replace(/\u0001/g, "&#36;");
}

/* Whitelist sanitizer: anything outside it is unwrapped (kept as text) or dropped. */
const SAN_TAGS = new Set(["b", "strong", "i", "em", "u", "sub", "sup", "br", "p", "ul", "ol", "li", "code", "pre", "h3", "h4", "div", "span", "table", "thead", "tbody", "tr", "th", "td", "img", "a", "hr"]);
const SAN_DROP = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "form", "input", "button", "textarea", "select", "svg", "math", "template", "noscript", "frame", "frameset", "base"]);
const SAN_CLASSES = new Set(["tbl-wrap", "t", "c", "callout", "key", "trap", "ex", "ct", "mathblock", "widget", "wt", "tag", "wbody", "stepper", "st", "k", "note", "muted", "small"]);
function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = node => {
    [...node.children].forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (SAN_DROP.has(tag)) { el.remove(); return; }
      if (!SAN_TAGS.has(tag)) { walk(el); el.replaceWith(...el.childNodes); return; }
      [...el.attributes].forEach(a => {
        const n = a.name.toLowerCase(), v = a.value;
        let keep = false;
        if (n === "class") { const cls = v.split(/\s+/).filter(c => SAN_CLASSES.has(c)); if (cls.length) { el.setAttribute("class", cls.join(" ")); keep = true; } }
        else if (n === "data-w" && tag === "div") keep = /^[a-z0-9]+$/i.test(v);
        else if ((n === "colspan" || n === "rowspan") && (tag === "td" || tag === "th")) keep = /^\d{1,2}$/.test(v);
        else if (n === "src" && tag === "img") keep = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(v) || /^[\w./-]+\.(png|jpe?g|webp|gif)$/i.test(v);
        else if (n === "alt" && tag === "img") keep = true;
        else if (n === "href" && tag === "a") keep = /^(https:\/\/|#)/i.test(v);
        if (!keep) el.removeAttribute(a.name);
      });
      if (tag === "a") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
      walk(el);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
/* One call for any pack text field. */
function rich(s, markup) { if (s == null || s === "") return ""; return sanitize(markup === "md" ? renderMd(s) : T(s)); }
/* For titles, options and table cells: same as rich() but without a wrapping paragraph. */
function richInline(s, markup) { const h = rich(s, markup); const m = h.match(/^<p>([\s\S]*)<\/p>$/); return m && !m[1].includes("<p>") ? m[1] : h; }

function typeset(el) {
  if (!el || typeof window.renderMathInElement !== "function") return;
  try {
    window.renderMathInElement(el, { delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }], throwOnError: false, ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option", "svg"] });
  } catch (e) { /* maths stays as source text */ }
}
