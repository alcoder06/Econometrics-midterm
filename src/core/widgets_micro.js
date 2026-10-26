/* Interactive diagrams for the microeconomics pack. Mounted from [data-w] blocks like the other widgets.
   They write plain numbers (no $ signs) so nothing is mistaken for a maths delimiter. */
const mfmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("en-US", { maximumFractionDigits: d });
const mpoly = (pts, X, Y, style) => `<polygon points="${pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" style="${style}"/>`;
const marea = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const mline = (x1, y1, x2, y2, X, Y, style) => `<line x1="${X(x1).toFixed(1)}" y1="${Y(y1).toFixed(1)}" x2="${X(x2).toFixed(1)}" y2="${Y(y2).toFixed(1)}" style="${style}"/>`;
const mtext = (x, y, t, X, Y, extra = "") => `<text x="${X(x).toFixed(1)}" y="${Y(y).toFixed(1)}" style="fill:var(--ink);font-size:12px;font-weight:600" ${extra}>${t}</text>`;
const MF = { cs: "fill:var(--c-s1);fill-opacity:.25", ps: "fill:var(--c-s5);fill-opacity:.28", dwl: "fill:var(--bad);fill-opacity:.28", profit: "fill:var(--c-s5);fill-opacity:.3", loss: "fill:var(--bad);fill-opacity:.25", tax: "fill:var(--sun);fill-opacity:.35" };
const key = (sw, t) => `<span><b style="display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;background:${sw}"></b> ${t}</span>`;
const clip = (id, X, Y, x0, x1, y0, y1) => `<clipPath id="${id}"><rect x="${X(x0)}" y="${Y(y1)}" width="${X(x1) - X(x0)}" height="${Y(y0) - Y(y1)}"/></clipPath>`;

/* ---- S1: risk attitudes on a utility curve ---- */
WIDGETS.riskutil = (b) => {
  let att = "averse", p = 0.5; const W1 = 10, W2 = 90;
  const U = { averse: w => Math.sqrt(w / 100), neutral: w => w / 100, loving: w => (w / 100) ** 2 };
  const Ui = { averse: u => 100 * u * u, neutral: u => 100 * u, loving: u => 100 * Math.sqrt(u) };
  const draw = () => {
    const W = 500, H = 300, X = sc(0, 100, 46, W - 16), Y = sc(0, 1, H - 36, 30), u = U[att];
    let s = axes(0, 100, 0, 1, X, Y, [0, 20, 40, 60, 80, 100], [0, 0.5, 1], "Wealth (thousands)", "Utility");
    let path = ""; for (let w = 0; w <= 100; w += 2) path += `${w ? "L" : "M"}${X(w).toFixed(1)},${Y(u(w)).toFixed(1)} `;
    s += `<path d="${path}" style="fill:none;stroke:var(--c-s2);stroke-width:3"/>`;
    const ev = p * W2 + (1 - p) * W1, eu = p * u(W2) + (1 - p) * u(W1), ce = Ui[att](eu), rp = ev - ce;
    s += mline(W1, u(W1), W2, u(W2), X, Y, "stroke:var(--muted);stroke-dasharray:5 4;stroke-width:1.5");
    s += mline(ev, 0, ev, Math.max(eu, u(ev)), X, Y, "stroke:var(--accent);stroke-dasharray:3 3;stroke-width:1.5");
    if (Math.abs(rp) > 0.05) s += mline(ce, eu, ev, eu, X, Y, "stroke:var(--sun);stroke-width:3");
    s += mline(ce, 0, ce, eu, X, Y, "stroke:var(--sun);stroke-dasharray:3 3;stroke-width:1.5");
    [[W1, u(W1)], [W2, u(W2)]].forEach(([w, v]) => { s += `<circle cx="${X(w)}" cy="${Y(v)}" r="5" style="fill:var(--c-s2)"/>`; });
    s += `<circle cx="${X(ev)}" cy="${Y(u(ev))}" r="6" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"><title>Utility of getting the expected value for sure</title></circle>`;
    s += `<circle cx="${X(ev)}" cy="${Y(eu)}" r="6" style="fill:var(--sun);stroke:var(--surface);stroke-width:2"><title>Expected utility of the gamble</title></circle>`;
    s += `<text class="axl" x="${X(ev)}" y="${Y(0) - 6}" text-anchor="middle" style="font-weight:700">EV</text>`;
    if (Math.abs(rp) > 2) s += `<text class="axl" x="${X(ce)}" y="${Y(0) - 6}" text-anchor="middle" style="font-weight:700">CE</text>`;
    const verdict = att === "averse" ? `Risk-averse: the gamble is worth only ${mfmt(ce, 1)} for sure, less than its expected value ${mfmt(ev, 1)}. The <b>risk premium</b> is ${mfmt(rp, 1)}: what this person would give up to avoid the risk. That's why they turn down even fair (or slightly better than fair) gambles.`
      : att === "neutral" ? `Risk-neutral: the straight line means each extra unit of wealth is worth the same, so only the expected value matters. The certainty equivalent equals the expected value (${mfmt(ev, 1)}) and the risk premium is 0.`
        : `Risk-loving: the curve gets steeper, so marginal utility rises with wealth. The gamble is worth ${mfmt(ce, 1)} for sure, more than its expected value ${mfmt(ev, 1)}: this person would pay extra to keep the risk (risk premium ${mfmt(rp, 1)}).`;
    b.innerHTML = `${chipsHTML("ra", [["averse", "Risk-averse (concave)"], ["neutral", "Risk-neutral (linear)"], ["loving", "Risk-loving (convex)"]], att)}
      ${svg(W, H, s, "Utility of wealth and a 10 or 90 gamble")}
      <div class="ctrl"><label class="rng">Chance of the good outcome (90) = <output>${Math.round(p * 100)}%</output><input id="w-ru-p" type="range" min="0.1" max="0.9" step="0.05" value="${p}"></label></div>
      <div class="readout">${key("var(--accent)", "utility of the expected value, for sure")}${key("var(--sun)", "expected utility of the gamble")}</div>
      <p class="small">${verdict}</p>`;
    b.querySelectorAll("[data-ra]").forEach(e => e.onclick = () => { att = e.dataset.ra; draw(); });
    b.querySelector("#w-ru-p").oninput = e => { p = +e.target.value; draw(); };
  };
  draw();
};

