"""Replicate the Stata commands from the question bank and print Stata-style output.
Writes a JSON map {question_id: output_text} used by the website."""
import sys, json
import numpy as np, pandas as pd
from scipy import stats

sys.stdout.reconfigure(encoding="utf-8")
RAW = sys.argv[1]
OUT = sys.argv[2]

wage1 = pd.read_csv(f"{RAW}/wage1.csv.bz2")
bw = pd.read_stata("D:/WIUT/WIUT year 3/Econometrics/data/1_BWGHT.DTA")
kiel = pd.read_csv(f"{RAW}/kielmc.csv.bz2")
aej = pd.read_stata(f"{RAW}/AEJfigs.dta")


def g(x, w=9, sig=7):
    """Approximate Stata %9.0g display: ~7 significant digits, no leading zero."""
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return ".".rjust(w)
    if x == 0:
        return "0".rjust(w)
    ax = abs(x)
    digits_int = int(np.floor(np.log10(ax))) + 1 if ax >= 1 else 0
    dec = max(0, sig - digits_int)
    s = f"{x:.{dec}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    if len(s.lstrip("-").split(".")[0]) > w - 1:
        m, e = f"{x:.4e}".split("e")
        return f"{m}e+{int(e):02d}".rjust(w)
    while len(s) > w and dec > 0:
        dec -= 1
        s = f"{x:.{dec}f}"
        if s.startswith("0."):
            s = s[1:]
        elif s.startswith("-0."):
            s = "-" + s[2:]
    return s.rjust(w)


def ols(df, y, xs, const=True):
    d = df[[y] + xs].dropna()
    Y = d[y].to_numpy(float)
    X = d[xs].to_numpy(float)
    if const:
        X = np.column_stack([X, np.ones(len(d))])
    n, k = X.shape
    XtXi = np.linalg.inv(X.T @ X)
    b = XtXi @ X.T @ Y
    e = Y - X @ b
    rss = e @ e
    tss = ((Y - Y.mean()) ** 2).sum() if const else (Y @ Y)
    mss = tss - rss
    s2 = rss / (n - k)
    V = s2 * XtXi
    se = np.sqrt(np.diag(V))
    t = b / se
    p = 2 * stats.t.sf(np.abs(t), n - k)
    tc = stats.t.ppf(0.975, n - k)
    dfm = k - 1 if const else k
    F = (mss / dfm) / s2
    pF = stats.f.sf(F, dfm, n - k)
    r2 = mss / tss
    adj = 1 - (1 - r2) * (n - (1 if const else 0)) / (n - k)
    names = xs + (["_cons"] if const else [])
    return dict(y=y, names=names, b=b, se=se, t=t, p=p, lo=b - tc * se, hi=b + tc * se,
                n=n, k=k, rss=rss, tss=tss, mss=mss, dfm=dfm, F=F, pF=pF, r2=r2, adj=adj,
                rmse=np.sqrt(s2), V=V, e=e, idx=d.index, const=const)


def reg_text(r, labels=None, groups=None):
    """labels: display name per regressor. groups: dict insert header line before a name."""
    labels = labels or {}
    groups = groups or {}
    n, dfm, dfr = r["n"], r["dfm"], r["n"] - r["k"]
    L = []
    L.append(f"      Source |       SS           df       MS      Number of obs   = {n:>9,}")
    L.append(f"-------------+----------------------------------   {'F(%d, %d)' % (dfm, dfr):<16}= {r['F']:>9.2f}")
    L.append(f"       Model | {g(r['mss'], 10)} {dfm:>9} {g(r['mss'] / dfm, 11)}   Prob > F        = {r['pF']:>9.4f}")
    L.append(f"    Residual | {g(r['rss'], 10)} {dfr:>9} {g(r['rss'] / dfr, 11)}   R-squared       = {r['r2']:>9.4f}")
    L.append(f"-------------+----------------------------------   Adj R-squared   = {r['adj']:>9.4f}")
    tot_df = n - 1 if r["const"] else n
    L.append(f"       Total | {g(r['tss'], 10)} {tot_df:>9} {g(r['tss'] / tot_df, 11)}   Root MSE        = {float('%.5g' % r['rmse']):>9g}")
    L.append("")
    L.append("-" * 78)
    L.append(f"{r['y'][:12]:>12} | Coefficient  Std. err.      t    P>|t|     [95% conf. interval]")
    L.append("-------------+----------------------------------------------------------------")
    for i, nm in enumerate(r["names"]):
        if nm in groups:
            L.append("             |")
            L.append(f"{groups[nm]:>12} |")
        if nm == "_cons" and groups:
            L.append("             |")
        lab = labels.get(nm, nm)
        L.append(f"{lab[:12]:>12} | {g(r['b'][i], 10)} {g(r['se'][i], 10)} {r['t'][i]:>8.2f}   {r['p'][i]:.3f} {g(r['lo'][i], 12)} {g(r['hi'][i], 11)}")
    L.append("-" * 78)
    return "\n".join(L)


