# Brief for the marketing agent: Henriette Stadthotel Vienna

## Goal

Turn one case study into four pieces that bring in hotels and restaurants planning or doing a refit now, HoReCa representatives and specifiers. Every piece leads with durability: after more than a year of guests and daily steam cleaning, the Polygood® washstands at Henriette Stadthotel Vienna are in "impeccable condition".

## Read first, in this order

1. `source-article.md`: the full story, quotes and the merged CTA.
2. `02-facts-and-sources.md`: the only facts you may use, the quotes, photo credits and the claims still to check.
3. `03-channel-kit.md`: audience and personas, key message, hooks, the CTA in four lengths, and the spec for each channel.
4. `01-mailchimp-segment.md`: who gets the newsletter and the benchmarks.
5. `../../polygood-case-tracker/docs/case-study-outline.md`: house rules for website case pages.

## Deliverables

Write each one to `outputs/henriette/` as Markdown:

| File | What | Spec |
|---|---|---|
| `01-website-case.md` | Case page for polygood.com/projects/henriette-stadthotel/ | `03-channel-kit.md` § 1 and the case outline. Body up to 150 words |
| `02-newsletter.md` | Mailchimp email for the `HoReCa` tag | § 2: 3 subject lines, 2 preheaders, 120–160 words, button copy, link list with UTMs |
| `03-linkedin.md` | Main post, 6-slide carousel text, first comment, plus outlines for posts 2–4 | § 3 |
| `04-instagram.md` | Collab carousel (7 slides with on-image text and alt text), caption, Stories quiz, optional Reel script | § 4 |

For each piece, say which photo goes where by its file name from the Notion pages listed in `02-facts-and-sources.md`.

## Rules

- **Facts.** Use only what is in `02-facts-and-sources.md`. If something is missing, write `[ASK: …]` rather than guessing.
- **Claims still to check.** "Used to be fridges" may appear only inside Verena's quote until the material source of each pattern is confirmed. GreenSign Circular may appear only as the article words it, until the status is confirmed. Mark both with `[CHECK]`.
- **Quotes.** Use them word for word, only from the quote table, and attribute each to Verena Brandtner-Pastuszyn, co-owner.
- **Durability first.** Lead with a year of guests and steam, then no extra effort, certificates, CNC to drawings, and the award and press. The award supports the story. The story is the washstands.
- **One CTA.** Use the merged "Planning a refit or a trip to Vienna?" CTA in the length the channel needs. Don't add a second, separate traveller CTA.
- **Style.**
  - UK spelling.
  - Polygood® on first mention, then Polygood.
  - No exclamation marks in our own copy (quotes stay as said). No "unique".
  - Pattern names exactly: Sapphire Terrazzo, Emerald Ghost, White Terrazzo.
  - Photo credit on every image. Johannsen shots: © Stadthotel Henriette / Patrick Johannsen Fotografie. supersusi shots: © Henriette Stadthotel Vienna / supersusi.com. Tag @hotel.henriette on social.
- **Plain writing.** No "not X, it's Y". No "game-changer", "innovative", "seamless", "elevate". No groups of three by habit. No em-dash punch lines. Concrete details over adjectives.
- Run `marketing:brand-review` on each draft before you finish.

## Done when

- [ ] Four files in `outputs/henriette/`
- [ ] Each piece opens with durability
- [ ] Every fact traces to `02-facts-and-sources.md`; open points marked `[ASK]` or `[CHECK]`
- [ ] One CTA per piece, the merged one
- [ ] Credits on every image, alt text on every image
- [ ] A short list at the end of each file of what still needs a human decision

## Prompt to paste into Claude Code

```text
Read campaigns/henriette-stadthotel/AGENT-BRIEF.md and follow it. Use the marketing:draft-content skill for the four pieces, then marketing:brand-review on each. Write the files to outputs/henriette/. Facts only from 02-facts-and-sources.md; anything missing goes in as [ASK: …].
```
