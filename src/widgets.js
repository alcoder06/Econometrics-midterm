/* Interactive visuals mounted into [data-w] blocks of the Learn pages. */
const WIDGETS = {};
/* Widgets write math as $...$; convert those text-node spans to \( \) before KaTeX runs. */
function convertDollars(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && n.parentElement.closest("svg,pre,script,style,textarea") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => { if (n.nodeValue.indexOf("$") >= 0) n.nodeValue = n.nodeValue.replace(/\$([^$]+?)\$/g, "\\($1\\)"); });
}
function typesetW(el) { if (!el) return; convertDollars(el); typeset(el); }

const AEJ = [[19.068,92.83],[19.151,95.1],[19.233,92.14],[19.315,88.43],[19.397,88.7],[19.479,90.19],[19.562,96.22],[19.644,89.62],[19.726,93.38],[19.808,90.86],[19.89,95.81],[19.973,94.16],[20.055,92.46],[20.137,98.25],[20.219,94.96],[20.301,93.39],[20.384,90.12],[20.466,92.41],[20.548,93.35],[20.63,92.23],[20.712,92.33],[20.795,92.67],[20.877,93.39],[20.959,94.27],[21.041,105.27],[21.123,101.07],[21.205,96.97],[21.288,102.83],[21.37,100.98],[21.452,101.24],[21.534,99.5],[21.616,95.2],[21.699,97.26],[21.781,98.93],[21.863,102.26],[21.945,96.83],[22.027,99.5],[22.11,96.07],[22.192,95.97],[22.274,98.61],[22.356,97.95],[22.438,97.41],[22.521,97.51],[22.603,95.56],[22.685,97.02],[22.767,99.37],[22.849,94.32],[22.932,97.4]];

const sc = (d0, d1, r0, r1) => v => r0 + (v - d0) * (r1 - r0) / (d1 - d0);
const svg = (w, h, inner, label = "") => `<svg class="plot" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg>`;
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randn(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function olsXY(xs, ys) { const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; } const b = sxy / sxx; return { a: my - b * mx, b, mx, my, sxx }; }
const arrowDefs = id => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:currentColor"/></marker></defs>`;
function chipsHTML(name, opts, cur) { return `<div class="chips" role="group">${opts.map(o => `<button type="button" class="chip${o[0] === cur ? " on" : ""}" data-${name}="${o[0]}">${o[1]}</button>`).join("")}</div>`; }
function axes(x0, x1, y0, y1, X, Y, xt, yt, xl = "", yl = "") {
  let s = "";
  yt.forEach(v => { s += `<line class="ax" x1="${X(x0)}" x2="${X(x1)}" y1="${Y(v)}" y2="${Y(v)}" style="stroke-opacity:.6"/><text class="axl" x="${X(x0) - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`; });
  xt.forEach(v => { s += `<text class="axl" x="${X(v)}" y="${Y(y0) + 16}" text-anchor="middle">${v}</text>`; });
  s += `<line x1="${X(x0)}" x2="${X(x1)}" y1="${Y(y0)}" y2="${Y(y0)}" style="stroke:var(--muted);stroke-width:1"/>`;
  if (xl) s += `<text class="axl" x="${X((x0 + x1) / 2)}" y="${Y(y0) + 32}" text-anchor="middle">${xl}</text>`;
  if (yl) s += `<text class="axl" x="${X(x0)}" y="${Y(y1) - 10}" text-anchor="start">${yl}</text>`;
  return s;
}

/* ---- S0 ---- */
WIDGETS.dimcheck = (b) => {
  const sel = (id, v) => `<select id="${id}">${[1, 2, 3, 4, 5, 6].map(n => `<option${n === v ? " selected" : ""}>${n}</option>`).join("")}</select>`;
  b.innerHTML = `<div class="ctrl"><span>$A$: ${sel("w-dc-a1", 4)} × ${sel("w-dc-a2", 3)}</span><span>$B$: ${sel("w-dc-b1", 3)} × ${sel("w-dc-b2", 2)}</span></div><div class="readout" aria-live="polite"></div>`;
  const out = b.querySelector(".readout");
  const upd = () => {
    const [a1, a2, b1, b2] = ["a1", "a2", "b1", "b2"].map(k => +b.querySelector("#w-dc-" + k).value);
    const ab = a2 === b1 ? `<b style="color:var(--good)">AB is defined → ${a1} × ${b2}</b> (inner ${a2} = ${b1} shake hands; outer ${a1} and ${b2} survive)` : `<b style="color:var(--bad)">AB is not defined</b>: inner numbers ${a2} ≠ ${b1}`;
    const ba = b2 === a1 ? `BA is defined → ${b1} × ${a2}` : `BA is not defined (${b2} ≠ ${a1})`;
    const add = a1 === b1 && a2 === b2 ? "A + B is defined (same shape)" : "A + B is not defined (shapes differ)";
    out.innerHTML = `<div>${ab}</div><div class="muted">${ba} · ${add}</div>`;
  };
  b.querySelectorAll("select").forEach(s => s.addEventListener("change", upd)); upd();
};
WIDGETS.matmul = (b) => {
  const A = [[2, 1], [0, 3]], v = [4, 2]; let step = 0;
  const draw = () => {
    const r = step - 1;
    const res = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
    const g = (rows, cls) => `<span class="mgrid" style="grid-template-columns:repeat(${rows[0].length},auto)">${rows.flat().map((x, i) => `<span class="${cls(Math.floor(i / rows[0].length), i % rows[0].length)}">${x}</span>`).join("")}</span>`;
    const Ah = g(A, (i) => (i === r ? "hl" : "")), vh = g(v.map(x => [x]), () => (r >= 0 ? "hl" : ""));
    const R2 = g(res.map((x, i) => [i < step ? x : "?"]), (i) => (i === r ? "hl res" : i < step ? "res" : ""));
    const calc = r >= 0 ? `Row ${r + 1} · column: $${A[r][0]}\\cdot${v[0]}+${A[r][1]}\\cdot${v[1]}=${res[r]}$` : "Press <b>Next entry</b> to compute the first entry.";
    b.innerHTML = `<div class="row" style="gap:10px;font-size:1.05rem">${Ah}${vh}<span>=</span>${R2}</div><div aria-live="polite">${calc}</div><div><button type="button" class="btn sm soft" id="w-mm-next">${step >= 2 ? "Start over" : "Next entry"}</button></div>`;
    b.querySelector("#w-mm-next").onclick = () => { step = step >= 2 ? 0 : step + 1; draw(); };
    typesetW(b);
  };
  draw();
};
WIDGETS.span = (b) => {
  let mode = "ind", a1 = 1, a2 = 1;
  const draw = () => {
    const x1 = [1, 2], x2 = mode === "ind" ? [3, 1] : [2, 4];
    const W2 = 320, H2 = 300, X = sc(-6, 6, 10, W2 - 10), Y = sc(-6, 6, H2 - 10, 10);
    const c = [a1 * x1[0] + a2 * x2[0], a1 * x1[1] + a2 * x2[1]];
    let s = arrowDefs("w-sp-arr");
    if (mode === "ind") s += `<rect x="${X(-6)}" y="${Y(6)}" width="${X(6) - X(-6)}" height="${Y(-6) - Y(6)}" rx="14" style="fill:var(--accent-soft);opacity:.55"/>`;
    for (let g = -6; g <= 6; g += 2) s += `<line class="ax" x1="${X(g)}" x2="${X(g)}" y1="${Y(-6)}" y2="${Y(6)}" style="stroke-opacity:.45"/><line class="ax" y1="${Y(g)}" y2="${Y(g)}" x1="${X(-6)}" x2="${X(6)}" style="stroke-opacity:.45"/>`;
    s += `<line x1="${X(-6)}" x2="${X(6)}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--muted)"/><line y1="${Y(-6)}" y2="${Y(6)}" x1="${X(0)}" x2="${X(0)}" style="stroke:var(--muted)"/>`;
    if (mode === "col") s += `<line x1="${X(-3)}" y1="${Y(-6)}" x2="${X(3)}" y2="${Y(6)}" style="stroke:var(--accent);stroke-width:8;stroke-linecap:round;opacity:.25"/>`;
    const arr = (v, col, w = 3) => `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(v[0])}" y2="${Y(v[1])}" style="stroke:${col};color:${col};stroke-width:${w}" marker-end="url(#w-sp-arr)"/>`;
    s += arr(x1, "var(--c-s0)") + arr(x2, "var(--c-s2)");
    const inView = Math.abs(c[0]) <= 6 && Math.abs(c[1]) <= 6;
    if (inView) s += `<circle cx="${X(c[0])}" cy="${Y(c[1])}" r="7" style="fill:var(--sun);stroke:var(--surface);stroke-width:2"/>`;
    s += `<text x="${X(x1[0]) + 6}" y="${Y(x1[1])}" style="fill:var(--c-s0);font-size:13px;font-weight:600">x₁</text><text x="${X(x2[0]) + 6}" y="${Y(x2[1]) + 4}" style="fill:var(--c-s2);font-size:13px;font-weight:600">x₂</text>`;
    b.innerHTML = `${chipsHTML("m", [["ind", "x₂ = (3, 1)  · independent"], ["col", "x₂ = (2, 4) = 2x₁"]], mode)}
      ${svg(W2, H2, s, "Two vectors and their span")}
      <div class="ctrl"><label class="rng">a₁ = <output>${a1}</output><input id="w-sp-a1" type="range" min="-2" max="2" step="0.5" value="${a1}"></label><label class="rng">a₂ = <output>${a2}</output><input id="w-sp-a2" type="range" min="-2" max="2" step="0.5" value="${a2}"></label></div>
      <div class="readout"><span>${a1}·x₁ + ${a2}·x₂ = <b>(${c[0]}, ${c[1]})</b> ${inView ? "(yellow dot)" : "(off the chart)"}</span><span><b>${mode === "ind" ? "Span = the whole plane (shaded)" : "Span = only the line through x₁"}</b></span></div>`;
    b.querySelectorAll("[data-m]").forEach(e => e.onclick = () => { mode = e.dataset.m; draw(); });
    b.querySelector("#w-sp-a1").oninput = e => { a1 = +e.target.value; draw(); };
    b.querySelector("#w-sp-a2").oninput = e => { a2 = +e.target.value; draw(); };
  };
  draw();
};