/* ---- S2: price ceilings and floors with surplus areas ---- */
WIDGETS.pricecontrol = (b) => {
  let mode = "ceiling", dem = "elastic", price = 3.5;
  const DEM = { elastic: { a: 8, b: 0.5 }, inelastic: { a: 14, b: 2 } }, S0 = 2, Qe = 4, Pe = 6;
  const draw = () => {
    const d = DEM[dem], Dp = q => d.a - d.b * q, Sp = q => S0 + q;
    if (mode === "ceiling") price = Math.min(Math.max(price, 2.5), 6); else if (mode === "floor") price = Math.min(Math.max(price, 6), d.a - 0.5);
    const binding = (mode === "ceiling" && price < Pe) || (mode === "floor" && price > Pe);
    let Qt, cs, ps, dwl = null, gap = 0;
    if (!binding || mode === "none") { Qt = Qe; cs = [[0, d.a], [Qe, Pe], [0, Pe]]; ps = [[0, Pe], [Qe, Pe], [0, S0]]; }
    else if (mode === "ceiling") { Qt = price - S0; const Dt = Dp(Qt); cs = [[0, d.a], [Qt, Dt], [Qt, price], [0, price]]; ps = [[0, price], [Qt, price], [0, S0]]; dwl = [[Qt, Dt], [Qe, Pe], [Qt, price]]; gap = (d.a - price) / d.b - Qt; }
    else { Qt = (d.a - price) / d.b; const St = Sp(Qt); cs = [[0, d.a], [Qt, price], [0, price]]; ps = [[0, price], [Qt, price], [Qt, St], [0, S0]]; dwl = [[Qt, price], [Qe, Pe], [Qt, St]]; gap = (price - S0) - Qt; }
    const cs0 = 0.5 * Qe * (d.a - Pe), ps0 = 0.5 * Qe * (Pe - S0), CS = marea(cs), PS = marea(ps), DW = dwl ? marea(dwl) : 0;
    const W = 500, H = 320, X = sc(0, 9, 40, W - 16), Y = sc(0, 14, H - 36, 30);
    let s = clip("w-pc-clip", X, Y, 0, 9, 0, 14) + axes(0, 9, 0, 14, X, Y, [0, 2, 4, 6, 8], [0, 2, 4, 6, 8, 10, 12, 14], "Quantity", "Price");
    s += `<g clip-path="url(#w-pc-clip)">` + mpoly(cs, X, Y, MF.cs) + mpoly(ps, X, Y, MF.ps) + (dwl ? mpoly(dwl, X, Y, MF.dwl) : "");
    s += mline(0, d.a, d.a / d.b, 0, X, Y, "stroke:var(--c-s1);stroke-width:2.5") + mline(0, S0, 12, S0 + 12, X, Y, "stroke:var(--c-s5);stroke-width:2.5");
    if (mode !== "none") s += mline(0, price, 9, price, X, Y, `stroke:var(--ink);stroke-width:2;stroke-dasharray:${binding ? "0" : "6 4"}`);
    s += `</g>` + mtext(8.3, Sp(8.3) - 0.4 > 13.5 ? 13.2 : Sp(7.6), "S", X, Y) + mtext(Math.min(8.5, (d.a - 1) / d.b), Math.max(0.6, Dp(Math.min(8.5, (d.a - 1) / d.b)) + 0.4), "D", X, Y);
    if (mode !== "none") s += mtext(0.15, price + 0.35, mode === "ceiling" ? "ceiling" : "floor", X, Y, 'style="fill:var(--ink);font-size:11px"');
    const dCS = CS - cs0, dPS = PS - ps0;
    b.innerHTML = `<div class="row">${chipsHTML("pm", [["ceiling", "Price ceiling"], ["floor", "Price floor"], ["none", "No control"]], mode)}${chipsHTML("pd", [["elastic", "Elastic demand"], ["inelastic", "Inelastic demand"]], dem)}</div>
      ${svg(W, H, s, "Price control on a supply and demand diagram")}
      ${mode !== "none" ? `<div class="ctrl"><label class="rng">${mode === "ceiling" ? "Ceiling" : "Floor"} price = <output>${mfmt(price, 1)}</output><input id="w-pc-p" type="range" min="${mode === "ceiling" ? 2.5 : 6}" max="${mode === "ceiling" ? 6 : d.a - 0.5}" step="0.1" value="${price}"></label></div>` : ""}
      <div class="readout">${key("var(--c-s1)", "consumer surplus")}${key("var(--c-s5)", "producer surplus")}${key("var(--bad)", "deadweight loss")}</div>
      <div class="readout"><span>Quantity traded <b>${mfmt(Qt)}</b>${gap > 0.01 ? ` (${mode === "ceiling" ? "shortage" : "excess supply"} ${mfmt(gap)})` : ""}</span><span>CS <b>${mfmt(CS)}</b> (${dCS >= 0 ? "+" : ""}${mfmt(dCS)})</span><span>PS <b>${mfmt(PS)}</b> (${dPS >= 0 ? "+" : ""}${mfmt(dPS)})</span><span>DWL <b>${mfmt(DW)}</b></span></div>
      <p class="small">${!binding || mode === "none" ? "At the free-market equilibrium (Q = 4, P = 6) total surplus is as large as it can be: no deadweight loss." : mode === "ceiling" ? `The ceiling cuts the quantity <b>supplied</b> to ${mfmt(Qt)}, so units worth more to buyers than they cost to make are never traded: that's the red deadweight loss. Consumers who still buy gain the price cut, but buyers squeezed out lose. ${dCS < 0 ? "<b>Here consumers lose overall, because demand is inelastic</b>: the lost units were worth a lot to them." : "Here consumers still gain overall, because demand is elastic."}` : "The floor cuts the quantity <b>demanded</b>, so fewer units are traded. Producers who still sell earn more per unit, but the lost trades are deadweight loss."}</p>`;
    b.querySelectorAll("[data-pm]").forEach(e => e.onclick = () => { mode = e.dataset.pm; price = mode === "ceiling" ? 3.5 : 7.2; draw(); });
    b.querySelectorAll("[data-pd]").forEach(e => e.onclick = () => { dem = e.dataset.pd; draw(); });
    const sl = b.querySelector("#w-pc-p"); if (sl) sl.oninput = e => { price = +e.target.value; draw(); };
  };
  draw();
};

