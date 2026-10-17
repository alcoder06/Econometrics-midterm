/* Learning content, one object per seminar. Everything here is aimed at the question bank:
   each "pattern" lists the bank question numbers it unlocks. Widgets mount on [data-w]. */
const W = (name, title) => `<div class="widget" data-w="${name}"><div class="wt"><span class="tag">Try it</span>${title}</div><div class="wbody"></div></div>`;
const KEY = (t, h) => `<div class="callout key"><div class="ct">${t}</div><div>${h}</div></div>`;
const TRAP = (h) => `<div class="callout trap"><div class="ct">Exam trap</div><div>${h}</div></div>`;
const EX = (t, h) => `<div class="callout ex"><div class="ct">${t}</div><div>${h}</div></div>`;
const TB = (head, rows) => `<div class="tbl-wrap"><table class="t"><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;

const LEARN = [
/* ============================ S0 ============================ */
{ id: "s0", name: "Matrix toolkit", sub: "Intro matrix algebra",
  blurb: R`The vocabulary every later formula is written in. $\hat\beta=(X'X)^{-1}X'y$ uses dimensions, multiplication, transposes, rank and inverses, all in one line.`,
  metaphor: R`A matrix is an **egg carton**: a grid of slots, described by **rows × columns** (always in that order, like reading a page top-to-bottom then left-to-right). A vector is a carton with a single row or a single column of slots.`,
  sections: [
  { id: "dims", tags: ["dims"], title: "Shapes: rows × columns", html: R`
<p>The dimension of a matrix is <b>(number of rows) × (number of columns)</b>. Say it out loud as "R by C".</p>
${TB(["Object", "Looks like", "Dimension"], [[R`Scalar`, R`$7$`, R`$1\times1$`], [R`Column vector`, R`$${V([2, 4, 6])}$`, R`$3\times1$`], [R`Row vector`, R`$\begin{bmatrix}2&4&6\end{bmatrix}$`, R`$1\times3$`], [R`Matrix`, R`$${M([[1, 3, 5], [2, 4, 6]])}$`, R`$2\times3$`]])}
<p>In econometrics, vectors are <b>columns by default</b>. $y$ is $n\times1$, one row per observation.</p>` },
  { id: "ops", tags: ["ops"], title: "Adding and scaling", html: R`
<p><b>Adding/subtracting</b> works slot by slot, like stacking two egg cartons on top of each other. That only works if the cartons have <b>exactly the same shape</b>.</p>
<p><b>Scalar multiplication</b> multiplies <b>every</b> slot: $2${M([[1, -2], [3, 4]])}=${M([[2, -4], [6, 8]])}$.</p>
${TRAP(R`A $2\times3$ plus a $3\times2$ is <b>not defined</b>. Same number of entries isn't enough; the shapes must match.`)}` },
  { id: "mult", tags: ["mult"], title: "Multiplying matrices", html: R`
<p>Write the two dimensions side by side. The <b>inner numbers must match</b> (they "shake hands" and disappear), and the <b>outer numbers</b> give the size of the answer:</p>
<div class="mathblock">$$(\underbrace{4\times 3}_{A})(\underbrace{3\times 2}_{B})=\;4\times 2$$</div>
<p>Each entry of the result is a <b>row of the first × a column of the second</b>: multiply pairwise and add (an inner product).</p>
${W("dimcheck", "Will these multiply?")}
${W("matmul", "Row × column, step by step (bank Q6)")}
${KEY("Not commutative", R`Order matters: $AB\neq BA$ in general. Putting on socks then shoes is not the same as shoes then socks. Often $BA$ isn't even defined.`)}` },
  { id: "transpose", tags: ["transpose"], title: "Transpose: flip over the diagonal", html: R`
<p>$A'$ turns <b>rows into columns</b>: row 1 of $A$ becomes column 1 of $A'$. An $m\times n$ matrix becomes $n\times m$.</p>
<div class="mathblock">$$A=${M([[1, 2, 3], [4, 5, 6]])}\quad\Rightarrow\quad A'=${M([[1, 4], [2, 5], [3, 6]])}$$</div>
${KEY("Socks-and-shoes rule", R`$(AB)'=B'A'$ and $(AB)^{-1}=B^{-1}A^{-1}$. Undoing a sequence reverses its order. Also $(A')'=A$.`)}
${TRAP(R`Writing $1,2,3,4,5,6$ in reading order into a $3\times2$ grid gives $${M([[1, 2], [3, 4], [5, 6]])}$, which is <b>not</b> the transpose.`)}` },
  { id: "inner", tags: ["inner"], title: "Inner product and orthogonality", html: R`
<p>$x'y=x_1y_1+x_2y_2+\cdots+x_ny_n$: multiply matching entries, then add. The result is a single number.</p>
<p>If $x'y=0$ the vectors are <b>orthogonal</b> (perpendicular arrows). Example: $(1,2)\cdot(2,-1)=2-2=0$.</p>
${KEY("Where it comes back", R`$E[Y]=y'p$ (Seminar 1) and $e'e=\sum e_i^2$ (Seminar 2) are both inner products. The <b>outer</b> product $ee'$ (Seminar 3) is the opposite: a column times a row, which gives a whole matrix.`)}` },
  { id: "span", tags: ["span"], title: "Linear combinations, span, independence", html: R`
<p>A <b>linear combination</b> is a recipe: $a_1x_1+a_2x_2$ ("2 scoops of $x_1$, minus 1 scoop of $x_2$"). The <b>span</b> is every dish you could ever cook with those ingredients.</p>
<ul><li>Two arrows pointing in <b>different</b> directions: the span is the <b>whole plane</b> $\mathbb{R}^2$.</li>
<li>Two arrows on the <b>same line</b> ($x_2=2x_1$): you're stuck on that line.</li></ul>
${W("span", "Mix two vectors")}
<p><b>Linearly independent</b>: the only recipe that gives the zero vector is "use zero of everything" ($a_1=\dots=a_k=0$). If you can write one vector as a remix of the others (e.g. $x_3=2x_1+x_2$), they're <b>dependent</b>.</p>` },
  { id: "rank", tags: ["rank"], title: "Rank", html: R`
<p><b>Rank = number of independent directions</b> among the columns (equivalently, the rows).</p>
<div class="mathblock">$$${M([[1, 2], [2, 4]])}:\ \text{column 2}=2\times\text{column 1}\ \Rightarrow\ \text{rank}=1$$</div>
<p>A $k$-column matrix with rank $k$ has <b>full (column) rank</b>. In regression that means no regressor is an exact combination of the others.</p>` },
  { id: "inverse", tags: ["inverse"], title: "Identity and inverse", html: R`
<p>$I$ (1s on the diagonal, 0s elsewhere) is "multiply by 1": $AI=IA=A$.</p>
<p>The inverse is an <b>undo button</b>: $AA^{-1}=A^{-1}A=I$. A square matrix has an inverse <b>exactly when it has full rank</b>. With dependent columns there's no undo, because information was lost.</p>
${KEY("Why OLS cares", R`$\hat\beta=(X'X)^{-1}X'y$ needs $(X'X)^{-1}$ to exist, so $X$ must have full column rank. That is the no-perfect-multicollinearity assumption.`)}` },
  ],
  patterns: [
    { title: "Read a dimension / identify a vector", qs: [1, 2, 8, 19], recipe: R`Rows first, columns second. A column vector is $n\times1$. Transposing swaps the two numbers.` },
    { title: "Is it defined? What size is the product?", qs: [3, 5, 7], recipe: R`Addition needs identical shapes. Multiplication needs the inner numbers to match, and the answer takes the outer numbers.` },
    { title: "Compute: scalar multiple, product, combination", qs: [4, 6, 13], recipe: R`Scalar: every entry. Product: row·column for each entry. Combination: scale each vector, then add or subtract entry by entry.` },
    { title: "Transpose rules", qs: [9, 10], recipe: R`Rows become columns. $(AB)'=B'A'$, reversing the order.` },
    { title: "Inner product and orthogonality", qs: [11, 12], recipe: R`Multiply matching entries and add. A result of $0$ means orthogonal.` },
    { title: "Span, independence, rank, inverse", qs: [14, 15, 16, 17, 18, 20], recipe: R`Is one vector a multiple or combination of the others? If yes: dependent, the span shrinks, rank < k, and there's no inverse.` },
  ],
  sheet: [[R`Dimension`, R`rows $\times$ columns`], [R`Product size`, R`$(m\times n)(n\times p)=m\times p$`], [R`Transpose`, R`$(AB)'=B'A'$, $(A')'=A$`], [R`Inner product`, R`$x'y=\sum x_iy_i$; $0\Rightarrow$ orthogonal`], [R`Inverse`, R`exists $\Leftrightarrow$ full rank; $(AB)^{-1}=B^{-1}A^{-1}$`]] },

/* ============================ S1 ============================ */
{ id: "s1", name: "Expected value & conditional expectations", sub: "Seminar 1",
  blurb: R`Regression is built from <b>averages</b>: the overall average $E[Y]$, the group averages $E[Y\mid X]$, and how the two connect.`,
  metaphor: R`$E[Y]$ is the **balance point of a seesaw**. Each possible value sits on the plank, and its probability is how heavy it is. Heavier (more likely) values pull the balance point towards themselves.`,
  sections: [
  { id: "datatypes", tags: ["datatypes"], title: "Kinds of data (and a few key words)", html: R`
${TB(["Type", "Picture it as", "Example"], [["Cross-section", "One <b>photo</b> of many units at one moment", "526 workers in 1976 (WAGE1)"], ["Time series", "A <b>video</b> of one unit over time", "Uzbekistan's GDP 2000–2025"], ["Pooled cross-sections", "Several photos of <b>different</b> crowds in different years", "House sales in 1978 and in 1981 (KIELMC)"], ["Panel (longitudinal)", "A video of the <b>same</b> crowd", "Same firms followed every year"]])}
<ul><li><b>Experimental data</b>: the researcher assigns treatment (ideally at random) to estimate a causal effect. <b>Observational</b> data: no intervention.</li>
<li><b>Random sampling</b>: a fair lottery where every member of the population is equally likely to be picked.</li>
<li><b>Ceteris paribus</b>: "all else equal". Change one factor and freeze every other relevant factor.</li></ul>` },
  { id: "ev", tags: ["ev"], title: "Expected value = probability-weighted average", html: R`
<div class="mathblock">$$E[Y]=\sum_y y\,P(Y=y)=y'p$$</div>
${EX("Example (seminar)", R`$Y\in\{50,70,90\}$ with probabilities $0.2, 0.5, 0.3$: $E[Y]=50(0.2)+70(0.5)+90(0.3)=10+35+27=72$.`)}
${TRAP(R`The plain average of the values, $(50+70+90)/3=70$, ignores the probabilities. The bank always offers it as a distractor.`)}` },
  { id: "linearity", tags: ["linearity"], title: "Rules that save time", html: R`
${TB(["Rule", "In words"], [[R`$E[c]=c$`, "A constant's average is itself"], [R`$E[a+bY]=a+bE[Y]$`, "Constants pass straight through"], [R`$E[a+bX+cY]=a+bE[X]+cE[Y]$`, "Works <b>without</b> independence"], [R`$E[Y-E[Y]]=0$`, "Deviations from the mean balance out"]])}
${EX("Bank Q5", R`$E[X]=4,\ E[Y]=6$: $E[5+2X-3Y]=5+8-18=-5$. Keep the signs.`)}` },
  { id: "joint", tags: ["joint", "condprob"], title: "Joint, marginal and conditional probability", html: R`
<p>A <b>joint</b> table gives $P(Y=y, X=x)$ for every pair, and all the cells sum to 1.</p>
<ul><li><b>Marginal</b> $P(X=0)$: add the whole column. These totals are literally written in the table's <i>margins</i>.</li>
<li><b>Conditional</b> $P(Y=y\mid X=x)=\dfrac{P(Y=y,X=x)}{P(X=x)}$: zoom into one column and <b>rescale</b> it so it sums to 1.</li></ul>
${W("jointtable", "Zoom into a column")}` },
  { id: "condev", tags: ["condev"], title: R`Conditional expectation $E[Y\mid X=x]$`, html: R`
<p>Exactly the same weighted average, but using the <b>conditional</b> probabilities: the average of $Y$ <b>inside one group</b>.</p>
<p>From raw data (the income–consumption tables), $E[Y\mid X=120]$ means: take <b>only the rows with income 120</b> and average their consumption.</p>
${EX("Bank Q14", R`Income 120: consumption 79, 89, 90, so $E[Y\mid X=120]=258/3=86.00$.`)}
${TRAP(R`83.67 is the average of <b>all nine</b> people, i.e. $E[Y]$, not $E[Y\mid X=120]$. The other group means (58.67, 106.33) are also offered.`)}` },
  { id: "lie", tags: ["lie"], title: "Law of Iterated Expectations", html: R`
<div class="mathblock">$$E[Y]=E\big[E[Y\mid X]\big]=\sum_x E[Y\mid X=x]\,P(X=x)$$</div>
<p>The school average is the <b>class averages weighted by class size</b>. A big class pulls the school average towards its own mean.</p>
${EX("Bank Q13", R`$60(0.7)+80(0.3)=42+24=66$. The trap answer 70 weights the two groups equally.`)}` },
  { id: "cef", tags: ["cef"], title: R`From $E[Y\mid X]$ to regression and the error term`, html: R`
<p>Join the group averages and you get the <b>conditional expectation function</b> (the population regression line). Each person's gap from their group average is the <b>error term</b>:</p>
<div class="mathblock">$$u=Y-E[Y\mid X]\qquad(\text{everything else that moves }Y)$$</div>
${W("cef", "Population regression function (seminar Q4 data)")}` },
  { id: "causal", tags: ["causal"], title: R`Why $E[Y\mid X]$ isn't automatically causal`, html: R`
<p>Ice-cream sales and drownings move together because <b>summer</b> drives both. That's a <b>confounder</b>. And sometimes $Y$ causes $X$ (<b>reverse causality</b>).</p>
<p>So a conditional mean describes <b>association</b>. Causal claims need a design or assumptions that rule these out (Seminar 4 makes this precise).</p>` },
  ],
  patterns: [
    { title: "Data types and definitions", qs: [1, 2, 17, 18, 19, 20, 22, 25], recipe: R`Photo (cross-section), video of one unit (time series), photos of different crowds (pooled), video of the same crowd (panel).` },
    { title: "Compute $E[Y]$ from a table", qs: [3], recipe: R`Multiply each value by its probability and add.` },
    { title: "Linearity of expectation", qs: [4, 5, 6, 7], recipe: R`$E[a+bX+cY]=a+bE[X]+cE[Y]$. Constants come out, signs stay, no independence needed.` },
    { title: "Marginal and conditional probability", qs: [8, 9, 10], recipe: R`Marginal = column sum. Conditional = cell ÷ column sum.` },
    { title: "Conditional expectation", qs: [11, 14, 23, 26], recipe: R`Average within the group only: with conditional probabilities, or with the raw rows for that $X$.` },
    { title: "Law of Iterated Expectations", qs: [12, 13], recipe: R`Weight each group mean by its group probability.` },
    { title: "Error term and causality", qs: [15, 16, 21, 24], recipe: R`$u$ = all omitted influences. $E[Y\mid X]$ isn't causal because of confounders and reverse causality.` },
  ],
  sheet: [[R`Expected value`, R`$E[Y]=\sum y\,P(y)=y'p$`], [R`Linearity`, R`$E[a+bX+cY]=a+bE[X]+cE[Y]$`], [R`Conditional prob.`, R`$P(Y\mid X)=P(Y,X)/P(X)$`], [R`LIE`, R`$E[Y]=\sum_x E[Y\mid X=x]P(X=x)$`], [R`Error term`, R`$u=Y-E[Y\mid X]$`]] },

/* ============================ S2 ============================ */
{ id: "s2", name: "OLS in matrix form", sub: "Seminar 2",
  blurb: R`Where $\hat\beta=(X'X)^{-1}X'y$ comes from, which assumption buys what, and how to tell the population error from the residual.`,
  metaphor: R`Imagine a stiff rod (the fitted line) tied to each data point with **rubber bands**. The rod settles where the total stretch (measured as **squared** length) is smallest. That resting place is OLS.`,
  sections: [
  { id: "setup", tags: ["setup"], title: "The model in matrix clothes", html: R`
<div class="mathblock">$$\underbrace{y}_{n\times1}=\underbrace{X}_{n\times k}\ \underbrace{\beta}_{k\times1}+\underbrace{\varepsilon}_{n\times1}$$</div>
<p>$X$ has one row per observation and one column per coefficient, <b>including a column of 1s for the constant</b>. So "a constant and three regressors" means $k=4$.</p>
${KEY("Shortcut", R`$X'X$ and $(X'X)^{-1}$ are always $k\times k$. $X'y$ and $\hat\beta$ are $k\times1$. $n$ never appears in them.`)}` },
  { id: "residual", tags: ["residual"], title: R`Population error $\varepsilon$ vs residual $e$`, html: R`
${TB(["", R`$\varepsilon=y-X\beta$`, R`$e=y-X\hat\beta$`], [["Uses", R`true $\beta$`, R`estimated $\hat\beta$`], ["Observed?", "Never", "Yes, after estimation"], ["Lives in", "Population", "Sample"]])}
<p>Think of $\varepsilon$ as the <b>true wind gust</b> that pushed each dart, and $e$ as <b>how far each dart landed</b> from where you aimed. You can measure the second; you can only guess at the first.</p>` },
  { id: "objective", tags: ["objective"], title: "Least squares: smallest total square area", html: R`
<p>OLS picks $\hat\beta$ to minimise $e'e=\sum e_i^2$. Residuals are <b>squared</b> so that $+5$ and $-5$ can't cancel into a fake "perfect fit". Below, each residual is drawn as an actual square: OLS makes their total area as small as possible.</p>
${W("olsfit", "Make the squares as small as you can")}
<p>Comparing two candidate $\hat\beta$'s? The one with the <b>smaller</b> $e'e$ fits better.</p>` },
  { id: "calculus", tags: ["calculus"], title: "Three derivative rules (that's all you need)", html: R`
${TB(["Type of term", "Scalar version", "Matrix version"], [["Constant (no $\\beta$)", R`$\frac{d}{dx}c=0$`, R`$\frac{\partial\, y'y}{\partial\beta}=0$`], ["Linear", R`$\frac{d}{dx}ax=a$`, R`$\frac{\partial\,\beta'a}{\partial\beta}=a$, so $\frac{\partial(-2\beta'X'y)}{\partial\beta}=-2X'y$`], ["Quadratic", R`$\frac{d}{dx}ax^2=2ax$`, R`$\frac{\partial\,\beta'A\beta}{\partial\beta}=2A\beta$, so $\frac{\partial\,\beta'X'X\beta}{\partial\beta}=2X'X\beta$`]])}` },
  { id: "derivation", tags: ["derivation"], title: R`Deriving $\hat\beta$ step by step`, html: R`
${W("derive", "Click through the derivation")}` },
  { id: "fullrank", tags: ["fullrank"], title: "Full rank (no perfect multicollinearity)", html: R`
<p>$\operatorname{rank}(X)=k$: no column is an exact combination of the others. Then $X'X$ is invertible and there is <b>one unique</b> $\hat\beta$.</p>
<p>It fails if, e.g., $x_3=x_1+x_2$, or with <b>all</b> category dummies plus a constant (Seminar 5). Two GPS beacons in the same spot can't triangulate your position: the data can't separate the two effects.</p>` },
  { id: "unbiased", tags: ["unbiased"], title: "Unbiasedness", html: R`
<div class="mathblock">$$\hat\beta=(X'X)^{-1}X'(X\beta+\varepsilon)=\beta+(X'X)^{-1}X'\varepsilon$$</div>
<p>Take $E(\cdot\mid X)$: the second term vanishes <b>if</b> $E(\varepsilon\mid X)=0$. Then $E(\hat\beta)=\beta$: the darts are centred on the bullseye <b>on average</b>, even though each throw misses a little.</p>
${TB(["Assumption", "Buys you"], [[R`Linear model $y=X\beta+\varepsilon$`, "Defines what we estimate"], [R`Full rank`, R`$(X'X)^{-1}$ exists, so $\hat\beta$ is unique`], [R`$E(\varepsilon\mid X)=0$`, "Unbiasedness"]])}
${TRAP(R`Homoskedasticity and normality are <b>not</b> needed for unbiasedness. Example of failure: motivation drives both attendance and scores but is omitted, so $E(\varepsilon\mid X)\neq0$.`)}` },
  { id: "residprops", tags: ["residprops"], title: "Mechanical facts about residuals", html: R`
<p>The normal equations say $X'(y-X\hat\beta)=X'e=0$. This <b>always</b> holds by construction. With a constant (a column of 1s), it implies $\sum e_i=0$, so the residuals average zero.</p>
${TRAP(R`$X'e=0$ is a sample identity. It does <b>not</b> prove the population assumption $E(\varepsilon\mid X)=0$.`)}` },
  ],
  patterns: [
    { title: "Objects and dimensions", qs: [1, 2, 15], recipe: R`$k$ = constant + slopes. $X$: $n\times k$, $\beta$: $k\times1$, $X'X$: $k\times k$, $X'y$: $k\times1$.` },
    { title: "Residual vs error, the objective", qs: [3, 4, 5, 6, 7, 22, 24], recipe: R`$e=y-X\hat\beta$. Minimise $e'e$ (smaller is better). Square so signs can't cancel.` },
    { title: "Matrix derivatives", qs: [8, 9, 10], recipe: R`Constant → 0. Linear $\beta'a$ → $a$. Quadratic $\beta'A\beta$ → $2A\beta$.` },
    { title: "Derivation chain", qs: [11, 12, 13, 14], recipe: R`Expand, then FOC $-2X'y+2X'X\hat\beta=0$, then $X'X\hat\beta=X'y$, then $\hat\beta=(X'X)^{-1}X'y$.` },
    { title: "Full rank", qs: [16, 17], recipe: R`An exact linear combination among regressors means rank < k, no inverse, no unique solution.` },
    { title: "Unbiasedness and residual properties", qs: [18, 19, 20, 21, 23], recipe: R`$\hat\beta=\beta+(X'X)^{-1}X'\varepsilon$. You need $E(\varepsilon\mid X)=0$. Residuals sum to 0 when there's a constant.` },
  ],
  sheet: [[R`Model`, R`$y=X\beta+\varepsilon$`], [R`Residual`, R`$e=y-X\hat\beta$`], [R`Objective`, R`$\min e'e=y'y-2\hat\beta'X'y+\hat\beta'X'X\hat\beta$`], [R`Normal eq.`, R`$X'X\hat\beta=X'y$`], [R`Estimator`, R`$\hat\beta=(X'X)^{-1}X'y$`], [R`Sampling error`, R`$\hat\beta-\beta=(X'X)^{-1}X'\varepsilon$`]] },

/* ============================ S3 ============================ */
{ id: "s3", name: "Standard errors", sub: "Seminar 3",
  blurb: R`How uncertain is $\hat\beta$? Variance rules → the sandwich formula → $\sigma^2(X'X)^{-1}$ → standard errors → $t$-tests.`,
  metaphor: R`Your coefficient is **one arrow** on a target. If you could redo the whole study with a fresh sample, the arrow would land somewhere slightly different. The **standard error** measures how widely those arrows would scatter: small se, tight cluster.`,
  sections: [
  { id: "omega", tags: ["omega"], title: R`$ee'$ and $\Omega$: the errors' fingerprint`, html: R`
<p>The <b>outer product</b> $ee'$ is $n\times n$. Its <b>diagonal</b> holds $e_i^2$ (how big each error is), and its <b>off-diagonal</b> holds $e_ie_j$ (whether errors move together).</p>
<p>The population version is $\Omega=\operatorname{Var}(\varepsilon\mid X)$:</p>
${W("omega", "Three kinds of Ω")}
${TRAP(R`One sample's $e_1e_2\neq0$ proves nothing. Even uncorrelated errors almost never multiply to exactly zero. Heteroskedasticity and autocorrelation are properties of the population $\Omega$.`)}` },
  { id: "varrules", tags: ["varrules"], title: "Variance rules", html: R`
${TB(["Rule", "Why"], [[R`$\operatorname{Var}(c)=0$`, "A constant doesn't vary"], [R`$\operatorname{Var}(Y+c)=\operatorname{Var}(Y)$`, "Moving everyone up 10 points doesn't change the spread"], [R`$\operatorname{Var}(aY)=a^2\operatorname{Var}(Y)$`, "Stretching is squared, so the sign disappears"], [R`$sd(aY+c)=|a|\,sd(Y)$`, "SD is the square root: no squaring"], [R`$\operatorname{Var}(aY+bZ)=a^2V_Y+b^2V_Z+2ab\,\operatorname{Cov}$`, R`watch the sign of $ab$`], [R`$\operatorname{Var}(Az\mid X)=A\operatorname{Var}(z\mid X)A'$`, R`the matrix "$a^2$" is a sandwich`]])}
${EX("Bank Q11", R`$\operatorname{Var}(2Y-Z)$ with $V_Y=4,V_Z=9,\operatorname{Cov}=1$: $a=2,b=-1$ gives $16+9+2(2)(-1)(1)=21$.`)}
${TRAP(R`$\operatorname{Var}(2Y-Z)$ is <b>not</b> $16-9$. Variances always add; only the covariance term can subtract.`)}` },
  { id: "vcov", tags: ["vcov"], title: R`Deriving $\operatorname{Var}(\hat\beta\mid X)$`, html: R`
<div class="stepper" style="--c: var(--c-s3)">
<div class="st"><span class="k">1</span><div>$\hat\beta-\beta=(X'X)^{-1}X'\varepsilon=A\varepsilon$, with $A=(X'X)^{-1}X'$ fixed given $X$.</div></div>
<div class="st"><span class="k">2</span><div>$\operatorname{Var}(\hat\beta\mid X)=\operatorname{Var}(A\varepsilon\mid X)=A\,\Omega\,A'$</div></div>
<div class="st"><span class="k">3</span><div>$=(X'X)^{-1}X'\,\Omega\,X(X'X)^{-1}$, the <b>sandwich</b>: bread–meat–bread.</div></div>
<div class="st"><span class="k">4</span><div>If $\Omega=\sigma^2I$: $\sigma^2(X'X)^{-1}X'X(X'X)^{-1}=\sigma^2(X'X)^{-1}$.</div></div></div>
<p>The result is $k\times k$. The <b>diagonal</b> holds each coefficient's variance; the off-diagonals hold covariances.</p>` },
  { id: "sigma2", tags: ["sigma2"], title: R`From $\hat\sigma^2$ to a standard error`, html: R`
<div class="mathblock">$$\hat\sigma^2=\frac{e'e}{n-k},\qquad \widehat{\operatorname{Var}}(\hat\beta_j)=\hat\sigma^2\,[(X'X)^{-1}]_{jj},\qquad se(\hat\beta_j)=\sqrt{\widehat{\operatorname{Var}}(\hat\beta_j)}$$</div>
${EX("Bank Q22–24", R`$e'e=150,\ n=80,\ k=5\Rightarrow\hat\sigma^2=150/75=2$. With $\hat\sigma^2=4$ and $[(X'X)^{-1}]_{22}=0.16$: variance $=0.64$, so $se=0.80$.`)}
${TRAP(R`$k$ counts the intercept. The usual wrong answers divide by $n$ (1.875) or take $\sqrt{0.16}=0.40$ without multiplying by $\hat\sigma^2$.`)}
<p>In Stata output, $\hat\sigma=$ <b>Root MSE</b>.</p>` },
  { id: "se", tags: ["se"], title: "What a standard error means (simulation)", html: R`
<p>The seminar simulation: the true model is $y=2+3x+u$. Draw many samples, run OLS on each, and look at the spread of the $\hat\beta_2$'s.</p>
${W("simse", "Repeat the study 1,000 times")}
${KEY("What shrinks the se", R`Smaller error variance $\sigma^2$, <b>more observations</b>, and <b>more spread in $X$</b> (a longer lever pins the slope down). Adding irrelevant or collinear regressors <b>raises</b> it. A standard error is never negative.`)}` },
  { id: "ttest", tags: ["ttest"], title: "The partial significance $t$-test", html: R`
<div class="mathblock">$$H_0:\beta_j=0\quad\text{vs}\quad H_1:\beta_j\neq0,\qquad t=\frac{\hat\beta_j}{se(\hat\beta_j)}$$</div>
<p>Reject $H_0$ if $|t|$ is large (roughly $>2$ at 5%) or, equivalently, if <b>$p<\alpha$</b>. It's "partial" because the other regressors are held constant.</p>
${W("ttest", "t-statistic and decision")}
${KEY("Reading the hypotheses in words", R`$H_0:\beta_2=0$: "$X_2$ has no effect on the expected value of $Y$". $H_1$: "$X_2$ <b>has</b> an effect". It's the <i>variable</i> that has the effect; $\beta_2$ is its size.`)}` },
  { id: "hetero", tags: ["hetero"], title: "Heteroskedasticity: what breaks, what doesn't", html: R`
${TB(["", "Under heteroskedasticity"], [["Coefficients $\\hat\\beta$", "Still unbiased (only needs $E(u\\mid X)=0$)"], ["Usual se $\\sigma^2(X'X)^{-1}$", "<b>Wrong</b>: it assumed $\\Omega=\\sigma^2I$"], ["$t$-tests, $p$-values", "Unreliable unless robust se are used"], ["$R^2$", "Still computable"]])}` },
  ],
  patterns: [
    { title: "Outer product and Ω patterns", qs: [1, 2, 3, 4, 5, 6, 7], recipe: R`Diagonal = variances (equal: homoskedastic; different: heteroskedastic). Off-diagonal ≠ 0: autocorrelation. One sample proves nothing.` },
    { title: "Variance and SD rules", qs: [8, 9, 10, 11, 12, 31, 36], recipe: R`Shift: no change. Scale: $a^2$ (SD: $|a|$). Two variables: $a^2V_Y+b^2V_Z+2ab\operatorname{Cov}$.` },
    { title: "Sandwich derivation", qs: [13, 14, 15, 16, 17, 18, 19, 20], recipe: R`$\hat\beta-\beta=A\varepsilon$, so $A\Omega A'$; with $\Omega=\sigma^2I$ you get $\sigma^2(X'X)^{-1}$ ($k\times k$).` },
    { title: R`$\hat\sigma^2$ and se calculations`, qs: [21, 22, 23, 24], recipe: R`$e'e/(n-k)$, then $\times$ the diagonal entry, then $\sqrt{\ }$.` },
    { title: "$t$-statistics and $p$-value decisions", qs: [26, 27, 28, 29, 30, 32, 34, 37, 39], recipe: R`$t=\hat\beta/se$. Reject if $p<\alpha$. The variable $X$ has the effect; $\beta$ is its size.` },
    { title: "Meaning of se and heteroskedasticity", qs: [25, 33, 35, 38], recipe: R`se = sampling uncertainty. It shrinks with $n$ and spread in $X$. Heteroskedasticity breaks the usual se, not unbiasedness.` },
  ],
  sheet: [[R`Var rules`, R`$\operatorname{Var}(aY+c)=a^2\operatorname{Var}(Y)$; $sd(aY+c)=|a|sd(Y)$`], [R`Two vars`, R`$a^2V_Y+b^2V_Z+2ab\operatorname{Cov}(Y,Z)$`], [R`General`, R`$(X'X)^{-1}X'\Omega X(X'X)^{-1}$`], [R`Homoskedastic`, R`$\sigma^2(X'X)^{-1}$`], [R`Error variance`, R`$\hat\sigma^2=e'e/(n-k)$`], [R`t-stat`, R`$t=\hat\beta_j/se(\hat\beta_j)$; reject if $p<\alpha$`]] },

/* ============================ S4 ============================ */
{ id: "s4", name: "Controls & model fit", sub: "Seminar 4",
  blurb: R`What "controlling for" really does (FWL), which controls belong in a model (causal diagrams), and how to judge fit ($R^2$) and joint significance ($F$).`,
  metaphor: R`Controlling for $z$ is like **noise-cancelling headphones**. First cancel out everything $z$ can explain in both $y$ and $x$. Whatever is left is $x$'s *own* voice, and the coefficient is how $y$'s leftover responds to $x$'s leftover.`,
  sections: [
  { id: "fwl", tags: ["fwl"], title: "Frisch–Waugh–Lovell: what “controlling for” means", html: R`
<div class="stepper" style="--c: var(--c-s4)">
<div class="st"><span class="k">1</span><div>Regress $x$ on $z$ and keep the residual $r_x$: the part of $x$ that $z$ <b>can't</b> explain.</div></div>
<div class="st"><span class="k">2</span><div>Regress $y$ on $z$ and keep the residual $r_y$.</div></div>
<div class="st"><span class="k">3</span><div>Regress $r_y$ on $r_x$. The slope <b>equals</b> $\hat\beta_1$ from $y=\beta_0+\beta_1x+\beta_2z+u$.</div></div></div>
${EX("Checked in real data (WAGE1)", R`reg wage educ exper gives educ = 0.6442721. The FWL route (partial exper out of both) gives exactly 0.6442721.`)}
${TRAP(R`FWL returns the <b>multiple-regression</b> coefficient (FoS: 0.097), not the simple one (0.219).`)}` },
  { id: "controls", tags: ["controls"], title: "Why coefficients move when you add a control", html: R`
<p>After adding $z$, OLS only uses the variation in $x$ that's <b>not shared</b> with $z$. Math and IELTS overlap (good students do well at both), so once IELTS is held fixed, Math's coefficient drops from 0.219 to 0.097.</p>
<p>Coefficients can also <b>rise</b>: in WAGE1, educ goes from 0.54 to 0.64 once exper is added, because more educated workers have less experience.</p>
${KEY("Interpretation", R`$\beta_1$ in a multiple regression is a <b>partial</b> (ceteris paribus) association, holding the other regressors fixed. It is causal only if the right controls are in and the wrong ones are out.`)}` },
  { id: "dag", tags: ["dag"], title: "Confounder, mediator, collider", html: R`
${W("dag", "The three shapes to recognise")}
${EX("Mediator arithmetic (bank Q12)", R`Total effect = direct + (product along the indirect path) $=1+0.8\times2=2.6$. Controlling for $M$ leaves only the direct effect, about 1.`)}
${W("collider", "Conditioning on a collider creates a fake link")}
${KEY("Rule of thumb", R`Choose controls by their <b>role in the causal diagram</b>, not because they're available or "make things significant".`)}` },
  { id: "r2", tags: ["r2"], title: "$R^2$: share of the variation explained", html: R`
<div class="mathblock">$$R^2=1-\frac{RSS}{TSS},\qquad RSS=\sum e_i^2,\quad TSS=\sum(y_i-\bar y)^2$$</div>
<p>Picture $TSS$ as a whole pie of variation in $y$. $RSS$ is the slice the model failed to explain. $R^2=0.40$ means <b>40% of the sample variation in $y$</b> is explained.</p>
${TRAP(R`$RSS/TSS$ (e.g. 0.60 or 0.49) is the <b>unexplained</b> share. Also: a high $R^2$ doesn't prove causality, a low $R^2$ doesn't make coefficients insignificant, and $R^2$ <b>never falls</b> when you add a regressor.`)}` },
  { id: "adjr2", tags: ["adjr2"], title: "Adjusted $R^2$", html: R`
<div class="mathblock">$$\bar R^2=1-\frac{RSS/(n-k)}{TSS/(n-1)}$$</div>
<p>It charges a "fee" for each regressor, so it can <b>fall</b> (even go negative) when a useless variable is added. It's always $\le R^2$ and still says nothing about causality.</p>
${EX("Bank Q23", R`$n=100,k=5,RSS=300,TSS=500$: $\frac{300/95}{500/99}=0.625$, so $\bar R^2=0.375$ (just below $R^2=0.40$).`)}` },
  { id: "ftest", tags: ["ftest"], title: "The overall $F$ test", html: R`
<div class="mathblock">$$H_0:\beta_1=\cdots=\beta_{k-1}=0,\qquad F=\frac{R^2/(k-1)}{(1-R^2)/(n-k)}$$</div>
<p>It asks whether all the slopes are jointly zero, i.e. whether the model explains nothing. Large $F$ (or small Prob > F) means reject.</p>
${EX("Bank Q25", R`$\frac{0.40/4}{0.60/95}=15.83$.`)}` },
  { id: "partialf", tags: ["partialf"], title: "The partial $F$ test", html: R`
<p>Tests a <b>group</b> of coefficients, e.g. $H_0:\beta_3=\beta_4=0$ ($q=2$ restrictions), while the other variables stay in the model.</p>
${TB(["Model", "Contains", R`$R^2$`], [["Unrestricted", "everything, including the tested variables", "larger"], ["Restricted", "drops the tested variables (imposes $H_0$)", "smaller"]])}
<div class="mathblock">$$F=\frac{(R^2_{ur}-R^2_r)/q}{(1-R^2_{ur})/(n-k_{ur})}$$</div>
<p>Reject if $F>F_{crit}$ or Prob > F $<\alpha$. Variables can be <b>jointly</b> significant even if none is individually significant.</p>
${W("fitcalc", "Fit and F calculator")}` },
  ],
  patterns: [
    { title: "FWL mechanics", qs: [1, 2, 3], recipe: R`Partial the <b>control</b> out of both $y$ and $x$, then regress residual on residual. The slope is the same as in the full regression.` },
    { title: "Interpreting controls", qs: [4, 5, 6, 7, 8], recipe: R`Partial association holding the others fixed. Coefficients move because shared variation is removed. Choose controls by causal role.` },
    { title: "Causal diagrams", qs: [9, 10, 11, 12, 13, 14, 15, 16, 17], recipe: R`$X\leftarrow C\to Y$ confounder (control it). $X\to M\to Y$ mediator (don't control it for the total effect). $X\to C\leftarrow Y$ collider (don't control it: a fake, usually negative, link appears).` },
    { title: "$R^2$ calculations and meaning", qs: [18, 19, 20, 21, 31, 32], recipe: R`$1-RSS/TSS$. It measures fit, not causation, and never falls when a regressor is added.` },
    { title: "Adjusted $R^2$", qs: [22, 23], recipe: R`$1-\frac{RSS/(n-k)}{TSS/(n-1)}$. It penalizes regressors.` },
    { title: "$F$ tests", qs: [24, 25, 26, 27, 28, 29, 30], recipe: R`Overall: all slopes $=0$, using $k-1$ and $n-k$. Partial: $q$ = number of restrictions. Reject if $F>F_{crit}$.` },
  ],
  sheet: [[R`FWL`, R`$\hat\beta_x$ = slope of $r_y$ on $r_x$ (both residualized on $z$)`], [R`Total effect`, R`direct + (product along indirect path)`], [R`$R^2$`, R`$1-RSS/TSS$`], [R`Adjusted`, R`$1-\frac{RSS/(n-k)}{TSS/(n-1)}$`], [R`Overall F`, R`$\frac{R^2/(k-1)}{(1-R^2)/(n-k)}$`], [R`Partial F`, R`$\frac{(R^2_{ur}-R^2_r)/q}{(1-R^2_{ur})/(n-k_{ur})}$`]] },

/* ============================ S5 ============================ */
{ id: "s5", name: "Dummies, interactions & functional form", sub: "Seminar 5",
  blurb: R`Reading coefficients correctly: group gaps, interactions (DiD, different slopes, RDD), changing units, logs and standardized variables.`,
  metaphor: R`A dummy is a **light switch** (on = 1, off = 0). The reference group is **home base**: every dummy coefficient tells you how far that group sits from home base.`,
  sections: [
  { id: "dummies", tags: ["dummies"], title: "Dummy variables and the reference group", html: R`
<p>With $J$ categories and an intercept, include <b>$J-1$ dummies</b>. The omitted one is the <b>reference (benchmark) group</b>, i.e. whoever has all the dummies $=0$.</p>
<div class="mathblock">$$\text{marks}=\beta_0+\beta_1\,\text{part\_time}+\beta_2\,\text{full\_time}+u$$</div>
<ul><li>$\beta_0$ = mean for <b>no job</b> (the reference)</li><li>$\beta_1$ = part-time <b>minus</b> no-job; $\beta_2$ = full-time <b>minus</b> no-job</li></ul>
${KEY("The dummy variable trap", R`All $J$ dummies + intercept: the dummies sum to 1 = the constant column, which is <b>perfect multicollinearity</b>. Fix it by dropping one category, <b>or</b> drop the intercept. Then each coefficient is that group's <b>own mean</b> (lecture: GE 102.29, GM 608.02, WH 42.89).`)}` },
  { id: "interact2", tags: ["interact2"], title: "Two dummies and their interaction", html: R`
<p>$Y=\beta_0+\beta_1D_1+\beta_2D_2+\beta_3(D_1D_2)+u$. The interaction is 1 <b>only</b> when both are 1. Plug in each case to get the four group means:</p>
${W("dummygrid", "The 2×2 table of group means (KIELMC numbers)")}
<p>$\beta_3$ is the <b>extra</b> effect when both switches are on: does the effect of $D_1$ depend on $D_2$?</p>` },
  { id: "did", tags: ["did"], title: "Difference-in-differences", html: R`
<div class="mathblock">$$\text{DiD}=(\bar Y_{T,after}-\bar Y_{C,after})-(\bar Y_{T,before}-\bar Y_{C,before})$$</div>
<p>Incinerator example: near-minus-far gap $=-18{,}824$ in 1978 and $-30{,}688$ in 1981, so DiD $=-30{,}688-(-18{,}824)=-11{,}864$. That is $\beta_3$ in reg rprice i.nearinc##i.y81.</p>
${W("did", "Parallel trends picture (KIELMC, real means)")}
${KEY("Identifying assumption", R`<b>Parallel trends</b>: without treatment, both groups would have changed by the same amount. The levels may differ (the first difference removes them).`)}` },
  { id: "interactc", tags: ["interactc"], title: "Dummy × continuous: different slopes", html: R`
<div class="mathblock">$$Y=\beta_0+\beta_1X+\beta_2D+\beta_3(XD)+u$$</div>
${TB(["Group", "Intercept", "Slope"], [[R`$D=0$`, R`$\beta_0$`, R`$\beta_1$`], [R`$D=1$`, R`$\beta_0+\beta_2$`, R`$\beta_1+\beta_3$`]])}
<p>$\beta_2$ <b>shifts</b> the line; $\beta_3$ <b>tilts</b> it (the change in slope). Without $XD$, both groups are forced to share one slope.</p>
${W("slopes", "Move the dials")}` },
  { id: "rdd", tags: ["rdd"], title: "Regression discontinuity (sharp RDD)", html: R`
<p>Treatment switches on at a cutoff of a running variable (age 21 for legal drinking). Center the running variable ($X_c=$ age − 21) and compare just below with just above:</p>
<div class="mathblock">$$Y=\beta_0+\beta_1X_c+\beta_2D+\beta_3(X_cD)+u$$</div>
<p>At $X_c=0$ the fitted values are $\beta_0$ and $\beta_0+\beta_2$, so <b>$\beta_2$ is the jump</b> at the cutoff ($\beta_3$ is the change in slope).</p>
${W("rdd", "Mortality jumps at 21 (AEJfigs, real data)")}
${KEY("Assumption", R`Without treatment, potential outcomes would change <b>smoothly</b> through the cutoff. Nothing else jumps at 21.`)}` },
  { id: "scaling", tags: ["scaling"], title: "Changing units of measurement", html: R`
${TB(["Change", "Slope", "se", R`$t$, $p$, $R^2$`], [[R`$Y^*=cY$`, R`$\times c$`, R`$\times c$`, "unchanged"], [R`$X^*=cX$`, R`$\div c$`, R`$\div c$`, "unchanged"]])}
${EX("Wage example (bank Q19–20)", R`$\widehat{Wage}=-3.96+0.595\,Educ$ (hourly). Weekly wage $=40\times$ hourly, so the slope is $0.595\times40=23.8$. Education in <b>decades</b>: one more decade = 10 more years, so $0.595\times10=5.95$.`)}
${TRAP(R`Ask "what does <b>one new unit</b> mean in old units?" A decade is 10 years, so <b>multiply</b> by 10. A month is 1/12 of a year, so divide.`)}` },
  { id: "logs", tags: ["logs"], title: "Logs and functional forms", html: R`
${TB(["Form", "Model", "Read $\\beta_1$ as"], [["Level–level", R`$Y=\beta_0+\beta_1X$`, R`+1 unit $X$ → $\beta_1$ units $Y$`], ["Log–level", R`$\ln Y=\beta_0+\beta_1X$`, R`+1 unit $X$ → $\approx100\beta_1\%$ in $Y$ (exact: $100(e^{\beta_1}-1)\%$)`], ["Level–log", R`$Y=\beta_0+\beta_1\ln X$`, R`+1% $X$ → $\beta_1/100$ units $Y$`], ["Log–log", R`$\ln Y=\beta_0+\beta_1\ln X$`, R`+1% $X$ → $\beta_1\%$ $Y$ (elasticity)`]])}
${KEY("Mnemonic", R`<b>Log on $Y$ → think %. Log on $X$ → think "1%".</b> Log–level: multiply by 100. Level–log: divide by 100. Log–log: read it as it is.`)}
${W("logs", "Interpretation translator")}
${TRAP(R`$\ln(0)$ is undefined. Compare $R^2$ only between models with the <b>same dependent variable</b> (wage vs ln(wage) are different things to explain). Read the direction right: the right-hand variable changes and the left-hand one responds.`)}` },
  { id: "std", tags: ["std"], title: "Standardized coefficients", html: R`
<div class="mathblock">$$z_X=\frac{X-\bar X}{s_X}$$</div>
<p>If $Y$ and $X$ are standardized, a coefficient of 0.48 means <b>+1 SD in $X$ → +0.48 SD in $Y$</b>. That lets you compare regressors measured in different units (compare absolute values).</p>
<p>The intercept is ≈0 (all means are 0), and $R^2$, $t$ and $p$ are <b>unchanged</b>. It's only a rescaling, so it fixes no bias.</p>` },
  ],
  patterns: [
    { title: "Dummies, benchmark group, trap", qs: [1, 2, 3, 4, 5, 31, 32, 35, 36], recipe: R`$J-1$ dummies; coefficients are gaps from the reference group (dummy $=0$). All $J$ + intercept is perfect multicollinearity. No intercept gives group means.` },
    { title: "Two-dummy interaction and DiD", qs: [6, 7, 8, 9, 10], recipe: R`Plug in 0/1 for each cell. DiD = after gap − before gap. Assumption: parallel trends.` },
    { title: "Dummy × continuous and RDD", qs: [11, 12, 13, 14, 15], recipe: R`$\beta_2$ = intercept shift (the jump at the cutoff in RDD). $\beta_3$ = slope change. Assumption: smooth outcomes at the cutoff.` },
    { title: "Units of measurement", qs: [16, 17, 18, 19, 20], recipe: R`$Y\times c$ → coefficient and se $\times c$. $X\times c$ → $\div c$. $t$, $p$, $R^2$ unchanged.` },
    { title: "Logs", qs: [21, 22, 23, 24, 25, 26, 27, 33, 37], recipe: R`Log–level $100\beta\%$. Level–log $\beta/100$ units. Log–log elasticity. Exact: $100(e^\beta-1)$.` },
    { title: "Standardized variables", qs: [28, 29, 30, 34, 38], recipe: R`SD-in, SD-out. Intercept ≈ 0. $R^2$ and $t$ unchanged.` },
  ],
  sheet: [[R`Dummies`, R`$J-1$ with an intercept; coefficient = gap vs reference`], [R`DiD`, R`$\beta_3$ = (after gap) − (before gap)`], [R`Slopes`, R`$D=1$: intercept $\beta_0+\beta_2$, slope $\beta_1+\beta_3$`], [R`Scaling`, R`$Y\times c$: $\hat\beta\times c$; $X\times c$: $\hat\beta\div c$`], [R`Logs`, R`log-lev $100\beta\%$; lev-log $\beta/100$; log-log $\beta\%$`], [R`Standardized`, R`$\beta^*$ in SD units; intercept ≈ 0`]] },

/* ============================ MIX ============================ */
{ id: "mix", name: "Reading Stata output", sub: "Combined questions",
  blurb: R`In the exam you'll get a screenshot of Stata output. These questions combine skills from every seminar, but they all come down to finding the right number and reading it the right way.`,
  metaphor: R`A Stata table is a **receipt**. The top-right block is the bill summary (sample size, $F$, $R^2$). Each line below is one item: its price (coefficient), how sure we are of it (std. err.), and whether it's really on the bill ($t$, $p$).`,
  sections: [
  { id: "stata-read", tags: ["stata-read", "stata-controls"], title: "Anatomy of a regress table", html: R`
<p>Click the highlighted parts of this real output (reg wage educ exper, WAGE1):</p>
${W("stataanat", "Tap a number to see what it is")}` },
  { id: "stata-ftest", tags: ["stata-ftest", "stata-fwl"], title: "test, ttest and summarize", html: R`
${TB(["Command", "What to read", "Decision"], [[`test x1 x2`, R`F( q, n−k ) and Prob > F`, R`Prob > F $<0.05$: jointly significant`], [`ttest y, by(g)`, R`the $t$ on the "diff = mean(0) − mean(1)" line; Pr(|T| > |t|) for two-sided`, R`$p<0.05$: the means differ`], [`sum x if g==0`, R`the Mean column for the group you want`, "Check which group is which: female==0 means men"]])}
${TRAP(R`For a joint test, never use the individual $p$-values. In WAGE1, fem_educ alone has $p=0.43$, yet the three interactions are jointly significant ($p=0.0002$).`)}` },
  { id: "stata-interact", tags: ["stata-interact", "stata-did", "stata-dummy", "stata-rdd"], title: "Factor variables: i., c., # and ##", html: R`
${TB(["Syntax", "Meaning"], [[`i.female`, "dummy/categorical; the output line 1.female is the gap vs the base (0)"], [`c.cigs`, "continuous variable"], [`i.a##i.b`, "main effects + interaction (the DiD-style model)"], [`i.a#i.b`, "interaction cells only (cell differences vs the base cell)"]])}
${EX("reg wage i.female##i.married (real output)", R`_cons 5.168 = single men. 1.married 2.815 = marriage premium for <b>men</b>. 1.female#1.married −2.861 = how much <b>smaller</b> that premium is for women. Married man = 5.168 + 2.815 = 7.98.`)}` },
  { id: "stata-logs", tags: ["stata-logs", "stata-std"], title: "Logs and standardized output", html: R`
<p>If the dependent variable is lwage or lbwght, multiply coefficients by 100 to get % (e.g. educ 0.0828 → 8.28%, married 0.0646 → 6.46%, cigs −0.00403 → −0.40%). If every variable starts with z, read coefficients in SD units and compare absolute values.</p>` },
  { id: "stata-checklist", tags: [], title: "A 30-second checklist", html: R`
<ol><li>What's the <b>dependent variable</b>? Logged or not, standardized or not, units (ounces, \$/hour)?</li>
<li>Which <b>row</b> does the question ask about? Watch for factor-variable labels like 1.female#1.married.</li>
<li>Which <b>column</b>: Coefficient, Std. err., $t$, P>|t|?</li>
<li>Significance: compare P>|t| (or Prob > F) with $\alpha$.</li>
<li>Translate into words with the right units and "holding other variables constant".</li></ol>` },
  ],
  patterns: [
    { title: "Find the right number", qs: [1, 2, 3, 8, 13, 16, 20, 21, 23], recipe: R`Mean/SD block, the coefficient vs se vs t columns, and the $R^2$ box.` },
    { title: "Significance decisions", qs: [6, 7, 15, 17, 26, 32], recipe: R`P>|t| for one coefficient; Prob > F from test for a group.` },
    { title: "Interpret with logs, dummies, standardized", qs: [4, 5, 10, 24, 25, 27], recipe: R`×100 for log $Y$; dummy = gap vs base; z-variables in SD units.` },
    { title: "Interactions, DiD, RDD", qs: [11, 12, 18, 19], recipe: R`Interaction = difference in effects. Add the base and the main effect for group predictions. over21 = the jump.` },
    { title: "Controls and FWL", qs: [9, 14, 22, 28, 29, 30, 31], recipe: R`Compare the coefficient before and after adding the control (direction matters). FWL residual regression = multiple-regression coefficient.` },
  ],
  sheet: [[R`$t$`, R`Coefficient ÷ Std. err.`], [R`Root MSE`, R`$\hat\sigma=\sqrt{RSS/(n-k)}$`], [R`F(df1, df2)`, R`df1 = $k-1$ (or $q$), df2 = $n-k$`], [R`Log $Y$`, R`coef × 100 = %`], [R`Interaction`, R`difference in an effect between groups`]] },
];
