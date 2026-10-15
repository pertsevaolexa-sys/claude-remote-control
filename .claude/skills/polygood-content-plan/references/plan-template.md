# Content plan template

Use this structure for `content-plan.md`. Drop a section when there is no data for it rather than filling it with guesses, and say in "Data used" what was skipped.

```markdown
# Polygood content plan: {first date} to {last date}

Generated {date} · Research window: last {days} days · Platforms: {platforms researched}

## Data used

| Platform | Accounts | Posts analysed | Standout posts | Notes |
|---|---|---|---|---|
| Instagram | {n} | {n} | {n} | {e.g. threshold lowered to 1.5} |
| X | ... | | | {or: skipped, no key / no accounts} |

{One or two sentences on how far the data can be trusted: e.g. "Four accounts over 30 days is a small sample: treat the patterns as leads to test, not rules."}

## Summary

- {5 bullets: the main things this plan asks Polygood to do differently, each tied to evidence}

## Competitor benchmark (Instagram)

{Table printed by account_benchmark.py}

- {3-5 observations: who posts most, which format each account leans on, where engagement is highest, how Polygood compares. Use numbers from the table.}

## What's working

Standout posts from the research, best first.

### 1. {What the post is, in a few words} · @{account}
- **Link:** {url}
- **Format:** {reel / carousel / image} · **Engagement:** {likes} likes, {comments} comments{, views}
- **Why it worked:** {from video analysis for videos; from caption and image for photos}
- **Hook:** "{opening line or on-screen text}" {for videos}
- **What Polygood can borrow:** {specific, using Polygood's material or projects}

{Repeat for 5-8 posts. Include Polygood's own best post even if it isn't an outlier, as a baseline.}

## Gaps and openings

- **{Opening}:** {what competitors do that Polygood doesn't, or something only Polygood can show}. Evidence: {links or numbers}

{3-5 bullets. Polygood's own strengths to check against: brand clients (Nike, Coach, Lush, Adidas...), bespoke patterns, Cradle to Cradle Certified and EPD, production scale in the Netherlands and Ukraine.}

## Content pillars

| Pillar | What it covers | Share of posts | Why |
|---|---|---|---|
| {e.g. Project reveals} | {...} | {e.g. 40%} | {evidence from research} |

{3-5 pillars.}

## Post ideas

### 1. {Working title, sentence case}
- **Pillar:** {pillar} · **Format:** {reel / carousel / image} · **Platform:** {Instagram, ...}
- **Project or asset:** {project name from pick_projects.py, website case link} · **Rights:** {cleared, credit X / ask first}
- **Hook or first line:** "{text}"
- **Outline:** {3-5 frames or slides, or the shot list for a reel}
- **Caption angle:** {one or two sentences}
- **Call to action:** {e.g. order samples, see the case study, save for later}
- **Based on:** {link to the standout post or the benchmark finding that supports it}

{10-15 ideas. Every idea names a real Polygood project or asset, or says what needs shooting.}

## Calendar

| Date | Day | Platform | Format | Post | Project or asset | Rights |
|---|---|---|---|---|---|---|
| {YYYY-MM-DD} | Mon | Instagram | Carousel | {idea title} | {project} | Cleared |

{Weeks starting the Monday after today; cadence from the request, else Polygood's current posts per week from the benchmark (minimum 2, maximum 5).}

## Before posting

- [ ] Projects marked "ask first": confirm social media use in Notion
- [ ] Credits for photographers and designers in every caption that needs them
- [ ] Alt text on every image
- [ ] {anything specific to this plan}

## Data sources

- Run folder: {path}
- Instagram: {raw.json, outliers.json, benchmark.json, video-analysis.json}
- Projects: {catalog path and its date}
```
