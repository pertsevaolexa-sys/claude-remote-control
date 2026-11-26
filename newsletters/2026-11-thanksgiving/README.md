# Polygood® newsletter: Thanksgiving edition (send 27 November 2026)

Email-ready HTML for the whole database. Four projects, framed as a Thanksgiving menu: Sea Containers London to start, De Bijenkorf as the main, Paagman and Solané on the side.

| File | What it is |
|---|---|
| `email.html` | The newsletter. 600 px, table layout, inline styles, Mailchimp merge tags in the header and footer |
| `images/` | 11 images, about 690 KB in total, sized at 2× for sharp screens |
| `plain-text.txt` | Plain-text version for the campaign's text part |
| `polygood-thanksgiving-2026-mailchimp.zip` (not committed) | `index.html` + `images/`, for Mailchimp's *Code your own → Import zip* |

## Subject line and preheader

- **Subject:** Four projects we’re thankful for (32 characters)
- **A/B alternative:** Sea Containers London, De Bijenkorf and two more (48)
- **Preheader** (already in the HTML): Sea Containers London, De Bijenkorf, Paagman and Solané (55)
- **From name:** Polygood® by The Good Plastic Company (or your usual sender name)

The send date is Black Friday, so most inboxes will be full of sales mail. A thank-you subject with no offer in it should stand out among them.

## Structure

1. Header on a dark espresso band: “Four projects we’re thankful for”, a short lead, *Today’s menu* (doubles as the table of contents) and a row of five pattern samples set like plates. The caption calls the source materials “our favourite kind of leftovers”.
2. **To start:** Sea Containers London, Thames Suites (Lore Group). Hero photo plus two smaller ones.
3. **Main:** De Bijenkorf, Private Shopping (the new Milenka Backx photographs). Large photo plus two smaller ones.
4. **On the side:** Paagman, Lange Poten (The Hague) and Solané (Zurich) in two columns. The columns stack on phones.
5. The material line, a thank-you in four languages (cheers, dank je wel, merci vielmal, happy Thanksgiving), then *Order samples* and *See all projects*.
6. Footer with Instagram, LinkedIn, *Talk to our team* and the Mailchimp permission, address and unsubscribe tags.

Each project opens with a thank-you in the local language: *Cheers, Lore Group* · *Dank je wel, De Bijenkorf* · *Bedankt, Paagman* · *Merci vielmal, Solané*.

## Colour scheme

Brand base: paper `#F5F4F1`, ink `#252525`, hairline `#D9D6D0`, from the TGPC design system. The Thanksgiving accents are taken from the materials in this edition:

| Token | Hex | From | Used for |
|---|---|---|---|
| Espresso band | `#2B1E17` | Translucent Bronze and Espresso Noir | Header and footer |
| Bronze | `#8A4F2A` | Translucent Bronze | Thank-you lines on paper (5.9:1 on paper) |
| Bronze light | `#D9A577` | Translucent Bronze highlights | Labels on the espresso band (7.4:1) |

Secondary text uses `#6B6762` instead of the brand `#77736E`. The brand grey is 4.3:1 on paper, below the 4.5:1 that small captions need.

The colours of the four projects:

- Sea Containers London: black, blue and teal-grey, with brass and citrus in the hero shot.
- De Bijenkorf: cream, taupe and burl-wood brown. This is the most autumnal set of photos.
- Paagman: cobalt blue, salmon pink, mint and a black-and-white floor. It is the brightest and coolest of the four. It sits in the side column at half width, so it doesn’t fight the warm header.
- Solané: bronze-brown counter, paper lantern, maple and concrete.

## Before sending: checklist

- [ ] **Publish the Sea Containers London case** at `polygood.com/projects/sea-containers-london/`. Its hero photo and button link there, and the page returns 404 today (checked 26 Nov). If it can’t be live by send time, change both links to `https://polygood.com/projects/`.
- [ ] **De Bijenkorf link** goes to the existing case (`/projects/de-bijenkorf/`, Salmon Terra stands). Ideally add the Private Shopping photos to that page before sending.
- [ ] **Solané patterns.** Translucent Bronze (#PS1302) and Espresso Noir (#PS2114) were identified from the photos, and the case draft still says “to confirm”. Check with Andreas Spörri or the invoice for order U-10865. If they can’t be confirmed, remove the two pattern names from the Solané text and point its link to `/projects/`.
- [ ] **Paagman is in The Hague**, not Rotterdam: Lange Poten 13-15, Den Haag, per the Project images entry.
- [ ] **Image rights for a newsletter.** Sea Containers London cleared the photos for “website and social channels”, and De Bijenkorf for “Instagram and a website case study”. A newsletter is usually treated the same way. If you want it in writing, ask Anna Ashmore (Sea Containers) and Gonnie Janssen (De Bijenkorf) for a one-line OK. Paagman (“free to publish”) and Solané (“happy for us to post”) are covered.
- [ ] Send a test to Gmail, Outlook and an iPhone. Mailchimp fills in the `*|…|*` merge tags at send time, so the local preview shows them raw.

## Credits used (as each partner asked)

| Project | Credit line in the email | Source |
|---|---|---|
| Sea Containers London | Sea Containers London · Photography: James McDonald | Notion case, Anna Ashmore email 16 Nov 2026 |
| De Bijenkorf | New photography: Milenka Backx · Design: Random Studio | Gonnie Janssen email 16 Nov 2026 |
| Paagman | Photography: Fleur Huijsdens (from the file name); design ACES of SPACE and +31 ARCHITECTS in the text | Project images entry: “Mention Paagman and designers” |
| Solané | Photography: Solané | Andreas Spörri email 3 Nov 2026: credit Solané, not Pelikamo |

## Links in the email

| Where | URL |
|---|---|
| Sea Containers London (photo and button) | https://polygood.com/projects/sea-containers-london/ (publish first) |
| De Bijenkorf (photo and button) | https://polygood.com/projects/de-bijenkorf/ |
| Paagman | https://polygood.com/product/sapphire-terrazzo/ |
| Solané | https://polygood.com/product/translucent-bronze/ |
| Order samples | https://polygood.com/order-samples/ |
| See all projects | https://polygood.com/projects/ |
| Footer | Instagram, LinkedIn, https://polygood.com/contact-us/ |

Pattern codes and origins were checked against polygood.com on 26 Nov 2026: Reverse Timeless Duo #PS1202, Sapphire Terrazzo #PS1801 (blue spools), Salt Dune #PS1701 (white spools), Translucent Bronze #PS1302 (CD cases) and Espresso Noir #PS2114.

## Import into Mailchimp

1. *Create → Email → Code your own → Import zip*, then choose `polygood-thanksgiving-2026-mailchimp.zip`. Mailchimp uploads the images and rewrites their paths.
2. Paste the subject and preheader. The preheader is already in the HTML, so leave Mailchimp’s preview-text field empty or paste the same line.
3. Paste `plain-text.txt` into the plain-text version.
4. Send the tests, run the checklist above, then schedule.

Fonts: PP Neue Montreal is set first in the font stack. Most inboxes don’t have it and fall back to Helvetica Neue, Helvetica or Arial. The logo and pattern labels are images set in PP Neue Montreal.
