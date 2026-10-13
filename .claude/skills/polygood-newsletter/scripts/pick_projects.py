#!/usr/bin/env python3
"""Shortlist Polygood projects for a newsletter from the Notion project catalogue.

Reads polygood-case-tracker/data/catalog.json (or --catalog PATH), filters by
region, category and colour (pattern), leaves out projects that can't be
published, and ranks the rest by how ready they are for an email: a website
case to link to, professional photos, publishing rights, recency.

Examples:
  python3 pick_projects.py --region benelux --limit 8
  python3 pick_projects.py --region all --category Hospitality --pattern "Sapphire Terrazzo"
  python3 pick_projects.py --region dach --json
"""

import argparse
import json
import re
import sys
from pathlib import Path

REGIONS = {
    "benelux": {"Netherlands", "Belgium", "Luxembourg"},
    "dach": {"Germany", "Austria", "Switzerland"},
    "france": {"France"},
    "uk": {"UK", "Ireland"},
    "us": {"USA"},
    "nordics": {"Norway", "Sweden", "Denmark", "Finland", "Iceland"},
    "south": {"Spain", "Italy", "Portugal", "Malta", "Croatia", "Greece"},
    "middle-east": {"UAE", "Saudi Arabia", "Qatar"},
    "asia": {"Japan", "Taiwan", "India", "China", "Hong Kong", "Singapore"},
}

# Notion spellings that differ from polygood.com product names.
PATTERN_FIXES = {
    "white terazzo": "White Terrazzo",
    "black lolipop": "Black Lollipop",
    "emerald ghost": "Emerald Ghost",
    "ice lollypop": "Ice Lollipop",
    "coral reef": "Coral Reef",
    "glaze sprinkes": "Glaze Sprinkles",
}

BLOCKED_STATUSES = {"nda", "restricted", "not_project"}
RIGHTS_BLOCKERS = re.compile(
    r"expired|do not share|no permission|not to be used|only for internal|intended only",
    re.IGNORECASE,
)


def find_catalog(explicit):
    if explicit:
        path = Path(explicit)
        if not path.is_file():
            sys.exit(f"Catalogue not found: {path}")
        return path
    here = Path.cwd().resolve()
    script_parents = Path(__file__).resolve().parents
    repo_guess = [script_parents[4]] if len(script_parents) > 4 else []
    for base in [here, *here.parents, *repo_guess]:
        candidate = base / "polygood-case-tracker" / "data" / "catalog.json"
        if candidate.is_file():
            return candidate
    sys.exit(
        "Couldn't find polygood-case-tracker/data/catalog.json. "
        "Pass --catalog PATH, or ask the user which projects to feature."
    )


def clean_pattern(name):
    return PATTERN_FIXES.get(name.strip().lower(), name.strip())


def clean_name(name):
    # Drop photo and licence notes such as "(P. Johannsen)" or "- Licensed Photos".
    name = re.sub(r"\s*-\s*Licensed Photos\s*$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s*\((?:[A-Z]\. ?[A-Za-z]+|[a-z0-9.-]+\.[a-z]{2,})\)\s*$", "", name)
    return name.strip()


def why_blocked(project):
    if project.get("status") in BLOCKED_STATUSES:
        return f"status is {project['status']}"
    rights = project.get("rights") or ""
    if RIGHTS_BLOCKERS.search(rights):
        return f"rights: {rights[:80]}"
    note = project.get("note") or ""
    if re.search(r"expired", note, re.IGNORECASE):
        return f"note: {note[:80]}"
    return None


def clearance(project):
    """Whether the project can go in the default copy or only as an optional swap."""
    if project.get("siteUrl") or project.get("status") == "live":
        return "cleared: already published on polygood.com"
    if project.get("agreement"):
        return "cleared: publishing agreement signed"
    if re.search(r"free to use|use with|permission to use|yes", project.get("rights") or "", re.IGNORECASE):
        return "cleared: rights note allows use (follow its credit wording)"
    return "not yet cleared: optional swap only, check rights first"


