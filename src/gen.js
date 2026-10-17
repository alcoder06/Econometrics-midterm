/* "Fresh numbers" generators. Each returns {q, o:[correct, d1, d2, d3], x}.
   Distractors are built from the classic mistakes for that question type. */
const GEN = {};
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const nf = (x, d = 2) => { let s = (+x).toFixed(d); if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, ""); return s === "-0" ? "0" : s; };
const fxd = (x, d = 2) => { const s = (+x).toFixed(d); return s === "-" + (0).toFixed(d) ? (0).toFixed(d) : s; };
const mth = s => "$" + s + "$";
function uniq4(correct, ds, alt) {
  const out = [correct];
  for (const d of ds) { if (out.length >= 4) break; if (d != null && !out.includes(d)) out.push(d); }
  let g = 0;
  while (out.length < 4 && g++ < 80) { const d = alt(); if (!out.includes(d)) out.push(d); }
  return out;
}
const dimS = (a, b) => mth(`${a}\\times ${b}`);
const randMat = (r, c, lo = -5, hi = 9) => Array.from({ length: r }, () => Array.from({ length: c }, () => ri(lo, hi)));

/* ---------- S0 ---------- */
GEN["s0-2"] = () => {
  let r = ri(2, 5), c = ri(2, 5); while (c === r) c = ri(2, 5);
  const A = randMat(r, c, 0, 9);
  return { q: R`What is the dimension of $A=${M(A)}$?`, o: [dimS(r, c), dimS(c, r), dimS(r, r), dimS(c, c)],
    x: R`Rows first, then columns: ${r} rows and ${c} columns, so $${r}\times${c}$.` };
};
GEN["s0-4"] = () => {
  const k = pick([2, 3, 4, 5, -2, -3]); const A = randMat(2, 2, -5, 6);
  const mul = A.map(r => r.map(v => k * v)), add = A.map(r => r.map(v => v + k));
  const diag = A.map((r, i) => r.map((v, j) => (i === j ? k * v : v))), row1 = A.map((r, i) => r.map(v => (i === 0 ? k * v : v)));
  return { q: R`Let $A=${M(A)}$. What is $${k}A$?`, o: uniq4(mth(M(mul)), [mth(M(add)), mth(M(diag)), mth(M(row1))], () => mth(M(mul.map(r => r.map(v => v + ri(-2, 2)))))),
    x: R`A scalar multiplies **every** entry by ${k}. Adding ${k}, or only scaling some entries, are the traps.` };
};
GEN["s0-5"] = () => {
  const m = ri(2, 7), n = ri(2, 7), p = ri(2, 7); const ok = Math.random() < 0.72;
  let q2 = n; if (!ok) { while (q2 === n) q2 = ri(2, 7); }
  const nd = "The product is not defined.";
  const correct = ok ? dimS(m, p) : nd;
  const ds = ok ? [dimS(n, n), dimS(p, m), nd] : [dimS(m, p), dimS(q2, n), dimS(n, q2)];
  return { q: R`If $A$ is $${m}\times${n}$ and $B$ is $${q2}\times${p}$, what is the dimension of $AB$?`, o: uniq4(correct, ds, () => dimS(ri(2, 7), ri(2, 7))),
    x: ok ? R`Inner numbers match (${n} and ${n}), so the result takes the outer numbers: $${m}\times${p}$.` : R`The inner numbers (${n} and ${q2}) don't match, so $AB$ is not defined.` };
};
GEN["s0-6"] = () => {
  const A = randMat(2, 2, 0, 5), v = [ri(1, 5), ri(1, 5)];
  const Av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
  const Atv = [A[0][0] * v[0] + A[1][0] * v[1], A[0][1] * v[0] + A[1][1] * v[1]];
  const ew = [A[0][0] * v[0], A[1][1] * v[1]];
  return { q: R`Calculate $${M(A)}${V(v)}$.`, o: uniq4(mth(V(Av)), [mth(V(Atv)), mth(V([Av[1], Av[0]])), mth(V(ew))], () => mth(V([Av[0] + ri(-3, 3), Av[1] + ri(-3, 3)]))),
    x: R`Row 1: $${A[0][0]}\cdot${v[0]}+${A[0][1]}\cdot${v[1]}=${Av[0]}$. Row 2: $${A[1][0]}\cdot${v[0]}+${A[1][1]}\cdot${v[1]}=${Av[1]}$.` };
};
GEN["s0-8"] = () => {
  let r = ri(2, 8), c = ri(2, 8); while (c === r) c = ri(2, 8);
  return { q: R`If $A$ has dimension $${r}\times${c}$, what is the dimension of $A'$?`, o: [dimS(c, r), dimS(r, c), dimS(c, c), dimS(r, r)], x: R`Transpose swaps the dimensions: $${c}\times${r}$.` };
};
GEN["s0-9"] = () => {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5).slice(0, 6);
  const A = [nums.slice(0, 3), nums.slice(3, 6)];
  const T = [[A[0][0], A[1][0]], [A[0][1], A[1][1]], [A[0][2], A[1][2]]];
  const reshape = [[nums[0], nums[1]], [nums[2], nums[3]], [nums[4], nums[5]]];
  const swap = [A[1], A[0]];
  const mixed = [[A[0][0], A[1][0], A[0][1]], [A[1][1], A[0][2], A[1][2]]];
  return { q: R`Let $A=${M(A)}$. Which is $A'$?`, o: [mth(M(T)), mth(M(reshape)), mth(M(swap)), mth(M(mixed))], x: R`Row 1 of $A$ becomes column 1 of $A'$, row 2 becomes column 2.` };
};
GEN["s0-11"] = () => {
  const x = [ri(-3, 6), ri(1, 6)], y = [ri(1, 6), ri(-3, 6)];
  const d = x[0] * y[0] + x[1] * y[1];
  return { q: R`Let $x=${V(x)}$, $y=${V(y)}$. What is the inner product $x'y$?`, o: uniq4(mth(d), [mth(x[0] * y[1] + x[1] * y[0]), mth(x[0] + x[1] + y[0] + y[1]), mth((x[0] + x[1]) * (y[0] + y[1]))], () => mth(d + ri(-5, 5))),
    x: R`$${x[0]}\cdot${y[0]}+${x[1]}\cdot${y[1]}=${d}$.` };
};
GEN["s0-12"] = () => {
  const a = ri(1, 4), b = ri(1, 4), k = pick([1, 2, -1]); const orth = Math.random() < 0.6;
  const x = [a, b]; const y = orth ? [b * k, -a * k] : [ri(1, 4), ri(-3, 4)];
  const d = x[0] * y[0] + x[1] * y[1]; const isO = d === 0;
  const o1 = R`The vectors are orthogonal because $x'y=0$.`, o4 = R`The vectors are not orthogonal because $x'y=${d}\neq 0$.`;
  return { q: R`Consider $x=${V(x)}$, $y=${V(y)}$. Which statement is correct?`,
    o: isO ? [o1, R`The vectors are orthogonal because $x'y=1$.`, R`The vectors are collinear because $x'y=0$.`, R`The vectors are not orthogonal because $x'y\neq 0$.`]
           : [o4, o1, R`The vectors are collinear because $x'y=${d}$.`, R`The vectors are orthogonal because $x'y=1$.`],
    x: R`$x'y=${x[0]}\cdot${y[0]}+${x[1]}\cdot(${y[1]})=${d}$. ${isO ? "Zero inner product = orthogonal." : "Non-zero, so not orthogonal."}` };
};
GEN["s0-13"] = () => {
  const x1 = [ri(-2, 4), ri(0, 5)], x2 = [ri(0, 5), ri(-2, 4)], a = pick([2, 3]), b = pick([1, 2]);
  const r = [a * x1[0] - b * x2[0], a * x1[1] - b * x2[1]];
  const bterm = b === 1 ? "x_2" : `${b}x_2`;
  return { q: R`Let $x_1=${V(x1)}$, $x_2=${V(x2)}$. What is $${a}x_1-${bterm}$?`,
    o: uniq4(mth(V(r)), [mth(V([a * x1[0] + b * x2[0], a * x1[1] + b * x2[1]])), mth(V([-r[0], -r[1]])), mth(V([x1[0] - b * x2[0], x1[1] - b * x2[1]]))], () => mth(V([r[0] + ri(-2, 2), r[1] + ri(-2, 2)]))),
    x: R`$${a}x_1=(${a * x1[0]},${a * x1[1]})'$ and $${bterm}=(${b * x2[0]},${b * x2[1]})'$. Subtract entry by entry: $(${r[0]},${r[1]})'$.` };
};
GEN["s0-15"] = () => {
  const a = ri(1, 3), b = ri(1, 5), k = ri(2, 4);
  return { q: R`Let $x_1=${V([a, b])}$, $x_2=${V([k * a, k * b])}$. Which statement is correct?`,
    o: [R`The vectors span only a line because $x_2=${k}x_1$.`, R`The vectors span all of $\mathbb{R}^2$.`, R`The vectors are orthogonal.`, R`The vectors provide two independent directions.`],
    x: R`$x_2$ is $x_1$ stretched by ${k}: same direction, so the span is just a line.` };
};
GEN["s0-18"] = () => {
  const a = ri(1, 4), b = ri(1, 5); const one = Math.random() < 0.65; const k = ri(2, 3);
  let A = one ? [[a, b], [k * a, k * b]] : [[a, b], [ri(1, 5), ri(1, 5)]];
  if (!one && A[0][0] * A[1][1] === A[0][1] * A[1][0]) A[1][1] += 1;
  const rk = one ? 1 : 2;
  return { q: R`Consider $A=${M(A)}$. What is the rank of $A$?`, o: [mth(rk), mth(rk === 1 ? 2 : 1), mth(0), mth(4)],
    x: one ? R`Row 2 $=${k}\times$ row 1, so there's only one independent direction: rank 1.` : R`Neither row is a multiple of the other, so there are two independent directions: rank 2 (full rank).` };
};