/* ---- S2: who pays a tax depends on elasticity ---- */
WIDGETS.taxincidence = (b) => {
  let v = 50, t = 2;
  const draw = () => {
    const bs = 0.1 * Math.pow(60, v / 100), a = 6 + 4 * bs, Qt = 4 - t / (1 + bs), Pb = 6 + bs * t / (1 + bs), Ps = Pb - t, cons = (Pb - 6) / t;
    const W = 500, H = 300, X = sc(0, 9, 40, W - 16), Y = sc(0, 12, H - 36, 30);
    let s = clip("w-ti-clip", X, Y, 0, 9, 0, 12) + axes(0, 9, 0, 12, X, Y, [0, 2, 4, 6, 8], [0, 2, 4, 6, 8, 10, 12], "Quantity", "Price");
    s += `<g clip-path="url(#w-ti-clip)">`;
    s += mpoly([[0, Pb], [Qt, Pb], [Qt, 6], [0, 6]], X, Y, MF.cs) + mpoly([[0, 6], [Qt, 6], [Qt, Ps], [0, Ps]], X, Y, MF.ps) + mpoly([[Qt, Pb], [4, 6], [Qt, Ps]], X, Y, MF.dwl);
    s += mline(0, a, a / bs, 0, X, Y, "stroke:var(--c-s1);stroke-width:2.5") + mline(0, 2, 10, 12, X, Y, "stroke:var(--c-s5);stroke-width:2.5") + mline(0, 2 + t, 10, 12 + t, X, Y, "stroke:var(--c-s5);stroke-width:2;stroke-dasharray:6 4");
    s += mline(0, 6, 9, 6, X, Y, "stroke:var(--muted);stroke-dasharray:3 3") + `</g>`;
    s += mtext(0.15, Pb + 0.3, "buyers pay", X, Y, 'style="fill:var(--ink);font-size:11px"') + mtext(0.15, Ps - 0.55, "sellers keep", X, Y, 'style="fill:var(--ink);font-size:11px"');
    const elas = v < 25 ? "very elastic" : v < 45 ? "fairly elastic" : v < 60 ? "middling" : v < 80 ? "fairly inelastic" : "very inelastic";
    b.innerHTML = `${svg(W, H, s, "Tax incidence")}
      <div class="ctrl"><label class="rng">Demand: <output>${elas}</output><input id="w-ti-e" type="range" min="0" max="100" step="1" value="${v}"></label><label class="rng">Tax per unit = <output>${t}</output><input id="w-ti-t" type="range" min="0.5" max="3" step="0.5" value="${t}"></label></div>
      <div class="readout">${key("var(--c-s1)", `consumers' share ${Math.round(cons * 100)}%`)}${key("var(--c-s5)", `producers' share ${Math.round((1 - cons) * 100)}%`)}${key("var(--bad)", "deadweight loss")}</div>
      <p class="small">Slide demand towards <b>inelastic</b>: buyers can't easily walk away, so the price they pay rises by almost the whole tax and they bear most of it. With <b>elastic</b> demand, buyers switch away, so sellers have to absorb the tax. Perfectly inelastic demand puts the whole tax on consumers; perfectly elastic puts it all on producers.</p>`;
    b.querySelector("#w-ti-e").oninput = e => { v = +e.target.value; draw(); };
    b.querySelector("#w-ti-t").oninput = e => { t = +e.target.value; draw(); };
  };
  draw();
};

