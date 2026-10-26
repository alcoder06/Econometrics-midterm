"""Build everything from src/ and packs/.

    python build.py            # site + Claude artifacts
    python build.py --site     # only what GitHub Pages needs (index.html + packs/index.json)

Outputs:
  index.html            public site (GitHub Pages); loads packs/*.json listed in packs/index.json
  packs/index.json      list of published packs, generated from the files in packs/
  dist/artifact.html    your private Claude artifact: player with the econometrics pack embedded
  dist/creator.html     the Study Pack Creator artifact
"""
import base64
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
PACKS = ROOT / "packs"
KATEX = ROOT / "vendor" / "katex"

# Credit shown on every page. CREDIT_URL makes the name a link.
CREDIT_NAME = "alcoder"
CREDIT_URL = "https://github.com/alcoder06"
# GoatCounter account for anonymous visit counts on the public site only (artifacts block it).
ANALYTICS_CODE = "alcoder"

CDN = "https://cdnjs.cloudflare.com/ajax/libs"
KATEX_JS = [f"{CDN}/KaTeX/0.16.9/katex.min.js", f"{CDN}/KaTeX/0.16.9/contrib/auto-render.min.js"]
CREATOR_JS = [f"{CDN}/pdf.js/3.11.174/pdf.min.js", f"{CDN}/pdf.js/3.11.174/pdf.worker.min.js",
              "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"]
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=JetBrains+Mono:wght@400;600&family=Lexend:wght@400;500;600&display=swap">'
BRAND = ('<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="13" style="fill:var(--accent)"/>'
         '<line x1="7" y1="31" x2="33" y2="9" style="stroke:var(--sun);stroke-width:3;stroke-linecap:round"/>'
         '<circle cx="10.5" cy="25" r="3.2" style="fill:#fff"/><circle cx="17" cy="25.5" r="2.5" style="fill:#fff;opacity:.85"/>'
         '<circle cx="20.5" cy="17.5" r="3" style="fill:#fff"/><circle cx="27" cy="17" r="2.4" style="fill:#fff;opacity:.85"/>'
         '<circle cx="30" cy="10" r="2.8" style="fill:#fff"/></svg>')
CORE_JS = ["core/text.js", "core/widgets.js", "core/widgets_micro.js", "core/audio.js", "player/player.js"]


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def katex_css() -> str:
    css = read(KATEX / "katex.min.css")
    fonts = {p.stem: p for p in (KATEX / "fonts").glob("*.woff2")}

    def face(m):
        block = m.group(0)
        name = re.search(r"fonts/(KaTeX_[A-Za-z0-9-]+)\.woff2", block)
        if not name or name.group(1) not in fonts:
            return ""
        data = base64.b64encode(fonts[name.group(1)].read_bytes()).decode()
        return re.sub(r"src:[^;}]*", f'src:url(data:font/woff2;base64,{data}) format("woff2")', block)

    return re.sub(r"@font-face\{[^}]*\}", face, css)


def credit_html() -> str:
    name = f'<a href="{CREDIT_URL}" target="_blank" rel="noopener">{CREDIT_NAME}</a>' if CREDIT_URL else f"<b>{CREDIT_NAME}</b>"
    return f"<span>Developed by {name}</span>"


def inline_script(code: str, label: str) -> str:
    if "</script" in code.lower():
        raise SystemExit(f"{label} contains a closing script tag")
    return f"<script>\n{code}\n</script>"


def json_script(var: str, value) -> str:
    return inline_script(f"const {var} = " + json.dumps(value, ensure_ascii=False).replace("</", "<\\/") + ";", var)


def player_body(name: str, sub: str, hidden: bool = False) -> str:
    return (read(SRC / "player" / "body.html").replace("@@HIDDEN@@", " hidden" if hidden else "")
            .replace("@@BRANDNAME@@", name).replace("@@BRANDSUB@@", sub))