/* ---------- S1 ---------- */
const PSETS = [[0.2, 0.5, 0.3], [0.3, 0.5, 0.2], [0.1, 0.4, 0.5], [0.25, 0.5, 0.25], [0.3, 0.3, 0.4], [0.4, 0.4, 0.2], [0.2, 0.4, 0.4], [0.5, 0.3, 0.2]];
GEN["s1-3"] = () => {
  const step = pick([10, 20, 5]), base = ri(1, 6) * step; const ys = [base, base + step * ri(1, 2), base + step * ri(3, 4)];
  const ps = pick(PSETS); const e = ys.reduce((s, y, i) => s + y * ps[i], 0);
  const mean = (ys[0] + ys[1] + ys[2]) / 3, rev = ys.reduce((s, y, i) => s + y * ps[2 - i], 0);
  return { q: R`Suppose $Y$ takes the values below. What is $E[Y]$? ${PT(ys, ps.map(p => p.toFixed(2)))}`,
    o: uniq4(mth(nf(e)), [mth(nf(mean)), mth(nf(rev)), mth(nf(ys[1]))], () => mth(nf(e + pick([-4, -2, 2, 4, 6])))),
    x: R`$E[Y]=${ys.map((y, i) => `${y}(${ps[i]})`).join("+")}=${nf(e)}$. The plain average (${nf(mean)}) ignores the probabilities.` };
};
GEN["s1-4"] = () => {
  const e = ri(3, 15), a = ri(2, 12), b = ri(2, 6);
  return { q: R`If $E[Y]=${e}$, what is $E[${a}+${b}Y]$?`, o: uniq4(mth(a + b * e), [mth(a + e), mth(b * (a + e)), mth(b * e)], () => mth(a + b * e + ri(-5, 5))),
    x: R`$E[a+bY]=a+bE[Y]=${a}+${b}(${e})=${a + b * e}$.` };
};
GEN["s1-5"] = () => {
  const ex = ri(2, 9), ey = ri(2, 9), a = ri(1, 10), b = ri(2, 4), c = ri(2, 4);
  const r = a + b * ex - c * ey;
  return { q: R`Suppose $E[X]=${ex}$ and $E[Y]=${ey}$. What is $E[${a}+${b}X-${c}Y]$?`, o: uniq4(mth(r), [mth(a + b * ex + c * ey), mth(b * ex - c * ey), mth(a - b * ex + c * ey)], () => mth(r + ri(-4, 4))),
    x: R`$${a}+${b}(${ex})-${c}(${ey})=${a}+${b * ex}-${c * ey}=${r}$.` };
};
function jointNice() {
  const p0 = pick([0.4, 0.5, 0.6]), p1 = +(1 - p0).toFixed(2);
  const c0 = pick(PSETS), c1 = pick(PSETS);
  const J = [0, 1, 2].map(i => [+(c0[i] * p0).toFixed(3), +(c1[i] * p1).toFixed(3)]);
  return { p0, p1, c0, c1, J };
}
const fmtP = v => nf(v, 3);
GEN["s1-8"] = () => {
  const { J } = jointNice(); const ys = [10, 30, 50]; const col = pick([0, 1]);
  const s = J.reduce((t, r) => t + r[col], 0), s2 = J.reduce((t, r) => t + r[1 - col], 0), row = J[0][0] + J[0][1];
  return { q: R`Consider the joint probability table. What is $P(X=${col})$? ${JT(J.map((r, i) => [`Y=${ys[i]}`, fmtP(r[0]), fmtP(r[1])]))}`,
    o: uniq4(mth(fxd(s, 2)), [mth(fxd(s2, 2)), mth(fxd(J[1][col], 2)), mth(fxd(row, 2))], () => mth(fxd(s + pick([-0.1, 0.1, 0.2]), 2))),
    x: R`Add the whole $X=${col}$ column: $${J.map(r => fmtP(r[col])).join("+")}=${fxd(s, 2)}$.` };
};
GEN["s1-10"] = () => {
  const { p1, c1, J } = jointNice(); const ys = [20, 40, 60]; const k = ri(0, 2);
  const ans = c1[k], rowS = J[k][0] + J[k][1];
  return { q: R`Using the table below, what is $P(Y=${ys[k]}\mid X=1)$? ${JT(J.map((r, i) => [`Y=${ys[i]}`, fmtP(r[0]), fmtP(r[1])]))}`,
    o: uniq4(mth(fxd(ans, 2)), [mth(fxd(J[k][1], 2)), mth(fxd(J[k][1] / rowS, 2)), mth(fxd(p1, 2))], () => mth(fxd(ans + pick([-0.1, 0.1, 0.15]), 2))),
    x: R`$P(X=1)=${fxd(p1, 2)}$, so $P(Y=${ys[k]}\mid X=1)=${fmtP(J[k][1])}/${fxd(p1, 2)}=${fxd(ans, 2)}$. The joint cell alone is the trap.` };
};
GEN["s1-11"] = () => {
  const step = pick([10, 20]), base = ri(3, 5) * 10; const ys = [base, base + step, base + 2 * step]; const ps = pick(PSETS);
  const e = ys.reduce((s, y, i) => s + y * ps[i], 0);
  return { q: R`Suppose that for students with low attendance, ${ys.map((y, i) => `$P(Y=${y}\\mid X=0)=${ps[i].toFixed(2)}$`).join(", ")}. What is $E[Y\mid X=0]$?`,
    o: uniq4(mth(nf(e)), [mth(nf(ys[1])), mth(nf(ys.reduce((s, y, i) => s + y * ps[2 - i], 0))), mth(nf(e + step / 2))], () => mth(nf(e + pick([-4, 4, 8])))),
    x: R`$${ys.map((y, i) => `${y}(${ps[i]})`).join("+")}=${nf(e)}$.` };
};
GEN["s1-13"] = () => {
  const a = ri(4, 7) * 10, b = a + ri(1, 3) * 10, p = pick([0.6, 0.7, 0.8, 0.4, 0.3]);
  const e = a * p + b * (1 - p);
  return { q: R`Suppose $E[Y\mid X=0]=${a}$, $E[Y\mid X=1]=${b}$, $P(X=0)=${p.toFixed(2)}$, $P(X=1)=${(1 - p).toFixed(2)}$. Using the Law of Iterated Expectations, what is $E[Y]$?`,
    o: uniq4(mth(nf(e)), [mth(nf((a + b) / 2)), mth(nf(a * (1 - p) + b * p)), mth(nf(b))], () => mth(nf(e + pick([-2, 2, 4])))),
    x: R`$E[Y]=${a}(${p.toFixed(2)})+${b}(${(1 - p).toFixed(2)})=${nf(e)}$: weight each group mean by its share.` };
};
function genCondTable() {
  const incomes = [80, 120, 160];
  const groups = incomes.map((inc, i) => { const base = 40 + i * ri(22, 30); return [inc, base + ri(0, 4), base + ri(5, 12), base + ri(13, 20)]; });
  const means = groups.map(g => (g[1] + g[2] + g[3]) / 3), overall = means.reduce((s, m) => s + m, 0) / 3;
  const k = ri(0, 2);
  return {
    q: R`The following hypothetical population data are given. What is $E(Y\mid X=${incomes[k]})$? ${IC(groups)}`,
    o: uniq4(mth(fxd(means[k], 2)), [mth(fxd(overall, 2)), ...means.filter((_, i) => i !== k).map(m => mth(fxd(m, 2)))], () => mth(fxd(means[k] + ri(-3, 3), 2))),
    x: R`Average only the $X=${incomes[k]}$ group: $(${groups[k].slice(1).join("+")})/3=${fxd(means[k], 2)}$. ${fxd(overall, 2)} is the overall mean $E(Y)$, the trap.`
  };
}
GEN["s1-14"] = genCondTable; GEN["s1-23"] = genCondTable; GEN["s1-26"] = genCondTable;

