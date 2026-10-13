---
name: polygood-newsletter
description: Plan and draft newsletters and email campaigns for Polygood® by The Good Plastic Company (Mailchimp audience "The Good Plastic Company Newsletter"), built on what the October 2026 analysis showed real readers respond to — project stories over product grids, regional hero projects, Tuesday–Thursday morning sends, and click results with mail-filter clicks removed. Use this skill whenever someone asks to write, plan, outline, structure or improve a Polygood or Good Plastic Company newsletter, email campaign, project edit, product or colour launch email (new colours, Wall Tiles), design-week, trade-fair or event email, sale email, re-engagement email, subject lines or preview text for this list — even if they only say "next newsletter", "email to our list" or "Mailchimp campaign". Also use it when someone wants to check how a sent Polygood newsletter really performed.
---

# Polygood newsletter

This skill turns a theme ("autumn project edit", "Wall Tiles follow-up", "trade fair in Paris") into a newsletter for The Good Plastic Company's Mailchimp list that a marketer can build straight away: a short brief, subject lines, paste-ready email copy, the send plan, tracking, and a checklist.

It exists because the list's real behaviour is very different from what Mailchimp's own report shows. Read the rules below as lessons from data, not taste. `references/insights-2026-10.md` has the numbers behind each one; open it when you need to justify a choice or the user asks why.

## What the data says (October 2026 analysis)

The analysis covered the 9 Oct 2026 send "The Polygood® Project Edit: Autumn 2026" (10,014 delivered) and the five sends before it.

1. **Most Mailchimp clicks are not people.** Company mail-security tools (Microsoft Defender, Mimecast, Proofpoint and others) open and click every link the moment an email arrives. Of 155 clicking addresses, about 47 were people and 99 were these filters, which made 91% of all clicks. Mailchimp's bot filter flagged none of them. So never judge content, subject lines or A/B winners by Mailchimp's raw click or open numbers.
2. **People click project stories, not product tiles.** Real readers clicked the five project links 41 times and the seven product-colour links 11 times. de Bijenkorf drew 21 people; Salmon Terra, second in Mailchimp's report, had 3 people among 102 clicking addresses; Emerald Ghost had none. Products work when they sit inside a story ("colours used in this project").
3. **Readers pick projects from their own region.** About a third of de Bijenkorf's readers had Dutch or Belgian addresses; Henriette Stadthotel Vienna drew Austria and Germany. Two thirds of real clickers were in Europe (Netherlands, Belgium, Germany, France lead). The US opens a lot (partly filter opens) but clicks little per contact.
4. **Friday afternoon sends split the audience.** The Friday 16:07 Amsterdam send went quiet over the weekend and got a second wave on Monday morning. Tuesday to Thursday mornings put everyone in the same working day.
5. **Event announcements on their own do worst.** The three design-week emails had the lowest click-to-open rates of the six sends analysed; product news (a sale, the Wall Tiles launch) had the highest.
6. **The list is cold and not growing.** 74% of subscribers had not opened anything in 90 days; every contact came from a list import, none from a sign-up form; 64% have no country; subscribers fell 6.7% from April to October. Sending to everyone hurts inbox placement.
7. **The largest firms may not be receiving it.** Gensler opened 2 of 73, Perkins&Will 0 of 44, HOK 0 of 17, AECOM and HKS 0 of 11. Zero opens across a whole large firm usually means junk folder or quarantine, not disinterest.
8. **Basics were missing.** No preview text; the subject line repeated the campaign title, naming brand and season but giving no reason to open; bounces were above 2% on every one of the last six sends.

The base is small (one campaign, about 47 people), so treat points 2 and 3 as strong direction, not law. When newer analyses exist, prefer them and say so.

The 9 October 2026 issue featured de Bijenkorf, Henriette Stadthotel Vienna, Orion Office Kitchenette Paris and One Dust Studio (Taiwan, Taipei). Don't reuse a hero from the last two issues.

## Workflow

### 1. Gather the inputs

