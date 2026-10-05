"""Builds tests/fixtures/por-coursework.pdf: a résumé laid out like a typical LaTeX/Word template
(right-aligned dates, CAPS headings, bullets, a Positions of Responsibility and a Coursework section)."""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import sys
sys.path.insert(0, ".")
text = open("tests/fixtures/por-coursework.txt", encoding="utf8").read().split("\n")
c = canvas.Canvas("tests/fixtures/por-coursework.pdf", pagesize=A4)
c.setTitle("Fixture résumé")
W, H = A4
y = H - 50
for line in text:
    if y < 50:
        c.showPage(); y = H - 50
    if "\t" in line:
        left, right = line.split("\t", 1)
        c.setFont("Helvetica-Bold", 10); c.drawString(50, y, left)
        c.setFont("Helvetica", 10); c.drawRightString(W - 50, y, right)
    elif line.isupper() and len(line) < 40:
        y -= 6; c.setFont("Helvetica-Bold", 11); c.drawString(50, y, line)
    elif line.startswith("• "):
        c.setFont("Helvetica", 9); c.drawString(58, y, line)
    else:
        c.setFont("Helvetica", 10); c.drawString(50, y, line)
    y -= 14
c.linkURL("https://github.com/example-user", (50, H - 80, 150, H - 60))
c.save()
