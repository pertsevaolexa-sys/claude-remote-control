# WordPress code for four new case studies

Four case studies from the Notion page "Polygood® case study pages", ready to paste into polygood.com. The text is copied word for word from Notion as of 30 Sep 2026.

| Case | Content file | Slug |
|---|---|---|
| De Bijenkorf | `de-bijenkorf.html` | `de-bijenkorf` |
| Henriette Stadthotel, Vienna | `henriette-stadthotel.html` | `henriette-stadthotel` |
| Orion, Paris | `orion.html` | `orion` |
| ONE DUST Studio, Taipei | `one-dust-studio.html` | `one-dust-studio` |

- **Content files:** each holds the subtitle, body, spec lines and links. The code is plain HTML with no inline styles, so the theme's own fonts and colours apply. Special characters (®, ß, –, ·, ©) are written as HTML entities, so they survive any editor.
- **`seo.md`:** every SEO field for each page, plus the alt text, title and caption for each photo.

## How to add a case

The Notion page "WordPress instructions" has a video called "How to add and edit case studies" with the site's own steps. In short:

1. Create a new case study and type the **Title** from the list below.
2. Paste the content:
   - **Block editor:** add a **Custom HTML** block and paste the whole file.
   - **Classic editor:** switch to the **Text** tab and paste the whole file.
3. **Subtitle:** each file starts with the subtitle as an `h2`. If the case template has its own subtitle field, move the text there and delete the `h2`.
4. **Photos:**
   - Upload the photos for the case from `polygood-case-study-images.zip` and fill in the alt text, title and caption from `seo.md`.
   - Photo 01 is the widest shot. Use it as the **featured image** and put the rest in a Gallery block, where the comment at the end of the file marks the spot.
5. **SEO box:** fill in the slug, focus keyphrase, SEO title and meta description from `seo.md`. In the social tab, add the social title, description and the `-social-1200x630.jpg` image.
6. Pick the similar projects.
7. **Preview:** click every link once. This environment couldn't open polygood.com or the partner sites, so the links come from search results and the Notion sources.
8. **Publish**, then translate the page the usual way (the Notion page has a video on translations).

The "About The Good Plastic Company" paragraph from the Notion parent page is left out, because the live case pages don't carry one.

## Page fields

### De Bijenkorf

- **Title:** De Bijenkorf
- **Category:** Retail
- **Similar projects:**
  - [Harvey Nichols](https://polygood.com/projects/harvey-nichols-2/)
  - [Karl Lagerfeld](https://polygood.com/projects/a-unique-custom-pattern-for-a-legendary-fashion-brand/)
  - [Adidas](https://polygood.com/projects/adidas/)

### Henriette Stadthotel, Vienna

- **Title:** Henriette Stadthotel, Vienna
- **Category:** Hospitality
- **Similar projects:** the Notion page has none. Suggested:
  - [Hotel Rosalie](https://polygood.com/projects/hotel-rosalie/)
  - [Soho Boutique Turia Hotel](https://polygood.com/projects/soho-boutique-turia-hotel/)
  - [Canary Islands Bathroom](https://polygood.com/projects/canary-islands-bathroom/)

### Orion, Paris

- **Title:** Orion, Paris
- **Category:** Office
- **Similar projects:**
  - [Japanese Office Canteen](https://polygood.com/projects/japanese-office-canteen/)
  - Kaleidos Office Headquarters (its address isn't in the tracker)
  - [Next Media Kitchens](https://polygood.com/projects/next-media-kitchens/)

### ONE DUST Studio, Taipei

- **Title:** ONE DUST Studio, Taipei
- **Category:** Furniture or design, whichever the site uses
- **Similar projects:**
  - Material Alchemists (its address isn't in the tracker)
  - [Jeudi Studio Furniture](https://polygood.com/projects/jeudi-studio-furniture/)
  - Regina Lamp Collection (its address isn't in the tracker)

## Photos

`polygood-case-study-images.zip` has one folder per case.

- **Case photos:** copies of the photos on the Notion case pages, resized to 2,400 px on the long side and saved as JPEG. That makes them 160 KB to 1.3 MB each, down from up to 34 MB.
- **Social image:** one 1200 × 630 px crop of photo 01 per case, the size Facebook, LinkedIn and X use for link previews.
- **`image-seo.txt`:** the alt text, title and caption for every photo, the same as in `seo.md`.

Four photos are small, about 840 to 1,090 px wide: Orion 02 and 03, and De Bijenkorf 02 and 03. They are fine in a gallery but too small for a full-width banner.

## Before publishing

- [ ] **ONE DUST:** Notion only records social media use for these photos, so ask the studio before putting them on the website.
- [ ] **De Bijenkorf:** check the rights for the photos and who took photos 02 and 03.
- [ ] **Orion:** ask Samji for the photographer's name for the captions. The credits line already starts with Samji and a link, as Samji asked.
- [ ] **Henriette:** the credit line already names the photographer and the hotel.
- [ ] Every link opens the right page.
- [ ] Tracker updated: Ready to publish, then Published with the link.