/* ---------- S2 ---------- */
GEN["s2-2"] = () => {
  const n = ri(5, 50) * 10, m = ri(2, 6), k = m + 1;
  const f = (a, b, c, d) => R`$X: ${a}\times${b},\ \beta: ${c}\times${d}$`;
  return { q: R`A regression has $n=${n}$ observations and contains a constant and ${m} explanatory variables. What are the dimensions of $X$ and $\beta$?`,
    o: [f(n, k, k, 1), f(n, m, m, 1), f(k, n, 1, k), f(n, k, n, 1)], x: R`$k=1+${m}=${k}$ columns (don't forget the constant). $X$ is $${n}\times${k}$ and $\beta$ is $${k}\times1$.` };
};
GEN["s2-5"] = () => {
  const a = ri(8, 60), b = ri(8, 60); if (a === b) return GEN["s2-5"]();
  const better = a < b ? "A" : "B", worse = a < b ? "B" : "A";
  return { q: R`Suppose two possible coefficient vectors produce $e_A'e_A=${a}$ and $e_B'e_B=${b}$. Which statement is correct?`,
    o: [R`$\hat\beta_${better}$ gives the better fit because its residual sum of squares is smaller.`, R`$\hat\beta_${worse}$ gives the better fit because its residual sum of squares is larger.`, R`Both coefficient vectors give exactly the same fit.`, R`Neither coefficient vector can be compared using OLS.`],
    x: R`OLS prefers the smaller SSR: $${Math.min(a, b)}<${Math.max(a, b)}$.` };
};
GEN["s2-15"] = () => {
  const n = ri(5, 60) * 10, k = ri(3, 8);
  const f = (a, b, c, d) => R`$X'X: ${a}\times${b},\ X'y: ${c}\times${d}$`;
  return { q: R`Suppose $X$ is $${n}\times${k}$. What are the dimensions of $X'X$ and $X'y$?`, o: [f(k, k, k, 1), f(n, n, n, 1), f(k, n, n, 1), f(n, k, k, 1)],
    x: R`$(${k}\times${n})(${n}\times${k})=${k}\times${k}$ and $(${k}\times${n})(${n}\times1)=${k}\times1$.` };
};