/* ---- S3: single price vs perfect vs block pricing ---- */
WIDGETS.pricediscrim = (b) => {
  let mode = "single";
  const D = q => 12 - q, MC = 2;
  const draw = () => {
    const W = 500, H = 300, X = sc(0, 12, 40, W - 16), Y = sc(0, 12, H - 36, 30);
    let s = axes(0, 12, 0, 12, X, Y, [0, 2, 4, 6, 8, 10, 12], [0, 2, 4, 6, 8, 10, 12], "Quantity", "Price");
    let cs = [], pr = [], dwl = [];
    if (mode === "single") { cs = [[[0, 12], [5, 7], [0, 7]]]; pr = [[[0, 7], [5, 7], [5, 2], [0, 2]]]; dwl = [[[5, 7], [10, 2], [5, 2]]]; }
    else if (mode === "perfect") { pr = [[[0, 12], [10, 2], [0, 2]]]; }
    else { const B = [[0, 3, 9], [3, 6, 6], [6, 8, 4]]; B.forEach(([q0, q1, p]) => { pr.push([[q0, p], [q1, p], [q1, MC], [q0, MC]]); cs.push([[q0, D(q0)], [q1, D(q1)], [q0, p]]); }); dwl = [[[8, 4], [10, 2], [8, 2]]]; }
    pr.forEach(p => { s += mpoly(p, X, Y, MF.profit); }); cs.forEach(p => { s += mpoly(p, X, Y, MF.cs); }); dwl.forEach(p => { s += mpoly(p, X, Y, MF.dwl); });
    s += mline(0, 12, 12, 0, X, Y, "stroke:var(--c-s1);stroke-width:2.5") + mline(0, MC, 12, MC, X, Y, "stroke:var(--c-s4);stroke-width:2.5");
    if (mode !== "perfect") s += mline(0, 12, 6, 0, X, Y, "stroke:var(--c-s2);stroke-width:2;stroke-dasharray:6 4") + mtext(5.2, 1.0, "MR", X, Y);
    s += mtext(10.6, 2.5, "MC", X, Y) + mtext(10.4, 0.8, mode === "perfect" ? "D = MR" : "D", X, Y);
    if (mode === "single") s += mtext(0.2, 7.3, "P* = 7", X, Y, 'style="fill:var(--ink);font-size:11px"');
    const P = pr.reduce((t, p) => t + marea(p), 0), C = cs.reduce((t, p) => t + marea(p), 0), L = dwl.reduce((t, p) => t + marea(p), 0);
    const msg = { single: "One price for everyone: the firm sets MR = MC (Q = 5, P = 7). Buyers who value the good above 7 keep consumer surplus, and buyers willing to pay between 2 and 7 aren't served at all: that's the deadweight loss.", perfect: "First-degree (perfect) price discrimination: each buyer pays exactly their reservation price. Every extra sale adds its full price to revenue, so the <b>demand curve becomes the MR curve</b>, output rises to where D = MC, consumer surplus is <b>zero</b>, and the firm captures all the surplus.", block: "Second-degree price discrimination: different prices for different <b>quantities</b> (blocks). It captures part of the consumer surplus without knowing each buyer's reservation price." }[mode];
    b.innerHTML = `${chipsHTML("dm", [["single", "Single price"], ["perfect", "Perfect (1st-degree)"], ["block", "Block pricing (2nd-degree)"]], mode)}${svg(W, H, s, "Price discrimination")}
      <div class="readout">${key("var(--c-s5)", `profit ${mfmt(P)}`)}${key("var(--c-s1)", `consumer surplus ${mfmt(C)}`)}${key("var(--bad)", `deadweight loss ${mfmt(L)}`)}</div><p class="small">${msg}</p>`;
    b.querySelectorAll("[data-dm]").forEach(e => e.onclick = () => { mode = e.dataset.dm; draw(); });
  };
  draw();
};

