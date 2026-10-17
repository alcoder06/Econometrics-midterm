"""Build the single-page site.

    python build.py

Writes:
  dist/artifact.html  page content only (the Artifact publisher adds the <html>/<head> skeleton)
  index.html          a complete standalone page you can open straight from disk
"""
import base64
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
KATEX = ROOT / "vendor" / "katex"

BRAND = ('<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="13" style="fill:var(--accent)"/>'
         '<line x1="7" y1="31" x2="33" y2="9" style="stroke:var(--sun);stroke-width:3;stroke-linecap:round"/>'
         '<circle cx="10.5" cy="25" r="3.2" style="fill:#fff"/><circle cx="17" cy="25.5" r="2.5" style="fill:#fff;opacity:.85"/>'
         '<circle cx="20.5" cy="17.5" r="3" style="fill:#fff"/><circle cx="27" cy="17" r="2.4" style="fill:#fff;opacity:.85"/>'
         '<circle cx="30" cy="10" r="2.8" style="fill:#fff"/></svg>')

# Credit shown on every page (footer + desktop sidebar). Put your GitHub/portfolio URL in CREDIT_URL to make the name a link.
CREDIT_NAME = "alcoder"
CREDIT_URL = "https://github.com/alcoder06"


def credit_html() -> str:
    name = f'<a href="{CREDIT_URL}" target="_blank" rel="noopener">{CREDIT_NAME}</a>' if CREDIT_URL else f"<b>{CREDIT_NAME}</b>"
    return f"<span>Developed by {name}</span>"


SCRIPT_ORDER = ["q1.js", "q2.js", "q3.js", "gen.js", "learn.js", "widgets.js", "audio.js", "app.js"]


def katex_css() -> str:
    css = (KATEX / "katex.min.css").read_text(encoding="utf-8")
    fonts = {p.stem: p for p in (KATEX / "fonts").glob("*.woff2")}

    def face(m):
        block = m.group(0)
        name = re.search(r"fonts/(KaTeX_[A-Za-z0-9-]+)\.woff2", block)
        if not name or name.group(1) not in fonts:
            return ""  # font not bundled: drop the rule so nothing requests a blocked URL
        data = base64.b64encode(fonts[name.group(1)].read_bytes()).decode()
        return re.sub(r"src:[^;}]*", f'src:url(data:font/woff2;base64,{data}) format("woff2")', block)

    return re.sub(r"@font-face\{[^}]*\}", face, css)


def build():
    stata = json.loads((ROOT / "data" / "stata_outputs.json").read_text(encoding="utf-8"))
    data_js = "const STATA_OUT = " + json.dumps(stata, ensure_ascii=False).replace("</", "<\\/") + ";"
    scripts = [f"<script>\n{data_js}\n</script>"]
    for name in SCRIPT_ORDER:
        code = (SRC / name).read_text(encoding="utf-8")
        if "</script" in code.lower():
            raise SystemExit(f"{name} contains a closing script tag")
        scripts.append(f"<script>\n{code}\n</script>")

    page = (SRC / "shell.html").read_text(encoding="utf-8")
    page = page.replace("/*@@KATEX_CSS@@*/", katex_css())
    page = page.replace("/*@@APP_CSS@@*/", (SRC / "styles.css").read_text(encoding="utf-8"))
    page = page.replace("@@BRAND@@", BRAND)
    page = page.replace("@@CREDIT@@", credit_html())
    page = page.replace("@@SCRIPTS@@", "\n".join(scripts))

    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "artifact.html").write_text(page, encoding="utf-8")

    standalone = (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
        f"<meta name=\"author\" content=\"{CREDIT_NAME}\">\n"
        "<meta name=\"description\" content=\"Econometrics midterm practice: theory by seminar, every question-bank MCQ with difficulty levels, mock exams and progress tracking.\">\n"
        "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
        "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n"
        "</head>\n<body>\n" + page + "\n</body>\n</html>\n"
    )
    (ROOT / "index.html").write_text(standalone, encoding="utf-8")
    kb = len(page.encode("utf-8")) / 1024
    print(f"built dist/artifact.html and index.html ({kb:.0f} KB)")


if __name__ == "__main__":
    build()
