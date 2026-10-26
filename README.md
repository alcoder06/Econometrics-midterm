# Exam Prep Packs

Practice sites built from real question banks. Each subject is a **study pack**: every question from the bank with its answer, an explanation and a difficulty level, plus theory pages, fresh-number versions of calculation questions, and a mock exam in the real format.

**Open it here: https://alcoder06.github.io/Econometrics-midterm/**

It works in any browser, on a laptop or a phone. There's nothing to install and no account to make. Pick a subject with **Change subject** in the sidebar.

![Learn page for Seminar 2](docs/screenshot.png)

## What's inside every subject

- **Learn**: one page per section, with a simple picture to remember the idea by, worked examples using the bank's own numbers, the traps the wrong options are built from, and a formula sheet.
- **Exercises**: every question, grouped by section, with a seminar badge, a difficulty level and an explanation of *why*.
- **By difficulty**: practise Easy, Medium or Hard questions across the sections you choose.
- **Fresh numbers**: calculation questions come back with new values, like the real exam. The method stays the same.
- **Fix-it deck**: every question you miss is saved, and leaves once you answer it correctly twice in a row.
- **Mock exam**: a full paper drawn like the real one, with an optional timer and a full review.
- **Progress**: mastery per section, accuracy by difficulty, your weakest topics and your mock history.
- Soft sounds for right and wrong answers, and a small ambient music player.

Your progress is saved in your own browser, separately for each subject, and never leaves it. The site counts anonymous visits with [GoatCounter](https://www.goatcounter.com) (no cookies, no personal data), such as how many people open each page or finish a mock exam.

## Subjects

| Subject | Questions | Notes |
|---|---|---|
| Econometrics Midterm (WIUT 5ECON012C) | 211 | Stata output reproduced from the real datasets. The FoS answer keys (Stata Q28, Q29, Q30, Q32) are inferred and marked **Key unverified**. |
| Intermediate Microeconomics (WIUT 5ECON010C) | 50 | The five seminar quizzes, each its own seminar, with interactive diagrams (price controls, tax incidence, price discrimination, Cournot/Stackelberg/Bertrand, cartels). The mock exam uses all 50. Four quiz figures weren't available and are redrawn to match the answer keys. |

Direct links open a subject straight away, e.g. [`#pack-microeconomics`](https://alcoder06.github.io/Econometrics-midterm/#pack-microeconomics) or [`#pack-econometrics`](https://alcoder06.github.io/Econometrics-midterm/#pack-econometrics).

New subjects are made with the Study Pack Creator: Claude reads the question bank, solves each question, re-solves it blind to catch mistakes, settles any disagreement with its strongest model, and flags anything uncertain for review before a pack is published. If you spot a wrong answer, please open an issue.

These are unofficial study tools and aren't affiliated with WIUT. The questions come from question banks shared with students.

## Adding a subject

Drop a pack file (`something.json`, exported from the Creator) into the [`packs`](packs) folder, either with **Add file → Upload files** on GitHub or with a commit. The workflow in `.github/workflows/pages.yml` rebuilds the site and its subject list, and the new subject is live about a minute later.

## Building from source

The site is plain HTML, CSS and JavaScript, combined into single pages by `build.py`:

```bash
python build.py          # index.html, packs/index.json, and the Claude artifacts in dist/
python build.py --site   # only what GitHub Pages needs
node tools/export_econ.js   # rebuild packs/econometrics.json from content/econometrics
```

- `src/player/`: the study app. Every page is driven by the loaded pack.
- `src/creator/`: the Study Pack Creator, which reads PDFs (pdf.js) and Word files (mammoth) and runs the AI stages.
- `src/core/`: shared text rendering (a safe Markdown dialect plus a whitelist sanitizer), sounds, and the interactive visuals.
- `content/econometrics/`: the hand-built econometrics content and the script that reproduces its Stata output.

Maths is rendered with [KaTeX](https://katex.org).

---

Built by **[alcoder](https://github.com/alcoder06)**.
