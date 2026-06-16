#!/usr/bin/env python3
"""Build a clean, text-first study-guide PDF from course.json (for NotebookLM).
Uses reportlab + Liberation Sans (full German Unicode: ä ö ü ß).
Run:  python3 build-pdf.py   ->   Deutsch-A2-Lernskript.pdf
"""
import json, re, html as H, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, "course.json"), encoding="utf-8"))
COURSE, ORDER = data["COURSE"], data["LESSON_ORDER"]

# ---- fonts ----
FB = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Lib", FB + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Lib-B", FB + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Lib-I", FB + "LiberationSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Lib-BI", FB + "LiberationSans-BoldItalic.ttf"))
registerFontFamily("Lib", normal="Lib", bold="Lib-B", italic="Lib-I", boldItalic="Lib-BI")

BRAND = colors.HexColor("#3a2db5")
GREEN = colors.HexColor("#0a7d4d")
GREY = colors.HexColor("#555555")

EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002190-\U000021FF"
    "\U00002B00-\U00002BFF\U0001F1E6-\U0001F1FF\U0000FE0F\U0000200D\U000024C2]",
    flags=re.UNICODE)


def rl(s, breaks=True):
    """HTML-ish source -> reportlab-safe text (plain, optional <br/>)."""
    s = EMOJI.sub("", str(s))
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)        # strip remaining tags
    s = H.unescape(s)                     # &rarr; &amp; -> chars
    s = H.escape(s, quote=False)          # re-escape & < > for reportlab
    s = s.replace("\n", "<br/>") if breaks else s.replace("\n", " ")
    return re.sub(r"[ \t]{2,}", " ", s).strip()


# ---- styles ----
def S(name, **kw):
    base = dict(fontName="Lib", fontSize=10.5, leading=15, textColor=colors.HexColor("#1a1a1a"))
    base.update(kw)
    return ParagraphStyle(name, **base)


st = {
    "title": S("title", fontName="Lib-B", fontSize=28, leading=32, alignment=1, textColor=BRAND),
    "sub": S("sub", fontSize=15, leading=20, alignment=1, textColor=GREY),
    "h1": S("h1", fontName="Lib-B", fontSize=19, leading=23, textColor=BRAND, spaceBefore=4, spaceAfter=8),
    "h2": S("h2", fontName="Lib-B", fontSize=14, leading=18, textColor=BRAND, spaceBefore=12, spaceAfter=4),
    "h3": S("h3", fontName="Lib-B", fontSize=12, leading=15, spaceBefore=8, spaceAfter=2),
    "body": S("body", spaceAfter=4),
    "small": S("small", fontSize=9, leading=12, textColor=GREY),
    "sol": S("sol", fontName="Lib-B", fontSize=10, leading=13, textColor=GREEN),
    "box": S("box", backColor=colors.HexColor("#f1effc"), borderColor=colors.HexColor("#b9b2ee"),
             borderWidth=0.6, borderPadding=7, spaceBefore=4, spaceAfter=6, leading=15),
    "tip": S("tip", backColor=colors.HexColor("#fdf6e0"), borderColor=colors.HexColor("#e7c66a"),
             borderWidth=0.6, borderPadding=7, spaceBefore=4, spaceAfter=6, leading=15),
    "cell": S("cell", fontSize=9.5, leading=12.5),
    "cellh": S("cellh", fontName="Lib-B", fontSize=9.5, leading=12.5),
    "exq": S("exq", spaceBefore=6, spaceAfter=1),
    "exlab": S("exlab", fontName="Lib-B", fontSize=9, leading=12, textColor=GREY, spaceBefore=6),
}

USABLE = A4[0] - 3.4 * cm  # left+right margins 1.7cm each
story = []


def P(text, style="body"):
    story.append(Paragraph(text, st[style]))


def grammar_table(b):
    head = [Paragraph(rl(h), st["cellh"]) for h in b["head"]]
    rows = [[Paragraph(rl(c), st["cell"]) for c in r] for r in b["rows"]]
    n = len(b["head"])
    w = USABLE / n
    t = Table([head] + rows, colWidths=[w] * n, repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e6fb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 4))


def grammar_block(b):
    t = b["t"]
    if t == "intro":
        P(rl(b["html"]))
    elif t == "rule":
        P(f"<b>Regel — {rl(b['title'])}:</b><br/>{rl(b['html'])}", "box")
    elif t == "tip":
        P(f"<b>Eselsbrücke / Tipp:</b> {rl(b['html'])}", "tip")
    elif t == "examples":
        P("Beispiele:", "exlab")
        for it in b["items"]:
            P(f"• {rl(it['de'])} <font color='#666666'>— {rl(it['en'])}</font>")
    elif t == "table":
        grammar_table(b)


TYPE = {"mc": "Multiple Choice", "fill": "Lücken füllen", "order": "Satz bauen", "match": "Zuordnen"}


