// Build packs/microeconomics.json from the five seminar quizzes in "micro eco.txt" (Intermediate Microeconomics, 5ECON010C).
//   node content/microeconomics/build_micro.js
// Answer keys are the ones posted with the quizzes; every one was re-derived when writing the explanations.
// Four questions refer to figures that weren't in the source file; those figures are redrawn here with
// geometry chosen so the posted answer is exactly right, and each is labelled as redrawn.
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const R = String.raw;
const usd = n => "\\$" + Math.round(n).toLocaleString("en-US");
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const n2 = v => (Math.round(v * 100) / 100).toString();

/* ---------- figures (SVG on white, used as question images) ---------- */
function figure(w, h, [x0, x1], [y0, y1], pad, body, title) {
  const X = v => pad.l + (v - x0) * (w - pad.l - pad.r) / (x1 - x0), Y = v => h - pad.b - (v - y0) * (h - pad.t - pad.b) / (y1 - y0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Lexend, Segoe UI, Arial, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/>${title ? `<text x="${w / 2}" y="18" text-anchor="middle" font-size="13" font-weight="600" fill="#18233a">${title}</text>` : ""}<line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x1)}" y2="${Y(y0)}" stroke="#18233a" stroke-width="1.5"/><line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x0)}" y2="${Y(y1)}" stroke="#18233a" stroke-width="1.5"/>${body(X, Y)}</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}
const P = (pts, X, Y, fill) => `<polygon points="${pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ")}" fill="${fill}" stroke="none"/>`;
const L = (a, b, c, d, X, Y, col = "#18233a", w = 2, dash = "") => `<line x1="${X(a).toFixed(1)}" y1="${Y(b).toFixed(1)}" x2="${X(c).toFixed(1)}" y2="${Y(d).toFixed(1)}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const Tx = (x, y, t, X, Y, opt = {}) => `<text x="${X(x).toFixed(1)}" y="${Y(y).toFixed(1)}" font-size="${opt.size || 13}" font-weight="${opt.weight || 600}" fill="${opt.fill || "#18233a"}" text-anchor="${opt.anchor || "middle"}" font-style="${opt.italic ? "italic" : "normal"}">${t}</text>`;
const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
const shoelace = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

// Fig 1 (S2 Q8): supply falls from S1 to S2. D: P = 10 − Q, S1: P = 2 + Q, S2: P = 4.4 + Q.
const F1 = { a: [[0, 10], [0, 7.2], [2.8, 7.2]], b: [[0, 6], [0, 7.2], [2.8, 7.2], [1.6, 6]], g: [[1.6, 6], [2.8, 7.2], [2.8, 6]], c: [[2.8, 7.2], [2.8, 6], [4, 6]], e: [[0, 2], [0, 4.4], [1.6, 6], [2.8, 6], [2.8, 4.8]], f: [[2.8, 6], [4, 6], [2.8, 4.8]] };
{ // self-check: change in producer surplus must equal b − f − e exactly
  const ps1 = 0.5 * 4 * 4, ps2 = 0.5 * 2.8 * 2.8, d = ps2 - ps1, key = shoelace(F1.b) - shoelace(F1.f) - shoelace(F1.e);
  if (Math.abs(d - key) > 1e-9) throw new Error(`figure 1 geometry: ΔPS ${d} ≠ b−f−e ${key}`);
}
const fig1 = figure(460, 360, [0, 7], [0, 11], { l: 46, r: 20, t: 28, b: 34 }, (X, Y) => {
  const col = { a: "#d7e6fb", b: "#ffe6a8", g: "#e3e3e3", c: "#cfe9f7", e: "#cdeedb", f: "#a9dfbf" };
  let s = Object.entries(F1).map(([k, pts]) => P(pts, X, Y, col[k])).join("");
  s += L(0, 10, 7, 3, X, Y, "#2a6fb3", 2.5) + L(0, 2, 7, 9, X, Y, "#2f9d63", 2.5) + L(0, 4.4, 6.6, 11, X, Y, "#b5562f", 2.5);
  s += L(0, 6, 4, 6, X, Y, "#76829a", 1, "4 3") + L(0, 7.2, 2.8, 7.2, X, Y, "#76829a", 1, "4 3") + L(2.8, 0, 2.8, 7.2, X, Y, "#76829a", 1, "4 3") + L(4, 0, 4, 6, X, Y, "#76829a", 1, "4 3");
  Object.entries(F1).forEach(([k, pts]) => { const [cx, cy] = centroid(pts); s += Tx(k === "g" ? cx + 0.12 : cx, cy - 0.15, k, X, Y, { italic: true, size: 15 }); });
  s += Tx(6.85, 3.4, "D", X, Y) + Tx(6.85, 8.5, "S₁", X, Y) + Tx(6.4, 10.6, "S₂", X, Y);
  s += Tx(-0.12, 5.85, "P₁", X, Y, { anchor: "end", size: 12 }) + Tx(-0.12, 7.05, "P₂", X, Y, { anchor: "end", size: 12 }) + Tx(2.8, -0.75, "Q₂", X, Y, { size: 12 }) + Tx(4, -0.75, "Q₁", X, Y, { size: 12 });
  s += Tx(6.9, -0.75, "Quantity", X, Y, { anchor: "end", size: 11, weight: 500 }) + Tx(0.1, 10.7, "Price", X, Y, { anchor: "start", size: 11, weight: 500 });
  return s;
}, "Supply decreases from S₁ to S₂");
// Fig 2 (S3 Q4): capturing consumer surplus. D: P = 10 − Q, MC = 2, single price P* = 6.
const fig2 = figure(460, 330, [0, 10.5], [0, 11], { l: 46, r: 20, t: 28, b: 34 }, (X, Y) => {
  let s = P([[0, 10], [4, 6], [0, 6]], X, Y, "#d7e6fb") + P([[4, 6], [8, 2], [4, 2]], X, Y, "#ffe6a8");
  s += L(0, 10, 10, 0, X, Y, "#2a6fb3", 2.5) + L(0, 2, 10.2, 2, X, Y, "#d85a82", 2.5) + L(0, 6, 10.2, 6, X, Y, "#18233a", 1.5, "6 4");
  s += L(0, 10, 4, 6, X, Y, "#2a6fb3", 7) + L(4, 6, 8, 2, X, Y, "#e0a400", 7);
  s += Tx(1.6, 6.7, "A", X, Y, { size: 16 }) + Tx(5.4, 2.9, "B", X, Y, { size: 16 });
  s += Tx(2.6, 8.9, "range A: willing to pay more than P*", X, Y, { anchor: "start", size: 11, weight: 500 }) + Tx(6.5, 4.4, "range B: between P* and MC", X, Y, { anchor: "start", size: 11, weight: 500 });
  s += Tx(-0.15, 5.85, "P*", X, Y, { anchor: "end", size: 12 }) + Tx(10.3, 2.3, "MC", X, Y, { anchor: "end", size: 12 }) + Tx(9.6, 1.0, "D", X, Y) + Tx(4, -0.75, "Q*", X, Y, { size: 12 });
  s += Tx(10.4, -0.75, "Quantity", X, Y, { anchor: "end", size: 11, weight: 500 }) + Tx(0.1, 10.7, "Price", X, Y, { anchor: "start", size: 11, weight: 500 });
  return s + L(4, 0, 4, 6, X, Y, "#76829a", 1, "4 3");
}, "Figure 1: capturing consumer surplus");
// Fig 3 (S3 Q8): perfect price discrimination. D: P = 12 − Q, MR = 12 − 2Q, MC = 2 + 0.5Q. Q* = 4, P* = 8, Q** = 20/3.
const q2 = 20 / 3, p2 = 12 - q2;
const fig3 = figure(460, 360, [0, 12.5], [0, 13], { l: 46, r: 20, t: 28, b: 34 }, (X, Y) => {
  const A = [[0, 8], [4, 8], [4, 4], [0, 2]], B = [[0, 12], [0, 8], [4, 8]], C = [[4, 8], [4, p2], [q2, p2]], Dr = [[4, p2], [q2, p2], [4, 4]];
  let s = P(A, X, Y, "#cdeedb") + P(B, X, Y, "#d7e6fb") + P(C, X, Y, "#ffe6a8") + P(Dr, X, Y, "#f6d0dc");
  s += L(0, 12, 12, 0, X, Y, "#2a6fb3", 2.5) + L(0, 12, 6, 0, X, Y, "#8a5fd0", 2, "6 4") + L(0, 2, 12.2, 8.1, X, Y, "#d85a82", 2.5);
  s += L(0, 8, 4, 8, X, Y, "#76829a", 1, "4 3") + L(4, 0, 4, 8, X, Y, "#76829a", 1, "4 3") + L(q2, 0, q2, p2, X, Y, "#76829a", 1, "4 3") + L(4, p2, q2, p2, X, Y, "#76829a", 1, "4 3");
  [["A", A], ["B", B], ["C", C], ["D", Dr]].forEach(([k, pts]) => { const [cx, cy] = centroid(pts); s += Tx(cx, cy - 0.2, k, X, Y, { size: 15 }); });
  s += Tx(11.8, 0.8, "D", X, Y) + Tx(5.6, 0.6, "MR", X, Y, { size: 12 }) + Tx(12.2, 8.6, "MC", X, Y, { anchor: "end", size: 12 });
  s += Tx(-0.15, 7.85, "P*", X, Y, { anchor: "end", size: 12 }) + Tx(4, -0.75, "Q*", X, Y, { size: 12 }) + Tx(q2, -0.75, "Q**", X, Y, { size: 12 });
  s += Tx(12.4, -0.75, "Quantity", X, Y, { anchor: "end", size: 11, weight: 500 }) + Tx(0.1, 12.7, "Price", X, Y, { anchor: "start", size: 11, weight: 500 });
  return s;
}, "Figure 2: single price vs reservation prices");
// Fig 4 (S4 Q3, Q4): monopolistically competitive firm. D: P = 5 − Q, MR = 5 − 2Q, MC = 0.5Q, ATC = 3/Q + 0.25Q.
const fig4 = figure(460, 360, [0, 5.2], [0, 5.2], { l: 52, r: 20, t: 28, b: 34 }, (X, Y) => {
  let s = "";
  [1, 2, 3, 4].forEach(v => { s += L(0, v, 5.2, v, X, Y, "#e7eef8", 1) + Tx(-0.12, v - 0.08, "$" + v, X, Y, { anchor: "end", size: 12, weight: 500 }); });
  [1, 2, 3, 4, 5].forEach(v => { s += Tx(v, -0.38, v, X, Y, { size: 11, weight: 500 }); });
  let atc = ""; for (let q = 0.75; q <= 5.2; q += 0.05) atc += `${q === 0.75 ? "M" : "L"}${X(q).toFixed(1)},${Y(3 / q + 0.25 * q).toFixed(1)} `;
  s += `<path d="${atc}" fill="none" stroke="#d98a1c" stroke-width="2.5"/>` + L(0, 0, 5.2, 2.6, X, Y, "#d85a82", 2.5) + L(0, 5, 5, 0, X, Y, "#2a6fb3", 2.5) + L(0, 5, 2.5, 0, X, Y, "#8a5fd0", 2, "6 4");
  s += L(2, 0, 2, 3, X, Y, "#76829a", 1, "4 3");
  s += Tx(5.1, 3.15, "ATC", X, Y, { anchor: "end", size: 12 }) + Tx(5.1, 2.25, "MC", X, Y, { anchor: "end", size: 12 }) + Tx(4.6, 0.6, "D", X, Y) + Tx(2.75, 0.25, "MR", X, Y, { size: 12 });
  s += Tx(5.15, -0.82, "Quantity (thousands)", X, Y, { anchor: "end", size: 11, weight: 500 }) + Tx(0.1, 5.0, "Price", X, Y, { anchor: "start", size: 11, weight: 500 });
  return s;
}, "Figure 1: a monopolistically competitive firm");