/* ---- S1 ---- */
WIDGETS.jointtable = (b) => {
  const ys = [50, 70, 90], J = [[0.2, 0.1], [0.2, 0.2], [0.1, 0.2]]; let col = 0;
  const draw = () => {
    const px = [0, 1].map(c => J.reduce((s, r) => s + r[c], 0));
    const cond = J.map(r => r[col] / px[col]); const e = ys.reduce((s, y, i) => s + y * cond[i], 0);
    const E = [0, 1].map(c => ys.reduce((s, y, i) => s + y * J[i][c] / px[c], 0));
    const tbl = `<div class="tbl-wrap"><table class="t"><tr><th></th><th class="c" style="${col === 0 ? "background:var(--sun-soft)" : ""}">$X=0$</th><th class="c" style="${col === 1 ? "background:var(--sun-soft)" : ""}">$X=1$</th><th class="c">$P(Y=y)$</th></tr>
      ${J.map((r, i) => `<tr><th>$Y=${ys[i]}$</th>${r.map((v, c) => `<td class="c" style="${c === col ? "background:var(--sun-soft);font-weight:600" : ""}">${v.toFixed(2)}</td>`).join("")}<td class="c muted">${(r[0] + r[1]).toFixed(2)}</td></tr>`).join("")}
      <tr><th>$P(X=x)$</th>${px.map((v, c) => `<td class="c" style="${c === col ? "background:var(--sun);color:#2b1d00;font-weight:700" : ""}">${v.toFixed(2)}</td>`).join("")}<td class="c">1</td></tr></table></div>`;
    b.innerHTML = `${chipsHTML("c", [[0, "Zoom into X = 0 (low attendance)"], [1, "Zoom into X = 1 (high attendance)"]], col)}${tbl}
      <div class="stepper" style="--c:var(--c-s1)">
       <div class="st"><span class="k">1</span><div>Marginal: $P(X=${col})=${J.map(r => r[col].toFixed(2)).join("+")}=${px[col].toFixed(2)}$</div></div>
       <div class="st"><span class="k">2</span><div>Rescale the column: $P(Y\\mid X=${col})=${cond.map((c, i) => `\\tfrac{${J[i][col].toFixed(2)}}{${px[col].toFixed(2)}}`).join(",\\ ")}=${cond.map(c => c.toFixed(2)).join(",\\ ")}$ (sums to 1)</div></div>
       <div class="st"><span class="k">3</span><div>$E[Y\\mid X=${col}]=${ys.map((y, i) => `${y}(${cond[i].toFixed(2)})`).join("+")}=${e.toFixed(0)}$</div></div>
       <div class="st"><span class="k">4</span><div>LIE: $E[Y]=${E[0].toFixed(0)}(${px[0].toFixed(2)})+${E[1].toFixed(0)}(${px[1].toFixed(2)})=${(E[0] * px[0] + E[1] * px[1]).toFixed(0)}$</div></div></div>`;
    b.querySelectorAll("[data-c]").forEach(e => e.onclick = () => { col = +e.dataset.c; draw(); });
    typesetW(b);
  };
  draw();
};
WIDGETS.cef = (b) => {
  const G = [[80, [55, 60, 65]], [120, [79, 84, 90]], [160, [102, 107, 110]]]; let showU = true;
  const draw = () => {
    const W2 = 520, H2 = 300, X = sc(60, 180, 50, W2 - 20), Y = sc(40, 120, H2 - 40, 28);
    let s = axes(60, 180, 40, 120, X, Y, [80, 120, 160], [40, 60, 80, 100, 120], "Income", "Consumption");
    const means = G.map(g => [g[0], g[1].reduce((a, c) => a + c) / 3]);
    s += `<polyline points="${means.map(m => `${X(m[0])},${Y(m[1])}`).join(" ")}" style="fill:none;stroke:var(--c-s1);stroke-width:2.5"/>`;
    G.forEach((g, gi) => g[1].forEach(v => {
      if (showU) s += `<line x1="${X(g[0])}" x2="${X(g[0])}" y1="${Y(v)}" y2="${Y(means[gi][1])}" style="stroke:var(--bad);stroke-width:2;stroke-dasharray:3 3"/>`;
      s += `<circle cx="${X(g[0])}" cy="${Y(v)}" r="5" style="fill:var(--surface);stroke:var(--ink-2);stroke-width:2"><title>(${g[0]}, ${v})</title></circle>`;
    }));
    means.forEach(m => { s += `<rect x="${X(m[0]) - 7}" y="${Y(m[1]) - 7}" width="14" height="14" rx="3" transform="rotate(45 ${X(m[0])} ${Y(m[1])})" style="fill:var(--c-s1);stroke:var(--surface);stroke-width:2"/><text x="${X(m[0]) + 14}" y="${Y(m[1]) + 4}" style="fill:var(--ink);font-size:12px;font-weight:600">${m[1].toFixed(2)}</text>`; });
    b.innerHTML = `${svg(W2, H2, s, "Conditional means of consumption by income")}
      <div class="readout"><span><b style="color:var(--c-s1)">◆</b> $E[Y\\mid X]$ joined = population regression function</span><span><b style="color:var(--bad)">┆</b> gaps $u=Y-E[Y\\mid X]$</span></div>
      <label class="chip${showU ? " on" : ""}" style="width:max-content"><input id="w-cef-u" type="checkbox" ${showU ? "checked" : ""} style="margin:0"> Show error terms</label>`;
    b.querySelector("#w-cef-u").onchange = e => { showU = e.target.checked; draw(); };
    typesetW(b);
  };
  draw();
};