Ask only for what you can't find or infer. If the user gives a theme and nothing else, draft with clearly marked placeholders rather than stalling.

- Theme or occasion, and the planned send week.
- Projects to feature: name, city and country, what was made, colours (patterns) used, designer or fabricator, photo credits, and one or two facts about the brief or result. If the user doesn't name projects, shortlist them from the project catalogue (step 2).
- Product news, if any (a new colour, Wall Tiles, a collection), and any offer or event, with dates.
- Anything that must not appear (NDA projects, expired photo licences).

### 2. Pick the projects

Lead with projects. A good issue has one hero project and two or three more, each with the colours used in it. Product news gets one short block or is woven into a story; a grid of colour tiles is what filters click and people skip.

To shortlist projects, run the bundled script against the catalogue in this repository (`polygood-case-tracker/data/catalog.json`, exported from Notion):

```bash
python3 .claude/skills/polygood-newsletter/scripts/pick_projects.py --region benelux --limit 8
python3 .claude/skills/polygood-newsletter/scripts/pick_projects.py --region all --category Hospitality --pattern "Sapphire Terrazzo"
```

It ranks projects by how ready they are for an email, prints each one's clearance, credits and any recorded facts, and leaves out NDA, restricted and expired-licence projects (saying why). Pass `--catalog <path>` if the file lives elsewhere; if there is no catalogue, ask the user for projects. The catalogue can lag behind the website (its "updated" date is printed at the top): de Bijenkorf and Henriette Stadthotel had case pages by October 2026 although the September catalogue says "no case page yet", so check polygood.com/projects/ before writing a project off as unlinkable.

**Use only cleared projects in the default copy.** A project is cleared when it already has a case page on polygood.com, a signed publishing agreement, or a rights note that allows use. The script labels each one. A project that isn't cleared yet can appear only as an optional swap, flagged "check rights before use". When the script says "photo rights not recorded" (a published case with no agreement or rights note), the project can run, but use the photos already on its case page and add a checklist item to confirm the rights. Follow each partner's credit wording exactly; some ask to be credited first, with a link (SAMJI does). When a name is known only from a social handle ("@montevers_merdeglace"), write it as you think it's spelled and add `[check spelling]`.

**Choose the hero** in this order: cleared with recorded rights or a signed agreement, and strong photos; a case page to link to; enough known facts to tell a short story; fits the issue's theme; relevant to the main region; not featured in the last two issues. A cleared project without a case page can fill a story slot, linked to its closest real page and flagged `[no case page]`, but shouldn't be the hero. Facts come from the user, the case page, the catalogue's case note and credits. If the hero would need more than one `[fact needed]`, ask the user for one or two facts about it, or pick a better-documented project.

### 3. Decide on versions

Start from one Global version. Add a regional version only when there is a cleared project from that region that fits the issue's theme, because each extra version means another build, another test send and another set of results to read. Two or three versions is usually plenty.

| Version | Countries (Mailchimp profile) | When it's worth it |
|---|---|---|
| Benelux | NL, BE | Most engaged per contact; a Dutch or Belgian project on theme |
| DACH | DE, AT, CH | A German, Austrian or Swiss project on theme |
| France | FR | A French project on theme, or an event in France |
| UK & Ireland | UK, IE | A UK or Irish project on theme |
| US | US | A US project on theme; also send US at a US-friendly time |
| Global | everyone else and contacts with no country (about 64% of the list) | Always |

A regional hero that doesn't fit the theme (an office project in a hospitality issue) is worse than the Global version. Don't invent a regional project to fill a slot.

### 4. Write the subject lines and preview text

Write four subject-line options, each taking a different angle: one project, a place, a concrete promise, and a regional variant. Keep each under about 50 characters, sentence case, no exclamation marks. Lead with what the reader gets, not with "Polygood®" or a season label. Pick two for an A/B test.