/* ---------- small html helpers (same markup conventions as the econometrics pack) ---------- */
const W = (name, title) => `<div class="widget" data-w="${name}"><div class="wt"><span class="tag">Try it</span>${title}</div><div class="wbody"></div></div>`;
const KEY = (t, h) => `<div class="callout key"><div class="ct">${t}</div><div>${h}</div></div>`;
const TRAP = h => `<div class="callout trap"><div class="ct">Exam trap</div><div>${h}</div></div>`;
const EX = (t, h) => `<div class="callout ex"><div class="ct">${t}</div><div>${h}</div></div>`;
const TB = (head, rows) => `<div class="tbl-wrap"><table class="t"><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
const IMG = (src, alt) => `<img class="qimg" src="${src}" alt="${alt}">`;
const FIGNOTE = "Your quiz file didn't include the original diagram, so it's redrawn here with labels that match the answer key. In the exam the picture may look different: use the method in the explanation.";

const SCEN1 = R`<p><b>Scenario 1:</b> Randy and Samantha are shopping for new cars (one each). Randy expects to pay \$15,000 with probability 1/5 and \$20,000 with probability 4/5. Samantha expects to pay \$12,000 with probability 1/4 and \$20,000 with probability 3/4.</p>`;
const firmTable = rows => `<p><b>Scenario 2:</b> Wanting to invest in the computer games industry, you select A, B and C as the three best firms. Over the past 10 years they have had good years and bad years:</p>` + TB(["Company", "Good-year revenue", "Bad-year revenue", "Number of good years (out of 10)"], rows.map(r => [r[0], `\\$${r[1]} million`, `\\$${r[2]} million`, String(r[3])]));

/* ---------- questions ---------- */
const Q = [];
const add = (sec, list) => list.forEach((q, i) => Q.push(Object.assign({ id: `${sec}-${i + 1}`, sec, n: i + 1 }, q)));

add("s1", [
  { d: 1, t: "ev", q: R`The expected value of a project is always the:`, o: [R`median value of the project.`, R`modal value of the project.`, R`standard deviation of the project.`, R`weighted average of the outcomes, with probabilities of the outcomes used as weights.`], a: 3,
    x: R`Expected value = each outcome × its probability, added up: a **probability-weighted average**. The median and mode are other kinds of "middle", and the standard deviation measures spread (risk), not the average.` },
  { d: 1, t: "risk-attitude", q: R`Some individuals, when facing a lottery or other situation of uncertainty, prefer not to accept gambles that are better than fair (i.e., have a positive expected return), because of the negative utility they receive from uncertainty. What is the name for this behavior?`, o: [R`Expected utility theory`, R`Risk aversion`, R`Risk loving`, R`Risk neutrality`], a: 1,
    x: R`Turning down a better-than-fair gamble because uncertainty itself feels bad is **risk aversion**. A risk-neutral person only looks at expected value, so they'd take it. Expected utility theory is the framework, not the behaviour.` },
  { d: 1, t: "utility-shape", q: R`A person who is risk-loving by definition has a utility function with what shape?`, o: [R`Any of these`, R`Concave`, R`Convex`, R`Linear`], a: 2,
    x: R`Risk-loving means each extra unit of wealth adds **more** utility than the last, so the curve gets steeper: **convex**. Concave means risk-averse; linear means risk-neutral.` },
  { d: 2, t: "utility-shape", q: R`The risk-averse consumer has a ______ utility function, and its slope gets ______ as wealth is increased.`, o: [R`Concave, flatter`, R`Convex, flatter`, R`Convex, vertical`, R`Concave, vertical`], a: 0,
    x: R`Risk aversion = diminishing marginal utility. The curve is **concave**, and its slope (marginal utility) gets **flatter** as wealth rises. A slope never turns "vertical" because you got richer.` },
  { d: 2, t: "ev", q: SCEN1 + R`Refer to Scenario 1. Which of the following is true?`, o: [R`Randy has a higher expected expense than Samantha for the car.`, R`Randy has a lower expected expense than Samantha for the car.`, R`Randy and Samantha have the same expected expense for the car, and it is somewhat less than \$20,000.`, R`Randy and Samantha have the same expected expense for the car: \$20,000.`, R`It is not possible to calculate the expected expense for the car until the true probabilities are known.`], a: 0,
    x: R`Randy: 0.2 × \$15,000 + 0.8 × \$20,000 = \$3,000 + \$16,000 = **\$19,000**. Samantha: 0.25 × \$12,000 + 0.75 × \$20,000 = \$3,000 + \$15,000 = **\$18,000**. Randy's expected expense is higher. Samantha's cheaper low price outweighs her lower chance of getting it.` },
  { d: 2, t: "ev", q: firmTable([["A", 8, 6, 8], ["B", 10, 4, 4], ["C", 30, 1, 1]]) + R`Refer to Scenario 2. Which firm has the highest expected revenue, based on the 10 years' past performance?`, o: [R`A`, R`B`, R`C`, R`A and B`, R`B and C`], a: 0,
    x: R`Use the share of good years as the probability. A: 0.8 × 8 + 0.2 × 6 = **7.6** million. B: 0.4 × 10 + 0.6 × 4 = 6.4 million. C: 0.1 × 30 + 0.9 × 1 = 3.9 million. C's \$30 million is the trap: it only happened in 1 year out of 10.` },
  { d: 1, t: "risk-measure", q: R`Which of the following is NOT a generally accepted measure of the riskiness of an investment?`, o: [R`Standard deviation`, R`Expected value`, R`Variance`, R`none of the above`], a: 1,
    x: R`Risk is about how far outcomes **spread** around the average, which is what variance and standard deviation measure. Expected value is the average itself, so it tells you nothing about risk.` },
  { d: 1, t: "probability", q: R`People often use probability statements to describe events that can only happen once. For example, a political consultant may offer their opinion about the probability that a particular candidate may win the next election. Probability statements like these are based on ____ probabilities.`, o: [R`frequency-based`, R`objective`, R`subjective`, R`universally known`], a: 2,
    x: R`A one-off event can't be repeated to count how often it happens, so the probability is a personal judgment: **subjective** probability. Objective (frequency-based) probability comes from how often something happened over many repetitions.` },
  { d: 2, t: "risk-attitude", q: R`A person with a diminishing marginal utility of income:`, o: [R`will be risk averse.`, R`will be risk neutral.`, R`will be risk loving.`, R`cannot decide without more information`], a: 0,
    x: R`Diminishing marginal utility means losing \$100 hurts more than winning \$100 helps, so a fair gamble lowers expected utility and the person avoids it: **risk averse** (a concave utility curve).` },
  { d: 2, t: "risk-attitude", q: R`John's marginal utility of income function is given as $MU(I) = I$ (his income). From this you would say that he is:`, o: [R`risk averse.`, R`risk loving.`, R`risk neutral.`, R`none of the above`], a: 1,
    x: R`$MU(I) = I$ means marginal utility **rises** with income: each extra unit of income adds more utility than the last. That makes utility convex, so John is **risk-loving**. Constant MU would be risk-neutral; falling MU, risk-averse.` },
]);