def exercise(ex, i):
    P(f"Übung {i+1} ({TYPE.get(ex['t'], ex['t'])})", "exlab")
    if ex["t"] == "mc":
        P(rl(ex["q"]), "exq")
        for k, o in enumerate(ex["options"]):
            mark = " <font color='#0a7d4d'><b>(richtig)</b></font>" if k == ex["answer"] else ""
            P(f"&nbsp;&nbsp;– {rl(o)}{mark}")
        P(f"Lösung: {rl(ex['options'][ex['answer']])}", "sol")
    elif ex["t"] == "fill":
        P(rl(ex["q"]).replace("___", "_____"), "exq")
        P("Lösung: " + "  |  ".join(rl(a[0]) for a in ex["answers"]), "sol")
        if ex.get("hint"):
            P(f"Hinweis: {rl(ex['hint'])}", "small")
    elif ex["t"] == "order":
        P(f"Aufgabe: {rl(ex['q'])}", "exq")
        P("Wörter: " + " · ".join(rl(w) for w in ex["words"]))
        P(f"Lösung: {rl(ex['answer'])}", "sol")
    elif ex["t"] == "match":
        P(rl(ex["q"]), "exq")
        for a, bb in ex["pairs"]:
            P(f"&nbsp;&nbsp;{rl(a)} &rarr; <font color='#0a7d4d'>{rl(bb)}</font>")
    if ex.get("ex"):
        P(f"Erklärung: {rl(ex['ex'])}", "small")


# ================= DOCUMENT =================
# Cover
story.append(Spacer(1, 4 * cm))
P("Deutsch A2", "title")
P("Lern-Skript für die Prüfung", "sub")
story.append(Spacer(1, 0.8 * cm))
n_vocab = sum(len(COURSE["lessons"][i]["vocab"]) for i in ORDER)
n_ex = sum(len(COURSE["lessons"][i]["exercises"]) for i in ORDER)
P(f"Modul 1–3 + Bonus · {len(ORDER)} Lektionen · {n_vocab} Vokabeln · {n_ex} Übungen mit Lösungen", "small")
story.append(Spacer(1, 1 * cm))
P("<b>Für NotebookLM:</b> Lade dieses PDF als Quelle hoch. Du kannst dann zusammenfassen "
  "lassen, Quizfragen und eine Audio-Übersicht erstellen oder gezielt zu jedem Grammatikthema "
  "(Perfekt, weil, dass, wenn, Wechselpräpositionen ...) Fragen stellen. Jede Lektion enthält "
  "Erklärung, Tabellen, Beispiele mit Übersetzung, Vokabeln und Übungen samt Lösung.", "box")

# TOC
P("Inhalt", "h2")
toc = [[Paragraph("Lektion", st["cellh"]), Paragraph("Thema", st["cellh"]), Paragraph("Grammatik", st["cellh"])]]
for i in ORDER:
    L = COURSE["lessons"][i]
    toc.append([Paragraph(f"Lektion {L['number']}", st["cell"]),
                Paragraph(rl(L["theme"]), st["cell"]),
                Paragraph(rl(L["grammarTitle"]), st["cell"])])
tt = Table(toc, colWidths=[2.6 * cm, USABLE - 8.6 * cm, 6 * cm], repeatRows=1)
tt.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e6fb")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(tt)

# Lessons
for m in COURSE["modules"]:
    for i in m["lessons"]:
        L = COURSE["lessons"][i]
        story.append(PageBreak())
        P(f"Lektion {L['number']}: {rl(L['title'])}", "h1")
        P(f"<b>Modul:</b> {rl(m['title'])} &nbsp;·&nbsp; <b>Thema:</b> {rl(L['theme'])} "
          f"&nbsp;·&nbsp; <b>Grammatik:</b> {rl(L['grammarTitle'])}", "small")
        P("Grammatik", "h2")
        for b in L["grammar"]:
            grammar_block(b)
        P("Vokabeln", "h2")
        vrows = [[Paragraph("Deutsch", st["cellh"]), Paragraph("Englisch", st["cellh"]),
                  Paragraph("Beispielsatz", st["cellh"])]]
        for v in L["vocab"]:
            vrows.append([Paragraph(f"<b>{rl(v['de'])}</b>", st["cell"]),
                          Paragraph(rl(v["en"]), st["cell"]),
                          Paragraph(rl(v.get("ex", "")), st["cell"])])
        vt = Table(vrows, colWidths=[USABLE * 0.30, USABLE * 0.27, USABLE * 0.43], repeatRows=1)
        vt.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e6fb")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f5fd")]),
        ]))
        story.append(vt)
        P("Übungen mit Lösungen", "h2")
        for k, ex in enumerate(L["exercises"]):
            exercise(ex, k)

# Exam
story.append(PageBreak())
P("Prüfungssimulation (mit Lösungen)", "h1")
P("Gemischte Aufgaben aus allen Lektionen — ideal, um dich von NotebookLM abfragen zu lassen.", "small")
for k, ex in enumerate(COURSE["exam"]):
    exercise(ex, k)

# Cheat sheet
story.append(PageBreak())
P("Grammatik-Spickzettel (Kurzfassung)", "h1")
for i in ORDER:
    L = COURSE["lessons"][i]
    P(f"L{L['number']}: {rl(L['grammarTitle'])}", "h3")
    for b in L["grammar"]:
        if b["t"] == "rule":
            P(f"<b>{rl(b['title'])}:</b> {rl(b['html'])}", "box")
        elif b["t"] == "tip":
            P(rl(b["html"]), "tip")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Lib", 8)
    canvas.setFillColor(GREY)
    canvas.drawCentredString(A4[0] / 2, 1 * cm, f"Deutsch A2 — Lern-Skript   ·   Seite {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    os.path.join(HERE, "Deutsch-A2-Lernskript.pdf"), pagesize=A4,
    leftMargin=1.7 * cm, rightMargin=1.7 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm,
    title="Deutsch A2 — Lern-Skript", author="Deutsch A2 Bootcamp")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK ->", os.path.join(HERE, "Deutsch-A2-Lernskript.pdf"))
