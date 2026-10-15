---
name: polygood-content-plan
description: Build a researched social media content plan for Polygood, The Good Plastic Company's recycled plastic surface material. Pulls the last 30 days of posts from Polygood and its main competitors (Le Pavé, Smile Materials, Plasticiet) on Instagram, plus X, YouTube and TikTok where accounts or keywords exist. Finds the posts that beat each account's usual engagement and analyses the winning videos. Turns that into a competitor benchmark, post ideas built on real Polygood projects cleared for social media, and a dated posting calendar. Use this whenever the user asks for a Polygood content plan, content calendar, social media plan, post ideas, an Instagram strategy, or what Polygood should post next. Also use it to compare Polygood's social media with Le Pavé, Smile Materials or Plasticiet, even if they don't say "content plan".
---

# Polygood content plan

Research what is working for Polygood and its competitors on social media, then turn it into a plan Polygood's marketing team can post from.

`SKILL_DIR` below means the folder this file is in. Scripts are in `SKILL_DIR/scripts/`, background in `SKILL_DIR/references/`. Set it at the start of each shell command, e.g. `SKILL_DIR="/path/to/polygood-content-plan"`, because shell variables may not carry over between commands.

## What you produce

One run folder holds everything:

```
{OUT}/content-plans/{YYYY-MM-DD_HHMMSS}/
├── content-plan.md            # The plan (always)
├── instagram-playbook.md      # Only for platforms with 20+ posts of data
└── research/
    ├── instagram/  raw.json, outliers.json, benchmark.json, video-analysis.json
    ├── x/          raw.json, outliers.json
    ├── tiktok/     raw.json, outliers.json, video-analysis.json
    └── youtube/    outliers.json, report.md, video-analysis.json
```

`{OUT}` is `brands/polygood` when the working folder contains `brands/polygood/` (the claude-remote-control repository), otherwise the working folder itself.

## 1. Check what can run

```bash
python3 "$SKILL_DIR/scripts/check_setup.py"
```

It reads keys from the environment or from a `.env` file in the working folder, and prints which platforms are ready:

- **Instagram, X, TikTok** need `APIFY_TOKEN` and `pip install apify-client`. Apify charges per result, usually well under $1 for a run like this.
- **YouTube** needs `TUBELAB_API_KEY`.
- **Video analysis** needs `GEMINI_API_KEY` and `pip install google-genai requests`.

If a package is missing, install it (`pip install apify-client google-genai requests python-dotenv`). If keys are missing, never ask the user to paste them into the chat, because that leaves them in the conversation history. Ask them to add the keys to a `.env` file in the working folder (the names above, one `KEY=value` per line) or to their environment settings, then run the check again.

Instagram is the platform that matters most: it's where Polygood and all three competitors post. If Instagram can't run, tell the user what is missing and offer two choices: set up the keys, or get a **brand-only plan**. A brand-only plan skips steps 3-5 and builds ideas from `references/brand.md` and the project list. Its title says "brand-only, not based on new research", so nobody mistakes it for a researched plan.

## 2. Read the background

Read `references/brand.md`: what Polygood is, who buys it, and the competitors. The audience is architects, interior designers and brand fit-out teams, not consumers. That shapes everything. A project reveal or a material close-up beats a lifestyle trend, and a call to action like "order samples" beats "follow for more".

If the user gave a time span, posting rhythm, campaign, product launch or event (e.g. Milan Design Week, a new pattern), note it now. It overrides the defaults below.

## 3. Create the run folder

```bash
RUN="{OUT}/content-plans/$(date +%Y-%m-%d_%H%M%S)" && mkdir -p "$RUN/research" && echo "$RUN"
```

## 4. Research each platform

Run the platforms that check_setup marked ready. They're independent, so if you can run subagents, run them in parallel. Otherwise go one at a time, starting with Instagram.

### Instagram (main)

```bash
mkdir -p "$RUN/research/instagram"
python3 "$SKILL_DIR/scripts/instagram_fetch.py" --type posts --days 30 --limit 50 -o "$RUN/research/instagram/raw.json"
python3 "$SKILL_DIR/scripts/instagram_outliers.py" -i "$RUN/research/instagram/raw.json" -o "$RUN/research/instagram/outliers.json" --threshold 2.0
python3 "$SKILL_DIR/scripts/account_benchmark.py" -i "$RUN/research/instagram/raw.json" -o "$RUN/research/instagram/benchmark.json" --days 30
```

`--type posts` gets reels, carousels and single images. Reels-only would miss most of what material brands post. The outlier script compares engagement per follower, so a small account like Plasticiet can stand out next to bigger ones.

Four accounts over 30 days is a small sample. If the outlier script finds fewer than 3 posts, run it again with `--threshold 1.5`, then `1.0`. Note the threshold you ended on, because the plan has to report it.

### X

```bash
mkdir -p "$RUN/research/x"
python3 "$SKILL_DIR/scripts/x_fetch.py" --days 30 --max-items 100 -o "$RUN/research/x/raw.json"
python3 "$SKILL_DIR/scripts/x_outliers.py" -i "$RUN/research/x/raw.json" -o "$RUN/research/x/outliers.json"
```