add("s2", [
  { d: 2, t: "price-controls", q: R`A ______ set below the equilibrium price in a perfectly competitive market will result in a deadweight loss because it ______ the quantity supplied by producers.`, o: [R`price ceiling, reduces`, R`price floor, reduces`, R`price ceiling, increases`, R`price floor, increases`], a: 0,
    x: R`A ceiling set **below** equilibrium is binding. At the lower price producers supply less, so fewer units are traded. Trades worth more to buyers than they cost to produce never happen: that's the deadweight loss. A floor would be set *above* equilibrium.` },
  { d: 1, t: "price-support", q: R`If the government plans to maintain a certain level of price for a specific good, what economic policy can it use to achieve this goal?`, o: [R`Minimum price policy`, R`Price support policy`, R`Import tariff policy`, R`All of the above`], a: 3,
    x: R`All three hold the price up: a **minimum price** stops it falling below a level, a **price support** has the government buy up the surplus, and an **import tariff** keeps cheaper foreign supply out.` },
  { d: 2, t: "surplus", q: R`Jhon is selling his violin. The minimum amount he needs to be paid for the violin is \$15,500. He finds a buyer who is willing to pay \$22,400, but this buyer insists that Jhon pays for delivery of the violin. The cost of delivery is \$700. Jhon's producer surplus from selling his violin is equal to:`, o: [R`\$14,800.`, R`\$7,600.`, R`\$6,900.`, R`\$6,200.`], a: 3,
    x: R`Producer surplus = what he receives − the least he'd accept − costs he has to pay: \$22,400 − \$15,500 − \$700 = **\$6,200**. \$6,900 forgets the delivery cost; \$7,600 adds it instead of subtracting it.` },
  { d: 3, t: "price-controls", q: R`Consumers suffer a net loss from price controls when demand is ______.`, o: [R`Relatively elastic`, R`Perfectly elastic`, R`Relatively inelastic`, R`None of the above`], a: 2,
    x: R`A price ceiling helps the buyers who still get the good (they pay less) but hurts the buyers who can no longer find it. When demand is **inelastic**, those lost units were worth a lot to consumers, so the loss outweighs the gain and consumers end up worse off overall. Switch the price-control diagram to "Inelastic demand" to see it.` },
  { d: 1, t: "externalities", q: R`In the context of market outcomes, an externality occurs when the actions of consumers or producers:`, o: [R`Impose uncompensated costs or benefits on third parties that are not reflected in the market price.`, R`Lead to a divergence between private and social costs or benefits.`, R`Result in market inefficiency because the price mechanism fails to capture all relevant costs or benefits.`, R`All of the above.`], a: 3,
    x: R`All three describe an externality: a cost or benefit lands on third parties without a price, so private and social costs (or benefits) differ, and the market outcome is inefficient.` },
  { d: 2, t: "price-controls", q: R`Which of the following CANNOT reduce the equilibrium quantity sold in a market?`, o: [R`A quota.`, R`A price ceiling.`, R`A price floor.`, R`None of the above.`], a: 3,
    x: R`Each of them can cut the quantity sold. A quota caps it directly; a binding ceiling cuts the quantity **supplied**; a binding floor cuts the quantity **demanded**. Trade happens on the short side of the market, so the answer is "none of the above".` },
  { d: 1, t: "quotas", q: R`A government limits the number of taxi licenses or the acreage used to grow wheat or corn. If consumer demand remains unchanged, what is the most likely effect of such a production limit?`, o: [R`The reduction in supply creates scarcity, causing the equilibrium price to rise.`, R`The reduction in supply causes both the equilibrium price and quantity to rise.`, R`The restriction has no effect on price because consumer demand has not changed.`, R`The restriction causes the equilibrium price to fall because fewer units are available for consumers.`], a: 0,
    x: R`Limiting licences or acreage shifts supply to the left. With demand unchanged, the price **rises** and the quantity falls. Quantity can't rise when supply is restricted (B).` },
  { d: 3, t: "surplus-areas", img: fig1, imgAlt: "Supply shifts left from S1 to S2; areas a, b, c, e, f, g are marked", note: FIGNOTE, q: R`Consider the supply and demand diagram. If supply decreases from $S_1$ to $S_2$, which area represents the change in PRODUCER surplus?`, o: [R`$b + c - f$`, R`$a + b + c$`, R`$b - f - e$`, R`$c + f + g + e$`], a: 2,
    x: R`Producer surplus is the area between the price and the supply curve. After the shift producers **gain** *b* (the higher price on the units they still sell) but **lose** *e* (those units now cost more to make, since $S_2$ lies above $S_1$) and *f* (surplus on the units no longer sold). Change = **b − f − e**. Option B, a + b + c, is the original consumer surplus.` },
  { d: 2, t: "tax-incidence", q: R`Which one of these statements is true?`, o: [R`The more inelastic the demand, the greater the incidence of a tax on the producer.`, R`The more elastic the demand, the smaller the incidence of a tax on the consumer.`, R`If demand is perfectly inelastic, the whole incidence of the tax will be on the producer.`, R`If demand is perfectly elastic, the whole incidence of the tax will be on the consumer.`], a: 1,
    x: R`The less able buyers are to walk away (inelastic demand), the more of the tax they pay. So with **more elastic** demand, consumers bear **less** of it. The other three are back to front: perfectly inelastic demand puts the whole tax on consumers, and perfectly elastic demand puts it all on producers.` },
  { d: 2, t: "efficiency", q: R`Which of the following statements is FALSE?`, o: [R`At competitive equilibrium, market surplus is maximized.`, R`At the competitive equilibrium, the marginal benefit to consumers equals the marginal cost to producers.`, R`At the competitive equilibrium, social surplus is maximized if there are no externalities.`, R`At the competitive equilibrium, it is possible to make at least one person better off without making anyone worse off.`], a: 3,
    x: R`A competitive equilibrium is **Pareto efficient**: you **can't** make anyone better off without making someone worse off, so D is the false one. A–C are true: surplus is maximised where marginal benefit = marginal cost, as long as there are no externalities.` },
]);

add("s3", [
  { d: 1, t: "first-degree", q: R`Under perfect price discrimination, consumer surplus:`, o: [R`is less than zero.`, R`is greater than zero.`, R`equals zero.`, R`is maximized.`], a: 2,
    x: R`Perfect (first-degree) price discrimination charges every buyer exactly their reservation price, so nobody pays less than they'd be willing to: consumer surplus is **zero**. The firm captures all of it.` },
  { d: 3, t: "capture-surplus", q: R`Suppose a firm has market power and faces a downward sloping demand curve for its product, and its marginal cost curve is upward sloping. If the firm reduces its price, then:`, o: [R`producer surplus increases due to new buyers, but the producer surplus from existing customers declines due to the lower price.`, R`the change in producer surplus is transferred to consumers.`, R`the increase in consumer surplus is only due to the increase in quantity demanded.`, R`the sum of producer and consumer surplus remains the same, but surplus value is transferred from the producer to consumers.`], a: 0,
    x: R`A price cut wins **new** buyers (extra producer surplus on those units) but every **existing** customer now pays less too (lost producer surplus on them). That trade-off is why a single-price firm can't capture all the surplus, and why it would like to price-discriminate. D is wrong: total surplus changes too, because the deadweight loss shrinks.` },
  { d: 2, t: "first-degree", q: R`When a monopolist engages in perfect price discrimination,`, o: [R`the marginal revenue curve lies below the demand curve.`, R`the demand curve and the marginal revenue curve are identical.`, R`marginal cost becomes zero.`, R`the marginal revenue curve becomes horizontal.`], a: 1,
    x: R`With perfect price discrimination, selling one more unit doesn't lower the price on earlier units, so the extra revenue is just that unit's price: **MR = demand**. With a single price, MR lies below demand (option A).` },
  { d: 2, t: "capture-surplus", img: fig2, imgAlt: "Demand curve with range A above the single price and range B between the single price and marginal cost", note: FIGNOTE, q: R`Refer to Figure 1. To capture the consumer surplus along the B range, the firm would ideally charge:`, o: [R`a higher price to consumers willing to pay more and a lower price to those willing to pay less.`, R`the same higher price to all consumers.`, R`a higher price to consumers willing to pay less and a lower price to those willing to pay more.`, R`a range of random prices along the demand curve.`], a: 0,
    x: R`Buyers in range B value the good above marginal cost but below the single price, so they don't buy. To reach them without giving range-A buyers a discount, charge **more to those willing to pay more and less to those willing to pay less**. Matching price to willingness to pay is the whole idea of price discrimination.` },
  { d: 1, t: "first-degree", q: R`When a firm charges each customer the maximum price that the customer is willing to pay, the firm:`, o: [R`engages in a discrete pricing strategy.`, R`charges the average reservation price.`, R`engages in second-degree price discrimination.`, R`engages in first-degree price discrimination.`], a: 3,
    x: R`Charging each customer their reservation price (maximum willingness to pay) is the definition of **first-degree** price discrimination. Second-degree prices by quantity bought; third-degree by group.` },
  { d: 3, t: "third-degree", q: R`Your local grocery store offers a coupon that reduces the price of milk during the coming week. The regular retail price of milk in the store is \$3.00 per gallon, and the coupon price is \$2.00 per gallon for the next week. If the store maximizes profits and the price elasticity of demand for milk is −2 for coupon users, what is the price elasticity of demand for non-users?`, o: [R`$-0.67$`, R`$-1.0$`, R`$-1.5$`, R`We do not have enough information to answer the question.`], a: 2,
    x: R`A profit-maximiser makes marginal revenue equal across groups (and equal to MC), with $MR = P(1 + 1/E)$. Coupon users: $2(1 + \tfrac{1}{-2}) = 1$. Non-users need the same MR: $3(1 + 1/E) = 1 \Rightarrow 1/E = -\tfrac{2}{3} \Rightarrow E = -1.5$. Non-users are less price-sensitive, which is why they pay the higher price.` },
  { d: 1, t: "third-degree", q: R`Third-degree price discrimination involves:`, o: [R`charging each consumer the same two part tariff.`, R`charging lower prices the greater the quantity purchased.`, R`the use of increasing block rate pricing.`, R`charging different prices to different groups based upon differences in elasticity of demand.`], a: 3,
    x: R`Third-degree price discrimination splits customers into **groups** (students, adults, regions) and charges each a different price, depending on how elastic its demand is. A–C are quantity-based pricing (second-degree) or tariffs.` },
  { d: 3, t: "first-degree", img: fig3, imgAlt: "Demand, MR and MC with areas A, B, C and D marked", note: FIGNOTE, q: R`Refer to Figure 2. When the firm charges the reservation price to each consumer, the additional profit equals area:`, o: [R`A`, R`B`, R`C`, R`B + C + D`], a: 3,
    x: R`With one price ($P^*$, where MR = MC) the firm earns area A. Charging every consumer their reservation price turns the old consumer surplus **B** into profit, and makes it worth selling more units, out to where demand meets MC at $Q^{**}$. That adds **C + D**, the old deadweight loss. Additional profit = **B + C + D**.` },
  { d: 1, t: "third-degree", q: R`A tennis pro charges \$15 per hour for tennis lessons for children and \$30 per hour for tennis lessons for adults. The tennis pro is practicing:`, o: [R`first-degree price discrimination.`, R`second-degree price discrimination.`, R`third-degree price discrimination.`, R`fourth-degree price discrimination.`, R`fifth-degree price discrimination.`], a: 2,
    x: R`Children and adults are two **groups** paying different prices for the same lesson: **third-degree** price discrimination. (Fourth- and fifth-degree don't exist.)` },
  { d: 2, t: "third-degree", q: R`A firm sells an identical product to two groups of consumers, A and B. The firm has decided that third-degree price discrimination is feasible and wishes to set prices that maximize profits. Which of the following best describes the price and output strategy that will maximize profits?`, o: [R`$P_A = P_B = MC$`, R`$MR_A = MR_B$`, R`$MR_A = MR_B = MC$`, R`$(MR_A - MR_B) = (1 - MC)$`], a: 2,
    x: R`Sell to each group until the last unit earns the same marginal revenue in both, and that equals marginal cost. If $MR_A > MR_B$, moving a unit from B to A raises profit. $MR_A = MR_B$ alone (B) isn't enough: total output must also satisfy MR = MC.` },
]);