/* ---- S2 ---- */
WIDGETS.olsfit = (b) => {
  const xs = [80, 80, 100, 100, 120, 120], ys = [55, 60, 65, 70, 79, 84]; const fit = olsXY(xs, ys);
  const ssr = (a, s) => xs.reduce((t, x, i) => t + (ys[i] - a - s * x) ** 2, 0); const best = ssr(fit.a, fit.b);
  let a = 20, s = 0.45;
  const draw = () => {
    const W2 = 520, H2 = 320, X = sc(70, 130, 50, W2 - 20), Y = sc(35, 100, H2 - 40, 28), pxu = (Y(0) - Y(1));
    let g = axes(70, 130, 35, 100, X, Y, [80, 90, 100, 110, 120], [40, 60, 80, 100], "Income", "Consumption");
    xs.forEach((x, i) => {
      const yh = a + s * x, r = ys[i] - yh, side = Math.abs(r) * pxu, top = Math.min(Y(ys[i]), Y(yh));
      const left = i % 2 === 0 ? X(x) - side : X(x);
      g += `<rect x="${left}" y="${top}" width="${side}" height="${side}" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent);stroke-opacity:.6"/>`;
    });
    g += `<line x1="${X(70)}" y1="${Y(a + s * 70)}" x2="${X(130)}" y2="${Y(a + s * 130)}" style="stroke:var(--ink);stroke-width:2.5"/>`;
    xs.forEach((x, i) => { g += `<circle cx="${X(x)}" cy="${Y(ys[i])}" r="5.5" style="fill:var(--sun);stroke:var(--surface);stroke-width:2"/>`; });
    const cur = ssr(a, s);
    b.innerHTML = `${svg(W2, H2, g, "Least squares squares")}
      <div class="ctrl"><label class="rng">Intercept $\\hat\\beta_0$ = <output>${a.toFixed(1)}</output><input id="w-ols-a" type="range" min="-20" max="45" step="0.5" value="${a}"></label>
      <label class="rng">Slope $\\hat\\beta_1$ = <output>${s.toFixed(2)}</output><input id="w-ols-s" type="range" min="0.2" max="1" step="0.01" value="${s}"></label></div>
      <div class="readout"><span>Your $e'e$ = <b>${cur.toFixed(1)}</b></span><span>OLS minimum = <b>${best.toFixed(1)}</b> at $\\hat\\beta=(${fit.a.toFixed(2)},\\ ${fit.b.toFixed(2)})$</span><span>${cur - best < 0.5 ? "<b style='color:var(--good)'>You found the OLS line.</b>" : `${(cur / best).toFixed(1)}× the minimum`}</span></div>
      <div class="row"><button type="button" class="btn sm" id="w-ols-snap">Snap to OLS</button><button type="button" class="btn sm ghost" id="w-ols-bad">Try a bad guess</button></div>`;
    b.querySelector("#w-ols-a").oninput = e => { a = +e.target.value; draw(); };
    b.querySelector("#w-ols-s").oninput = e => { s = +e.target.value; draw(); };
    b.querySelector("#w-ols-snap").onclick = () => { a = Math.round(fit.a * 2) / 2; s = Math.round(fit.b * 100) / 100; a = fit.a; s = fit.b; draw(); };
    b.querySelector("#w-ols-bad").onclick = () => { a = 40; s = 0.25; draw(); };
    typesetW(b);
  };
  draw();
};
WIDGETS.derive = (b) => {
  const steps = [
    [R`S(\hat\beta)=e'e=(y-X\hat\beta)'(y-X\hat\beta)`, "Write the objective: the sum of squared residuals."],
    [R`=y'y-y'X\hat\beta-\hat\beta'X'y+\hat\beta'X'X\hat\beta`, R`Expand like $(a-b)^2$. Transposing reverses order: $(X\hat\beta)'=\hat\beta'X'$.`],
    [R`=y'y-2\hat\beta'X'y+\hat\beta'X'X\hat\beta`, R`The two middle terms are the same $1\times1$ scalar.`],
    [R`\frac{\partial S}{\partial\hat\beta}=0-2X'y+2X'X\hat\beta`, R`Constant → 0, linear → $-2X'y$, quadratic → $2X'X\hat\beta$.`],
    [R`-2X'y+2X'X\hat\beta=0`, "First-order condition: set the derivative to zero."],
    [R`X'X\hat\beta=X'y`, "The normal equations."],
    [R`\hat\beta=(X'X)^{-1}X'y`, R`Premultiply by $(X'X)^{-1}$, which exists only with <b>full rank</b>.`],
  ];
  let k = 1;
  const draw = () => {
    b.innerHTML = `<div class="stepper" style="--c:var(--c-s2)">${steps.slice(0, k).map((s, i) => `<div class="st"><span class="k">${i + 1}</span><div><div>$${s[0]}$</div><div class="small muted">${s[1]}</div></div></div>`).join("")}</div>
      <div class="row"><button type="button" class="btn sm" id="w-dv-next" ${k >= steps.length ? "disabled" : ""}>Next step</button><button type="button" class="btn sm ghost" id="w-dv-all">${k >= steps.length ? "Start over" : "Show all"}</button></div>`;
    b.querySelector("#w-dv-next").onclick = () => { k = Math.min(steps.length, k + 1); draw(); };
    b.querySelector("#w-dv-all").onclick = () => { k = k >= steps.length ? 1 : steps.length; draw(); };
    typesetW(b);
  };
  draw();
};