/* ---- S3: third-degree pricing rule ---- */
WIDGETS.inverseelastic = (b) => {
  b.innerHTML = `<div class="ctrl"><label class="rng">Group 1 price<input id="w-ie-p1" type="number" step="0.5" value="2"></label><label class="rng">Group 1 elasticity<input id="w-ie-e1" type="number" step="0.1" value="-2"></label><label class="rng">Group 2 price<input id="w-ie-p2" type="number" step="0.5" value="3"></label></div><div class="ieout stepper" style="--c:var(--c-s3)"></div>`;
  const upd = () => {
    const p1 = +b.querySelector("#w-ie-p1").value, e1 = +b.querySelector("#w-ie-e1").value, p2 = +b.querySelector("#w-ie-p2").value, out = b.querySelector(".ieout");
    if (!(e1 < -1)) { out.innerHTML = `<div class="st"><span class="k">!</span><div>A profit-maximising firm only prices where demand is <b>elastic</b> (elasticity below −1). With |E| ≤ 1, marginal revenue would be zero or negative.</div></div>`; return; }
    const mr = p1 * (1 + 1 / e1), e2 = p2 / (mr - p2);
    out.innerHTML = `<div class="st"><span class="k">1</span><div>Profit is highest when the last unit sold to <b>each</b> group earns the same: MR₁ = MR₂ = MC.</div></div>
      <div class="st"><span class="k">2</span><div>MR = P(1 + 1/E), so MR₁ = ${mfmt(p1)} × (1 + 1/${mfmt(e1)}) = <b>${mfmt(mr)}</b>. That's also MC.</div></div>
      <div class="st"><span class="k">3</span><div>Group 2 must have the same MR: ${mfmt(p2)} × (1 + 1/E₂) = ${mfmt(mr)}, so 1/E₂ = ${mfmt(mr / p2 - 1, 3)} and <b>E₂ = ${mfmt(e2)}</b>.</div></div>
      <div class="st"><span class="k">✓</span><div>The group charged the <b>higher</b> price has the <b>less elastic</b> demand (|${mfmt(e2)}| ${Math.abs(e2) < Math.abs(e1) ? "<" : ">"} |${mfmt(e1)}|). Charge more to whoever is less price-sensitive.</div></div>`;
  };
  b.querySelectorAll("input").forEach(i => i.addEventListener("input", upd)); upd();
};

