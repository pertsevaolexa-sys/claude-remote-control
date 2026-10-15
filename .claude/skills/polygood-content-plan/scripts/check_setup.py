#!/usr/bin/env python3
"""
Report which platforms the content plan can research right now.

Checks API keys (environment, or a .env file in the working folder),
Python packages, and the account lists bundled with the skill.
Prints one line per platform and exits 0 even when nothing is ready,
so the caller can decide what to do.
"""

import importlib.util
import os
import re
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
ACCOUNTS = SKILL_DIR / "references" / "accounts"


def load_env_file():
    """Read KEY=value lines from ./.env without overriding real env vars."""
    env_path = Path.cwd() / ".env"
    if not env_path.exists():
        return False
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return True


def has_key(name):
    value = os.environ.get(name, "")
    return bool(value) and not value.startswith("your-") and value != "your-key"


def has_package(module):
    try:
        return importlib.util.find_spec(module) is not None
    except ModuleNotFoundError:
        return False


def handles(platform):
    path = ACCOUNTS / f"{platform}.md"
    if not path.exists():
        return []
    found = []
    for line in path.read_text().splitlines():
        cells = [c.strip() for c in line.split("|")]
        if len(cells) > 2 and cells[1].startswith("@") and not cells[1].startswith("@example"):
            found.append(cells[1])
    return found


def youtube_keywords():
    path = ACCOUNTS / "youtube.md"
    if not path.exists():
        return []
    return re.findall(r"^- (.+)$", path.read_text(), flags=re.M)


def main():
    env_file = load_env_file()
    apify = has_key("APIFY_TOKEN") and has_package("apify_client")
    gemini = has_key("GEMINI_API_KEY") and has_package("google.genai") and has_package("requests")
    tubelab = has_key("TUBELAB_API_KEY")

    print(f".env in working folder: {'yes' if env_file else 'no'}")
    print(f"APIFY_TOKEN: {'set' if has_key('APIFY_TOKEN') else 'missing'}"
          f"{'' if has_package('apify_client') else ' (package apify-client not installed)'}")
    print(f"GEMINI_API_KEY: {'set' if has_key('GEMINI_API_KEY') else 'missing'}"
          f"{'' if has_package('google.genai') else ' (package google-genai not installed)'}")
    print(f"TUBELAB_API_KEY: {'set' if tubelab else 'missing'}")
    print()

    rows = []
    for platform in ("instagram", "x", "tiktok"):
        accounts = handles(platform)
        if not accounts:
            status = "skip: no accounts listed"
        elif not apify:
            status = "blocked: needs APIFY_TOKEN and apify-client"
        else:
            status = "ready"
        rows.append((platform, status, ", ".join(accounts) or "-"))
    keywords = youtube_keywords()
    if not keywords:
        status = "skip: no keywords listed"
    elif not tubelab:
        status = "blocked: needs TUBELAB_API_KEY"
    else:
        status = "ready"
    rows.append(("youtube", status, f"{len(keywords)} keywords"))

    for platform, status, detail in rows:
        print(f"{platform:<10} {status:<45} {detail}")
    print()
    print(f"video analysis: {'ready' if gemini else 'blocked: needs GEMINI_API_KEY, google-genai and requests'}")


if __name__ == "__main__":
    main()