/* ---------- S3 ---------- */
GEN["s3-1"] = () => {
  let a = ri(-4, 4), b = ri(-4, 4); if (a === 0) a = 2; if (b === 0) b = -1; if (Math.sign(a) === Math.sign(b)) b = -b;
  const O = [[a * a, a * b], [a * b, b * b]];
  return { q: R`Let $e=${V([a, b])}$. What is the outer product $ee'$?`, o: uniq4(mth(M(O)), [mth(M(O.map(r => r.map(Math.abs)))), mth(M([[a, b], [a, b]])), mth(a * a + b * b)], () => mth(M([[a * a, -a * b], [-a * b, b * b]]))),
    x: R`Entries are $e_ie_j$: $${a}^2=${a * a}$, $${a}\cdot${b}=${a * b}$, $${b}^2=${b * b}$. The scalar ${a * a + b * b} would be $e'e$.` };
};
GEN["s3-8"] = () => { const v = ri(2, 12), a = ri(2, 6);
  return { q: R`If $\operatorname{Var}(Y)=${v}$, what is $\operatorname{Var}(${a}Y)$?`, o: uniq4(mth(a * a * v), [mth(a * v), mth(v), mth(a)], () => mth(a * a * v + ri(1, 9))), x: R`$${a}^2\times${v}=${a * a * v}$. Square the constant.` }; };
GEN["s3-9"] = () => { const v = ri(4, 30), c = ri(3, 15);
  return { q: R`If $\operatorname{Var}(Y)=${v}$, what is $\operatorname{Var}(Y+${c})$?`, o: uniq4(mth(v), [mth(v + c), mth(v * c), mth(Math.abs(v - c))], () => mth(v + ri(1, 9))), x: R`Shifting by a constant doesn't change the spread: still ${v}.` }; };
GEN["s3-10"] = () => { const v = ri(2, 10), a = ri(2, 5);
  return { q: R`If $\operatorname{Var}(Y)=${v}$, what is $\operatorname{Var}(-${a}Y)$?`, o: uniq4(mth(a * a * v), [mth(-a * v), mth(a * v), mth(v)], () => mth(a * a * v + ri(1, 6))), x: R`$(-${a})^2\cdot${v}=${a * a * v}$. Variances are never negative.` }; };