def test_text(r, names):
    idx = [r["names"].index(nm) for nm in names]
    R = np.zeros((len(idx), r["k"]))
    for j, i in enumerate(idx):
        R[j, i] = 1
    b = r["b"]
    Rb = R @ b
    W = Rb @ np.linalg.inv(R @ r["V"] @ R.T) @ Rb
    q = len(idx)
    F = W / q
    dfr = r["n"] - r["k"]
    p = stats.f.sf(F, q, dfr)
    L = [""]
    for j, nm in enumerate(names):
        L.append(f" ( {j + 1})  {nm} = 0")
    L.append("")
    L.append(f"       F(  {q}, {dfr:>5}) = {F:>7.2f}")
    L.append(f"            Prob > F = {p:>9.4f}")
    return "\n".join(L), F, p


def summ_text(df, vs):
    L = ["    Variable |        Obs        Mean    Std. dev.       Min        Max",
         "-------------+---------------------------------------------------------"]
    for v in vs:
        s = df[v].dropna()
        L.append(f"{v:>12} | {len(s):>10,} {g(s.mean(), 11)} {g(s.std(ddof=1), 11)} {g(s.min(), 10)} {g(s.max(), 10)}")
    return "\n".join(L)


def ttest_text(df, v, by):
    a = df[df[by] == 0][v].dropna()
    c = df[df[by] == 1][v].dropna()
    al = df[v].dropna()
    n0, n1 = len(a), len(c)
    sp = np.sqrt(((n0 - 1) * a.var() + (n1 - 1) * c.var()) / (n0 + n1 - 2))
    diff = a.mean() - c.mean()
    sed = sp * np.sqrt(1 / n0 + 1 / n1)
    dfree = n0 + n1 - 2
    t = diff / sed
    tc = stats.t.ppf(.975, dfree)

    def row(lbl, s):
        m, sd = s.mean(), s.std(ddof=1)
        se = sd / np.sqrt(len(s))
        tcc = stats.t.ppf(.975, len(s) - 1)
        return f"{lbl:>8} | {len(s):>7,} {g(m, 11)} {g(se, 11)} {g(sd, 11)} {g(m - tcc * se, 11)} {g(m + tcc * se, 11)}"

    L = ["Two-sample t test with equal variances",
         "-" * 78,
         "   Group |     Obs        Mean    Std. err.   Std. dev.   [95% conf. interval]",
         "---------+--------------------------------------------------------------------",
         row("0", a), row("1", c),
         "---------+--------------------------------------------------------------------",
         row("Combined", al),
         "---------+--------------------------------------------------------------------",
         f"    diff |         {g(diff, 11)} {g(sed, 11)}             {g(diff - tc * sed, 11)} {g(diff + tc * sed, 11)}",
         "-" * 78,
         f"    diff = mean(0) - mean(1)                                      t = {t:>8.4f}",
         f"H0: diff = 0                                     Degrees of freedom = {dfree:>8}",
         "",
         "    Ha: diff < 0                 Ha: diff != 0                 Ha: diff > 0",
         f" Pr(T < t) = {stats.t.cdf(t, dfree):.4f}         Pr(|T| > |t|) = {2 * stats.t.sf(abs(t), dfree):.4f}          Pr(T > t) = {stats.t.sf(t, dfree):.4f}"]
    return "\n".join(L), t


def std(s):
    return (s - s.mean()) / s.std(ddof=1)


out, facts = {}, {}
w = wage1.copy()
w["lwage"] = np.log(w["wage"])
w["expersq"] = w["exper"] ** 2
w["tenursq"] = w["tenure"] ** 2
w["fem_educ"] = w.female * w.educ
w["fem_exper"] = w.female * w.exper
w["fem_expersq"] = w.female * w.expersq

