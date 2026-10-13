---
name: polygood-newsletter
description: Plan and draft newsletters and email campaigns for Polygood® by The Good Plastic Company (Mailchimp audience "The Good Plastic Company Newsletter"), built on what the October 2026 analysis showed real readers respond to — project stories over product grids, regional hero projects, Tuesday–Thursday morning sends, and click results with mail-filter clicks removed. Use this skill whenever someone asks to write, plan, outline, structure or improve a Polygood or Good Plastic Company newsletter, email campaign, project edit, product or colour launch email (new colours, Wall Tiles), design-week or event email, sale email, re-engagement email, subject lines or preview text for this list — even if they only say "next newsletter", "email to our list" or "Mailchimp campaign". Also use it when someone wants to check how a sent Polygood newsletter really performed.
---

# Polygood newsletter

This skill turns a theme ("autumn project edit", "Wall Tiles follow-up", "Milan Design Week") into a ready-to-build newsletter for The Good Plastic Company's Mailchimp list: a short brief, subject lines, the full email copy, the audience and send plan, tracking, and a pre-send checklist.

It exists because the list's real behaviour is very different from what Mailchimp's own report shows. Read the rules below as lessons from data, not taste. `references/insights-2026-10.md` has the numbers behind each one; open it when you need to justify a choice or the user asks why.

## What the data says (October 2026 analysis)

The analysis covered the 9 Oct 2026 send "The Polygood® Project Edit: Autumn 2026" (10,014 delivered) and the five sends before it.

1. **Most Mailchimp clicks are not people.** Company mail-security tools (Microsoft Defender, Mimecast, Proofpoint and others) open and click every link the moment an email arrives. Of 155 clicking addresses, about 47 were people and 99 were these filters, which made 91% of all clicks. Mailchimp's bot filter flagged none of them. So never judge content, subject lines or A/B winners by Mailchimp's raw click or open numbers.
2. **People click project stories, not product tiles.** Real readers clicked the five project links 41 times and the seven product-colour links 11 times. de Bijenkorf drew 21 people; Salmon Terra, second in Mailchimp's report, had 3 people among 102 clicking addresses; Emerald Ghost had none. Products work when they sit inside a story ("colours used in this project").
3. **Readers pick projects from their own region.** About a third of de Bijenkorf's readers had Dutch or Belgian addresses; Henriette Stadthotel Vienna drew Austria and Germany. Two thirds of real clickers were in Europe (Netherlands, Belgium, Germany, France lead). The US opens a lot (partly filter opens) but clicks little per contact.
4. **Friday afternoon sends split the audience.** The Friday 16:07 Amsterdam send went quiet over the weekend and got a second wave on Monday morning. Tuesday to Thursday mornings put everyone in the same working day.
5. **The list is cold and not growing.** 74% of subscribers had not opened anything in 90 days; every contact came from a list import, none from a sign-up form; 64% have no country; subscribers fell 6.7% from April to October. Sending to everyone hurts inbox placement.
6. **The largest firms may not be receiving it.** Gensler opened 2 of 73, Perkins&Will 0 of 44, HOK 0 of 17, AECOM and HKS 0 of 11. Zero opens across a whole large firm usually means junk folder or quarantine, not disinterest.
7. **Basics were missing.** No preview text; the subject line repeated the campaign title ("The Polygood® Project Edit: Autumn 2026"), naming brand and season but giving no reason to open; bounces were above 2% on every one of the last six sends.

The base is small (one campaign, about 47 people), so treat points 2 and 3 as strong direction, not law. When newer analyses exist, prefer them and say so.

## Workflow

### 1. Gather the inputs

Ask only for what you can't find or infer. If the user gives a theme and nothing else, draft with clearly marked placeholders rather than stalling.

- Theme or occasion, and the planned send week.
- Projects to feature: name, city and country, what was made, colours (patterns) used, designer or fabricator, photo credits. If the user doesn't name projects, shortlist them from the project catalogue (step 2).
- Product news, if any (a new colour, Wall Tiles, a collection), and any offer or event (with dates).
- Anything that must not appear (NDA projects, expired photo licences).

