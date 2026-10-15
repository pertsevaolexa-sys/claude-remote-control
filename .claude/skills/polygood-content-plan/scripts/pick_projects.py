#!/usr/bin/env python3
"""
List Polygood projects that can be featured in social posts.

Reads the case tracker's catalog (polygood-case-tracker/data/catalog.json,
found by walking up from the working folder) or, failing that, the snapshot
bundled with this skill. Groups projects by whether social use is cleared:

  ready  - social media "yes" in Notion, not NDA or waiting on rights
  check  - social media not recorded, professional photos exist,
           not NDA or waiting on rights; ask before posting
Projects marked social "no", NDA or "needs rights" are never listed.
"""

import argparse
import json
import re
from pathlib import Path

SNAPSHOT = Path(__file__).resolve().parent.parent / "assets" / "projects-snapshot.json"
CATALOG = Path("polygood-case-tracker") / "data" / "catalog.json"
BLOCKED_STATUS = {"nda", "restricted", "not_project"}


def find_catalog(explicit):
    if explicit:
        return Path(explicit)
    here = Path.cwd()
    for folder in [here, *here.parents]:
        if (folder / CATALOG).exists():
            return folder / CATALOG
    return SNAPSHOT


def group(project):
    if project.get("status") in BLOCKED_STATUS or project.get("social") == "no":
        return None
    if project.get("social") == "yes":
        return "ready"
    if project.get("pro"):
        return "check"
    return None


def clean(text):
    """Keep credits readable: drop HTML tags, emails and phone numbers."""
    text = re.sub(r"<[^>]+>", "", text or "")
    text = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "", text)
    text = re.sub(r"\b(call/text|call|text|phone|tel)\s*:\s*", "", text, flags=re.I)
    text = re.sub(r"\+?\d[\d\s()-]{7,}\d", "", text)
    return re.sub(r"\s{2,}", " ", text).strip(" ;,")


def row(p):
    uses = ", ".join(p.get("uses") or []) or "-"
    patterns = ", ".join(p.get("patterns") or []) or "-"
    on_ig = "yes" if p.get("ig") else "no"
    site = p.get("siteUrl") or "-"
    notes = "; ".join(x for x in [clean(p.get("credits")), clean(p.get("rights"))] if x) or "-"
    return f"| {p.get('name')} | {p.get('cat') or '-'} | {p.get('country') or '-'} | {uses} | {patterns} | {on_ig} | {site} | {notes} |"


def main():
    parser = argparse.ArgumentParser(description="Polygood projects usable for social content")
    parser.add_argument("--catalog", help="Path to catalog.json (default: find it, else use the bundled snapshot)")
    parser.add_argument("--category", help="Only this category, e.g. Retail or Hospitality")
    parser.add_argument("--not-on-instagram", action="store_true",
                        help="Leave out projects that already have an Instagram post linked in Notion")
    parser.add_argument("--limit", type=int, default=25, help="Max projects per group (default 25)")
    args = parser.parse_args()

    path = find_catalog(args.catalog)
    data = json.loads(path.read_text())
    projects = data["projects"]
    print(f"Source: {path} (updated {data.get('updated', 'unknown')}, {len(projects)} projects)\n")

    groups = {"ready": [], "check": []}
    for p in projects:
        g = group(p)
        if not g:
            continue
        if args.category and (p.get("cat") or "").lower() != args.category.lower():
            continue
        if args.not_on_instagram and p.get("ig"):
            continue
        groups[g].append(p)

    titles = {
        "ready": "Cleared for social media (credit the people listed)",
        "check": "Social use not recorded - professional photos exist, ask before posting",
    }
    for key in ("ready", "check"):
        items = sorted(groups[key], key=lambda p: (bool(p.get("ig")), not p.get("siteUrl"), p.get("name") or ""))
        print(f"## {titles[key]}: {len(items)}\n")
        if not items:
            print("None.\n")
            continue
        print("| Project | Category | Country | Uses | Patterns | Already on Instagram | Website case | Credits and rights |")
        print("|---|---|---|---|---|---|---|---|")
        for p in items[: args.limit]:
            print(row(p))
        if len(items) > args.limit:
            print(f"\n{len(items) - args.limit} more not shown (raise --limit).")
        print()


if __name__ == "__main__":
    main()