/* ---- S4: monopolistic competition, short run to long run ---- */
WIDGETS.moncomp = (b) => {
  let k = 0;
  const ATC = q => 3 / q + 0.25 * q, MCf = q => 0.5 * q;
  const draw = () => {
    const A = 5 + (Math.sqrt(15) - 5) * k, Q = A / 2.5, P = A - Q, C = ATC(Q), prof = (P - C) * Q;
    const W = 500, H = 320, X = sc(0, 5, 40, W - 16), Y = sc(0, 5, H - 36, 30);
    let s = clip("w-mc-clip", X, Y, 0, 5, 0, 5) + axes(0, 5, 0, 5, X, Y, [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], "Quantity", "Price");
    s += `<g clip-path="url(#w-mc-clip)">`;
    if (Math.abs(P - C) > 0.01) s += mpoly([[0, P], [Q, P], [Q, C], [0, C]], X, Y, prof > 0 ? MF.profit : MF.loss);
    let atc = ""; for (let q = 0.6; q <= 5.01; q += 0.05) atc += `${q === 0.6 ? "M" : "L"}${X(q).toFixed(1)},${Y(ATC(q)).toFixed(1)} `;
    s += `<path d="${atc}" style="fill:none;stroke:var(--c-s3);stroke-width:2.5"/>` + mline(0, 0, 5, MCf(5), X, Y, "stroke:var(--c-s4);stroke-width:2.5");
    s += mline(0, A, A, 0, X, Y, "stroke:var(--c-s1);stroke-width:2.5") + mline(0, A, A / 2, 0, X, Y, "stroke:var(--c-s2);stroke-width:2;stroke-dasharray:6 4");
    s += mline(Q, 0, Q, P, X, Y, "stroke:var(--muted);stroke-dasharray:3 3") + `</g><circle cx="${X(Q)}" cy="${Y(P)}" r="5" style="fill:var(--ink)"/>`;
    s += mtext(4.55, ATC(4.55) + 0.25, "ATC", X, Y) + mtext(4.35, MCf(4.35) - 0.35, "MC", X, Y) + mtext(Math.min(A - 0.6, 4.4), 0.75, "D", X, Y) + mtext(A / 2 - 0.15, 0.35, "MR", X, Y);
    b.innerHTML = `${svg(W, H, s, "Monopolistically competitive firm")}
      <div class="ctrl"><label class="rng">New firms entering the market: <output>${Math.round(k * 100)}%</output><input id="w-mc-k" type="range" min="0" max="1" step="0.05" value="${k}"></label></div>
      <div class="readout"><span>Q <b>${mfmt(Q)}</b></span><span>Price <b>${mfmt(P)}</b></span><span>ATC <b>${mfmt(C)}</b></span><span>Profit <b>${mfmt(prof)}</b></span></div>
      <p class="small">${k < 0.05 ? "Short run: MR = MC gives Q = 2 and the price is read off the <b>demand</b> curve: 3. Price is above ATC (2), so the firm makes an economic profit (green). That profit attracts new firms. Slide right." : k < 0.99 ? "Entrants steal customers, so this firm's demand and MR both shift <b>left</b>. Profit shrinks." : "Long run: demand has shifted until it just touches ATC, so <b>P = ATC</b> and profit is zero. Price is still above MC, and output is below the bottom of the ATC curve (Q = 3.46): that gap is <b>excess capacity</b>."}</p>`;
    b.querySelector("#w-mc-k").oninput = e => { k = +e.target.value; draw(); };
  };
  draw();
};