### 2. Pick the content

Lead with projects. A good issue has one hero project and two or three more, each with the colours used in it. Product news gets one short block or is woven into a story; a grid of colour tiles is what filters click and people skip.

To shortlist projects, run the bundled script against the catalogue in this repository (`polygood-case-tracker/data/catalog.json`, exported from Notion):

```bash
python3 .claude/skills/polygood-newsletter/scripts/pick_projects.py --region benelux --limit 8
python3 .claude/skills/polygood-newsletter/scripts/pick_projects.py --region all --category Hospitality --pattern "Sapphire Terrazzo"
```

It ranks projects that have a website case to link to, professional photos and publishing rights, and leaves out NDA, restricted and expired-licence projects (it prints why when it skips one). Pass `--catalog <path>` if the file lives elsewhere; if there is no catalogue, ask the user for projects. The catalogue can lag behind the website (its "updated" date is printed at the top): de Bijenkorf and Henriette Stadthotel had case pages by October 2026 although the September catalogue says "no case page yet", so check polygood.com/projects/ before writing a project off as unlinkable. Always check the rights and credits columns before using a project: some partners require a specific credit line (for example, SAMJI asks to be credited first, with a link).

Choose the hero in this order: strongest photos, then relevance to the main region, then novelty (not featured in the last two issues).

### 3. Plan regional versions

When you have a strong project for a region, make that region's version swap in its own hero; everything else stays the same. Default regions, by Mailchimp profile country:

| Version | Countries | Why |
|---|---|---|
| Benelux | NL, BE | Most engaged per contact; home-market projects resonate |
| DACH | DE, AT, CH | Second-strongest real response |
| France | FR | Strong real response, highest open rate among large markets |
| UK & Ireland | UK, IE | Opens well, clicks less |
| US | US | Opens inflated by filters; check delivery to large firms |
| Global | everyone else and contacts with no country (about 64% of the list) | Strongest overall project as hero |

If only one strong project exists, send a single version. Don't invent a regional project to fill a slot.

### 4. Write the subject line and preview text

Write four subject-line options, each taking a different angle: one project, a place, a concrete promise, and a regional variant. Keep each under about 50 characters, sentence case, no exclamation marks. Lead with what the reader gets, not with "Polygood®" or a season label. Pick two for an A/B test.

Then write preview text of 40 to 90 characters that adds something the subject doesn't say. Never leave it empty: inboxes then show "View this email in your browser".

| Weak (what was sent) | Stronger |
|---|---|
| The Polygood® Project Edit: Autumn 2026 | Inside de Bijenkorf's recycled-plastic interior |
| | Four autumn interiors made from waste plastic |
| | A Vienna hotel's bathrooms in Sapphire Terrazzo |

### 5. Write the email

Follow `references/house-style.md`. The short version: sentence case, UK spelling, Polygood® on first mention then Polygood, no exclamation marks, no "unique" or "inspiring", and a fact in every paragraph. Never invent figures (recycled content, tonnes, percentages) or quotes: use what the user or the catalogue supplies, or leave a `[fact needed]` placeholder.

Structure (keep it to about 8–12 tracked links in total; every link should earn its place):

1. **Hero project.** Title (client or venue, city), one line on what was made, 40–70 words of story, "Colours used:" linking each colour to its product page, a button to the case page and a "Order a sample of [colour]" link.
2. **Two or three more projects.** Same pattern, 30–50 words each.
3. **One short news block** (product launch, event, Wall Tiles) only if there is real news. Design-week announcements on their own earned the weakest click-to-open rates of the six sends analysed, so keep event details brief and pair them with a project.
4. **Footer.** Sustainability page and social links live here, not as content blocks; almost nobody clicked them.