Write preview text of 40 to 90 characters for each A/B pair, adding something neither subject says (don't repeat words from the subject). Never leave it empty: inboxes then show "View this email in your browser".

Count lengths with code, not by eye, and report the counts:

```bash
python3 -c 'import sys; [print(len(s), s) for s in sys.argv[1:]]' "Subject one" "Subject two" "Preview text"
```

| Weak (what was sent) | Stronger |
|---|---|
| The Polygood® Project Edit: Autumn 2026 | Inside de Bijenkorf's recycled-plastic interior |
| | Four autumn interiors made from waste plastic |
| | A Vienna hotel's bathrooms in Sapphire Terrazzo |

### 5. Write the email

Follow `references/house-style.md`. In short: sentence case, UK spelling, Polygood® on first mention then Polygood, no exclamation marks, no "unique" or "inspiring", and a fact in every paragraph. Never invent figures (recycled content, tonnes, percentages), quotes, venues or dates: use what the user, the case page or the catalogue supplies, or leave a `[fact needed]` placeholder.

**Order:**

1. **Open on the hero project.** Either start straight with it, or with a one-line intro that names the projects (it may end with "plus [product news]"). Only a dated event or a launch happening in this issue gets a single banner line above the hero ("Meet us at [fair], Paris, [dates] — details below"); a reminder about an earlier launch goes in the intro line or the news block, not above the hero.
2. **Hero project.** Title (client or venue, city), one line on what was made, 40–70 words of story, "Colours used:", a button to the case page and a sample link.
3. **Two or three more projects.** Same pattern, 30–50 words each.
4. **One short news block** (product launch, event, Wall Tiles) only if there is real news, tied to a project where possible.
5. **Footer.** Sustainability page and social links live here, not as content blocks; almost nobody clicked them.

**Links.** Every project block needs a case-page link and a sample link; these come first. One shared sample link per block is fine ("Order samples of Salmon Terra and Espresso Noir"). Link colour names to their product pages only if the total stays around 10–14 tracked links. "Tracked links" means links with a `utm_content` value; partner credit links that the partner asked for don't carry UTM tags and don't count. Count the links from your utm_content list rather than by eye. Never drop a project's sample link to save room: cut a project instead.

Write real text, not text inside images: image-only emails land in junk more often. Every image needs alt text naming the object, the pattern and the place ("Bathroom countertop in Sapphire Terrazzo at Henriette Stadthotel, Vienna").

### 6. Event emails

Events still need projects: design-week announcements on their own had the weakest results of the six sends analysed. Pair the event with projects from the host city or country, ideally ones visitors can go and see, or pieces on the stand.

- **Ask first** what will be on the stand (panels, products, pieces from a project) if the user hasn't said; otherwise the event block carries a `[fact needed]`.
- **Details not confirmed yet:** write a save-the-date with a details box in two versions, "unconfirmed" (month, city, fair name if known, "dates and stand number to follow") and "confirmed" (dates, hall and stand, opening hours), so the user can send either. Don't guess the venue or dates. Every version (Global and regional) needs a subject line and preview text for both states, or says it reuses the Global ones.
- **Calls to action:** book a meeting at the stand, get a visitor pass if the fair offers one, or ask for samples to be brought along. Bookings are the success measure; tag the booking link with its own `utm_content`.
- **Sequence:** suggest save-the-date (6–8 weeks before), details confirmed (2–3 weeks before), last call (a few days before), and a follow-up after the fair with the projects shown. Give each planned send its own subject line and preview text. Send each to the same audience; don't narrow the last call to Mailchimp "clickers", who are mostly filters.
- **Versions:** the host country (plus Benelux and DACH for a European fair) and Global are usually enough; a US version only if US visitors are expected.

### 7. Plan the audience and the send

- **When:** Tuesday to Thursday, 09:00–10:30 Amsterdam time for Europe and Global; the US version at about 09:30 New York time the same day. Avoid Friday afternoons and Monday mornings.
- **Who:** exclude subscribers with no opens in the last 180 days from the regular send, and put them in a separate "still want to hear from us?" email once a quarter; archive those who don't respond. Mailchimp counts unsubscribed contacts toward the plan's contact limit, so archiving them also saves money.
- **Never** build an "engaged" segment from Mailchimp clicks: 79 of the 82 addresses that click newsletter after newsletter are filters.
- **Seed tests before sending:** an iPhone and an Android phone, Outlook desktop, and if possible a contact at one of the large firms (Gensler, Perkins&Will) to check junk and quarantine.

### 8. Set up tracking

Turn on Google Analytics link tracking in the Mailchimp campaign settings and tag links consistently: `utm_source=mailchimp`, `utm_medium=email`, `utm_campaign=<yyyy-mm>-<slug>`, `utm_content=<block>` (for example `hero`, `story-2`, `sample-hero`, `book-meeting`). Website sessions in Google Analytics are the source of truth for clicks, because filters rarely load pages like a browser does.

For A/B tests, choose "manually select winner" and decide at send time + 48 hours on Google Analytics sessions or people-only clicks, not on Mailchimp's automatic winner, which picks within hours on inflated opens or clicks. The final read is 72 hours after the winner goes to the rest of the list.

### 9. If asked to build it in Mailchimp

If a Mailchimp connector is available and the user asks, create the campaign as a **draft** only. Never schedule or send it: sending is the user's decision, and a newsletter can't be unsent.

## Output format

The deliverable is for a marketing manager who will build the email, so keep it lean: aim for about 150–250 lines, keep reasoning to one line per choice, and keep the email copy free of notes so it can be pasted as is. Don't mention this skill, its files or its scripts in the deliverable; state the conclusions instead. Unless the user asks for something narrower (for example only subject lines), deliver:

```markdown
# [Working title of the issue]

## Brief
- Goal: [one sentence]
- Send: [day, date, time Amsterdam; US time if a US version exists]
- Versions: [Global + any regional versions, one line each with the hero]
- Hero: [project] — [one-line reason]

## Subject lines and preview text
| # | Subject line | Characters | Angle |
A/B test: [x] vs [y] · Preview text ([n] characters): [text]

## Email copy (Global)
[Paste-ready copy, block by block, with neutral block labels. Only link targets in [brackets] and image notes in *italics*; no commentary, and no variant or send instructions (those go in the send plan).]

## Regional versions
[Per version, every element that changes (subject, preview, intro, hero, other blocks), written out in full.]

## Send plan and tracking
| Item | Setting |
[Audience and exclusions, send times, A/B setup, UTM values per link, seed tests]

## Pre-send checklist
- [ ] Preview text filled in
- [ ] Every featured project cleared; credits worded as the partner asks
- [ ] No `[fact needed]` or `[check URL]` placeholders left
- [ ] Alt text on every image; real text, not image-only
- [ ] Every project block has a case-page link and a sample link; links tested; Google Analytics tracking on
- [ ] Sent to seed phones and Outlook; junk checked at a large firm
- [ ] Inactive (180 days) excluded
- [ ] Send time Tuesday–Thursday morning

## After sending
[3–4 lines: when to read results (72 hours, or the Tuesday after a Friday send), to judge by Google Analytics sessions and people-only clicks rather than Mailchimp's totals, and to pass the people who clicked to sales.]

## Assumptions and open questions
[At most 5 bullets, one point each, about 20 words or fewer]
```

Write the email copy in English unless the user asks otherwise. Talk to the user in the language they write in.

## Checking a sent newsletter

When the user asks how a Polygood newsletter performed, follow `references/post-send-check.md`: pull contact-level click events, split people from filters, report real-reader clicks by link and country, flag large firms with zero opens, and hand sales the list of people who clicked, with the project each one opened.

## Reference files

- `references/insights-2026-10.md` — the full October 2026 numbers behind every rule above. Read it when the user asks why, or when weighing a choice the rules don't settle.
- `references/house-style.md` — Polygood writing rules for email, adapted from the website's case-study outline.
- `references/post-send-check.md` — how to measure a send with filter clicks removed, including the classification rules and the Mailchimp questions to ask.
- `scripts/pick_projects.py` — shortlists projects from the Notion catalogue by region, category and pattern, with clearance, credits and recorded facts.
