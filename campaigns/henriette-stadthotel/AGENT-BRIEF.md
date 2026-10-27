# Brief for the marketing agent: Henriette Stadthotel Vienna

The agent definition is `.claude/agents/polygood-content.md`, and `/henriette` runs it. All paths below are relative to `campaigns/henriette-stadthotel/`.

## Goal

Turn one case study into four pieces, each with copy and graphics. They should bring in hotels and restaurants planning or doing a refit now, HoReCa representatives and specifiers.

Every piece leads with durability: after more than a year of guests and daily steam cleaning, the Polygood® washstands at Henriette Stadthotel Vienna are in "impeccable condition", says co-owner Verena Brandtner-Pastuszyn.

## Read first

1. `ANSWERS.md`: answers to the 14 questions you asked, with what is still open.
2. `02-facts-and-sources.md`: the only facts you may use, the quotes, photo credits, claims to check.
3. `source-article.md`: the full story and the merged CTA.
4. `03-channel-kit.md`: audience and personas, key message, hooks, CTA in four lengths, channel specs.
5. `brand.md`: voice, terms, banned words, visual tokens.
6. `01-mailchimp-segment.md`: newsletter audience and benchmarks.
7. `graphics/README.md`: how the graphics are built and rendered.
8. `../../polygood-case-tracker/docs/case-study-outline.md`: house rules for website case pages.

## Deliverables

### Copy, in `outputs/henriette/`

| File | What | Spec |
|---|---|---|
| `01-website-case.md` | Case page for polygood.com/projects/henriette-stadthotel/ | `03-channel-kit.md` § 1 and the case outline. Body up to 150 words |
| `02-newsletter.md` | Mailchimp email for the `HoReCa` tag | § 2: 3 subject lines, 2 preheaders, 120–160 words, button copy, link list with UTMs |
| `03-linkedin.md` | Main post, text for the 6 carousel slides, first comment, outlines for posts 2–4 | § 3 |
| `04-instagram.md` | Collab caption, text and alt text for the 7 slides, Stories quiz, optional Reel script | § 4 |
| `README.md` | Hand-over: files, open `[ASK]`/`[CHECK]` items, decisions needed | |

### Graphics, from `graphics/specs/`, rendered to `graphics/out/`

| Spec | For |
|---|---|
| `instagram-carousel.json` | 7 slides, 1080×1350 |
| `instagram-story.json` | 3 frames, 1080×1920 |
| `linkedin-carousel.json` | 6 slides, 1080×1350; combine them into one PDF for LinkedIn |
| `newsletter.json` | Hero and quote band, 1200×600 |
| `website-og.json` | Link preview for the case page, 1200×630 |

The case page itself uses the photos without text, in the order `01-website-case.md` gives.

## Rules

- **Facts.** Use only what is in `02-facts-and-sources.md` and `ANSWERS.md`. If something is missing, write `[ASK: …]`. Don't guess.
- **Claims still to check.** "Used to be fridges" may appear only inside Verena's quote until the material source of each pattern is confirmed. GreenSign Circular may appear only in the article's wording until the status is confirmed. Mark both with `[CHECK]`.
- **Quotes.** Use them word for word, only from the quote table, and attribute each to Verena Brandtner-Pastuszyn, co-owner.
- **Durability first.** Lead with a year of guests and steam, then no extra effort, certificates, CNC to drawings, and the award and press. The award supports the story. The story is the washstands.
- **One CTA.** Use the merged "Planning a refit or a trip to Vienna?" in the length the channel needs. Don't add a separate traveller CTA.
- **Style.**
  - UK spelling.
  - Polygood® on first mention, then Polygood.
  - No exclamation marks in our own copy (quotes stay as said). No "unique".
  - Pattern names exactly: Sapphire Terrazzo, Emerald Ghost, White Terrazzo.
  - Terms as in `brand.md`.
- **Plain writing.** No "not X, it's Y". No "game-changer", "innovative", "seamless", "elevate". No groups of three by habit. No em-dash punch lines. Concrete details over adjectives.
- **Graphics.**
  - Real photos only. Never generate images of the hotel or the washstands.
  - On-image text matches the copy files word for word.
  - Every photo slide carries its credit; the renderer adds it.
- **Public repository.** Don't commit photos, logos, renders or contact data. `.gitignore` covers the asset folders.

## Done when

- [ ] Four copy files and the hand-over README in `outputs/henriette/`
- [ ] Each piece opens with durability
- [ ] Every fact traces to `02-facts-and-sources.md` or `ANSWERS.md`; open points are marked `[ASK]` or `[CHECK]`
- [ ] One CTA per piece, the merged one
- [ ] All specs rendered with no warnings, every image checked by eye
- [ ] Alt text for every image in the copy files
- [ ] `marketing:brand-review` run on each copy file

## Prompt to paste into Claude Code

From the repository root:

```text
/henriette
```

Or, without the slash command:

```text
Use the polygood-content agent and follow campaigns/henriette-stadthotel/AGENT-BRIEF.md for all four channels.
```