/* ---- S3 ---- */
WIDGETS.omega = (b) => {
  let mode = "homo";
  const info = {
    homo: [M([["\\sigma^2", 0, 0, 0], [0, "\\sigma^2", 0, 0], [0, 0, "\\sigma^2", 0], [0, 0, 0, "\\sigma^2"]]), "Same variance everywhere and no co-movement: $\\Omega=\\sigma^2I$. The usual standard errors are valid."],
    het: [M([["\\sigma_1^2", 0, 0, 0], [0, "\\sigma_2^2", 0, 0], [0, 0, "\\sigma_3^2", 0], [0, 0, 0, "\\sigma_4^2"]]), "<b>Heteroskedasticity</b>: the diagonal variances differ, giving a funnel or megaphone shape. OLS is still unbiased, but $\\sigma^2(X'X)^{-1}$ is wrong."],
    auto: [M([["\\sigma^2", "\\sigma_{12}", 0, 0], ["\\sigma_{21}", "\\sigma^2", "\\sigma_{23}", 0], [0, "\\sigma_{32}", "\\sigma^2", "\\sigma_{34}"], [0, 0, "\\sigma_{43}", "\\sigma^2"]]), "<b>Autocorrelation</b>: non-zero off-diagonals, so neighbouring errors move together (waves over time)."],
  };
  const draw = () => {
    const r = rng(7), n = 70, W2 = 520, H2 = 200, X = sc(0, n, 30, W2 - 10), Y = sc(-4, 4, H2 - 14, 14);
    let e = 0, s = `<line x1="${X(0)}" x2="${X(n)}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--muted)"/>`;
    for (let i = 0; i < n; i++) {
      const z = randn(r); let v;
      if (mode === "homo") v = z * 1; else if (mode === "het") v = z * (0.25 + 2.6 * i / n); else { e = 0.88 * e + 0.55 * z; v = e; }
      v = Math.max(-3.9, Math.min(3.9, v));
      s += `<circle cx="${X(i)}" cy="${Y(v)}" r="3.6" style="fill:var(--c-s3)"/>`;
    }
    s += `<text class="axl" x="${X(n)}" y="${H2 - 2}" text-anchor="end">${mode === "auto" ? "time →" : "observations (ordered by x) →"}</text><text class="axl" x="4" y="14">e</text>`;
    b.innerHTML = `${chipsHTML("o", [["homo", "Homoskedastic"], ["het", "Heteroskedastic"], ["auto", "Autocorrelated"]], mode)}
      <div class="row" style="align-items:center"><div class="mathblock">$\\Omega=${info[mode][0]}$</div><div style="flex:1 1 220px;min-width:0" class="small">${info[mode][1]}</div></div>${svg(W2, H2, s, "Residual pattern")}`;
    b.querySelectorAll("[data-o]").forEach(x => x.onclick = () => { mode = x.dataset.o; draw(); });
    typesetW(b);
  };
  draw();
};
WIDGETS.simse = (b) => {
  let n = 30, seed = 12345;
  const run = () => {
    const r = rng(seed), reps = 1000, est = [], ses = [];
    for (let k = 0; k < reps; k++) {
      const xs = [], ys = [];
      for (let i = 0; i < n; i++) { const x = 10 * r(); xs.push(x); ys.push(2 + 3 * x + 5 * randn(r)); }
      const f = olsXY(xs, ys); let rss = 0; for (let i = 0; i < n; i++) rss += (ys[i] - f.a - f.b * xs[i]) ** 2;
      est.push(f.b); ses.push(Math.sqrt(rss / (n - 2) / f.sxx));
    }
    const mean = est.reduce((a, c) => a + c) / reps, sd = Math.sqrt(est.reduce((a, c) => a + (c - mean) ** 2, 0) / (reps - 1)), mse = ses.reduce((a, c) => a + c) / reps;
    const lo = 1.8, hi = 4.2, bw = 0.05, nb = Math.round((hi - lo) / bw), bins = new Array(nb).fill(0);
    est.forEach(v => { const i = Math.floor((v - lo) / bw); if (i >= 0 && i < nb) bins[i]++; });
    const mx = Math.max(...bins), W2 = 520, H2 = 220, X = sc(lo, hi, 30, W2 - 10), Y = sc(0, mx, H2 - 30, 12);
    let s = "";
    bins.forEach((c, i) => { if (c) s += `<rect x="${X(lo + i * bw) + 1}" y="${Y(c)}" width="${X(lo + bw) - X(lo) - 2}" height="${Y(0) - Y(c)}" rx="2" style="fill:var(--c-s3)"><title>${(lo + i * bw).toFixed(2)}–${(lo + (i + 1) * bw).toFixed(2)}: ${c} samples</title></rect>`; });
    s += `<line x1="${X(lo)}" x2="${X(hi)}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--muted)"/>`;
    [2, 2.5, 3, 3.5, 4].forEach(v => { s += `<text class="axl" x="${X(v)}" y="${H2 - 12}" text-anchor="middle">${v}</text>`; });
    s += `<line x1="${X(3)}" x2="${X(3)}" y1="${Y(mx) - 6}" y2="${Y(0)}" style="stroke:var(--ink);stroke-width:2;stroke-dasharray:4 3"/><text x="${X(3) + 6}" y="${Y(mx) + 4}" style="fill:var(--ink);font-size:12px;font-weight:600">true β₂ = 3</text>`;
    b.querySelector(".simplot").innerHTML = svg(W2, H2, s, "Histogram of slope estimates");
    b.querySelector(".simread").innerHTML = `<span>mean of $\\hat\\beta_2$ = <b>${mean.toFixed(3)}</b> (≈ 3: unbiased)</span><span>SD of $\\hat\\beta_2$ = <b>${sd.toFixed(3)}</b></span><span>average reported se = <b>${mse.toFixed(3)}</b> (≈ SD: the se works)</span>`;
    typesetW(b.querySelector(".simread"));
  };
  b.innerHTML = `<div class="row">${chipsHTML("n", [[30, "n = 30"], [200, "n = 200"]], n)}<button type="button" class="btn sm soft" id="w-sim-again">Draw new samples</button></div><div class="simplot"></div><div class="readout simread"></div><p class="small muted">Model: $y=2+3x+u$, $x\sim U(0,10)$, $u\sim N(0,5^2)$, 1,000 samples (as in the seminar). Bigger $n$ makes a narrower histogram, i.e. a smaller se.</p>`;
  b.querySelectorAll("[data-n]").forEach(e => e.onclick = () => { n = +e.dataset.n; b.querySelectorAll("[data-n]").forEach(c => c.classList.toggle("on", c === e)); run(); });
  b.querySelector("#w-sim-again").onclick = () => { seed++; run(); };
  typesetW(b); run();
};
function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
WIDGETS.ttest = (b) => {
  b.innerHTML = `<div class="ctrl"><label class="rng">Coefficient $\\hat\\beta$<input id="w-tt-b" type="number" step="0.01" value="0.72"></label><label class="rng">Std. err.<input id="w-tt-se" type="number" step="0.01" min="0.0001" value="0.12"></label><label class="rng">Significance level<select id="w-tt-a"><option value="0.10">10%</option><option value="0.05" selected>5%</option><option value="0.01">1%</option></select></label></div><div class="ttplot"></div><div class="readout ttread" aria-live="polite"></div>`;
  const upd = () => {
    const bb = +b.querySelector("#w-tt-b").value, se = +b.querySelector("#w-tt-se").value, al = +b.querySelector("#w-tt-a").value;
    if (!(se > 0)) return;
    const t = bb / se, p = 2 * (1 - normCdf(Math.abs(t))), zc = { 0.1: 1.645, 0.05: 1.96, 0.01: 2.576 }[al];
    const W2 = 520, H2 = 180, X = sc(-5, 5, 20, W2 - 20), Y = sc(0, 0.42, H2 - 28, 10), f = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    let path = "", lt = "", rt = "";
    for (let z = -5; z <= 5.001; z += 0.05) { path += `${z === -5 ? "M" : "L"}${X(z).toFixed(1)},${Y(f(z)).toFixed(1)} `; }
    for (let z = -5; z <= -zc; z += 0.05) lt += `L${X(z).toFixed(1)},${Y(f(z)).toFixed(1)} `;
    for (let z = zc; z <= 5.001; z += 0.05) rt += `L${X(z).toFixed(1)},${Y(f(z)).toFixed(1)} `;
    let s = `<path d="M${X(-5)},${Y(0)} ${lt} L${X(-zc)},${Y(0)} Z" style="fill:var(--bad);fill-opacity:.25"/><path d="M${X(zc)},${Y(0)} ${rt} L${X(5)},${Y(0)} Z" style="fill:var(--bad);fill-opacity:.25"/>`;
    s += `<path d="${path}" style="fill:none;stroke:var(--ink-2);stroke-width:2"/><line x1="${X(-5)}" x2="${X(5)}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--muted)"/>`;
    [-4, -2, 0, 2, 4].forEach(v => { s += `<text class="axl" x="${X(v)}" y="${H2 - 10}" text-anchor="middle">${v}</text>`; });
    [-zc, zc].forEach(v => { s += `<text class="axl" x="${X(v)}" y="${Y(0.2)}" text-anchor="middle">${v > 0 ? "+" : "−"}${zc}</text>`; });
    const tc = Math.max(-4.9, Math.min(4.9, t));
    s += `<line x1="${X(tc)}" x2="${X(tc)}" y1="${Y(0.4)}" y2="${Y(0)}" style="stroke:var(--accent);stroke-width:3"/><circle cx="${X(tc)}" cy="${Y(0.4)}" r="6" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/><text x="${X(tc) + (tc > 3 ? -8 : 8)}" y="${Y(0.4) + 4}" text-anchor="${tc > 3 ? "end" : "start"}" style="fill:var(--ink);font-size:12px;font-weight:600">t = ${t.toFixed(2)}${Math.abs(t) > 4.9 ? " (off scale)" : ""}</text>`;
    b.querySelector(".ttplot").innerHTML = svg(W2, H2, s, "t statistic on the standard normal curve");
    const rej = p < al;
    b.querySelector(".ttread").innerHTML = `<span>$t=${bb}/${se}=$ <b>${t.toFixed(2)}</b></span><span>$p\\approx$ <b>${p < 0.0001 ? "<0.0001" : p.toFixed(4)}</b> (large-sample)</span><span><b style="color:var(${rej ? "--good" : "--bad"})">${rej ? "Reject H₀: significant" : "Do not reject H₀: not significant"}</b> at ${al * 100}%</span>`;
    typesetW(b.querySelector(".ttread"));
  };
  b.querySelectorAll("input,select").forEach(e => e.addEventListener("input", upd)); typesetW(b); upd();
};

