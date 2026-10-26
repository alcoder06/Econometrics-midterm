// Turn the hand-built econometrics content (content/econometrics) into packs/econometrics.json.
//   node tools/export_econ.js
// Fresh-number generators are run here; the pack stores their output as plain data (up to 10 variants each).
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "content", "econometrics");

const ctx = { console, Math, String, Array, Object, JSON, Number, parseFloat, Set };
vm.createContext(ctx);
let code = "";
for (const f of ["q1.js", "q2.js", "q3.js", "gen.js", "learn.js"]) code += fs.readFileSync(path.join(SRC, f), "utf8") + "\n";
code += "this.__BANK = BANK; this.__GEN = GEN; this.__LEARN = LEARN;";
vm.runInContext(code, ctx);
const { __BANK: BANK, __GEN: GEN, __LEARN: LEARN } = ctx;
const STATA = JSON.parse(fs.readFileSync(path.join(SRC, "stata_outputs.json"), "utf8"));

const SECTIONS = [
  { id: "s0", short: "S0", name: "Matrix toolkit" }, { id: "s1", short: "S1", name: "Expected value" },
  { id: "s2", short: "S2", name: "OLS in matrices" }, { id: "s3", short: "S3", name: "Standard errors" },
  { id: "s4", short: "S4", name: "Controls & fit" }, { id: "s5", short: "S5", name: "Dummies & forms" },
  { id: "mix", short: "MIX", name: "Stata & combined", combined: true },
];
const TAGS = { dims: "Dimensions", ops: "Adding & scaling", mult: "Matrix multiplication", transpose: "Transpose", inner: "Inner product", span: "Span & independence", rank: "Rank", inverse: "Identity & inverse", datatypes: "Data types & terms", ev: "Expected value", linearity: "Linearity of E", joint: "Marginal probability", condprob: "Conditional probability", condev: "Conditional expectation", lie: "Iterated expectations", cef: "Error term", causal: "Causality", setup: "Model & dimensions", residual: "Error vs residual", objective: "OLS objective", calculus: "Matrix derivatives", derivation: "Deriving β̂", fullrank: "Full rank", unbiased: "Unbiasedness", residprops: "Residual properties", omega: "Ω and ee′", varrules: "Variance rules", vcov: "Var(β̂) sandwich", sigma2: "σ̂² and se", se: "Meaning of se", ttest: "t-tests & p-values", hetero: "Heteroskedasticity", fwl: "FWL", controls: "Adding controls", dag: "Causal diagrams", r2: "R²", adjr2: "Adjusted R²", ftest: "Overall F", partialf: "Partial F", dummies: "Dummies", interact2: "Dummy interactions", did: "Diff-in-diff", interactc: "Different slopes", rdd: "RDD", scaling: "Units & scaling", logs: "Logs", std: "Standardized", "stata-read": "Reading output", "stata-logs": "Log coefficients", "stata-interact": "Interactions", "stata-ftest": "F tests", "stata-fwl": "FWL", "stata-std": "Standardized output", "stata-did": "DiD output", "stata-rdd": "RDD output", "stata-controls": "Adding controls", "stata-dummy": "Dummy coefficients" };

const questions = BANK.map(b => {
  const id = `${b.sem}-${b.n}`;
  const q = { id, sec: b.sem, n: b.n, d: b.d, t: b.t, q: b.q, o: b.o, a: "abcd".indexOf(b.a), x: b.x };
  if (b.rel) q.also = b.rel;
  if (b.so) { q.pre = STATA[b.so]; q.preLabel = "Stata output"; }
  else if (b.cmd) {
    q.pre = b.cmd; q.preLabel = "Stata commands";
    q.note = b.flag ? "The FoS dataset wasn't available, so there's no output to show and this answer key is **inferred**. Run the command in Stata to confirm it. In the exam the output screenshot will be given."
                    : "The FoS output isn't shown (dataset not available), but the answer follows from FWL and the 0.219 → 0.097 numbers in Seminar 4 Q5.";
  }
  if (b.flag) q.flag = "unverified";
  const gen = GEN[id];
  if (gen) {
    const seen = new Set(), v = [];
    for (let k = 0; k < 60 && v.length < 10; k++) { const g = gen(); if (!seen.has(g.q + g.o.join("|"))) { seen.add(g.q + g.o.join("|")); v.push({ q: g.q, o: g.o, a: 0, x: g.x }); } }
    q.v = v;
  }
  return q;
});

const learn = {};
for (const L of LEARN) {
  learn[L.id] = {
    name: L.name, sub: L.sub, blurb: L.blurb, metaphor: L.metaphor,
    topics: L.sections.map(s => ({ id: s.id, title: s.title, tags: s.tags, html: s.html })),
    patterns: L.patterns.map(p => ({ title: p.title, qs: p.qs.map(n => `${L.id}-${n}`), recipe: p.recipe })),
    sheet: L.sheet,
  };
}

const pack = {
  format: "studypack/1", id: "econometrics", title: "Econometrics Midterm", subtitle: "WIUT · 5ECON012C",
  subject: "Econometrics", markup: "html", updated: new Date().toISOString().slice(0, 10),
  storage: { local: "econprep.progress.v1", remote: "progress" },
  exam: { total: 20, perSection: { s0: 3, s1: 3, s2: 3, s3: 3, s4: 3, s5: 3, mix: 2 }, note: "20 multiple-choice questions: about 3 from each seminar plus 2 Stata-output questions." },
  sections: SECTIONS, tags: TAGS, learn, questions,
  resources: { stata_st3: STATA.st3 },
};
const out = path.join(ROOT, "packs", "econometrics.json");
fs.writeFileSync(out, JSON.stringify(pack));
const nv = questions.reduce((s, q) => s + (q.v ? q.v.length : 0), 0);
console.log(`wrote ${path.relative(ROOT, out)}: ${questions.length} questions, ${nv} variants, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
