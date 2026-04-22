"""Convert GUIDE.md to a nicely formatted PDF."""
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether,
)
from reportlab.lib.enums import TA_LEFT

import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else "GUIDE.md"
OUT = sys.argv[2] if len(sys.argv) > 2 else "OduDoc-Guide.pdf"
TITLE = sys.argv[3] if len(sys.argv) > 3 else TITLE

styles = getSampleStyleSheet()

h1 = ParagraphStyle(
    "h1", parent=styles["Heading1"], fontSize=20, leading=26,
    spaceBefore=18, spaceAfter=10, textColor=colors.HexColor("#0d5c63"),
)
h2 = ParagraphStyle(
    "h2", parent=styles["Heading2"], fontSize=15, leading=20,
    spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#0d5c63"),
)
h3 = ParagraphStyle(
    "h3", parent=styles["Heading3"], fontSize=12, leading=16,
    spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#1a7a85"),
)
body = ParagraphStyle(
    "body", parent=styles["BodyText"], fontSize=10.5, leading=14.5,
    alignment=TA_LEFT, spaceAfter=6,
)
bullet = ParagraphStyle(
    "bullet", parent=body, leftIndent=18, bulletIndent=6, spaceAfter=3,
)
code = ParagraphStyle(
    "code", parent=body, fontName="Courier", fontSize=9, leading=12,
    backColor=colors.HexColor("#f4f4f4"), leftIndent=8, rightIndent=8,
    borderColor=colors.HexColor("#dddddd"), borderWidth=0.5, borderPadding=4,
)
meta = ParagraphStyle(
    "meta", parent=body, textColor=colors.HexColor("#666666"), fontSize=9,
)


def inline(s: str) -> str:
    """Convert a line of markdown inline syntax to reportlab XML."""
    # escape XML specials first
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # stash inline code with placeholders so * inside code isn't parsed as italic
    codes = []
    def stash(m):
        codes.append(m.group(1))
        return f"\x00CODE{len(codes)-1}\x00"
    s = re.sub(r"`([^`]+)`", stash, s)
    # bold
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    # italic
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", s)
    # links: [text](url)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<link href="\2" color="#0d5c63"><u>\1</u></link>', s)
    # restore code
    def restore(m):
        idx = int(m.group(1))
        return f'<font name="Courier" color="#b5275c">{codes[idx]}</font>'
    s = re.sub(r"\x00CODE(\d+)\x00", restore, s)
    return s


def parse_table(lines, start):
    """Parse a markdown table starting at `start`. Returns (flowable, next_index)."""
    header = [c.strip() for c in lines[start].strip().strip("|").split("|")]
    # skip separator row (start+1)
    rows = []
    i = start + 2
    while i < len(lines) and lines[i].strip().startswith("|"):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        rows.append(cells)
        i += 1

    # build paragraph cells so inline formatting works
    def cell(text):
        return Paragraph(inline(text), ParagraphStyle("cell", parent=body, fontSize=9, leading=12))

    data = [[cell(c) for c in header]] + [[cell(c) for c in row] for row in rows]
    # even column widths
    ncols = len(header)
    usable = 17 * cm
    col_w = [usable / ncols] * ncols
    tbl = Table(data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d5c63")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f9fa")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl, i


def convert():
    with open(SRC, "r", encoding="utf-8") as f:
        text = f.read()

    lines = text.split("\n")
    story = []
    i = 0
    in_code = False
    code_buf = []

    while i < len(lines):
        line = lines[i]

        # fenced code
        if line.strip().startswith("```"):
            if in_code:
                story.append(Paragraph(
                    "<br/>".join(
                        l.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
                        for l in code_buf
                    ) or "&nbsp;",
                    code,
                ))
                story.append(Spacer(1, 4))
                code_buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # horizontal rule
        if re.match(r"^-{3,}\s*$", line):
            story.append(Spacer(1, 6))
            i += 1
            continue

        # table
        if line.strip().startswith("|") and i + 1 < len(lines) and re.match(r"^\|[-:\s|]+\|?\s*$", lines[i + 1]):
            tbl, ni = parse_table(lines, i)
            story.append(KeepTogether([tbl, Spacer(1, 8)]))
            i = ni
            continue

        # headings
        if line.startswith("# "):
            story.append(Paragraph(inline(line[2:].strip()), h1))
            i += 1
            continue
        if line.startswith("## "):
            story.append(Paragraph(inline(line[3:].strip()), h2))
            i += 1
            continue
        if line.startswith("### "):
            story.append(Paragraph(inline(line[4:].strip()), h3))
            i += 1
            continue

        # bullet
        m = re.match(r"^[\-\*]\s+(.*)$", line)
        if m:
            story.append(Paragraph(inline(m.group(1)), bullet, bulletText="•"))
            i += 1
            continue

        # numbered
        m = re.match(r"^\d+\.\s+(.*)$", line)
        if m:
            story.append(Paragraph(inline(m.group(1)), bullet, bulletText="1."))
            i += 1
            continue

        # blank line
        if not line.strip():
            story.append(Spacer(1, 4))
            i += 1
            continue

        # plain paragraph — accumulate consecutive non-special lines
        para = [line]
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if (not nxt.strip() or nxt.startswith("#") or nxt.strip().startswith("```")
                    or nxt.strip().startswith("|") or re.match(r"^[\-\*]\s+", nxt)
                    or re.match(r"^\d+\.\s+", nxt) or re.match(r"^-{3,}\s*$", nxt)):
                break
            para.append(nxt)
            j += 1
        story.append(Paragraph(inline(" ".join(para)), body))
        i = j

    doc = SimpleDocTemplate(
        OUT, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=1.8 * cm, bottomMargin=1.8 * cm,
        title=TITLE,
        author="OduDoc",
    )

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#888888"))
        canvas.drawString(2 * cm, 1 * cm, TITLE)
        canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Page {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    convert()