/* ---- S4 ---- */
WIDGETS.dag = (b) => {
  const node = (x, y, t, c) => `<circle cx="${x}" cy="${y}" r="22" style="fill:${c};stroke:var(--surface);stroke-width:3"/><text x="${x}" y="${y + 5}" text-anchor="middle" style="fill:#fff;font-weight:700;font-size:15px">${t}</text>`;
  const ed = (x1, y1, x2, y2, id) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), k = 25 / L; return `<line x1="${x1 + dx * k}" y1="${y1 + dy * k}" x2="${x2 - dx * k}" y2="${y2 - dy * k}" style="stroke:var(--ink-2);color:var(--ink-2);stroke-width:2.5" marker-end="url(#${id})"/>`; };
  const card = (id, title, shape, body, verdict, cls) => `<div class="dagcard"><b>${title}</b><svg viewBox="0 0 220 150" role="img" aria-label="${title}">${arrowDefs(id)}${body}</svg><div class="small">${shape}</div><div class="verdict ${cls}">${verdict}</div></div>`;
  b.innerHTML = `<div class="dagrow">
    ${card("w-dg1", "Confounder", "$X\\leftarrow C\\to Y$ (common cause)", ed(110, 35, 40, 115, "w-dg1") + ed(110, 35, 180, 115, "w-dg1") + ed(40, 115, 180, 115, "w-dg1") + node(110, 35, "C", "var(--c-s4)") + node(40, 115, "X", "var(--c-s1)") + node(180, 115, "Y", "var(--c-s5)"), "Usually control: it blocks a back door", "yes")}
    ${card("w-dg2", "Mediator", "$X\\to M\\to Y$ (the pipe)", ed(40, 115, 110, 35, "w-dg2") + ed(110, 35, 180, 115, "w-dg2") + ed(40, 115, 180, 115, "w-dg2") + node(110, 35, "M", "var(--c-s3)") + node(40, 115, "X", "var(--c-s1)") + node(180, 115, "Y", "var(--c-s5)"), "Depends: controlling leaves only the direct effect", "dep")}
    ${card("w-dg3", "Collider", "$X\\to C\\leftarrow Y$ (common effect)", ed(40, 40, 110, 120, "w-dg3") + ed(180, 40, 110, 120, "w-dg3") + node(110, 120, "C", "var(--c-s4)") + node(40, 40, "X", "var(--c-s1)") + node(180, 40, "Y", "var(--c-s5)"), "Don't control: it creates a fake link", "no")}</div>`;
  typesetW(b);
};
WIDGETS.collider = (b) => {
  const r = rng(99), n = 500, P = [];
  for (let i = 0; i < n; i++) { const x = randn(r), y = randn(r), c = x + y + randn(r); P.push([x, y, c]); }
  const all = olsXY(P.map(p => p[0]), P.map(p => p[1])), sub = P.filter(p => p[2] > 1), fs = olsXY(sub.map(p => p[0]), sub.map(p => p[1]));
  // regression of y on x and c (multiple), via FWL: residualize y and x on c
  const fc1 = olsXY(P.map(p => p[2]), P.map(p => p[0])), fc2 = olsXY(P.map(p => p[2]), P.map(p => p[1]));
  const rx = P.map(p => p[0] - fc1.a - fc1.b * p[2]), ry = P.map(p => p[1] - fc2.a - fc2.b * p[2]);
  const bxc = rx.reduce((s, v, i) => s + v * ry[i], 0) / rx.reduce((s, v) => s + v * v, 0);
  let mode = "all";
  const draw = () => {
    const W2 = 420, H2 = 320, X = sc(-3.2, 3.2, 30, W2 - 10), Y = sc(-3.2, 3.2, H2 - 26, 24);
    let s = axes(-3.2, 3.2, -3.2, 3.2, X, Y, [-3, -2, -1, 0, 1, 2, 3], [-3, 0, 3], "X", "Y");
    P.forEach(p => { const hi = mode === "all" || p[2] > 1; s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3.2" style="fill:${hi ? "var(--c-s4)" : "var(--muted)"};fill-opacity:${hi ? 0.75 : 0.18}"/>`; });
    const f = mode === "all" ? all : fs;
    s += `<line x1="${X(-3.2)}" y1="${Y(f.a + f.b * -3.2)}" x2="${X(3.2)}" y2="${Y(f.a + f.b * 3.2)}" style="stroke:var(--ink);stroke-width:2.5"/>`;
    b.innerHTML = `${chipsHTML("cm", [["all", "All data"], ["sub", "Only C > 1 (conditioning on C)"]], mode)}${svg(W2, H2, s, "Collider bias scatter")}
      <div class="readout"><span>X and Y are generated <b>independently</b>; $C=X+Y+u$.</span><span>Slope of Y on X: <b>${f.b.toFixed(2)}</b></span><span>reg y x c → coefficient on x ≈ <b>${bxc.toFixed(2)}</b> (true effect is 0)</span></div>`;
    b.querySelectorAll("[data-cm]").forEach(e => e.onclick = () => { mode = e.dataset.cm; draw(); });
    typesetW(b);
  };
  draw();
};
WIDGETS.fitcalc = (b) => {
  b.innerHTML = `<div class="grid two">
   <div class="stack"><b>Fit & overall F</b><div class="ctrl"><label class="rng">n<input id="w-fc-n" type="number" value="100"></label><label class="rng">k (incl. constant)<input id="w-fc-k" type="number" value="5"></label><label class="rng">RSS<input id="w-fc-rss" type="number" value="300"></label><label class="rng">TSS<input id="w-fc-tss" type="number" value="500"></label></div><div class="fc1 stack small"></div></div>
   <div class="stack"><b>Partial F</b><div class="ctrl"><label class="rng">$R^2_{ur}$<input id="w-fc-ru" type="number" step="0.01" value="0.42"></label><label class="rng">$R^2_{r}$<input id="w-fc-rr" type="number" step="0.01" value="0.35"></label><label class="rng">q<input id="w-fc-q" type="number" value="2"></label><label class="rng">n<input id="w-fc-n2" type="number" value="120"></label><label class="rng">$k_{ur}$<input id="w-fc-k2" type="number" value="5"></label></div><div class="fc2 stack small"></div></div></div>`;
  const v = id => +b.querySelector("#w-fc-" + id).value;
  const upd = () => {
    const n = v("n"), k = v("k"), rss = v("rss"), tss = v("tss");
    if (tss > 0 && n > k && k > 1) {
      const r2 = 1 - rss / tss, adj = 1 - (rss / (n - k)) / (tss / (n - 1)), F = (r2 / (k - 1)) / ((1 - r2) / (n - k));
      b.querySelector(".fc1").innerHTML = `<div>$R^2=1-${rss}/${tss}=$ <b>${r2.toFixed(3)}</b></div><div>$\\bar R^2=1-\\frac{${rss}/${n - k}}{${tss}/${n - 1}}=$ <b>${adj.toFixed(3)}</b></div><div>$F=\\frac{${r2.toFixed(3)}/${k - 1}}{${(1 - r2).toFixed(3)}/${n - k}}=$ <b>${F.toFixed(2)}</b></div>`;
    }
    const ru = v("ru"), rr = v("rr"), q = v("q"), n2 = v("n2"), k2 = v("k2");
    if (q > 0 && n2 > k2 && ru < 1) {
      const F2 = ((ru - rr) / q) / ((1 - ru) / (n2 - k2));
      b.querySelector(".fc2").innerHTML = `<div>$F=\\frac{(${ru}-${rr})/${q}}{(1-${ru})/${n2 - k2}}=$ <b>${F2.toFixed(2)}</b></div><div class="muted">Compare with the critical value $F_{${q},${n2 - k2}}$ (about 3 for q = 2 at 5%), or use Stata's Prob > F.</div>`;
    }
    typesetW(b.querySelector(".fc1")); typesetW(b.querySelector(".fc2"));
  };
  b.querySelectorAll("input").forEach(e => e.addEventListener("input", upd)); typesetW(b); upd();
};

/* ---- S5 ---- */
WIDGETS.dummygrid = (b) => {
  const B = { b0: 82517.23, b1: -18824.37, b2: 18790.29, b3: -11863.9 };
  const cells = { "00": ["b0"], "01": ["b0", "b2"], "10": ["b0", "b1"], "11": ["b0", "b1", "b2", "b3"] };
  const lab = { b0: "\\beta_0", b1: "\\beta_1", b2: "\\beta_2", b3: "\\beta_3" };
  let cur = "11";
  const fm = v => Math.round(v).toLocaleString("en-US");
  const draw = () => {
    const cell = (k, rowL, colL) => { const sum = cells[k].reduce((s, x) => s + B[x], 0); return `<td class="c" style="cursor:pointer;${k === cur ? "background:var(--sun-soft);outline:2px solid var(--sun)" : ""}" data-k="${k}"><div>$${cells[k].map(x => lab[x]).join("+")}$</div><div class="mono small">${fm(sum)}</div></td>`; };
    b.innerHTML = `<p class="small">Model: rprice $=\\beta_0+\\beta_1\\,\\text{nearinc}+\\beta_2\\,\\text{y81}+\\beta_3(\\text{nearinc}\\times\\text{y81})$. Tap a cell.</p>
      <div class="tbl-wrap"><table class="t"><tr><th></th><th class="c">1978 (y81 = 0)</th><th class="c">1981 (y81 = 1)</th></tr>
      <tr><th>Far (nearinc = 0)</th>${cell("00")}${cell("01")}</tr><tr><th>Near (nearinc = 1)</th>${cell("10")}${cell("11")}</tr></table></div>
      <div class="readout">${cells[cur].map(x => `<span>$${lab[x]}$ = <b>${fm(B[x])}</b></span>`).join("")}</div>
      <p class="small muted">$\\beta_3=(70{,}619-101{,}308)-(63{,}693-82{,}517)=-11{,}864$: the difference-in-differences.</p>`;
    b.querySelectorAll("[data-k]").forEach(e => e.onclick = () => { cur = e.dataset.k; draw(); });
    typesetW(b);
  };
  draw();
};
WIDGETS.did = (b) => {
  const far = [82517, 101308], near = [63693, 70619], cf = near[0] + (far[1] - far[0]);
  const W2 = 520, H2 = 300, X = sc(0, 1, 110, W2 - 150), Y = sc(55000, 110000, H2 - 34, 14);
  let s = "";
  [60000, 80000, 100000].forEach(v => { s += `<line class="ax" x1="${X(-0.2)}" x2="${X(1.2)}" y1="${Y(v)}" y2="${Y(v)}" style="stroke-opacity:.6"/><text class="axl" x="${X(-0.2) - 6}" y="${Y(v) + 4}" text-anchor="end">${v / 1000}K</text>`; });
  s += `<text class="axl" x="${X(0)}" y="${H2 - 12}" text-anchor="middle">1978</text><text class="axl" x="${X(1)}" y="${H2 - 12}" text-anchor="middle">1981</text>`;
  const line = (v, c, dash = "") => `<line x1="${X(0)}" y1="${Y(v[0])}" x2="${X(1)}" y2="${Y(v[1])}" style="stroke:${c};stroke-width:2.5;${dash ? "stroke-dasharray:6 5" : ""}"/>`;
  s += line(far, "var(--c-s1)") + line(near, "var(--c-s4)") + line([near[0], cf], "var(--c-s4)", 1);
  const dot = (x, v, c, t) => `<circle cx="${X(x)}" cy="${Y(v)}" r="6" style="fill:${c};stroke:var(--surface);stroke-width:2"><title>${t}: ${v.toLocaleString("en-US")}</title></circle>`;
  s += dot(0, far[0], "var(--c-s1)", "Far 1978") + dot(1, far[1], "var(--c-s1)", "Far 1981") + dot(0, near[0], "var(--c-s4)", "Near 1978") + dot(1, near[1], "var(--c-s4)", "Near 1981");
  s += `<line x1="${X(1) + 14}" x2="${X(1) + 14}" y1="${Y(cf)}" y2="${Y(near[1])}" style="stroke:var(--ink);stroke-width:2"/><line x1="${X(1) + 8}" x2="${X(1) + 20}" y1="${Y(cf)}" y2="${Y(cf)}" style="stroke:var(--ink);stroke-width:2"/><line x1="${X(1) + 8}" x2="${X(1) + 20}" y1="${Y(near[1])}" y2="${Y(near[1])}" style="stroke:var(--ink);stroke-width:2"/>`;
  s += `<text x="${X(1) + 26}" y="${(Y(cf) + Y(near[1])) / 2 + 4}" style="fill:var(--ink);font-size:12.5px;font-weight:700">DiD ≈ −11,864</text>`;
  s += `<text x="${X(1) + 10}" y="${Y(far[1]) + 4}" style="fill:var(--ink-2);font-size:12px">Far</text><text x="${X(1) + 10}" y="${Y(cf) - 6}" style="fill:var(--ink-2);font-size:11px">Near if parallel</text>`;
  b.innerHTML = `${svg(W2, H2, s, "Difference in differences")}<div class="readout"><span><b style="color:var(--c-s1)">●</b> far from incinerator</span><span><b style="color:var(--c-s4)">●</b> near the incinerator</span><span>dashed = where "near" would be if it had followed the far trend (parallel trends)</span></div>`;
};
WIDGETS.slopes = (b) => {
  let b1 = 1, b2 = 2, b3 = 0.5; const b0 = 2;
  const draw = () => {
    const W2 = 480, H2 = 260, X = sc(0, 10, 36, W2 - 12), Y = sc(0, 30, H2 - 30, 10);
    let s = axes(0, 10, 0, 30, X, Y, [0, 2, 4, 6, 8, 10], [0, 10, 20, 30], "X");
    const ln = (a, sl, c) => { const y0 = a, y1 = a + sl * 10; return `<line x1="${X(0)}" y1="${Y(y0)}" x2="${X(10)}" y2="${Y(y1)}" style="stroke:${c};stroke-width:3"/>`; };
    s = `<clipPath id="w-sl-clip"><rect x="${X(0)}" y="${Y(30)}" width="${X(10) - X(0)}" height="${Y(0) - Y(30)}"/></clipPath>` + s + `<g clip-path="url(#w-sl-clip)">${ln(b0, b1, "var(--c-s1)")}${ln(b0 + b2, b1 + b3, "var(--c-s4)")}</g>`;
    b.innerHTML = `${svg(W2, H2, s, "Two groups with different intercepts and slopes")}
      <div class="ctrl"><label class="rng">$\\beta_1$ (slope, D=0) = <output>${b1}</output><input id="w-sl-1" type="range" min="0" max="2.5" step="0.1" value="${b1}"></label>
      <label class="rng">$\\beta_2$ (intercept shift) = <output>${b2}</output><input id="w-sl-2" type="range" min="-5" max="8" step="0.5" value="${b2}"></label>
      <label class="rng">$\\beta_3$ (slope change) = <output>${b3}</output><input id="w-sl-3" type="range" min="-1.5" max="1.5" step="0.1" value="${b3}"></label></div>
      <div class="readout"><span><b style="color:var(--c-s1)">━</b> $D=0$: $Y=${b0}+${b1}X$</span><span><b style="color:var(--c-s4)">━</b> $D=1$: $Y=${(b0 + b2).toFixed(1)}+${(b1 + b3).toFixed(1)}X$</span></div>`;
    [["1", v => b1 = v], ["2", v => b2 = v], ["3", v => b3 = v]].forEach(([k, f]) => b.querySelector("#w-sl-" + k).oninput = e => { f(+e.target.value); draw(); });
    typesetW(b);
  };
  draw();
};
WIDGETS.rdd = (b) => {
  let mode = "common";
  const fitCommon = () => { // all = b0 + b1*age0 + b2*over21 via FWL-free normal equations (3x3)
    const Xm = AEJ.map(p => [1, p[0] - 21, p[0] >= 21 ? 1 : 0]), y = AEJ.map(p => p[1]);
    const XtX = [0, 1, 2].map(i => [0, 1, 2].map(j => Xm.reduce((s, r) => s + r[i] * r[j], 0))), Xty = [0, 1, 2].map(i => Xm.reduce((s, r, k) => s + r[i] * y[k], 0));
    return solve3(XtX, Xty);
  };
  const solve3 = (A, v) => { const m = A.map((r, i) => [...r, v[i]]); for (let i = 0; i < 3; i++) { let p = i; for (let k = i + 1; k < 3; k++) if (Math.abs(m[k][i]) > Math.abs(m[p][i])) p = k; [m[i], m[p]] = [m[p], m[i]]; for (let k = 0; k < 3; k++) if (k !== i) { const f = m[k][i] / m[i][i]; for (let j = i; j < 4; j++) m[k][j] -= f * m[i][j]; } } return m.map((r, i) => r[3] / r[i]); };
  const c = fitCommon();
  const L = olsXY(AEJ.filter(p => p[0] < 21).map(p => p[0] - 21), AEJ.filter(p => p[0] < 21).map(p => p[1]));
  const Rr = olsXY(AEJ.filter(p => p[0] >= 21).map(p => p[0] - 21), AEJ.filter(p => p[0] >= 21).map(p => p[1]));
  const draw = () => {
    const W2 = 520, H2 = 300, X = sc(19, 23, 44, W2 - 14), Y = sc(85, 108, H2 - 32, 28);
    let s = axes(19, 23, 85, 108, X, Y, [19, 20, 21, 22, 23], [85, 90, 95, 100, 105], "Age", "Deaths per 100,000");
    s += `<line x1="${X(21)}" x2="${X(21)}" y1="${Y(85)}" y2="${Y(108)}" style="stroke:var(--muted);stroke-dasharray:4 4"/>`;
    AEJ.forEach(p => { s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" style="fill:${p[0] >= 21 ? "var(--c-s4)" : "var(--c-s1)"}"><title>age ${p[0].toFixed(2)}: ${p[1]}</title></circle>`; });
    let left, right;
    if (mode === "common") { left = [c[0] - 2 * c[1], c[0]]; right = [c[0] + c[2], c[0] + c[2] + 2 * c[1]]; }
    else { left = [L.a - 2 * L.b, L.a]; right = [Rr.a, Rr.a + 2 * Rr.b]; }
    s += `<line x1="${X(19)}" y1="${Y(left[0])}" x2="${X(21)}" y2="${Y(left[1])}" style="stroke:var(--ink);stroke-width:2.5"/><line x1="${X(21)}" y1="${Y(right[0])}" x2="${X(23)}" y2="${Y(right[1])}" style="stroke:var(--ink);stroke-width:2.5"/>`;
    s += `<line x1="${X(21) + 8}" x2="${X(21) + 8}" y1="${Y(left[1])}" y2="${Y(right[0])}" style="stroke:var(--sun);stroke-width:4"/><text x="${X(21) + 16}" y="${(Y(left[1]) + Y(right[0])) / 2 + 4}" style="fill:var(--ink);font-size:12.5px;font-weight:700">jump ≈ ${(right[0] - left[1]).toFixed(2)}</text>`;
    b.innerHTML = `${chipsHTML("r", [["common", "Common slope (bank Q12)"], ["sep", "Separate slopes (with interaction)"]], mode)}${svg(W2, H2, s, "Regression discontinuity at age 21")}
      <div class="readout">${mode === "common" ? `<span>reg all age0 over21: over21 = <b>${c[2].toFixed(3)}</b> (the jump), age0 = <b>${c[1].toFixed(3)}</b> (the common slope)</span>` : `<span>Below 21: slope ${L.b.toFixed(2)} · Above 21: slope ${Rr.b.toFixed(2)}. The difference is $\\beta_3$.</span>`}</div>`;
    b.querySelectorAll("[data-r]").forEach(e => e.onclick = () => { mode = e.dataset.r; draw(); });
    typesetW(b);
  };
  draw();
};
WIDGETS.logs = (b) => {
  b.innerHTML = `<div class="ctrl"><label class="rng">Functional form<select id="w-lg-f"><option value="ll">Level–level: Y on X</option><option value="lg" selected>Log–level: ln Y on X</option><option value="gl">Level–log: Y on ln X</option><option value="gg">Log–log: ln Y on ln X</option></select></label><label class="rng">Coefficient β₁<input id="w-lg-b" type="number" step="0.01" value="0.08"></label></div><div class="readout lgout" aria-live="polite" style="font-size:.98rem"></div>`;
  const upd = () => {
    const f = b.querySelector("#w-lg-f").value, be = +b.querySelector("#w-lg-b").value; let t = "";
    const n = (x, d = 4) => (+x.toFixed(d)).toString();
    if (f === "ll") t = `A one-unit increase in X is associated with a <b>${n(be)}-unit</b> change in Y.`;
    if (f === "lg") t = `A one-unit increase in X is associated with approximately a <b>${n(100 * be, 2)}%</b> change in Y (exact: ${n(100 * (Math.exp(be) - 1), 2)}%).`;
    if (f === "gl") t = `A 1% increase in X is associated with a <b>${n(be / 100)}-unit</b> change in Y.`;
    if (f === "gg") t = `A 1% increase in X is associated with approximately a <b>${n(be, 3)}%</b> change in Y (elasticity).`;
    b.querySelector(".lgout").innerHTML = `<span>${t}</span>`;
  };
  b.querySelectorAll("input,select").forEach(e => e.addEventListener("input", upd)); upd();
};

/* ---- MIX ---- */
WIDGETS.stataanat = (b) => {
  const out = (typeof STATA_OUT !== "undefined" && STATA_OUT.st3) || "";
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let h = esc(out);
  const rep = [["Number of obs   =       526", "obs"], ["F(2, 523)       =     75.99", "F"], ["Prob &gt; F        =    0.0000", "pF"], ["R-squared       =    0.2252", "r2"], ["Adj R-squared   =    0.2222", "adj"], ["Root MSE        =     3.257", "rmse"], ["    Residual |    5548.16       523    10.60834", "ss"], ["Coefficient", "coef"], ["Std. err.", "se"], ["P&gt;|t|", "p"], ["[95% conf. interval]", "ci"], [".6442721", "coef"], [".0538061", "se"], ["11.97", "t"], ["_cons", "cons"]];
  rep.forEach(([s, k]) => { const i = h.indexOf(s); if (i >= 0) h = h.slice(0, i) + `<button type="button" class="hot" data-k="${k}">${s}</button>` + h.slice(i + s.length); });
  const T = {
    obs: "<b>Number of obs</b>: n = 526 workers in the estimation sample.",
    F: "<b>F(k−1, n−k)</b> = F(2, 523) = 75.99: the overall F test of H₀: all slopes = 0 (educ and exper jointly).",
    pF: "<b>Prob > F</b> = p-value of the overall F test. 0.0000 < 0.05, so the regressors are jointly significant.",
    r2: "<b>R-squared</b> = 1 − RSS/TSS = 1 − 5548.16/7160.41 = 0.2252: about 22.5% of the sample variation in wage is explained.",
    adj: "<b>Adj R-squared</b> = 1 − [RSS/(n−k)]/[TSS/(n−1)] = 0.2222. It penalizes extra regressors.",
    rmse: "<b>Root MSE</b> = σ̂ = √(RSS/(n−k)) = √10.608 ≈ 3.257. Square it to get σ̂².",
    ss: "<b>SS column</b>: Model = explained SS, Residual = RSS = e′e, Total = TSS. df = k−1, n−k, n−1. Residual MS = RSS/(n−k) = σ̂² = 10.608.",
    coef: "<b>Coefficient</b> β̂ on educ = 0.644: holding exper fixed, one more year of education goes with about \$0.64 more per hour.",
    se: "<b>Std. err.</b> = √(σ̂²·[(X′X)⁻¹]ⱼⱼ) = 0.0538: the sampling uncertainty of β̂.",
    t: "<b>t</b> = Coefficient / Std. err. = 0.6443 / 0.0538 = 11.97, testing H₀: β_educ = 0.",
    p: "<b>P>|t|</b> = the two-sided p-value. 0.000 < 0.05, so reject H₀: educ is statistically significant.",
    ci: "<b>95% confidence interval</b> = β̂ ± t_crit × se ≈ 0.644 ± 1.96 × 0.054 = [0.539, 0.750]. It excludes 0, so educ is significant at 5%.",
    cons: "<b>_cons</b> = intercept: the predicted wage when educ = exper = 0 (−3.39, not meaningful on its own).",
  };
  b.innerHTML = `<div class="stata hotspots"><pre>${h}</pre></div><div class="callout key anat-out" aria-live="polite"><div>Tap any highlighted number above.</div></div>`;
  b.querySelectorAll(".hot").forEach(e => e.onclick = () => { b.querySelectorAll(".hot").forEach(x => x.classList.toggle("on", x.dataset.k === e.dataset.k)); b.querySelector(".anat-out").innerHTML = `<div>${T[e.dataset.k]}</div>`; });
};