GEN["s3-11"] = () => {
  const vy = ri(2, 9), vz = ri(2, 9), c = pick([1, 2, -1, -2, 3]), a = ri(2, 3), b = ri(1, 2);
  const r = a * a * vy + b * b * vz - 2 * a * b * c;
  const bz = b === 1 ? "Z" : `${b}Z`;
  return { q: R`Suppose $\operatorname{Var}(Y)=${vy}$, $\operatorname{Var}(Z)=${vz}$, $\operatorname{Cov}(Y,Z)=${c}$. What is $\operatorname{Var}(${a}Y-${bz})$?`,
    o: uniq4(mth(r), [mth(a * a * vy + b * b * vz + 2 * a * b * c), mth(a * a * vy + b * b * vz), mth(a * a * vy - b * b * vz - 2 * a * b * c)], () => mth(r + ri(-6, 6))),
    x: R`$${a}^2(${vy})+${b}^2(${vz})+2(${a})(-${b})(${c})=${a * a * vy}+${b * b * vz}${-2 * a * b * c >= 0 ? "+" : ""}${-2 * a * b * c}=${r}$. The minus sign on $Z$ flips the covariance term.` };
};
GEN["s3-12"] = () => {
  const vy = ri(2, 9), vz = ri(2, 9), a = ri(2, 3); const r = a * a * vy + vz;
  return { q: R`Suppose $\operatorname{Var}(Y)=${vy}$, $\operatorname{Var}(Z)=${vz}$, $\operatorname{Cov}(Y,Z)=0$. What is $\operatorname{Var}(${a}Y-Z)$?`,
    o: uniq4(mth(r), [mth(a * a * vy - vz), mth(a * vy + vz), mth(a * vy - vz)], () => mth(r + ri(1, 6))),
    x: R`$${a}^2(${vy})+(-1)^2(${vz})=${r}$. Variances **add** even when the variables are subtracted.` };
};
GEN["s3-19"] = () => { const n = ri(5, 50) * 10, k = ri(3, 8);
  return { q: R`Suppose $X$ is $${n}\times${k}$. What are the dimensions of $\operatorname{Var}(\hat\beta\mid X)$?`, o: [dimS(k, k), dimS(n, n), dimS(n, k), dimS(k, n)], x: R`One row/column per coefficient: $${k}\times${k}$.` }; };
GEN["s3-22"] = () => {
  const n = ri(4, 20) * 10, k = ri(3, 8), s2 = pick([1.5, 2, 2.5, 3, 4, 5]); const ssr = s2 * (n - k);
  return { q: R`A regression has $n=${n}$ observations and estimates $k=${k}$ coefficients, including the intercept. If $e'e=${nf(ssr)}$, what is $\hat\sigma^2$?`,
    o: uniq4(mth(fxd(s2, 3)), [mth(fxd(ssr / n, 3)), mth(fxd(ssr / k, 3)), mth(fxd(ssr / (n - k - 1), 3))], () => mth(fxd(s2 + pick([0.25, -0.25, 0.5]), 3))),
    x: R`$\hat\sigma^2=e'e/(n-k)=${nf(ssr)}/${n - k}=${fxd(s2, 3)}$.` };
};
GEN["s3-23"] = () => {
  const s2 = pick([2, 4, 9, 16, 25]), d1 = pick([0.04, 0.09, 0.25, 0.36]), d2 = pick([0.04, 0.09, 0.16, 0.25]), off = pick([0.01, 0.02, 0.05]);
  const j = pick([1, 2]), d = j === 1 ? d1 : d2;
  return { q: R`Suppose $\hat\sigma^2=${s2}$ and $(X'X)^{-1}=${M([[d1, off], [off, d2]])}$. What is the estimated variance of coefficient ${j}?`,
    o: uniq4(mth(nf(s2 * d, 4)), [mth(nf(d, 4)), mth(nf(s2 * off, 4)), mth(nf(Math.sqrt(s2 * d), 4))], () => mth(nf(s2 * d + pick([0.1, 0.2, 0.5, -0.05]), 4))),
    x: R`$\hat\sigma^2\times[(X'X)^{-1}]_{${j}${j}}=${s2}\times${d}=${nf(s2 * d, 4)}$. Use the diagonal entry.` };
};
GEN["s3-24"] = () => {
  const s2 = pick([4, 9, 16, 25]), d = pick([0.04, 0.09, 0.16, 0.25, 0.36, 0.49]); const se = Math.sqrt(s2 * d);
  return { q: R`Suppose $\hat\sigma^2=${s2}$ and the second diagonal element of $(X'X)^{-1}$ is $${d}$. What is the standard error of the second coefficient?`,
    o: uniq4(mth(fxd(se, 2)), [mth(fxd(Math.sqrt(d), 2)), mth(fxd(s2 * d, 2)), mth(fxd(Math.sqrt(s2) * d, 2))], () => mth(fxd(se + pick([0.1, 0.2, 0.3, -0.1, 0.5]), 2))),
    x: R`Variance $=${s2}\times${d}=${nf(s2 * d)}$, so $se=\sqrt{${nf(s2 * d)}}=${fxd(se, 2)}$. $\sqrt{${d}}$ alone forgets $\hat\sigma^2$.` };
};
function genT() {
  const se = pick([0.04, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25]), t = pick([2.5, 3, 4, 4.5, 5, 6, 7, 8, 9.75]); const b = +(t * se).toFixed(4);
  return { q: R`The estimated slope is $${nf(b, 4)}$ and its standard error is $${se}$. What is the $t$ statistic for testing $H_0:\beta=0$?`,
    o: uniq4(mth(fxd(t, 2)), [mth(fxd(se / b, 2)), mth(fxd(b * se, 2)), mth(fxd(b - se, 2))], () => mth(fxd(t + pick([-1, 1, 2]), 2))),
    x: R`$t=\hat\beta/se=${nf(b, 4)}/${se}=${fxd(t, 2)}$.` };
}
GEN["s3-27"] = genT; GEN["s3-34"] = genT; GEN["s3-39"] = genT;
GEN["s3-28"] = () => {
  const al = pick([0.01, 0.05, 0.1]); let p = +(Math.random() * 0.2).toFixed(3); if (p === al) p += 0.004; if (p === 0) p = 0.001;
  const rej = p < al;
  return { q: R`For a test at the ${al * 100}% significance level, the reported $p$-value is $${p.toFixed(3)}$. What is the correct decision?`,
    o: rej ? [R`Reject $H_0$ because $p<${al}$.`, R`Do not reject $H_0$ because $p<${al}$.`, R`Reject $H_0$ only if the coefficient is negative.`, R`No decision can be made from the $p$-value.`]
           : [R`Do not reject $H_0$ because $p>${al}$.`, R`Reject $H_0$ because $p>${al}$.`, R`Reject $H_0$ only if the coefficient is positive.`, R`No decision can be made from the $p$-value.`],
    x: R`Rule: reject when $p<\alpha$. Here $${p.toFixed(3)}${rej ? "<" : ">"}${al}$.` };
};
GEN["s3-31"] = () => { const a = ri(2, 9), c = ri(2, 9);
  return { q: R`Choose the correct expression for $\operatorname{Var}(${a}X-\ln ${c})$.`, o: [R`$${a * a}\operatorname{Var}(X)$`, R`$\operatorname{Var}(${a * a}X)-\ln${c}$`, R`$\operatorname{Var}(${a * a}X)$`, R`$${a * a}\ln(X)$`], x: R`$\ln${c}$ is a constant and drops out; ${a} gets squared.` }; };
