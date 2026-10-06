"""Render the selling briefs (JSON) into a Markdown cheat sheet.

usage: python3 build_brief.py 2026-10-case-studies/briefs.json 2026-10-case-studies/selling-brief.md
"""
import json
import sys
from pathlib import Path

briefs = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])

GROUPS = [
    ("x", "Across the newsletter"),
    ("b", "De Bijenkorf, Amsterdam · Retail"),
    ("h", "Henriette Stadthotel, Vienna · Hotel"),
    ("o", "Orion, Paris · Workplace"),
    ("d", "ONE DUST Studio, Taipei · Design studio"),
]


QUOTES = "\u201c\u201d\""


def one_line(s):
    return " ".join(s.split())


def cell(s):
    return one_line(s).replace("|", "\\|")


lines = [
    "# Selling brief: four new case studies",
    "",
    "What each detail in the October 2026 newsletter sells, who it is for, the fact behind it, "
    "a line to reuse in sales emails, calls and posts, and the overclaim to avoid. "
    "Umbrella message: **One recycled panel, four different jobs.**",
    "",
    "Every proof comes from the four case-study PDFs (De Bijenkorf, Henriette Stadthotel, Orion, ONE DUST Studio). "
    "If a claim isn't here, check it before using it.",
    "",
    "## At a glance",
    "",
    "| # | Detail | What it sells | For |",
    "|---|---|---|---|",
]
n = 0
numbered = []
for prefix, title in GROUPS:
    for b in [b for b in briefs if b["id"].startswith(prefix)]:
        n += 1
        numbered.append((prefix, n, b))
        lines.append(f"| {n} | {cell(b['detail'])} | {cell(b['sells'])} | {cell(b['audience'])} |")

for prefix, title in GROUPS:
    lines += ["", f"## {title}"]
    for p, i, b in numbered:
        if p != prefix:
            continue
        lines += [
            "",
            f"### {i}. {one_line(b['detail'])}",
            "",
            f"- **In the newsletter:** “{one_line(b['in_newsletter']).strip(QUOTES)}”",
            f"- **Sells:** {one_line(b['sells'])}",
            f"- **For:** {one_line(b['audience'])}",
            f"- **Proof:** {one_line(b['proof'])}",
            f"- **Say it like this:** “{one_line(b['say_it']).strip(QUOTES)}”",
            f"- **Don't say:** {one_line(b['dont_say'])}",
        ]

out.write_text("\n".join(lines) + "\n")
print(f"{n} briefs -> {out}")