Only @SmilePlastics is listed, and it may post rarely. If it returns fewer than 5 posts, mention that in the plan and leave X out of the calendar.

### TikTok

Skipped until someone adds handles to `references/accounts/tiktok.md`. When there are some:

```bash
mkdir -p "$RUN/research/tiktok"
python3 "$SKILL_DIR/scripts/tiktok_fetch.py" --days 30 --limit 50 -o "$RUN/research/tiktok/raw.json"
python3 "$SKILL_DIR/scripts/tiktok_outliers.py" -i "$RUN/research/tiktok/raw.json" -o "$RUN/research/tiktok/outliers.json"
```

### YouTube

No brand in this set has a channel, so YouTube is searched by topic. Take the keywords from `references/accounts/youtube.md`:

```bash
python3 "$SKILL_DIR/scripts/youtube_outliers.py" \
  --keywords "recycled plastic panels" "recycled plastic interior design" "sustainable surface materials" "recycled plastic furniture" \
  --adjacent-keywords "retail interior design" "sustainable architecture materials" "circular design" "material innovation interior" \
  --output-dir "$RUN/research/youtube" --top 5
```

Read `outliers.json` and keep at most 3 videos that a Polygood buyer would actually watch, such as material, fit-out or design-process videos. Drop general home-renovation or DIY content. Write them to `$RUN/research/youtube/filtered-outliers.json` as `{"outliers": [...]}`.

## 5. Look closely at the winners

**Videos.** Run the analyser on each platform's outliers. It skips anything that isn't a video:

```bash
python3 "$SKILL_DIR/scripts/analyze_videos.py" -i "$RUN/research/instagram/outliers.json" -o "$RUN/research/instagram/video-analysis.json" --platform instagram --max-videos 5
```

Use `--platform tiktok` or `youtube` with the matching files (for YouTube, `filtered-outliers.json` with `--max-videos 3`). It returns each video's hook, structure, pacing and call to action.

**Photos and carousels.** These are most of what this niche posts, and the analyser doesn't cover them. For each standout photo or carousel, read the caption. If you can view images, download its `displayUrl` and look at it, then note what it shows: a finished space, a close-up of the material, a making-of shot, a person, before and after.

Also open Polygood's own best post from `benchmark.json`, even when it isn't an outlier. It's the baseline the plan improves on.

## 6. Pick the projects to feature

```bash
python3 "$SKILL_DIR/scripts/pick_projects.py" --not-on-instagram --limit 30
```

This reads the case tracker's project list (`polygood-case-tracker/data/catalog.json` when it's in the working folder, otherwise a snapshot bundled with this skill and dated in its output). It lists projects in two groups:

- **Cleared**: social media use is "yes" in Notion. Use these first, with the credits shown.
- **Ask first**: no social media decision recorded, but professional photos exist. They can go in the plan, marked "ask first".

Projects marked "no", NDA or waiting on rights are never listed, so don't add them from memory either. Prefer projects that aren't on Instagram yet and that have a website case to link to. Use `--category Retail` (or Hospitality, etc.) when an idea needs a certain kind of project.

## 7. Write the plan

Follow `references/plan-template.md` and write `$RUN/content-plan.md`. Principles:

- **Tie every idea to evidence and a real project.** Link the post or benchmark finding behind each idea, and name the project or asset it uses. If an idea needs new photos or video, say what has to be shot.
- **Only use numbers from the research files.** If a number isn't in the research files, leave it out.
- **Be honest about the sample.** Say how many posts and accounts the findings rest on. Present patterns from a small sample as things to test.
- **Write in Polygood's style.** polygood.com uses sentence case and short titles, with no exclamation marks. Use the same for post titles, hooks and on-screen text.
- **Plan dates.** The calendar starts the Monday after today and covers 4 weeks unless the user asked otherwise. Default to Polygood's current posts per week from the benchmark, kept between 2 and 5.

For each platform with at least 20 posts of research, also write `$RUN/{platform}-playbook.md` from `references/playbook-template.md`. With less data, put the platform's findings in the plan instead.

## 8. Tell the user

Keep the chat summary short:
- Which platforms ran, which were skipped and why
- 3 findings from the benchmark and standout posts
- The 3 strongest post ideas
- Where the files are

If the run folder is inside a git repository, the raw research is git-ignored under `brands/polygood/content-plans/*/research/`. The plan files can be committed if the user wants them kept.

## Updating the skill

- **Accounts:** edit `references/accounts/{platform}.md`. Instagram and TikTok tables start with `| Username`, X with `| Handle`. The scripts look for those exact headers, and rows starting with `@example` are ignored.
- **Brand facts and competitors:** `references/brand.md`.
- **Project list:** comes from the case tracker, so it's updated there. The bundled `assets/projects-snapshot.json` is only a fallback.

The research scripts come from [bradautomates/head-of-content](https://github.com/bradautomates/head-of-content) (MIT, see `LICENSE-head-of-content.txt`). They were changed to read `.env` from the working folder and to find the account lists inside this skill.