def page(title: str, css: list, body: str, ext_js: list, js: list) -> str:
    out = [f"<title>{title}</title>", '<meta name="claude:viewport-fit-sides" content="cover">', FONTS,
           f"<style>{katex_css()}</style>"]
    out += [f"<style>{read(SRC / c)}</style>" for c in css]
    out.append(body.replace("@@BRAND@@", BRAND).replace("@@CREDIT@@", credit_html()))
    out += [f'<script src="{u}"></script>' for u in ext_js]
    out += js
    return "\n".join(out)


def standalone(content: str, head_extra: str = "") -> str:
    return ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
            f"<meta name=\"author\" content=\"{CREDIT_NAME}\">\n"
            "<meta name=\"description\" content=\"Exam practice built from real question banks: theory by section, every question with difficulty levels, mock exams and progress tracking.\">\n"
            "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
            "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n"
            + head_extra + "</head>\n<body>\n" + content + "\n</body>\n</html>\n")


def build_index() -> list:
    PACKS.mkdir(exist_ok=True)
    entries = []
    for f in sorted(PACKS.glob("*.json")):
        if f.name == "index.json":
            continue
        try:
            p = json.loads(read(f))
            assert p.get("format", "").startswith("studypack/") and p.get("questions") and p.get("sections")
        except Exception as e:  # skip anything that isn't a valid pack rather than breaking the site
            print(f"  skipped {f.name}: not a valid study pack ({e})")
            continue
        entries.append({"id": p.get("id") or f.stem, "file": f.name, "title": p.get("title", f.stem), "subtitle": p.get("subtitle", ""),
                        "subject": p.get("subject", ""), "questions": len(p["questions"]), "sections": len(p["sections"]),
                        "updated": p.get("updated") or date.today().isoformat()})
    entries.sort(key=lambda e: (e["id"] != "econometrics", e["title"].lower()))
    (PACKS / "index.json").write_text(json.dumps({"packs": entries}, ensure_ascii=False, indent=1), encoding="utf-8")
    return entries


def build(site_only: bool):
    entries = build_index()
    core = [inline_script(read(SRC / p), p) for p in CORE_JS]
    analytics = (f'<script data-goatcounter="https://{ANALYTICS_CODE}.goatcounter.com/count" '
                 "data-goatcounter-settings='{\"no_onload\": true}' async src=\"https://gc.zgo.at/count.js\"></script>\n") if ANALYTICS_CODE else ""
    site = page("Exam Prep Packs", ["core/styles.css"], player_body("Exam Prep", "study packs"), KATEX_JS,
                core + [inline_script(read(SRC / "player" / "boot_site.js"), "boot_site.js")])
    (ROOT / "index.html").write_text(standalone(site, analytics), encoding="utf-8")
    print(f"index.html ({len(site.encode()) / 1024:.0f} KB), packs/index.json: {', '.join(e['id'] for e in entries) or 'no packs'}")
    if site_only:
        return
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    embedded = [json.loads(read(PACKS / e["file"])) for e in entries]
    art = page("Econometrics Midterm Prep", ["core/styles.css"], player_body("Exam Prep", "study packs"), KATEX_JS,
               core + [json_script("EMBEDDED_PACKS", embedded), inline_script(read(SRC / "player" / "boot_artifact.js"), "boot_artifact.js")])
    (dist / "artifact.html").write_text(art, encoding="utf-8")
    creator = page("Study Pack Creator", ["core/styles.css", "creator/creator.css"],
                   read(SRC / "creator" / "body.html") + "\n" + player_body("Preview", "as students see it", hidden=True),
                   KATEX_JS + CREATOR_JS,
                   core + [inline_script(read(SRC / "creator" / f), f) for f in ("pipeline.js", "creator.js", "boot.js")])
    (dist / "creator.html").write_text(creator, encoding="utf-8")
    print(f"dist/artifact.html ({len(art.encode()) / 1024:.0f} KB), dist/creator.html ({len(creator.encode()) / 1024:.0f} KB)")


if __name__ == "__main__":
    build("--site" in sys.argv)