def score(project):
    points = 0
    if project.get("siteUrl"):
        points += 4  # a case page to link to
    elif project.get("status") == "live":
        points += 3
    if project.get("pro"):
        points += 3  # professional photos
    if project.get("agreement"):
        points += 2  # signed publishing agreement
    if project.get("social") == "yes":
        points += 1  # cleared for social, usually fine for email
    if project.get("credits"):
        points += 1
    added = project.get("added") or ""
    if added >= "2026":
        points += 2
    elif added >= "2025":
        points += 1
    return points


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--catalog", help="Path to catalog.json")
    parser.add_argument("--region", default="all", choices=["all", *REGIONS.keys()])
    parser.add_argument("--country", help="Exact catalogue country, e.g. Netherlands")
    parser.add_argument("--category", help="Catalogue category, e.g. Hospitality, Retail, 'Offices & public spaces'")
    parser.add_argument("--pattern", help="Colour/pattern name, e.g. 'Sapphire Terrazzo'")
    parser.add_argument("--exclude", action="append", default=[], help="Skip projects whose name contains this text (repeatable)")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--json", action="store_true", help="Print JSON instead of a table")
    args = parser.parse_args()

    path = find_catalog(args.catalog)
    catalog = json.loads(path.read_text(encoding="utf-8"))
    projects = catalog.get("projects", [])
    # Facts recorded for website cases (brief, result, credits), keyed by Notion id.
    case_notes = {}
    for case in catalog.get("siteCases", []) or []:
        for notion_id in case.get("notion") or []:
            if case.get("note"):
                case_notes[notion_id] = case["note"]

    picked, skipped = [], []
    for p in projects:
        country = p.get("country") or ""
        if args.region != "all" and country not in REGIONS[args.region]:
            continue
        if args.country and country.lower() != args.country.lower():
            continue
        if args.category and args.category.lower() not in (p.get("cat") or "").lower():
            continue
        patterns = [clean_pattern(x) for x in p.get("patterns") or []]
        if args.pattern and args.pattern.lower() not in [x.lower() for x in patterns]:
            continue
        if any(x.lower() in (p.get("name") or "").lower() for x in args.exclude):
            continue
        reason = why_blocked(p)
        if reason:
            skipped.append((clean_name(p.get("name", "")), reason))
            continue
        picked.append({
            "name": clean_name(p.get("name", "")),
            "country": country or "unknown",
            "category": p.get("cat") or "",
            "uses": ", ".join(p.get("uses") or []),
            "patterns": ", ".join(patterns) or "[not recorded]",
            "case_url": p.get("siteUrl") or ("live, URL not recorded" if p.get("status") == "live" else "no case page yet"),
            "photos": ("professional" if p.get("pro") else "not professional") + ("; agreement signed" if p.get("agreement") else ""),
            "rights": (p.get("rights") or "").strip() or "no note",
            "credits": (p.get("credits") or "").strip() or "[not recorded]",
            "added": (p.get("added") or "")[:10],
            "score": score(p),
            "notion": p.get("notion") or "",
            "clearance": clearance(p),
            "case_note": case_notes.get(p.get("id"), ""),
        })

    picked.sort(key=lambda x: x["added"], reverse=True)  # newest first among equal scores
    picked.sort(key=lambda x: x["score"], reverse=True)
    picked = picked[: args.limit]

    if args.json:
        print(json.dumps({"catalog": str(path), "updated": catalog.get("updated"), "projects": picked,
                          "skipped": [{"name": n, "reason": r} for n, r in skipped]}, ensure_ascii=False, indent=1))
        return

    print(f"Catalogue: {path} (updated {catalog.get('updated', 'unknown')})")
    print(f"Filters: region={args.region} country={args.country or '-'} category={args.category or '-'} pattern={args.pattern or '-'}\n")
    if not picked:
        print("No publishable projects match. Widen the filters or ask the user for projects.")
    for i, x in enumerate(picked, 1):
        print(f"{i}. {x['name']}  ({x['country']} · {x['category']} · score {x['score']})")
        print(f"   Made: {x['uses'] or '[not recorded]'}")
        print(f"   Colours: {x['patterns']}")
        print(f"   Case page: {x['case_url']}")
        print(f"   Photos: {x['photos']} · Rights: {x['rights'][:120]}")
        print(f"   Clearance: {x['clearance']}")
        if x["case_note"]:
            print(f"   Case note: {x['case_note'][:240]}")
        print(f"   Credits: {x['credits'][:160]}")
        print(f"   Added: {x['added']} · Notion: {x['notion']}\n")
    if skipped:
        print("Left out (can't be published as recorded):")
        for name, reason in skipped:
            print(f"  - {name}: {reason}")


if __name__ == "__main__":
    main()