# Q1
out["st1"] = ". sum wage educ if female==1\n\n" + summ_text(w[w.female == 1], ["wage", "educ"]) + \
             "\n\n. sum wage educ if female==0\n\n" + summ_text(w[w.female == 0], ["wage", "educ"])
facts["st1_men_wage"] = w[w.female == 0].wage.mean()
facts["st1_women_wage"] = w[w.female == 1].wage.mean()
# Q2
txt, t = ttest_text(w, "wage", "female")
out["st2"] = ". ttest wage, by(female)\n\n" + txt
facts["st2_t"] = t
# Q3
r = ols(w, "wage", ["educ", "exper"])
out["st3"] = ". reg wage educ exper\n\n" + reg_text(r)
facts["st3_t_educ"] = r["t"][0]
# Q4/5
r = ols(w, "lwage", ["educ", "exper", "expersq", "married", "female"])
out["st4"] = ". gen lwage = ln(wage)\n. gen expersq = exper^2\n. reg lwage educ exper expersq married female\n\n" + reg_text(r)
facts["st4"] = dict(zip(r["names"], r["b"].round(5)))
# Q6/7
xs = ["educ", "exper", "expersq", "married", "female", "fem_educ", "fem_exper", "fem_expersq"]
r = ols(w, "lwage", xs)
tt, F, p = test_text(r, ["fem_educ", "fem_exper", "fem_expersq"])
out["st6"] = ". reg lwage educ exper expersq married female ///\n>     fem_educ fem_exper fem_expersq\n\n" + reg_text(r)
out["st7"] = out["st6"] + "\n\n. test fem_educ fem_exper fem_expersq\n" + tt
facts["st6"] = {"b": r["b"][5], "p": r["p"][5]}
facts["st7"] = {"F": F, "p": p}
# Q8
r = ols(w, "wage", ["educ", "exper", "numdep", "tenure"])
tt, F, p = test_text(r, ["numdep", "tenure"])
out["st8"] = ". reg wage educ exper numdep tenure\n\n" + reg_text(r) + "\n\n. test numdep tenure\n" + tt
facts["st8"] = {"F": F, "p": p, "r2": r["r2"]}
facts["st8_restricted_r2"] = ols(w, "wage", ["educ", "exper"])["r2"]
# Q9 FWL
full = ols(w, "wage", ["educ", "exper"])
r1 = ols(w, "wage", ["exper"])
r2_ = ols(w, "educ", ["exper"])
ww = w.copy()
ww["r_wage"] = r1["e"]
ww["r_educ"] = r2_["e"]
r3 = ols(ww, "r_wage", ["r_educ"], const=False)
out["st9"] = ". reg wage educ exper\n\n" + reg_text(full) + "\n\n. reg wage exper\n. predict r_wage, resid\n. reg educ exper\n. predict r_educ, resid\n. reg r_wage r_educ, noconstant\n\n" + reg_text(r3)
facts["st9"] = {"full_educ": full["b"][0], "fwl": r3["b"][0]}
# Q10
ww = w.copy()
ww["zwage"], ww["zeduc"], ww["zexper"] = std(w.wage), std(w.educ), std(w.exper)
r = ols(ww, "zwage", ["zeduc", "zexper"])
out["st10"] = ". egen zwage = std(wage)\n. egen zeduc = std(educ)\n. egen zexper = std(exper)\n. reg zwage zeduc zexper\n\n" + reg_text(r)
facts["st10"] = dict(zip(r["names"], r["b"].round(4)))
# Q11 KIELMC
k = kiel.copy()
k["nearinc_y81"] = k.nearinc * k.y81
r = ols(k, "rprice", ["nearinc", "y81", "nearinc_y81"])
out["st11"] = ". use \"KIELMC.dta\", clear\n. reg rprice i.nearinc##i.y81\n\n" + reg_text(
    r, labels={"nearinc": "1.nearinc", "y81": "1.y81", "nearinc_y81": "1 1"},
    groups={"nearinc_y81": "nearinc#y81"})
