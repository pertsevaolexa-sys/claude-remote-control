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


def cell(s):
    return s.replace("|", "\\|")


lines = [
    "# Selling brief: four new case studies",
    "",
    "What each detail in the October 2026 newsletter sells, who it's for, the fact behind it, "
    "a line to reuse in emails, calls and posts, and the claim to avoid.",
    "",
    "Umbrella message: **One recycled panel, four different jobs.** "
    "Every fact comes from the four case-study PDFs. Check anything that isn't here before you use it.",
    "",
    "| # | Detail | For |",
    "|---|---|---|",
]
numbered = []
for prefix, _ in GROUPS:
    for b in [b for b in briefs if b["id"].startswith(prefix)]:
        numbered.append((prefix, len(numbered) + 1, b))
for _, i, b in numbered:
    lines.append(f"| {i} | {cell(b['detail'])} | {cell(b['for'])} |")

for prefix, title in GROUPS:
    lines += ["", f"## {title}"]
    for p, i, b in numbered:
        if p != prefix:
            continue
        lines += [
            "",
            f"### {i}. {b['detail']}",
            "",
            f"- **Sells:** {b['sells']}",
            f"- **For:** {b['for']}",
            f"- **Proof:** {b['proof']}",
            f"- **Say:** “{b['say']}”",
            f"- **Don't:** {b['dont']}",
        ]

out.write_text("\n".join(lines) + "\n")
print(f"{len(numbered)} briefs -> {out}")