add("s4", [
  { d: 1, t: "moncomp-features", q: R`Which of the following is NOT true of firms in monopolistic competition?`, o: [R`They have excess capacity in the long run.`, R`They earn a normal profit in the long run.`, R`They practice product differentiation.`, R`They are price takers.`], a: 3,
    x: R`Each firm sells a slightly different product, so it faces a downward-sloping demand curve and **chooses** its price: it is **not** a price taker. A–C are all true of monopolistic competition.` },
  { d: 2, t: "moncomp-features", q: R`Firms in monopolistic competition will always:`, o: [R`Set their price above their marginal cost.`, R`Produce at the minimum average total cost.`, R`Make an economic profit.`, R`Set their price equal to their marginal cost.`], a: 0,
    x: R`Demand slopes down, so MR is below price. The firm produces where MR = MC, which leaves the price **above** MC, in the short run and the long run. It doesn't produce at minimum ATC (it has excess capacity), and its long-run economic profit is zero.` },
  { d: 2, t: "moncomp-longrun", img: fig4, imgAlt: "Demand, MR, MC and ATC for a monopolistically competitive firm", note: FIGNOTE, q: R`Refer to Figure 1. If the firm is in monopolistic competition, its price will be:`, o: [R`\$4.`, R`\$1.`, R`\$2.`, R`\$3.`], a: 3,
    x: R`Find the output where MR = MC (2 thousand units), then go **up to the demand curve** to read the price: **\$3**. \$1 is where MR meets MC (a common slip), and \$2 is ATC at that output.` },
  { d: 2, t: "moncomp-longrun", img: fig4, imgAlt: "Demand, MR, MC and ATC for a monopolistically competitive firm", note: FIGNOTE, q: R`Figure 1 shows a monopolistically competitive firm in the short run. During the transition to the long run, the demand curve will shift ______ and the MR curve will shift ______.`, o: [R`Rightward; leftward`, R`Leftward; rightward`, R`Rightward; rightward`, R`Leftward; leftward`], a: 3,
    x: R`In the figure the price (\$3) is above ATC (\$2), so the firm makes an economic profit. That attracts new firms. Each existing firm loses customers, so its demand **and** MR curves shift **left** until P = ATC and profit is zero. Demand and MR always move together.` },
  { d: 2, t: "moncomp-longrun", q: R`Which of the following is true regarding the long run for a firm in monopolistic competition?`, o: [R`$ATC = MC = MR$`, R`$P = MC = ATC$`, R`$P = ATC$`, R`$P = MC = MR$`], a: 2,
    x: R`In the long run entry removes economic profit, so the demand curve just touches ATC and **P = ATC**. Price stays above MC (so B and D are wrong). MR = MC still holds, but at a level below ATC (so A is wrong).` },
  { d: 1, t: "oligopoly-features", q: R`Which of the following is characteristic of oligopoly, but NOT of monopolistic competition?`, o: [R`Each firm faces a downward-sloping demand curve.`, R`Firms are profit-maximisers.`, R`There is more than one firm in the industry.`, R`The choices made by one firm have a significant effect on other firms.`], a: 3,
    x: R`A–C are true of both. What sets oligopoly apart is **strategic interdependence**: with only a few firms, one firm's choices noticeably affect the others, so each must think about how its rivals will react.` },
  { d: 2, t: "cournot", q: R`In the Cournot model, two firms simultaneously choose quantities, taking the quantity chosen by the other firm as given. At the Cournot equilibrium, which of the following statements is correct?`, o: [R`Each firm chooses the monopoly quantity because it assumes the other firm will produce zero.`, R`Each firm chooses its profit-maximizing quantity given the quantity chosen by the other firm; therefore, neither firm can increase its profit by changing its quantity alone.`, R`The market price must equal marginal cost because the two firms compete with each other.`, R`The two firms maximize their joint profit by behaving as a single monopolist.`], a: 1,
    x: R`Cournot equilibrium is a Nash equilibrium in quantities: each firm is on its **reaction curve**, giving its best response to the other's output, so neither gains by changing alone. Price stays above MC (C), and the firms don't reach the joint-monopoly profit (D).` },
  { d: 2, t: "moncomp-longrun", q: R`When a new firm enters a monopolistically competitive market or one firm introduces an improved product, the demand curve for each of the other firms shifts ______, reducing the ______ received by those incumbents.`, o: [R`Inward, price and quantity`, R`Outward, price and quantity`, R`Inward, quantity`, R`None of the above`], a: 0,
    x: R`A new or better rival takes customers, so each incumbent's demand curve shifts **inward** (left). At every price it sells less, and it can only charge less, so **both price and quantity** fall.` },
  { d: 1, t: "oligopoly-features", q: R`Which characteristic is essential for identifying an oligopolistic market, while the other characteristics may vary across oligopolies?`, o: [R`Products must be differentiated.`, R`Firms must earn substantial economic profits in the long run.`, R`A small number of firms account for most or all market production.`, R`Firms must produce identical products.`], a: 2,
    x: R`The defining feature is that **a few firms produce most of the output**. Oligopoly products can be identical (steel) or differentiated (cars), and long-run profits vary, so A, B and D aren't essential.` },
  { d: 1, t: "cournot", q: R`The relationship between a firm's profit maximizing output and the amount it thinks its competitor will produce refers to:`, o: [R`Marginal cost curve`, R`Marginal revenue curve`, R`Reaction curve`, R`$MC = MR$`], a: 2,
    x: R`A **reaction curve** shows a firm's profit-maximising output for each quantity it expects its rival to produce. Where two firms' reaction curves cross is the Cournot equilibrium.` },
]);

