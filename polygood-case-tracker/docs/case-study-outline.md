# Case study outline for polygood.com

Reference: the [Jimmy Fairly case](https://polygood.com/projects/jimmy-fairly/), from the page copy pasted on 24 Sep 2026. Title and field counts come from `data/catalog.json` (48 website cases and 219 Notion projects, updated 23 Sep 2026).

polygood.com couldn't be opened from the environment where this was written, so these notes cover what the copy shows: order, case, punctuation and length. Typefaces, sizes and colours still need the live page or a screenshot.

## 1. Typography of the reference page

### Hierarchy, top to bottom

| # | Element | On the page | Case and punctuation | Length |
|---|---|---|---|---|
| 1 | Breadcrumb | Polygood by The Good Plastic Company › Projects › Polygood for eyewear brand Jimmy Fairly | As typed | 3 levels |
| 2 | Title (H1) | Polygood for eyewear brand Jimmy Fairly | Sentence case, no full stop | 6 words, 39 characters |
| 3 | Subtitle | A unique custom pattern for eyewear brand | Sentence case, no full stop | 7 words |
| 4 | Body | 2 paragraphs, links on the client and partner names | 2 of the 6 sentences end in "!" | 100 words (64 + 36), sentences of 13 to 20 words |
| 5 | Spec lines | Pattern: ‘Jimmy Fairly’ (bespoke).<br>Store location: Paris, France | `Label: value`, one per line | 2 lines |
| 6 | Similar projects | 4 cards | Card titles in capitals | Title only |
| 7 | Contact block | Have a Project in Mind? Let's talk! Then email and phone numbers | Title Case | Same on every case |
| 8 | Footer | 5 columns of links | Column headings in capitals | Same on every page |

### What it tells us

The site uses two case styles. Everything typed into a page is in sentence case: the title, the subtitle, the "Similar projects" heading, and menu items such as "All patterns" and "About us". Card titles and footer headings appear in capitals. The same title comes through as "Polygood for eyewear brand Jimmy Fairly" in the H1 and as "POLYGOOD FOR EYEWEAR BRAND JIMMY FAIRLY" on its card, so the theme adds the capitals. Type titles in normal case.

Those capitals are the main reason titles need to be short. COACH or LUSH reads at a glance on the grid. A SUSTAINABLE OFFICE SOLUTION: LIGHT FITTINGS MADE FROM RECYCLED PLASTIC (72 characters) is a block of capitals that takes a few seconds to get through.

The spec lines are the only structured text in the case itself, and the part a reader scanning for facts lands on. On this page they disagree with each other and with the body (see the fixes below).

The body is 100 words, which leaves the page to the photos. New cases can stay close to that.

Two labels break the sentence-case style: "Have a Project in Mind?" in the contact block and "Order Samples" in the footer. The section also has two names: "Case studies" in the menu and footer heading, "Projects" in the breadcrumb, the footer link and the URL.

### What the 48 titles on /projects show

| Title style | Cases | Examples |
|---|---|---|
| Name of the client, venue or product | 38 | NIKE, THE ORDINARY, SOHO BOUTIQUE TURIA HOTEL, OLO TABLE |
| Name, place | 2 | THE SCORE ACADEMY, MIAMI; BEAUREPAIRE FLAT, PANTIN |
| Sentence-style headline | 8 | A RECEPTION MADE FROM 100% RECYCLED MARBLE-EFFECT PLASTIC; EARTH-FRIENDLY STYLE: FOOT LOCKER STORE ON THE CHAMPS-ELYSÉES, PARIS; POLYGOOD FOR EYEWEAR BRAND JIMMY FAIRLY |

All 8 headlines sit at positions 15 to 23 on /projects and match Notion entries from the November 2022 bulk import. The 14 cases above them all use a name, so Jimmy Fairly's title is the older style.

The 40 name titles have a median of 3 words and 19 characters. Nine in ten are 28 characters or fewer, and the longest is COUNT ENERGY TRADING HEADQUARTERS (33). The headlines run from 36 to 72 characters.

Where there's no brand name to use, the site describes the place: RESIDENTIAL KITCHEN, CANARY ISLANDS BATHROOM, JAPANESE OFFICE CANTEEN.

Slugs made the same shift. Newer cases use the name (`/projects/coach/`, `/projects/olo-table/`). Older ones keep sentence slugs: Karl Lagerfeld lives at `/projects/a-unique-custom-pattern-for-a-legendary-fashion-brand/`. Three end in "-2" (`azul-mediterraneo-2`, `broeinest-2`, `harvey-nichols-2`), which the CMS adds when a slug is already taken.

That Karl Lagerfeld slug and the Jimmy Fairly subtitle share one phrase, "a unique custom pattern for … brand". It fits every bespoke-pattern case, so it tells the reader nothing about this one.

## 2. Fixes for the Jimmy Fairly page

| What | On the page now | Change to | Source |
|---|---|---|---|
| Partner name | Module Care | Module Carré | Notion partner field: "Module Carre (France)". Their site is module-2.com |
| Link spacing | No space between the Module Care link and "teams"; the Jimmy Fairly link has spaces inside it | One space after each link, none inside | Pasted copy |
| Pattern name | Body: "a unique Polygood pattern called Mix". Spec line: ‘Jimmy Fairly’ (bespoke) | Pattern: Mix (bespoke) | Notion pattern: Mix |
| Location | "All of their new stores in Paris" and Store location: Paris, France | Check which store the photos show | Both Notion entries point to Orléans: "Jimmy Fairly, Orlean, France" and "Jimmy Fairly Orlean" |
| Breadcrumb | "Projects" links to /projects/jimmy-fairly/ | Link to /projects/ | Pasted copy |
| Similar projects | Lists this page; the other 3 are a hotel, a table and a kitchen | 3 retail cases, such as Coach, Karl Lagerfeld and Sepiia. If the theme picks them automatically, it needs to skip the current page | Catalog categories |
| Idiom | knows a real deal about recycling | knows a thing or two about recycling | |
| Repetition | "unique" 3 times in the subtitle and first paragraph; "eyewear brand" in both title and subtitle | Once each | |
| Exclamation marks | 2 in 6 body sentences | None in the body | |
| Subtitle | "for eyewear brand" is missing an article | See the example in section 4 | |
| Spec punctuation | First line ends in a full stop, the second doesn't | No full stops | |
| Vague sentence | have now gained new meaning and impact | Cut it, or replace it with a fact | |
| Credits | None on the page | Add a Credits line | Notion credits: "Jimmy Fairly and Module Carre". No photographer recorded |

## 3. The outline

Every new case follows the existing page template in this order. Nothing needs building; the outline only fixes what goes into each slot.

```text
URL        polygood.com/projects/[client-name]/
TITLE      [Client or venue]   or   [Client], [City]
SUBTITLE   What we made, for whom or where. One line, no full stop.

BODY       Up to 150 words (the reference has 100), 2 or 3 short paragraphs, no "!"
  1  Client and brief    Who they are and what they needed. Link the client name.
  2  What we made        Pattern, what it's made from, which pieces, who designed
                         and built them. Link the partner name.
  3  Result (optional)   One fact: tonnes taken back, stores fitted, a short quote.

SPEC LINES   Label: value, one per line, no full stops
  Pattern:       [Name], plus "(bespoke)" if it was made for this client
  Application:   [What was made, in plain words]
  Location:      [City, Country]
  Credits:       Design: … · Fabrication: … · Photography: …
                 (in the order and wording the partner asks for)

IMAGES     Widest shot of the space first, then a close-up of the pattern.
           Alt text names the object, the pattern and the place:
           "Mirror frame in the Mix pattern at a Jimmy Fairly store"
SIMILAR    3 cases from the same category, never this one
```

### Title

- The client's or venue's name, spelled the way they spell it: Jimmy Fairly, Soho Boutique Turia Hotel.
- Add ", City" when the client has more than one Polygood project (Adidas has 10 locations in Notion, Karl Lagerfeld 4) or when the name alone could be anywhere, as in The Score Academy, Miami.
- If the client can't be named, describe the place plainly: Residential kitchen, Canary Islands bathroom.
- No "Polygood for…", no headlines, no colons. The description goes in the subtitle.
- Normal case, 1 to 4 words, under 30 characters.

### Subtitle

One line saying what Polygood made, for whom or where. Sentence case, no full stop, 10 words at most. It carries the description the old headline titles tried to squeeze into the title. Examples written from tracker notes:

- A bespoke pattern made from Polygood offcuts (Jimmy Fairly)
- Fleur de Sel plinths for Wallpaper* at Triennale di Milano (Material Alchemists)
- Counter and tables in Potpourri for a Denver bar (Semiprecious)

Leave out "unique", "inspiring" and lines like "gained new meaning and impact". A fact does more: "remnants of refrigerators, TV parts and keyboards" tells the reader what the material is.

### Body

- Client and brief first, then what was made, then one result if there is one.
- Polygood® on first mention, Polygood after.
- No exclamation marks.
- Link the client and the partner once each, on their names.
- Keep accents and special characters in names: Module Carré, Les Rendez-vous de la Matière, Wallpaper*.
- One spelling standard. The site mixes US and UK now: "utilized" and "Colorful splash" next to "Take-back programme" and the `/the-colourful-splash-collection/` URL. With UK spelling no URL has to change, so it's the smaller switch.

### Spec lines

Pattern, Application and Location on every case; Credits whenever Notion has them. "Store location" becomes "Location" so the same label works for offices, homes and events. Write pattern names without quotes, as the body already does ("called Mix").

### Where the facts come from

Notion covers most of the spec lines. The story (brief, result, numbers) usually isn't there, so plan to ask sales or the partner. Counts are for the 129 projects that don't have a case yet.

| Outline slot | Tracker field (from Notion) | Filled in |
|---|---|---|
| Title | Project name. Drop photo and licence notes such as "(P. Johannsen)" or "- Licensed Photos" | 129 |
| Location | Country, plus the city in the project name | 115 have a country |
| Pattern | Pattern | 112 |
| Application | Made from Polygood | 124 |
| Similar projects | Category and type | 121 have a type |
| Credits | Credits and Partner | 71 have credits, 28 a partner |
| OK to publish? | Photos & rights | 73 have professional photos, 29 an agreement attached |
| Brief, result, numbers | Not in Notion | Ask sales or the partner |

## 4. Example: Jimmy Fairly in the outline

Only facts from the current page and Notion. The location stays open until someone checks it.

```text
URL        polygood.com/projects/jimmy-fairly/   (keep)
TITLE      Jimmy Fairly
SUBTITLE   A bespoke pattern made from Polygood offcuts

BODY
French eyewear brand Jimmy Fairly knows a thing or two about recycling. For its
new stores in [Paris or Orléans: check], we created Mix, a Polygood® pattern
made only for them.

Mix is made from offcuts of other Polygood panels. It contains remnants of
refrigerators, TV parts, kitchen appliances, keyboards, mice and even spools.

The mirror frames, coasters, desks and tables in the store are made from it.
We worked on the project with the Jimmy Fairly and Module Carré teams.

Pattern: Mix (bespoke)
Application: Mirror frames, coasters, desks, tables
Location: [Paris or Orléans], France
Credits: Jimmy Fairly, Module Carré

SIMILAR    Coach · Karl Lagerfeld · Sepiia
```

Notion lists stands, shelves, countertops, retail fixtures and decoration elements for this project, which the page doesn't mention; check the Application line against the photos. No photographer is recorded, so ask before adding a photo credit.

## 5. Before publishing

- [ ] Photos cleared for the website: Photos & rights checked in the tracker, and any licence still valid (Nike Manchester's expired on 17 Jul 2026)
- [ ] Credits worded and ordered as the partner asks (Samji wants the first credit line, with a link)
- [ ] Not NDA or internal-only
- [ ] Names and accents checked against Notion and the partner's own site
- [ ] Pattern names match Notion
- [ ] Slug is the short name, with no "-2"
- [ ] 3 similar projects from the same category, not this page
- [ ] No "unique", no "!", and every paragraph has at least one fact
- [ ] Tracker updated: Ready to publish, then Published with the link