GEN["s3-36"] = () => { const a = pick([4, 9, 16, 25, 36, 49, 64]), c = ri(2, 9);
  return { q: R`Choose the correct expression for $sd(${a}X-${c})$.`, o: [R`$${a}\,sd(X)$`, R`$sd(${a}X)-${c}$`, R`$\operatorname{Var}(${a}X)$`, R`$${a}\operatorname{Var}(X)$`], x: R`$sd(aX+c)=|a|\,sd(X)$: no squaring for the SD, and the shift drops out.` }; };

/* ---------- S4 ---------- */
GEN["s4-12"] = () => {
  const a = pick([0.4, 0.5, 0.6, 0.8, 1.2]), b = pick([1.5, 2, 2.5, 3]), c = pick([0.5, 1, 1.5, 2]); const tot = c + a * b;
  return { q: R`Suppose $X\to M$ has effect $${a}$, $M\to Y$ has effect $${b}$, and the direct effect $X\to Y$ is $${c}$. What is the total effect of $X$ on $Y$?`,
    o: uniq4(mth(nf(tot)), [mth(nf(c)), mth(nf(a * b)), mth(nf(a + b + c))], () => mth(nf(tot + pick([0.5, 1, -0.4, 1.5])))),
    x: R`Direct + indirect $=${c}+${a}\times${b}=${nf(tot)}$.` };
};
function genR2() {
  const tss = pick([400, 500, 600, 800, 900, 1000, 1200]), rss = Math.round(tss * (0.2 + Math.random() * 0.65));
  const r2 = 1 - rss / tss;
  return { q: R`If the residual sum of squares is $RSS=${rss}$ and the total sum of squares is $TSS=${tss}$, what is $R^2$?`,
    o: uniq4(mth(fxd(r2, 2)), [mth(fxd(rss / tss, 2)), mth(fxd(tss / rss, 2)), mth(fxd(1 + rss / tss, 2))], () => mth(fxd(r2 + pick([0.05, 0.1, -0.05, 0.15]), 2))),
    x: R`$1-${rss}/${tss}=1-${fxd(rss / tss, 3)}=${fxd(r2, 2)}$. $RSS/TSS$ alone is the unexplained share.` };
}
GEN["s4-19"] = genR2; GEN["s4-31"] = genR2; GEN["s4-32"] = genR2;
GEN["s4-23"] = () => {
  const n = pick([60, 80, 100, 120, 150]), k = ri(3, 7), tss = pick([500, 800, 1000]), rss = Math.round(tss * (0.4 + Math.random() * 0.4));
  const adj = 1 - (rss / (n - k)) / (tss / (n - 1)), r2 = 1 - rss / tss;
  return { q: R`A model has $n=${n}$, $k=${k}$ estimated coefficients including the constant, $RSS=${rss}$, and $TSS=${tss}$. Using $\bar R^2=1-\dfrac{RSS/(n-k)}{TSS/(n-1)}$, what is the adjusted $R^2$ approximately?`,
    o: uniq4(mth(fxd(adj, 3)), [mth(fxd(r2, 3)), mth(fxd(1 - adj, 3)), mth(fxd(1 - (rss / (n - 1)) / (tss / (n - k)), 3))], () => mth(fxd(adj + pick([-0.05, -0.02, 0.03, 0.08]), 3))),
    x: R`$\frac{${rss}/${n - k}}{${tss}/${n - 1}}=\frac{${fxd(rss / (n - k), 3)}}{${fxd(tss / (n - 1), 3)}}=${fxd(1 - adj, 3)}$, so $\bar R^2=${fxd(adj, 3)}$ (a bit below $R^2=${fxd(r2, 3)}$).` };
};
GEN["s4-25"] = () => {
  const n = pick([50, 80, 100, 120, 200]), k = ri(3, 7), r2 = pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]);
  const F = (r2 / (k - 1)) / ((1 - r2) / (n - k));
  return { q: R`Suppose $n=${n}$, $k=${k}$ including the constant, and $R^2=${r2}$. Using $F=\dfrac{R^2/(k-1)}{(1-R^2)/(n-k)}$, what is the overall $F$ statistic approximately?`,
    o: uniq4(mth(fxd(F, 2)), [mth(fxd((r2 / k) / ((1 - r2) / (n - k)), 2)), mth(fxd(r2 / (1 - r2), 2)), mth(fxd((r2 / (k - 1)) / ((1 - r2) / n), 2))], () => mth(fxd(F * pick([1.3, 0.7, 1.6, 2]), 2))),
    x: R`$\frac{${r2}/${k - 1}}{${nf(1 - r2)}/${n - k}}=\frac{${fxd(r2 / (k - 1), 4)}}{${fxd((1 - r2) / (n - k), 5)}}=${fxd(F, 2)}$.` };
};
GEN["s4-28"] = () => {
  const q = ri(2, 5), start = ri(1, 3); const b = Array.from({ length: q }, (_, i) => `\\beta_${start + i}`).join("=");
  return { q: R`Suppose the null hypothesis is $H_0:${b}=0$. What is the number of restrictions $q$?`, o: uniq4(mth(q), [mth(q - 1), mth(q + 1), mth(1)], () => mth(q + 2)), x: R`One restriction per coefficient set to zero: $q=${q}$.` };
};
GEN["s4-29"] = () => {
  const n = pick([80, 100, 120, 150, 200]), k = ri(4, 7), q = ri(2, 3), r2u = pick([0.3, 0.35, 0.4, 0.42, 0.45, 0.5]), r2r = +(r2u - pick([0.03, 0.05, 0.07, 0.1])).toFixed(2);
  const F = ((r2u - r2r) / q) / ((1 - r2u) / (n - k));
  return { q: R`An unrestricted model has $R^2_{ur}=${r2u}$, a restricted model has $R^2_r=${r2r}$, $n=${n}$, $k_{ur}=${k}$, and $q=${q}$. Using $F=\dfrac{(R^2_{ur}-R^2_r)/q}{(1-R^2_{ur})/(n-k_{ur})}$, what is the partial $F$ statistic approximately?`,
    o: uniq4(mth(fxd(F, 2)), [mth(fxd(F * q, 2)), mth(fxd(((r2u - r2r) / q) / ((1 - r2r) / (n - k)), 2)), mth(fxd((r2u - r2r) / (1 - r2u), 2))], () => mth(fxd(F + pick([1, 2, -0.5, 3]), 2))),
    x: R`Top: $${nf(r2u - r2r)}/${q}=${fxd((r2u - r2r) / q, 4)}$. Bottom: $${nf(1 - r2u)}/${n - k}=${fxd((1 - r2u) / (n - k), 5)}$. $F\approx${fxd(F, 2)}$.` };
};
GEN["s4-30"] = () => {
  const crit = pick([2.37, 2.6, 3.01, 3.07, 3.84]), F = +(Math.random() < 0.6 ? crit + 1 + Math.random() * 30 : crit * Math.random()).toFixed(2); const rej = F > crit;
  return { q: R`A partial $F$ test gives $F=${F}$, while the 5% critical value is $${crit}$. What should we conclude?`,
    o: rej ? [R`Reject $H_0$; the tested coefficients are jointly statistically significant.`, R`Do not reject $H_0$ because the critical value is positive.`, R`Reject $H_0$ only if every tested coefficient is individually significant.`, R`The test cannot be interpreted without knowing $R^2$ exactly.`]
           : [R`Do not reject $H_0$; the tested coefficients are not jointly significant at 5%.`, R`Reject $H_0$; the tested coefficients are jointly significant.`, R`Reject $H_0$ only if every tested coefficient is individually significant.`, R`The test cannot be interpreted without knowing $R^2$ exactly.`],
    x: R`Compare: $${F}${rej ? ">" : "<"}${crit}$, so ${rej ? "reject" : "don't reject"}.` };
};

