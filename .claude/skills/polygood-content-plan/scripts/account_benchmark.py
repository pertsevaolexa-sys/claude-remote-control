#!/usr/bin/env python3
"""
Compare Instagram accounts side by side from instagram_fetch.py output.

For each account: posts in the window, posts per week, format mix
(reels, carousels, single images), median likes and comments, median
engagement rate per 1,000 followers, and the best post by engagement rate.
Writes JSON and prints a Markdown table.
"""

import argparse
import json
import statistics
from datetime import datetime
from pathlib import Path


def count(value):
    """Apify reports hidden like counts as -1; treat those as unknown."""
    if value is None or value < 0:
        return None
    return value


def post_format(post):
    if post.get("productType") == "clips":
        return "reel"
    kind = (post.get("type") or "").lower()
    if kind == "sidecar":
        return "carousel"
    if kind == "video":
        return "video"
    return "image"


def parse_time(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def median(values):
    values = [v for v in values if v is not None]
    return round(statistics.median(values), 1) if values else None


def summarise(username, posts, days):
    followers = max((p.get("ownerFollowersCount") or 0) for p in posts)
    formats = {}
    for p in posts:
        formats[post_format(p)] = formats.get(post_format(p), 0) + 1

    def rate(p):
        likes, comments = count(p.get("likesCount")), count(p.get("commentsCount"))
        if not followers or likes is None:
            return None
        return (likes + 3 * (comments or 0)) / followers * 1000

    rated = [(rate(p), p) for p in posts]
    rated = [(r, p) for r, p in rated if r is not None]
    best = max(rated, key=lambda rp: rp[0]) if rated else None
    dates = [d for d in (parse_time(p.get("timestamp")) for p in posts) if d]

    return {
        "account": username,
        "followers": followers or None,
        "posts": len(posts),
        "posts_per_week": round(len(posts) / (days / 7), 1),
        "formats": formats,
        "median_likes": median(count(p.get("likesCount")) for p in posts),
        "median_comments": median(count(p.get("commentsCount")) for p in posts),
        "median_engagement_per_1k_followers": median(r for r, _ in rated),
        "first_post": min(dates).date().isoformat() if dates else None,
        "last_post": max(dates).date().isoformat() if dates else None,
        "best_post": None if not best else {
            "url": best[1].get("url"),
            "format": post_format(best[1]),
            "likes": count(best[1].get("likesCount")),
            "comments": count(best[1].get("commentsCount")),
            "engagement_per_1k_followers": round(best[0], 1),
            "caption_start": (best[1].get("caption") or "")[:140],
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Side-by-side Instagram account benchmark")
    parser.add_argument("--input", "-i", required=True, help="raw.json from instagram_fetch.py")
    parser.add_argument("--output", "-o", required=True, help="Where to write benchmark JSON")
    parser.add_argument("--days", "-d", type=int, default=30, help="Length of the research window")
    args = parser.parse_args()

    posts = json.loads(Path(args.input).read_text())
    by_account = {}
    for p in posts:
        name = (p.get("ownerUsername") or "").lower()
        if name:
            by_account.setdefault(name, []).append(p)

    rows = [summarise(name, items, args.days) for name, items in by_account.items()]
    rows.sort(key=lambda r: r["median_engagement_per_1k_followers"] or 0, reverse=True)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps({"days": args.days, "accounts": rows}, indent=2))

    print("| Account | Followers | Posts | Per week | Reels / carousels / images | Median likes | Median comments | Engagement per 1K followers |")
    print("|---|---|---|---|---|---|---|---|")
    for r in rows:
        f = r["formats"]
        mix = f"{f.get('reel', 0) + f.get('video', 0)} / {f.get('carousel', 0)} / {f.get('image', 0)}"
        print(f"| @{r['account']} | {r['followers'] or '?'} | {r['posts']} | {r['posts_per_week']} | {mix} | "
              f"{r['median_likes']} | {r['median_comments']} | {r['median_engagement_per_1k_followers']} |")
    print(f"\nSaved benchmark to: {args.output}")


if __name__ == "__main__":
    main()