add("s5", [
  { d: 2, t: "stackelberg", q: R`In a Stackelberg model, if firm 1 increases its output, the follower firm's best response will:`, o: [R`Increase, because the market price rises.`, R`Decrease, because the market price falls.`, R`Remain unchanged, because firm 2 ignores firm 1's output.`, R`Become unpredictable.`], a: 1,
    x: R`More output from firm 1 pushes the market price **down**, so producing is less attractive for firm 2: its best response is to produce **less**. That's why reaction curves slope down.` },
  { d: 2, t: "stackelberg", q: R`In a Stackelberg duopoly with zero marginal costs and inverse demand $p = a - bQ$, which of the following statements is TRUE?`, o: [R`The leader produces twice as much output as the follower at equilibrium.`, R`The follower produces twice as much output as the leader at equilibrium.`, R`Both firms produce the same quantity at equilibrium.`, R`The follower produces zero output at equilibrium.`], a: 0,
    x: R`The leader produces $\frac{a}{2b}$ and the follower $\frac{a}{4b}$, so the leader produces **twice** as much. Moving first lets the leader commit to a big output, and the follower has to accommodate it. Equal outputs (C) is Cournot.` },
  { d: 2, t: "oligopoly-strategy", q: R`A key fundamental behavioral difference between monopoly and oligopoly is that:`, o: [R`Both monopoly and oligopoly firms generally aim to maximize profits, but oligopoly firms face strategic interdependence.`, R`Barriers to entry and exit.`, R`Deadweight loss due to market power.`, R`A monopoly has no need to collude, but oligopoly firms often have incentives to collude to improve profits.`], a: 0,
    x: R`Both maximise profit, but an oligopolist must take its rivals' reactions into account: **strategic interdependence**. A monopoly has no rivals to think about. B and C are features of market structure, not behaviour.` },
  { d: 2, t: "monopoly-pricing", q: R`If the inverse demand curve a monopoly faces is $p = 100 - 2Q$, and MC is constant at 16, then profit maximisation is achieved when the monopoly sets price equal to:`, o: [R`$58$`, R`$21$`, R`$16$`, R`$25$`], a: 0,
    x: R`With linear demand, MR has twice the slope: $MR = 100 - 4Q$. Set $MR = MC$: $100 - 4Q = 16 \Rightarrow Q = 21$. Then **read the price from demand**: $p = 100 - 2(21) = 58$. 21 is the quantity, not the price, and 16 is MC.` },
  { d: 1, t: "cartels", q: R`Collusion makes firms better off because if they act as a single entity (a cartel) they can reduce output and increase their prices and profits. But some cartels have failed, and others are unstable. Which of the following is a reason why cartels often break down?`, o: [R`Most cartels do not have a dominant strategy.`, R`Each member of a cartel has an incentive to 'cheat' on the collusive agreement by producing more than its share when everyone else sticks with the collusive agreement.`, R`When a cartel is profitable the amount of competition it faces increases.`, R`Members of a cartel may resent having to share their profits equally.`], a: 1,
    x: R`Each member can raise its **own** profit by producing more than its quota while the others hold back. Everyone has that incentive, so cartels tend to collapse. It's a prisoners' dilemma: try the cartel game on the Learn page.` },
  { d: 2, t: "bertrand", q: R`When two firms sell identical products and have the same constant cost, what price do they end up charging in the Bertrand competition?`, o: [R`The monopoly price`, R`The same as their cost`, R`A price above their cost to make profit`, R`A price set through agreement to keep it high`], a: 1,
    x: R`With identical products, buyers go to whoever is cheaper, so each firm undercuts the other until **price equals marginal cost**. This is the Bertrand paradox: just two firms, yet the competitive price.` },
  { d: 1, t: "bertrand", q: R`If one firm lowers its price just a little bit below the other firm's price in Bertrand competition, what happens?`, o: [R`The firm loses all its customers to the other firm`, R`The firm gets all the customers`, R`Both firms share customers evenly`, R`The other firm keeps its customers without changing price`], a: 1,
    x: R`The products are identical, so every buyer goes to the cheaper firm: a tiny price cut wins the **whole** market. That incentive keeps pushing prices down to marginal cost.` },
  { d: 3, t: "cartels", q: R`An oligopoly firm can escape the prisoners' dilemma by:`, o: [R`Ignoring the actions of other firms.`, R`Advertising that it will match any price reduction made by competitors.`, R`Colluding with other firms to agree on high prices and restrict output.`, R`Increasing its production regardless of competitors' decisions.`], a: 2,
    x: R`In the dilemma each firm's dominant strategy (cut price or raise output) leaves both worse off. Escaping it means **coordinating on the cooperative outcome**: colluding to keep prices high and output low, which can last when the game is repeated or the deal is enforced. That's the course's answer. Price-matching promises (B) look tempting because they help such collusion hold, but the escape itself is the collusion.` },
  { d: 2, t: "oligopoly-strategy", q: R`Economies of scale can lead to an oligopoly market structure because:`, o: [R`A few firms can force rivals to produce at low levels of output.`, R`A few firms can use high profits to keep out new entrants.`, R`If larger firms have lower costs, new small entrants will not be able to produce at the low costs achieved by the big established firms.`, R`If economies of scale are insignificant in production, only a few firms are able to produce at the low costs achieved by the big established firms.`], a: 2,
    x: R`With big economies of scale, only large producers reach low average cost. A small newcomer can't match those costs, so the market supports only a **few** firms. D reverses the logic: if economies of scale were *insignificant*, many firms could compete.` },
  { d: 1, t: "oligopoly-strategy", q: R`Which of the following is not part of an oligopolist's business strategy?`, o: [R`Independently setting a product's price without consideration of rivals' pricing policies.`, R`Choosing what new technologies to adopt.`, R`Selecting which new markets to enter.`, R`Deciding on how to manage relations with suppliers.`], a: 0,
    x: R`Ignoring rivals' prices is exactly what an oligopolist **can't** do: its profit depends on what rivals charge. Technology, new markets and supplier relations are all normal parts of its strategy.` },
]);

/* ---------- fresh-number variants (generated here, stored as plain data) ---------- */
function variants(gen, n = 10) { const seen = new Set(), out = []; for (let k = 0; k < 200 && out.length < n; k++) { const v = gen(); if (!v) continue; const sig = v.q + v.o.join("|"); if (seen.has(sig) || new Set(v.o).size !== v.o.length) continue; seen.add(sig); out.push(v); } return out; }
const GEN = {
  "s1-5": () => {
    const probs = [[1, 5], [1, 4], [2, 5], [1, 2], [3, 10]], [rn, rd] = pick(probs), [sn, sd] = pick(probs);
    const rl = ri(10, 17) * 1000, sl = ri(10, 17) * 1000, hi = pick([20000, 22000, 25000]);
    const er = rn / rd * rl + (1 - rn / rd) * hi, es = sn / sd * sl + (1 - sn / sd) * hi;
    if (Math.abs(er - es) < 200) return null;
    const scen = `<p><b>Scenario 1:</b> Randy and Samantha are shopping for new cars (one each). Randy expects to pay ${usd(rl)} with probability ${rn}/${rd} and ${usd(hi)} with probability ${rd - rn}/${rd}. Samantha expects to pay ${usd(sl)} with probability ${sn}/${sd} and ${usd(hi)} with probability ${sd - sn}/${sd}.</p>`;
    const o = [`Randy has a higher expected expense than Samantha for the car.`, `Randy has a lower expected expense than Samantha for the car.`, `Randy and Samantha have the same expected expense for the car, and it is somewhat less than ${usd(hi)}.`, `Randy and Samantha have the same expected expense for the car: ${usd(hi)}.`, `It is not possible to calculate the expected expense for the car until the true probabilities are known.`];
    return { q: scen + "Refer to Scenario 1. Which of the following is true?", o, a: er > es ? 0 : 1, x: `Randy: ${n2(rn / rd)} × ${usd(rl)} + ${n2(1 - rn / rd)} × ${usd(hi)} = **${usd(er)}**. Samantha: ${n2(sn / sd)} × ${usd(sl)} + ${n2(1 - sn / sd)} × ${usd(hi)} = **${usd(es)}**. So Randy's expected expense is ${er > es ? "higher" : "lower"}.` };
  },
  "s1-6": () => {
    const firms = ["A", "B", "C"].map(name => { const bad = ri(1, 8), good = bad + ri(2, 24), yrs = ri(1, 9); return [name, good, bad, yrs, (yrs * good + (10 - yrs) * bad) / 10]; });
    const evs = firms.map(f => f[4]), best = Math.max(...evs);
    if (evs.filter(v => Math.abs(v - best) < 0.25).length > 1) return null;
    const win = evs.indexOf(best);
    return { q: firmTable(firms.map(f => f.slice(0, 4))) + "Refer to Scenario 2. Which firm has the highest expected revenue, based on the 10 years' past performance?", o: ["A", "B", "C", "A and B", "B and C"], a: win,
      x: firms.map(f => `${f[0]}: ${n2(f[3] / 10)} × ${f[1]} + ${n2(1 - f[3] / 10)} × ${f[2]} = **${n2(f[4])}** million`).join(". ") + `. Firm ${firms[win][0]} has the highest expected revenue. Weight each outcome by how often it happened.` };
  },
  "s2-3": () => {
    const min = ri(20, 36) * 500, offer = min + ri(40, 90) * 100, del = ri(3, 12) * 100, ps = offer - min - del;
    return { q: `Jhon is selling his violin. The minimum amount he needs to be paid for the violin is ${usd(min)}. He finds a buyer who is willing to pay ${usd(offer)}, but this buyer insists that Jhon pays for delivery of the violin. The cost of delivery is ${usd(del)}. Jhon's producer surplus from selling his violin is equal to:`,
      o: [`${usd(ps)}.`, `${usd(offer - min)}.`, `${usd(offer - min + del)}.`, `${usd(min - del)}.`], a: 0, x: `Producer surplus = price received − minimum acceptable − costs he pays: ${usd(offer)} − ${usd(min)} − ${usd(del)} = **${usd(ps)}**.` };
  },
  "s3-6": () => {
    const pu = pick([2, 3, 4, 5]), pn = pu + pick([1, 2, 3]), eu = pick([-2, -3, -4, -5]), mr = pu * (1 + 1 / eu), en = pn / (mr - pn);
    const f = v => (Math.round(v * 100) / 100).toFixed(2);
    return { q: `Your local grocery store offers a coupon that reduces the price of milk during the coming week. The regular retail price of milk is ${usd(pn)}.00 per gallon, and the coupon price is ${usd(pu)}.00 per gallon. If the store maximizes profits and the price elasticity of demand for milk is ${eu} for coupon users, what is the price elasticity of demand for non-users?`,
      o: [`$${f(en)}$`, `$${f(eu)}$`, `$${f(eu * pu / pn)}$`, `We do not have enough information to answer the question.`], a: 0,
      x: `Set MR equal across groups, with $MR = P(1 + 1/E)$. Coupon users: $${pu}(1 + \\tfrac{1}{${eu}}) = ${n2(mr)}$. Non-users: $${pn}(1 + 1/E) = ${n2(mr)} \\Rightarrow E = ${f(en)}$. The higher-price group is the less price-sensitive one.` };
  },
  "s5-4": () => {
    const b = pick([1, 2, 3, 4]), c = ri(2, 20) * 2, a = c + 2 * b * ri(6, 30), q = (a - c) / (2 * b), p = (a + c) / 2;
    return { q: `If the inverse demand curve a monopoly faces is $p = ${a} - ${b === 1 ? "" : b}Q$, and MC is constant at ${c}, then profit maximisation is achieved when the monopoly sets price equal to:`,
      o: [`$${p}$`, `$${q}$`, `$${c}$`, `$${a / 2}$`], a: 0, x: `$MR = ${a} - ${2 * b}Q$. Set $MR = MC$: $${a} - ${2 * b}Q = ${c} \\Rightarrow Q = ${q}$. Price comes from demand: $p = ${a} - ${b}(${q}) = ${p}$.` };
  },
};
Q.forEach(q => { if (GEN[q.id]) q.v = variants(GEN[q.id]); });