/* ---------- S5 ---------- */
GEN["s5-2"] = () => { const J = ri(3, 7); const w = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  return { q: R`A categorical variable has ${w[J].toLowerCase()} mutually exclusive categories. If the regression includes an intercept, how many category dummies should normally be included?`, o: [w[J - 1], w[J], w[J - 2], w[J + 1]], x: R`$J-1=${J - 1}$; the omitted category is the reference group.` }; };
GEN["s5-9"] = () => {
  const b = -ri(5, 25) * 1000 - ri(0, 999), a = b - ri(3, 15) * 1000 - ri(0, 999) * (Math.random() < 0.5 ? 1 : -1); const did = a - b;
  const fm = v => (v < 0 ? "−" : "") + Math.abs(v).toLocaleString("en-US");
  return { q: R`Before a policy, the treatment–control difference is ${fm(b)}. After the policy, it is ${fm(a)}. What is the Difference-in-Differences estimate?`,
    o: uniq4(fm(did), [fm(-did), fm(a + b), fm(-(a + b))], () => fm(did + ri(1, 5) * 1000)), x: R`After gap − before gap $=${fm(a)}-(${fm(b)})=${fm(did)}$.` };
};
GEN["s5-16"] = () => { const c = pick([10, 12, 40, 100, 1000]);
  return { q: R`Suppose $Y^*=${c}Y$. What happens to an estimated slope coefficient and its standard error when the dependent variable is rescaled from $Y$ to $Y^*$?`, o: [R`Both are multiplied by ${c}.`, R`Both are divided by ${c}.`, R`The slope is multiplied by ${c} but the standard error is unchanged.`, R`Neither changes.`], x: R`Coefficient and se both scale by ${c}; $t$ is unchanged.` }; };
