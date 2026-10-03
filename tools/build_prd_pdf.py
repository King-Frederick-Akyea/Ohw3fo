"""
Render docs/PRD.md to docs/PRD.pdf (Markdown -> styled HTML -> headless Chrome -> page numbers).
Usage: python tools/build_prd_pdf.py
Needs: pip install markdown pypdf reportlab, and Google Chrome or Microsoft Edge.
"""
import io
import os
import re
import subprocess
from pathlib import Path

import markdown
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "PRD.md"
HTML = ROOT / "docs" / "PRD.html"
PDF = ROOT / "docs" / "PRD.pdf"

BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; font-size: 10.2pt;
       line-height: 1.5; color: #1b1d1c; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always;
         position: relative; }
.cover .stripe { display: flex; height: 8px; width: 100%; margin-bottom: 28px; }
.cover .stripe span { flex: 1; }
.cover .kicker { font-size: 11pt; letter-spacing: .18em; text-transform: uppercase; color: #006b3f; font-weight: 700; }
.cover h1 { font-size: 40pt; margin: 8px 0 4px; border: 0; color: #111; }
.cover .sub { font-size: 16pt; color: #444; margin: 0 0 28px; }
.cover .meta { font-size: 10.5pt; color: #333; border-left: 4px solid #f2b705; padding-left: 14px; }
.cover .meta div { margin: 3px 0; }
.cover .quote { margin-top: 40px; font-size: 13pt; font-style: italic; color: #006b3f; }
h1 { font-size: 21pt; color: #111; border-bottom: 3px solid #006b3f; padding-bottom: 4px; margin: 0 0 12px; }
h2 { font-size: 15pt; color: #006b3f; margin: 22px 0 8px; padding-top: 4px; border-top: 1px solid #e3e1da;
     page-break-after: avoid; }
h3 { font-size: 12pt; margin: 16px 0 6px; color: #1b1d1c; page-break-after: avoid; }
h4 { font-size: 11pt; margin: 14px 0 4px; color: #8a5a00; page-break-after: avoid; }
p { margin: 6px 0; }
ul, ol { margin: 4px 0 8px; padding-left: 20px; }
li { margin: 2px 0; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 8.9pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #006b3f; color: #fff; text-align: left; padding: 5px 6px; font-weight: 600; }
td { border-bottom: 1px solid #e3e1da; padding: 4px 6px; vertical-align: top; }
tr:nth-child(even) td { background: #f7f6f2; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 8.6pt; background: #f0efe9; padding: 0 3px;
       border-radius: 3px; }
pre { background: #f4f3ee; border: 1px solid #e3e1da; border-left: 4px solid #006b3f; padding: 10px 12px;
      font-size: 8.2pt; line-height: 1.35; overflow: hidden; white-space: pre-wrap; page-break-inside: avoid;
      border-radius: 6px; }
pre code { background: none; padding: 0; font-size: inherit; }
blockquote { margin: 10px 0; padding: 8px 14px; border-left: 4px solid #f2b705; background: #fff8e1; color: #333;
             border-radius: 0 6px 6px 0; }
blockquote p { margin: 2px 0; }
hr { border: 0; border-top: 1px solid #e3e1da; margin: 16px 0; }
strong { color: #111; }
a { color: #006b3f; text-decoration: none; }
"""

COVER = """
<section class="cover">
  <div class="stripe"><span style="background:#ce1126"></span><span style="background:#f2b705"></span><span style="background:#006b3f"></span></div>
  <div class="kicker">Product Requirements Document</div>
  <h1>Ɔhwɛfo</h1>
  <p class="sub">A Ghana-aware safety layer for the SecureAI Guard</p>
  <div class="meta">
    <div><strong>Team:</strong> Neuralynx</div>
    <div><strong>Event:</strong> SecureAI Hackathon 2026, CAIRLab-KNUST, Challenge 3</div>
    <div><strong>Version:</strong> 1.1 · 3 October 2026</div>
    <div><strong>Submission:</strong> 4 October 2026 · <strong>Demo Day:</strong> 5 October 2026</div>
  </div>
  <p class="quote">"The SecureAI Guard is good. It just doesn't understand Ghana. Ɔhwɛfo teaches it."</p>
</section>
"""


def build_html():
    text = SRC.read_text(encoding="utf-8")
    # The cover page replaces the title block (everything before "## How to read this document").
    body_md = text[text.index("## How to read this document"):]
    body = markdown.markdown(body_md, extensions=["tables", "fenced_code", "sane_lists"])
    # Each numbered top-level section starts on a new page for readability of long sections.
    body = re.sub(r"<h2>(\d+\. |Appendix )", r'<h2 style="page-break-before:always;border-top:0">\1', body)
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ɔhwɛfo PRD</title>
<style>{CSS}</style></head><body>{COVER}{body}</body></html>"""
    HTML.write_text(html, encoding="utf-8")


def print_pdf(tmp_pdf):
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        raise SystemExit("Chrome or Edge not found")
    subprocess.run([browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={tmp_pdf}", HTML.resolve().as_uri()],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)


def add_page_numbers(src_pdf, out_pdf):
    reader = PdfReader(str(src_pdf))
    writer = PdfWriter()
    total = len(reader.pages)
    for i, page in enumerate(reader.pages):
        if i > 0:  # no number on the cover
            w, h = float(page.mediabox.width), float(page.mediabox.height)
            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=(w, h))
            c.setFont("Helvetica", 7.5)
            c.setFillGray(0.45)
            c.drawString(45, 28, "Ohwefo PRD - Team Neuralynx - SecureAI Hackathon 2026")
            c.drawRightString(w - 45, 28, f"Page {i + 1} of {total}")
            c.save()
            buf.seek(0)
            page.merge_page(PdfReader(buf).pages[0])
        writer.add_page(page)
    writer.add_metadata({"/Title": "Ohwefo - Product Requirements Document", "/Author": "Team Neuralynx"})
    with open(out_pdf, "wb") as f:
        writer.write(f)


if __name__ == "__main__":
    build_html()
    tmp = PDF.with_suffix(".tmp.pdf")
    print_pdf(tmp)
    add_page_numbers(tmp, PDF)
    tmp.unlink()
    HTML.unlink()
    print(f"Wrote {PDF} ({len(PdfReader(str(PDF)).pages)} pages)")