/* ---------- Learn pages ---------- */
const learn = {
  s1: { name: "Uncertainty & risk", sub: "Seminar 1",
    blurb: R`How to describe a risky choice with numbers (expected value, variance) and why attitudes to risk show up in the **shape** of a utility curve.`,
    metaphor: R`Think of a **coin flip for your rent money**. The expected value is the average result if you could flip forever. A risk-averse person feels the loss much more than the win, so a bet that's fair *on average* still feels like a bad deal.`,
    topics: [
      { id: "probability", title: "Objective and subjective probability", tags: ["probability"], html: R`
<p><b>Objective (frequency) probability</b> comes from how often something happened in many repetitions: a factory's defect rate, a coin landing heads.</p>
<p><b>Subjective probability</b> is a personal judgment, used for events that happen only once: who wins this election, whether a new product will succeed. Different people can hold different subjective probabilities for the same event.</p>` },
      { id: "ev", title: "Expected value: a probability-weighted average", tags: ["ev"], html: R`
<div class="mathblock">$$E(X) = \Pr_1 X_1 + \Pr_2 X_2 + \dots + \Pr_n X_n$$</div>
<p>Multiply each outcome by its probability and add up. More likely outcomes pull the average towards themselves.</p>
${EX("Seminar quiz, Scenario 1", R`Randy: 0.2 × \$15,000 + 0.8 × \$20,000 = **\$19,000**. Samantha: 0.25 × \$12,000 + 0.75 × \$20,000 = **\$18,000**. Randy expects to pay more.`)}
${EX("Seminar quiz, Scenario 2", R`Turn "8 good years out of 10" into a probability of 0.8. Firm A: 0.8 × 8 + 0.2 × 6 = **7.6**; B: 6.4; C: 0.1 × 30 + 0.9 × 1 = 3.9. A wins.`)}
${TRAP(R`A big number that rarely happens (firm C's \$30 million in 1 year out of 10) barely moves the expected value. Always weight by probability.`)}` },
      { id: "risk-measures", title: "Measuring risk: variance and standard deviation", tags: ["risk-measure"], html: R`
<div class="mathblock">$$\sigma^2 = \Pr_1 [X_1 - E(X)]^2 + \Pr_2 [X_2 - E(X)]^2 + \dots \qquad \sigma = \sqrt{\sigma^2}$$</div>
<p>Expected value tells you the <b>centre</b>; variance and standard deviation tell you the <b>spread</b>, i.e. how far the outcomes typically land from the centre. Spread is what risk means.</p>
${TB(["Firm (Scenario 2)", "Expected revenue", "Standard deviation"], [["A", "7.6", "0.8"], ["C", "3.9", "8.7"]])}
<p>Firm C is both worse on average <i>and</i> far riskier.</p>
${KEY("Remember", "Expected value is <b>not</b> a measure of risk. Variance and standard deviation are.")}` },
      { id: "attitudes", title: "Risk attitudes and the shape of utility", tags: ["risk-attitude", "utility-shape"], html: R`
${TB(["Attitude", "Marginal utility of income", "Utility curve", "Offered a fair gamble…"], [["Risk-averse", "diminishing", "<b>concave</b> (gets flatter)", "refuses it"], ["Risk-neutral", "constant", "<b>linear</b>", "doesn't care"], ["Risk-loving", "increasing", "<b>convex</b> (gets steeper)", "takes it"]])}
${W("riskutil", "Same gamble, three attitudes")}
${TRAP(R`$MU(I) = I$ means marginal utility <b>rises</b> with income, so the person is risk-<b>loving</b>, not risk-neutral. Constant MU (like $MU = 5$) would be risk-neutral.`)}` },
      { id: "premium", title: "Risk premium: why people pay to avoid risk", tags: ["risk-attitude"], html: R`
<p>The <b>certainty equivalent</b> is the sure amount that gives the same utility as the gamble. For a risk-averse person it is <b>less</b> than the expected value. The gap is the <b>risk premium</b>: what they would pay to get rid of the risk.</p>
<p>That's why risk-averse people buy insurance, and why they refuse gambles that are even slightly <i>better</i> than fair: the uncertainty costs them more utility than the small expected gain adds.</p>` },
    ],
    patterns: [["Expected value calculations", [1, 5, 6], R`Multiply each outcome by its probability and add. Turn frequencies ("8 years out of 10") into probabilities.`], ["Risk attitude and utility shape", [2, 3, 4, 9, 10], R`Averse = diminishing MU = concave; neutral = constant MU = linear; loving = increasing MU = convex.`], ["Measuring risk", [7], R`Variance and standard deviation measure risk; expected value doesn't.`], ["Kinds of probability", [8], R`One-off events use subjective probability; repeated events use objective (frequency) probability.`]],
    sheet: [[R`Expected value`, R`$E(X)=\sum \Pr_i X_i$`], [R`Variance`, R`$\sigma^2=\sum \Pr_i [X_i-E(X)]^2$`], [R`Risk-averse`, R`concave $U$, diminishing $MU$, positive risk premium`], [R`Risk-neutral`, R`linear $U$, constant $MU$`], [R`Risk-loving`, R`convex $U$, increasing $MU$`]] },
  s2: { name: "Market interventions & welfare", sub: "Seminar 2",
    blurb: R`Consumer and producer surplus, why a free competitive market is efficient, and what price controls, quotas, taxes and externalities do to it.`,
    metaphor: R`Picture the market as a **meeting place where every trade worth more to the buyer than it costs the seller goes ahead**. Surplus is the value created by all those trades. Price controls, quotas and taxes block some of them, and the trades that never happen are the **deadweight loss**.`,
    topics: [
      { id: "surplus", title: "Consumer and producer surplus", tags: ["surplus"], html: R`
<p><b>Consumer surplus</b> = what a buyer would be willing to pay − what they actually pay. <b>Producer surplus</b> = what the seller receives − the least they'd accept (minus any extra costs the seller has to cover).</p>
${EX("Seminar quiz: Jhon's violin", R`He'd accept anything above \$15,500, gets \$22,400, but must pay \$700 delivery: \$22,400 − \$15,500 − \$700 = **\$6,200**.`)}` },
      { id: "efficiency", title: "Why the competitive equilibrium is efficient", tags: ["efficiency"], html: R`
<p>At the competitive equilibrium the <b>marginal benefit</b> to buyers equals the <b>marginal cost</b> to sellers, so every trade worth making happens and no other. Total surplus is as large as it can be (when there are no externalities).</p>
${KEY("Pareto efficient", "At that point you <b>can't</b> make anyone better off without making someone else worse off.")}` },
      { id: "controls", title: "Price ceilings and price floors", tags: ["price-controls"], html: R`
<ul><li>A <b>ceiling below</b> equilibrium is binding. Quantity <b>supplied</b> falls, causing a shortage, and fewer units are traded.</li><li>A <b>floor above</b> equilibrium is binding. Quantity <b>demanded</b> falls, causing excess supply, and fewer units are traded.</li></ul>
<p>Either way, trade happens on the <b>short side</b> of the market, and the lost trades are deadweight loss.</p>
${W("pricecontrol", "Move the ceiling or floor")}
${TRAP(R`Consumers can <b>lose</b> from a price ceiling when demand is <b>inelastic</b>: the units that disappear were worth a lot to them. Try "Inelastic demand" in the diagram above.`)}` },
      { id: "supports", title: "Price supports, quotas and tariffs", tags: ["price-support", "quotas"], html: R`
<p>To <b>hold a price up</b>, a government can set a minimum price, buy up the surplus (a price support), or keep out cheaper imports with a tariff.</p>
<p><b>Production limits</b> (taxi licences, crop acreage) shift supply left. With demand unchanged, the price <b>rises</b> and quantity falls.</p>` },
      { id: "areas", title: "Reading surplus areas when supply shifts", tags: ["surplus-areas"], html: R`
<p>Producer surplus is the area <b>between the price and the supply curve</b>. When supply falls from $S_1$ to $S_2$:</p>
${IMG(fig1, "Supply shifts left from S1 to S2 with areas a to g")}
<ul><li>Gain <b>b</b>: the higher price on units still sold.</li><li>Lose <b>e</b>: those units now cost more to produce.</li><li>Lose <b>f</b>: surplus on units no longer sold.</li></ul>
<p>So the change in producer surplus = <b>b − f − e</b>. Consumers lose b and c. Areas c and f plus the cost increase are what society loses.</p>` },
      { id: "tax", title: "Who really pays a tax", tags: ["tax-incidence"], html: R`
<p>Whoever is <b>less able to walk away</b> pays more of a tax, whatever the law says about who writes the cheque.</p>
${TB(["Demand", "Who bears the tax"], [["Perfectly inelastic", "all on consumers"], ["Relatively inelastic", "mostly consumers"], ["Relatively elastic", "mostly producers"], ["Perfectly elastic", "all on producers"]])}
${W("taxincidence", "Change the elasticity of demand")}
<p class="small">Formula: the share passed on to consumers is $\dfrac{E_s}{E_s - E_d}$.</p>` },
      { id: "externalities", title: "Externalities", tags: ["externalities"], html: R`
<p>An <b>externality</b> is a cost or benefit that falls on third parties without being priced: pollution (negative), vaccinations or education (positive). Private and social costs or benefits diverge, so the market produces too much of a negative-externality good, too little of a positive one, and is inefficient.</p>` },
    ],
    patterns: [["Surplus calculations and efficiency", [3, 10], R`Surplus = value − price (consumers) or price − minimum acceptable − extra costs (producers). Competitive equilibrium is Pareto efficient.`], ["Price controls", [1, 4, 6], R`Ceiling below equilibrium cuts quantity supplied; floor above cuts quantity demanded; inelastic demand can make consumers lose.`], ["Holding prices up and limiting output", [2, 7], R`Minimum prices, supports and tariffs hold price up; production limits shift supply left and raise price.`], ["Surplus areas on a diagram", [8], R`PS change = gain on remaining units − higher costs − surplus lost on units no longer sold.`], ["Tax incidence", [9], R`The more inelastic side bears more of the tax.`], ["Externalities", [5], R`Unpriced costs or benefits on third parties, so private ≠ social, and inefficiency.`]],
    sheet: [[R`Consumer surplus`, R`willingness to pay − price`], [R`Producer surplus`, R`price − minimum acceptable − extra costs`], [R`Efficient output`, R`$MB = MC$ (no externalities)`], [R`Binding ceiling`, R`below equilibrium; quantity supplied falls`], [R`Binding floor`, R`above equilibrium; quantity demanded falls`], [R`Tax share on consumers`, R`$E_s/(E_s - E_d)$`]] },
  s3: { name: "Price discrimination", sub: "Seminar 3",
    blurb: R`How a firm with market power captures consumer surplus by charging different prices: to each customer (1st degree), by quantity (2nd) or by group (3rd).`,
    metaphor: R`A single price is like **selling concert tickets at one price to everyone**: fans who'd pay double keep the difference, and students who'd pay a little less stay home. Price discrimination is the art of charging each person or group closer to what they're **willing to pay**.`,
    topics: [
      { id: "capture", title: "Why one price leaves money on the table", tags: ["capture-surplus"], html: R`
${IMG(fig2, "Demand curve with ranges A and B")}
<p>At a single price $P^*$, buyers in range A pay less than they'd be willing to (they keep consumer surplus), and buyers in range B, who value the good above marginal cost, don't buy at all. To capture both, charge <b>more to those willing to pay more and less to those willing to pay less</b>.</p>
${KEY("The single-price trade-off", "Cutting the price wins new buyers, but every existing customer pays less too. Price discrimination gets the new sales without giving everyone the discount.")}` },
      { id: "first", title: "First-degree: everyone pays their reservation price", tags: ["first-degree"], html: R`
<ul><li>Each customer pays their <b>reservation price</b> (maximum willingness to pay).</li><li>Consumer surplus = <b>0</b>: the firm captures all of it.</li><li>Selling one more unit doesn't lower the price on the others, so <b>MR = the demand curve</b>.</li><li>Output expands to where demand meets MC, so there's no deadweight loss.</li></ul>
${W("pricediscrim", "Single price vs perfect vs block pricing")}
${IMG(fig3, "Areas A to D for single price versus perfect price discrimination")}
<p>Compared with a single price (profit = A), perfect discrimination adds the old consumer surplus <b>B</b> plus the old deadweight loss <b>C + D</b>.</p>` },
      { id: "second", title: "Second-degree: prices by quantity", tags: [], html: R`
<p>Different prices for different <b>quantities</b> or blocks: bulk discounts, block pricing of electricity. Customers sort themselves by how much they buy, so the firm doesn't need to know each person's reservation price.</p>` },
      { id: "third", title: "Third-degree: different prices for different groups", tags: ["third-degree"], html: R`
<p>Split customers into groups (children and adults, students, regions) and charge each group a different price.</p>
<div class="mathblock">$$MR_1 = MR_2 = MC, \qquad MR = P\left(1 + \frac{1}{E}\right)$$</div>
<p>If one group's last unit earned more MR, you'd shift sales towards it. So in the end, MR is equal across groups, and equal to MC.</p>
${KEY("Who pays more?", "The group with the <b>less elastic</b> demand (less price-sensitive) pays the <b>higher</b> price.")}
${W("inverseelastic", "The coupon question, step by step")}` },
    ],
    patterns: [["First-degree price discrimination", [1, 3, 5, 8], R`Reservation prices for everyone, so CS = 0, MR = D, and extra profit = old CS + old DWL.`], ["Capturing consumer surplus", [2, 4], R`One price trades new buyers against a lower price for existing ones; discriminate by willingness to pay.`], ["Third-degree price discrimination", [6, 7, 9, 10], R`Groups pay different prices; $MR_1 = MR_2 = MC$; $MR = P(1 + 1/E)$; less elastic group pays more.`]],
    sheet: [[R`Marginal revenue`, R`$MR = P(1 + 1/E)$`], [R`Markup rule`, R`$\frac{P - MC}{P} = -\frac{1}{E}$`], [R`1st degree`, R`$CS = 0$, MR curve = demand curve`], [R`2nd degree`, R`price depends on quantity bought`], [R`3rd degree`, R`$MR_1 = MR_2 = MC$; higher price to less elastic group`]] },
  s4: { name: "Monopolistic competition & oligopoly", sub: "Seminar 4",
    blurb: R`Markets with many firms selling slightly different products, and markets dominated by a few firms who watch each other (Cournot).`,
    metaphor: R`Monopolistic competition is **a street full of cafés**: each one has a little monopoly over people who love its coffee, but if cafés make good money, new ones open next door until the extra profit is gone.`,
    topics: [
      { id: "features", title: "What monopolistic competition looks like", tags: ["moncomp-features"], html: R`
<ul><li>Many firms, <b>differentiated</b> products, free entry and exit.</li><li>Each firm faces a <b>downward-sloping</b> demand curve, so it is <b>not</b> a price taker.</li><li>It produces where MR = MC, which leaves <b>P > MC</b>, always.</li></ul>` },
      { id: "longrun", title: "Short run to long run: entry wipes out profit", tags: ["moncomp-longrun"], html: R`
${IMG(fig4, "A monopolistically competitive firm")}
<p><b>Reading the price:</b> find Q where MR = MC, then go <b>up to the demand curve</b>. In this figure that's \$3, while ATC is \$2, so the firm makes a profit.</p>
${W("moncomp", "Let new firms enter")}
<p>Profit attracts entrants. Each incumbent's demand and MR shift <b>left</b> (inward), and its price and quantity fall, until demand just touches ATC: <b>P = ATC</b>, zero economic profit. Price is still above MC, and output is below the minimum of ATC: <b>excess capacity</b>.</p>
${TRAP(R`\$1 is where MR meets MC, not the price. The price is always read from the <b>demand</b> curve.`)}` },
      { id: "oligopoly", title: "Oligopoly: a few firms watching each other", tags: ["oligopoly-features"], html: R`
<p>The one essential feature: <b>a few firms produce most of the output</b>. Products can be identical or differentiated. Barriers to entry (economies of scale, patents, reputation) keep it that way.</p>
${KEY("Strategic interdependence", "One firm's choices noticeably affect the others, so each must think about how its rivals will react. That's what monopolistic competition doesn't have.")}` },
      { id: "cournot", title: "Cournot: competing on quantities", tags: ["cournot"], html: R`
<p>Each firm picks its output taking the other's output as given. A <b>reaction curve</b> shows a firm's best output for each output of its rival. The <b>Cournot equilibrium</b> is where the reaction curves cross: each firm is doing its best given the other, so neither wants to change alone (a Nash equilibrium).</p>
${W("oligopoly", "Reaction curves and four market outcomes")}` },
    ],
    patterns: [["Features of monopolistic competition", [1, 2], R`Differentiated products, downward-sloping demand, not price takers, P > MC.`], ["Short run, long run and entry", [3, 4, 5, 8], R`Price from the demand curve at MR = MC; profit leads to entry; demand and MR shift left until P = ATC.`], ["What makes an oligopoly", [6, 9], R`A few firms dominate, and strategic interdependence.`], ["Cournot and reaction curves", [7, 10], R`Each firm on its reaction curve; equilibrium where the curves cross.`]],
    sheet: [[R`Short run`, R`$MR = MC$, price from demand`], [R`Long run`, R`$P = ATC$ (tangency), $P > MC$, excess capacity`], [R`Entry`, R`incumbents' D and MR shift left`], [R`Cournot`, R`each firm on its reaction curve`]] },
  s5: { name: "Oligopoly strategy & game theory", sub: "Seminar 5",
    blurb: R`What happens when the order of moves matters (Stackelberg), when firms compete on price (Bertrand), and why cartels are hard to hold together.`,
    metaphor: R`Oligopoly is **chess between a few firms**: every move (price, output) depends on what you expect the others to do, and moving first can be an advantage.`,
    topics: [
      { id: "monopoly", title: "The monopoly benchmark: MR = MC", tags: ["monopoly-pricing"], html: R`
<p>With linear demand $p = a - bQ$, marginal revenue has twice the slope: $MR = a - 2bQ$. Set $MR = MC$ to get $Q$, then <b>read the price off demand</b>.</p>
${EX("Seminar quiz", R`$p = 100 - 2Q$, $MC = 16$: $MR = 100 - 4Q = 16 \Rightarrow Q = 21$, and $p = 100 - 42 = 58$.`)}
${TRAP(R`21 is the quantity, not the price. Always plug Q back into the demand curve.`)}` },
      { id: "stackelberg", title: "Stackelberg: the first-mover advantage", tags: ["stackelberg"], html: R`
<p>The <b>leader</b> chooses its output first, knowing how the <b>follower</b> will react. Because reaction curves slope down (more from the leader → lower price → less from the follower), the leader commits to a big output.</p>
<div class="mathblock">$$q_L = \frac{a - c}{2b}, \qquad q_F = \frac{a - c}{4b} \qquad\Rightarrow\qquad q_L = 2q_F$$</div>
${W("oligopoly", "Compare cartel, Stackelberg, Cournot and Bertrand")}` },
      { id: "bertrand", title: "Bertrand: competing on price", tags: ["bertrand"], html: R`
<p>With <b>identical</b> products, buyers go to the cheaper firm, so a tiny price cut wins the <b>whole</b> market. Each firm keeps undercutting until <b>price = marginal cost</b> and profit is zero: the Bertrand paradox (two firms, yet the competitive outcome).</p>` },
      { id: "cartels", title: "Cartels and the prisoners' dilemma", tags: ["cartels"], html: R`
<p>Acting together as a cartel, firms can restrict output and earn monopoly profit. But each member can earn even more by <b>cheating</b> (producing more) while the others stick to the deal.</p>
${W("pdgame", "The cartel game")}
${KEY("Escaping the dilemma", "Firms escape by making <b>collusion</b> stick: an enforceable agreement, or a repeated game where cheating gets punished. Price-matching promises help hold collusion together.")}` },
      { id: "strategy", title: "Why oligopolies exist and how they compete", tags: ["oligopoly-strategy"], html: R`
<ul><li><b>Economies of scale</b>: only big producers reach low costs, so small entrants can't compete and only a few firms survive.</li><li><b>Strategic interdependence</b> separates oligopoly from monopoly: both maximise profit, but an oligopolist must anticipate rivals.</li><li>Strategy covers technology, new markets and suppliers. What an oligopolist <b>can't</b> do is set its price ignoring its rivals.</li></ul>` },
    ],
    patterns: [["Monopoly pricing", [4], R`$MR = MC$ with $MR = a - 2bQ$, then price from demand.`], ["Stackelberg", [1, 2], R`Follower's output falls when the leader's rises; leader produces twice the follower.`], ["Bertrand", [6, 7], R`Undercut wins everyone, so price falls to marginal cost.`], ["Cartels and the prisoners' dilemma", [5, 8], R`Each member has an incentive to cheat; escape by sustaining collusion.`], ["Oligopoly behaviour and structure", [3, 9, 10], R`Strategic interdependence; economies of scale limit the number of firms.`]],
    sheet: [[R`Monopoly`, R`$Q = \frac{a-c}{2b}$, $P = \frac{a+c}{2}$`], [R`Cournot (each firm)`, R`$q = \frac{a-c}{3b}$`], [R`Stackelberg`, R`$q_L = \frac{a-c}{2b}$, $q_F = \frac{a-c}{4b}$`], [R`Bertrand`, R`$P = MC$`], [R`Cartel`, R`joint monopoly output, unstable because of cheating`]] },
};
Object.values(learn).forEach(L => { L.patterns = L.patterns.map(([title, ns, recipe]) => ({ title, qs: ns.map(n => `s${Object.values(learn).indexOf(L) + 1}-${n}`), recipe })); });

const sections = [["s1", "S1", "Uncertainty & risk"], ["s2", "S2", "Market interventions"], ["s3", "S3", "Price discrimination"], ["s4", "S4", "Monopolistic comp. & oligopoly"], ["s5", "S5", "Oligopoly strategy"]].map(([id, short, name]) => ({ id, short, name }));
const tags = { ev: "Expected value", "risk-attitude": "Risk attitudes", "utility-shape": "Utility shape", "risk-measure": "Measuring risk", probability: "Kinds of probability", surplus: "Consumer & producer surplus", efficiency: "Efficiency", "price-controls": "Price ceilings & floors", "price-support": "Price supports", quotas: "Quotas & production limits", "surplus-areas": "Surplus areas", "tax-incidence": "Tax incidence", externalities: "Externalities", "capture-surplus": "Capturing surplus", "first-degree": "1st-degree discrimination", "third-degree": "3rd-degree discrimination", "moncomp-features": "Monopolistic competition", "moncomp-longrun": "Short run → long run", "oligopoly-features": "What makes an oligopoly", cournot: "Cournot", stackelberg: "Stackelberg", "monopoly-pricing": "Monopoly pricing", bertrand: "Bertrand", cartels: "Cartels & prisoners' dilemma", "oligopoly-strategy": "Oligopoly strategy" };

const pack = { format: "studypack/1", id: "microeconomics", title: "Intermediate Microeconomics", subtitle: "WIUT · 5ECON010C", subject: "Microeconomics", markup: "html", updated: new Date().toISOString().slice(0, 10),
  exam: { total: 50, perSection: { s1: 10, s2: 10, s3: 10, s4: 10, s5: 10 }, note: "The mock exam uses all 50 seminar-quiz questions, 10 from each seminar." },
  sections, tags, learn, questions: Q.map(q => { const o = { id: q.id, sec: q.sec, n: q.n, d: q.d, t: q.t, q: q.q, o: q.o, a: q.a, x: q.x }; ["img", "imgAlt", "note", "v"].forEach(k => { if (q[k] != null) o[k] = q[k]; }); return o; }) };

/* ---------- checks ---------- */
const problems = [];
const dollars = s => (String(s).replace(/\\\$/g, "").match(/\$/g) || []).length;
pack.questions.forEach(q => {
  if (!(q.a >= 0 && q.a < q.o.length)) problems.push(`${q.id}: answer index`);
  if (new Set(q.o).size !== q.o.length) problems.push(`${q.id}: duplicate options`);
  [q.q, q.x, ...q.o].forEach((s, i) => { if (dollars(s) % 2) problems.push(`${q.id}: odd $ count in field ${i}`); });
  if (!tags[q.t]) problems.push(`${q.id}: unknown tag ${q.t}`);
  (q.v || []).forEach((v, i) => { if (!(v.a >= 0 && v.a < v.o.length)) problems.push(`${q.id} v${i}: answer`); if ([v.q, v.x, ...v.o].some(s => dollars(s) % 2)) problems.push(`${q.id} v${i}: odd $`); });
});
const ids = new Set(pack.questions.map(q => q.id));
Object.entries(learn).forEach(([sid, L]) => {
  const covered = new Set(L.patterns.flatMap(p => p.qs)); pack.questions.filter(q => q.sec === sid).forEach(q => { if (!covered.has(q.id)) problems.push(`${q.id}: not in a pattern`); });
  L.patterns.forEach(p => p.qs.forEach(id => { if (!ids.has(id)) problems.push(`pattern points to missing ${id}`); }));
  const ttags = new Set(L.topics.flatMap(t => t.tags)); pack.questions.filter(q => q.sec === sid).forEach(q => { if (!ttags.has(q.t)) problems.push(`${q.id}: tag ${q.t} has no topic`); });
  [L.blurb, L.metaphor, ...L.topics.map(t => t.html + t.title)].forEach((s, i) => { if (dollars(s) % 2) problems.push(`${sid} learn field ${i}: odd $ count`); });
});
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
const out = path.join(ROOT, "packs", "microeconomics.json");
fs.writeFileSync(out, JSON.stringify(pack));
console.log(`wrote packs/microeconomics.json: ${pack.questions.length} questions, ${pack.questions.reduce((s, q) => s + (q.v ? q.v.length : 0), 0)} variants, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