/* ---- S4/S5: Cournot, Stackelberg, Bertrand and cartel side by side ---- */
WIDGETS.oligopoly = (b) => {
  let a = 100, bb = 2, c = 16;
  const draw = () => {
    if (c >= a - 10) c = a - 10;
    const m = (a - c) / bb, mono = { q: m / 2, p: (a + c) / 2 }, cour = { q1: m / 3, q2: m / 3 }, stack = { q1: m / 2, q2: m / 4 };
    const P = Q => a - bb * Q;
    const rows = [["Cartel / monopoly", mono.q, mono.p, (mono.p - c) * mono.q / 2, (mono.p - c) * mono.q / 2],
      ["Stackelberg (firm 1 leads)", stack.q1 + stack.q2, P(stack.q1 + stack.q2), (P(stack.q1 + stack.q2) - c) * stack.q1, (P(stack.q1 + stack.q2) - c) * stack.q2],
      ["Cournot", cour.q1 + cour.q2, P(cour.q1 + cour.q2), (P(2 * cour.q1) - c) * cour.q1, (P(2 * cour.q1) - c) * cour.q2],
      ["Bertrand (identical goods)", m, c, 0, 0]];
    const W = 360, H = 320, X = sc(0, m, 46, W - 16), Y = sc(0, m, H - 38, 30), t = [0, m / 4, m / 2, 3 * m / 4, m].map(v => Math.round(v * 10) / 10);
    let s = axes(0, m, 0, m, X, Y, t, t, "Firm 1 output", "Firm 2 output");
    s += mline(0, m / 2, m, 0, X, Y, "stroke:var(--c-s1);stroke-width:2.5") + mline(m / 2, 0, 0, m, X, Y, "stroke:var(--c-s4);stroke-width:2.5");
    s += mline(0, m / 2, m / 2, 0, X, Y, "stroke:var(--muted);stroke-dasharray:4 4");
    s += `<circle cx="${X(cour.q1)}" cy="${Y(cour.q2)}" r="6" style="fill:var(--ink)"><title>Cournot</title></circle><circle cx="${X(stack.q1)}" cy="${Y(stack.q2)}" r="6" style="fill:var(--sun);stroke:var(--surface);stroke-width:2"><title>Stackelberg</title></circle><circle cx="${X(m / 4)}" cy="${Y(m / 4)}" r="6" style="fill:var(--c-s5);stroke:var(--surface);stroke-width:2"><title>Cartel split</title></circle>`;
    s += mtext(cour.q1 + m * 0.03, cour.q2 + m * 0.04, "Cournot", X, Y) + mtext(stack.q1 + m * 0.03, stack.q2 + m * 0.05, "Stackelberg", X, Y) + mtext(m * 0.02, m * 0.2, "cartel", X, Y);
    s += mtext(m * 0.55, m * 0.06, "firm 2's reaction", X, Y, 'style="fill:var(--ink);font-size:11px"') + mtext(m * 0.04, m * 0.92, "firm 1's reaction", X, Y, 'style="fill:var(--ink);font-size:11px"');
    b.innerHTML = `<p class="small">Inverse demand P = ${a} − ${bb}Q, marginal cost ${c} for both firms.</p>
      <div class="ctrl"><label class="rng">Demand intercept a = <output>${a}</output><input id="w-ol-a" type="range" min="60" max="160" step="5" value="${a}"></label><label class="rng">Slope b = <output>${bb}</output><input id="w-ol-b" type="range" min="1" max="4" step="0.5" value="${bb}"></label><label class="rng">Marginal cost = <output>${c}</output><input id="w-ol-c" type="range" min="0" max="50" step="1" value="${c}"></label></div>
      <div class="row" style="align-items:flex-start"><div style="flex:1 1 300px;min-width:0">${svg(W, H, s, "Reaction curves")}</div><div class="tbl-wrap" style="flex:1 1 280px;min-width:0"><table class="t"><tr><th>Model</th><th>Total Q</th><th>Price</th><th>Profit 1</th><th>Profit 2</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${mfmt(r[1], 1)}</td><td>${mfmt(r[2], 1)}</td><td>${mfmt(r[3], 0)}</td><td>${mfmt(r[4], 0)}</td></tr>`).join("")}</table></div></div>
      <p class="small">Each <b>reaction curve</b> shows a firm's best output given the other's. Cournot is where they cross: neither wants to change alone. The Stackelberg leader picks its spot on the follower's reaction curve; it produces <b>twice</b> the follower's output (${mfmt(stack.q1, 1)} vs ${mfmt(stack.q2, 1)}). Going down the table, output rises and price falls: Bertrand price competition drives price to marginal cost.</p>`;
    b.querySelector("#w-ol-a").oninput = e => { a = +e.target.value; draw(); };
    b.querySelector("#w-ol-b").oninput = e => { bb = +e.target.value; draw(); };
    b.querySelector("#w-ol-c").oninput = e => { c = +e.target.value; draw(); };
  };
  draw();
};

/* ---- S5: the cartel as a prisoners' dilemma ---- */
WIDGETS.pdgame = (b) => {
  const PAY = { CC: [40, 40], CD: [25, 50], DC: [50, 25], DD: [30, 30] }, NAME = { C: "Stick to the cartel", D: "Cheat (produce more)" };
  let cell = "CC";
  const note = {
    CC: "Both stick to the deal: 40 each. But look across the row and down the column: either firm could earn 50 by cheating while the other keeps its promise. So this outcome isn't stable on its own.",
    DC: "Firm 1 cheats and grabs 50; firm 2 is the sucker with 25. Firm 2's best reply is to cheat too (30 > 25).",
    CD: "Firm 2 cheats and grabs 50; firm 1 is left with 25. Firm 1's best reply is to cheat too (30 > 25).",
    DD: "The Nash equilibrium: whatever the other does, cheating pays more (50 > 40 and 30 > 25), so both cheat and earn 30, worse than the 40 they'd get by cooperating. That's the prisoners' dilemma, and it's why cartels break down. The way out is to make collusion stick: an enforceable agreement, or repeated play where cheating gets punished.",
  };
  const draw = () => {
    const td = k => `<td class="c" style="cursor:pointer;${k === cell ? "background:var(--sun-soft);outline:2px solid var(--sun)" : ""}${k === "DD" ? ";font-weight:700" : ""}" data-pg="${k}">Firm 1: <b>${PAY[k][0]}</b><br>Firm 2: <b>${PAY[k][1]}</b>${k === "DD" ? "<br><span class=\"small\">Nash equilibrium</span>" : ""}</td>`;
    b.innerHTML = `<p class="small">Two firms in a cartel each choose to stick to the agreed (low) output or to cheat. Profits are shown in each cell. Tap a cell.</p>
      <div class="tbl-wrap"><table class="t"><tr><th></th><th class="c">Firm 2: ${NAME.C}</th><th class="c">Firm 2: ${NAME.D}</th></tr><tr><th>Firm 1: ${NAME.C}</th>${td("CC")}${td("CD")}</tr><tr><th>Firm 1: ${NAME.D}</th>${td("DC")}${td("DD")}</tr></table></div>
      <div class="callout key"><div>${note[cell]}</div></div>`;
    b.querySelectorAll("[data-pg]").forEach(e => e.onclick = () => { cell = e.dataset.pg; draw(); });
  };
  draw();
};