Write real text, not text inside images: image-only emails land in junk more often, and every image needs alt text that names the object, the pattern and the place ("Bathroom countertop in Sapphire Terrazzo at Henriette Stadthotel, Vienna").

### 6. Plan the audience and the send

- **When:** Tuesday to Thursday, 09:00–10:30 Amsterdam time for Europe and Global; the US version at about 09:30 New York time the same day. Avoid Friday afternoons and Monday mornings.
- **Who:** exclude subscribers with no opens in the last 180 days from the regular send, and put them in a separate "still want to hear from us?" email once a quarter; archive those who don't respond. Mailchimp counts unsubscribed contacts toward the plan's contact limit, so archiving them also saves money.
- **Never** build an "engaged" segment from Mailchimp clicks: 79 of the 82 addresses that click newsletter after newsletter are filters.
- **Seed tests before sending:** an iPhone and an Android phone, Outlook desktop, and if possible a contact at one of the large firms (Gensler, Perkins&Will) to check junk and quarantine.

### 7. Set up tracking

Turn on Google Analytics link tracking in the Mailchimp campaign settings and tag links consistently: `utm_source=mailchimp`, `utm_medium=email`, `utm_campaign=<yyyy-mm>-<slug>`, `utm_content=<block>` (for example `hero`, `story-2`, `sample-salmon-terra`). Website sessions in Google Analytics are the source of truth for clicks, because filters rarely run page scripts.

For A/B tests, choose the winner manually after 48 hours using real-reader clicks (see `references/post-send-check.md`), not Mailchimp's automatic winner, which picks by inflated opens or clicks within hours.

### 8. If asked to build it in Mailchimp

If a Mailchimp connector is available and the user asks, create the campaign as a **draft** only. Never schedule or send it: sending is the user's decision, and a newsletter can't be unsent.

## Output format

Unless the user asks for something narrower (for example only subject lines), deliver this, in this order:

```markdown
# [Working title of the issue]

## Brief
- Goal: [one sentence]
- Main audience: [regions/versions]
- Send: [day, date, time Amsterdam; US time]
- Hero: [project] — why: [one line]

## Subject lines
1. [option] — [angle]
2. …
A/B test: [option x] vs [option y]

## Preview text
[40–90 characters]

## Email
[Full copy, block by block, with link targets in brackets and image notes in italics]

## Regional versions
| Version | Hero project | Subject line | Notes |

## Audience and send plan
[Segments, exclusions, timing, seed tests]

## Tracking
[UTM scheme and the utm_content value for each link]

## Pre-send checklist
- [ ] Preview text filled in
- [ ] Every project cleared for publishing (rights, licence dates) and credited as the partner asks
- [ ] Facts checked; no invented figures or `[fact needed]` placeholders left
- [ ] Alt text on every image; real text, not image-only
- [ ] Links tested; UTM tags present; Google Analytics tracking on
- [ ] Sent to seed phones and Outlook; checked junk at a large firm
- [ ] Inactive (180 days) excluded; internal addresses handled
- [ ] Send time Tuesday–Thursday morning

## After sending
[When to check results and how: see references/post-send-check.md]
```

Write the email copy in English unless the user asks otherwise. Talk to the user in the language they write in.

## Checking a sent newsletter

When the user asks how a Polygood newsletter performed, follow `references/post-send-check.md`: pull contact-level click events, split people from filters, report real-reader clicks by link and country, flag large firms with zero opens, and hand sales the list of people who clicked, with the project each one opened.

## Reference files

- `references/insights-2026-10.md` — the full October 2026 numbers behind every rule above. Read it when the user asks why, or when weighing a choice the rules don't settle.
- `references/house-style.md` — Polygood writing rules for email, adapted from the website's case-study outline.
- `references/post-send-check.md` — how to measure a send with filter clicks removed, including the classification rules and the Mailchimp questions to ask.
- `scripts/pick_projects.py` — shortlists projects from the Notion catalogue by region, category and pattern, with rights and credits.