facts["st11"] = dict(zip(r["names"], zip(r["b"].round(2), r["p"].round(3))))
# Q12 AEJ
a = aej.copy()
a["age0"] = a.agecell - 21
a["over21"] = (a.agecell >= 21).astype(float)
r = ols(a, "all", ["age0", "over21"])
out["st12"] = ". use \"AEJfigs.dta\", clear\n. gen age0 = agecell - 21\n. gen over21 = agecell >= 21\n. reg all age0 over21\n\n" + reg_text(r)
facts["st12"] = dict(zip(r["names"], zip(r["b"].round(3), r["p"].round(3))))
# Q13/14
r13 = ols(w, "wage", ["educ"])
out["st13"] = ". reg wage educ\n\n" + reg_text(r13)
out["st14"] = ". reg wage educ\n\n" + reg_text(r13) + "\n\n. reg wage educ exper\n\n" + reg_text(full)
facts["st13"] = r13["b"][0]
# Q15
r = ols(w, "wage", ["educ", "exper", "tenure"])
out["st15"] = ". reg wage educ exper tenure\n\n" + reg_text(r)
facts["st15"] = dict(zip(r["names"], r["p"].round(4)))
# Q16/17
r = ols(w, "wage", ["exper", "expersq", "educ", "tenure", "tenursq"])
tt, F, p = test_text(r, ["exper", "expersq"])
out["st16"] = ". gen expersq = exper^2\n. gen tenursq = tenure^2\n. reg wage exper expersq educ tenure tenursq\n\n" + reg_text(r)
out["st17"] = out["st16"] + "\n\n. test exper expersq\n" + tt
facts["st16"] = r["r2"]
facts["st17"] = {"F": F, "p": p}
# Q18/19
ww = w.copy()
ww["fm"] = ww.female * ww.married
r = ols(ww, "wage", ["female", "married", "fm"])
out["st18"] = ". reg wage i.female##i.married\n\n" + reg_text(
    r, labels={"female": "1.female", "married": "1.married", "fm": "1 1"},
    groups={"fm": "female#|"})
out["st18"] = out["st18"].replace("    female#| |", "      female#|\n     married |")
facts["st18"] = dict(zip(r["names"], r["b"].round(4)))
# BWGHT
b = bw.copy()
r20 = ols(b, "bwght", ["cigs"])
out["st20"] = ". use \"BWGHT.DTA\", clear\n. reg bwght cigs\n\n" + reg_text(r20)
facts["st20"] = {"b": r20["b"][0], "t": r20["t"][0]}
r22 = ols(b, "bwght", ["cigs", "faminc"])
out["st22"] = ". reg bwght cigs\n\n" + reg_text(r20) + "\n\n. reg bwght cigs faminc\n\n" + reg_text(r22)
out["st23"] = ". reg bwght cigs faminc\n\n" + reg_text(r22)
facts["st22"] = {"cigs": r22["b"][0], "r2": r22["r2"]}
r = ols(b, "lbwght", ["cigs", "faminc"])
out["st24"] = ". reg lbwght cigs faminc\n\n" + reg_text(r)
facts["st24"] = r["b"][0]
r = ols(b, "bwght", ["cigs", "faminc", "male"])
out["st25"] = ". reg bwght cigs faminc male\n\n" + reg_text(r)
facts["st25"] = r["b"][2]
bb = b.copy()
bb["male_cigs"] = bb.male * bb.cigs
r = ols(bb, "bwght", ["cigs", "male", "male_cigs", "faminc"])
out["st26"] = ". reg bwght c.cigs##i.male faminc\n\n" + reg_text(
    r, labels={"male": "1.male", "male_cigs": "1"}, groups={"male_cigs": "male#c.cigs"})
facts["st26"] = dict(zip(r["names"], zip(r["b"].round(4), r["p"].round(3))))
bb = b.copy()
bb["zbwght"], bb["zcigs"], bb["zfaminc"] = std(b.bwght), std(b.cigs), std(b.faminc)
r = ols(bb, "zbwght", ["zcigs", "zfaminc"])
out["st27"] = ". egen zbwght = std(bwght)\n. egen zcigs = std(cigs)\n. egen zfaminc = std(faminc)\n. reg zbwght zcigs zfaminc\n\n" + reg_text(r)
facts["st27"] = dict(zip(r["names"], r["b"].round(4)))

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for kk, v in facts.items():
    print(kk, v)
print()
print(out["st11"])
print(out["st18"])
print(out["st26"])
print(out["st2"])
print(out["st7"])