GEN["s5-17"] = () => { const c = pick([10, 12, 100, 1000]);
  return { q: R`Suppose $X^*=${c}X$, so $X=X^*/${c}$. What happens to the slope coefficient on the rescaled explanatory variable?`, o: [R`It is divided by ${c}.`, R`It is multiplied by ${c}.`, R`It is squared.`, R`It is unchanged.`], x: R`One unit of $X^*$ is $1/${c}$ of a unit of $X$, so the slope is divided by ${c}.` }; };
GEN["s5-19"] = () => {
  const b = +(0.3 + Math.random() * 0.7).toFixed(3), a = -(1 + Math.random() * 4).toFixed(2), opt = pick([["weekly", 40], ["weekly", 35], ["daily", 8], ["monthly", 160]]);
  const r = b * opt[1];
  return { q: R`Suppose $\widehat{Wage}=${a}+${b}\,Education$, where Wage is hourly earnings. If ${opt[0]} wage equals ${opt[1]} times hourly wage, what is the slope in the ${opt[0]}-wage regression?`,
    o: uniq4(mth(nf(r, 3)), [mth(nf(b / opt[1], 4)), mth(nf(b, 3)), mth(nf(b * 10, 3))], () => mth(nf(r * pick([1.5, 0.5, 2, 3]), 3))), x: R`$Y^*=${opt[1]}Y$, so the slope $\times${opt[1]}$: $${b}\times${opt[1]}=${nf(r, 3)}$.` };
};
GEN["s5-20"] = () => {
  const b = +(0.3 + Math.random() * 0.7).toFixed(3); const dec = Math.random() < 0.6;
  const r = dec ? b * 10 : b / 12;
  return { q: R`Suppose $\widehat{Wage}=-3.96+${b}\,Education$ with Education in years. Education is now measured in ${dec ? "**decades** (one decade = 10 years)" : "**months** (one year = 12 months)"}. What is the new slope coefficient?`,
    o: uniq4(mth(nf(r, 4)), [mth(nf(dec ? b / 10 : b * 12, 4)), mth(nf(b, 4)), mth(nf(dec ? b * 100 : b / 120, 4))], () => mth(nf(r * pick([2, 3, 0.5, 5]), 4))),
    x: dec ? R`One more decade = 10 more years, so $10\times${b}=${nf(r, 4)}$.` : R`One more month = 1/12 of a year, so $${b}/12=${nf(r, 4)}$.` };
};
GEN["s5-22"] = () => { const b = pick([0.02, 0.03, 0.05, 0.06, 0.08, 0.09, 0.11, 0.12, 0.15]);
  const p = v => nf(v, 2) + "%";
  return { q: R`Consider $\ln(Y)=\beta_0+${b}X+u$. Using the usual approximation, a one-unit increase in $X$ is associated with approximately`,
    o: [R`a ${p(100 * b)} increase in $Y$.`, R`a ${p(b)} increase in $Y$.`, R`a ${p(10 * b)} increase in $Y$.`, R`a ${p(1000 * b)} increase in $Y$.`], x: R`Log–level: $100\times${b}=${nf(100 * b)}\%$.` }; };
GEN["s5-24"] = () => { const b = pick([2, 3, 4, 5, 6, 8, 12, 15, 20]);
  return { q: R`Consider $Y=\beta_0+${b}\ln(X)+u$. A 1% increase in $X$ is associated with approximately`,
    o: [R`a ${nf(b / 100, 3)}-unit increase in $Y$.`, R`a ${b}-unit increase in $Y$.`, R`a ${b}% increase in $Y$.`, R`a ${nf(b / 100, 3)}% increase in $Y$.`], x: R`Level–log: $\beta/100=${b}/100=${nf(b / 100, 3)}$ **units** of $Y$.` }; };
GEN["s5-25"] = () => { const b = pick([0.27, 0.45, 0.52, 0.63, 0.74, 0.86, 1.12]);
  return { q: R`In the model $\ln(Y)=\beta_0+${b}\ln(X)+u$, what is the interpretation of ${b}?`,
    o: [R`A 1% increase in $X$ is associated with approximately a ${b}% increase in $Y$.`, R`A one-unit increase in $X$ raises $Y$ by ${b} units.`, R`A 1% increase in $X$ raises $Y$ by ${nf(b * 100)} units.`, R`A one-unit increase in $X$ raises $Y$ by ${nf(b * 100)}%.`], x: R`Log–log: an elasticity. 1% in $X$ goes with ≈${b}% in $Y$.` }; };
GEN["s5-29"] = () => { const b = pick([0.21, 0.34, 0.41, 0.48, 0.56, 0.63]);
  return { q: R`If both $Y$ and $X$ are standardized and the estimated slope on $z_X$ is ${b}, a one-standard-deviation increase in $X$ is associated with`,
    o: [R`a ${b}-standard-deviation increase in $Y$.`, R`a ${b}-unit increase in the original units of $Y$.`, R`a ${nf(b * 100)}% increase in $Y$.`, R`a one-standard-deviation increase in $Y$.`], x: R`Both sides are in SD units.` }; };
