# The Polygood® Kitchen Edit (November 2026)

One story in four chapters, "The life of a worktop". The bold intro explains the idea, and the story leads to the open call to kitchen makers at the end ("Your workshop could write the next chapter"). Each chapter is one kitchen and one job a worktop has to do:

1. **01 Shaped: the curve.** A private home in Paris. Samji Studio thermoformed an Emerald Ghost worktop and made a matching table.
2. **02 Fitted: the edge.** Maison Kyka, Paris. Samji Studio made Terrazzo Nuovo worktops; the solid edge needs no edging strip and is cut into a wave.
3. **03 Lived in: stains and care.** Station Road, UK. WUNSCH fitted a White Lollipop worktop. The chapter covers the stain test, sanding marks out, and daily care.
4. **04 Renewed: water and the next refit.** Commerzbank, Amsterdam, designed by CBRE Design Collective. The chapter covers the undermount sink in Timeless Duo Blue and the take-back programme.

The layout is `"layout": "story"`: each chapter is a square photo beside a short text. The photos show the whole room (portrait, `pt-*.jpg`); the close-ups stay in the header strip. Under each photo is a sample card: swatch, pattern name and code, and an "Order sample" bar, all one link. In the text column come the chapter label, the client name with the firms' logos at the right, the story, a filled "See the project" button and the credits. On phones the photo and text stack. Colours come from the Polygood brand palette: blue is the main colour and olive the accent (see `theme` in `copy.json`).

The claims come from polygood.com: the tech guide, stain test, cleaning guide, take-back page and material data.

## Files

- `copy.json`: all the words, links, credits and image names. Edit here, then rebuild:
  `python3 build_email.py 2026-11-kitchens/copy.json 2026-11-kitchens`
- `mailchimp-code-block.html`: everything under the header. Paste it into a Mailchimp **Code** block, not a Text block, because Text blocks underline the buttons.
- `mailchimp-hero.html`: the Project Edit header with this edition's photo strip.
- `mailchimp-full-email.html`: the whole email, for Mailchimp's "Paste in code".
- `preview.html`: open in a browser to check.
- `images/`: case photos at 1200px wide, the header strip at 720×420, and swatches at 240×240. The swatches are cropped from the official pattern images on polygood.com.

## Before sending

- [ ] **Images.** They point to this GitHub repository, which is now private, so they don't load for readers. Either make the repository public, or upload the files in `images/` (photos, swatches and logos) to Mailchimp and paste each URL into `copy.json`. A case takes it as `image_url`, a pattern as `swatch_url` and the header as `hero.image_url`. Then rebuild.
- [ ] **Project pages.** Publish the four pages on polygood.com. All four buttons return 404 until then:
  `/projects/maison-kyka-paris/`, `/projects/thermoformed-kitchen-paris/`, `/projects/station-road-kitchen/`, `/projects/commerzbank-amsterdam/`.
- [ ] **Samji photographer.** Confirm the photographer's name for both Samji projects. The credits say "Photography: Samji Studio". Samji asks to be on the first credit line with a link to ateliersamji.com, which is done.
- [ ] **Commerzbank credits.** CBRE asks for both names under the pictures: CBRE Design Collective and Commerzbank AG. Both are in place. Ask CBRE for the photographer's name and for their logo (it couldn't be downloaded).
- [ ] **Logos.** Confirm Samji Studio, Maison Kyka, WUNSCH and Commerzbank are happy for their logos to appear.
- [ ] **Partner box.** If you'd rather receive partner enquiries at an email address than through the contact form, change `partner.button_url` to a `mailto:` link.

## Facts deliberately left out

These are not confirmed in Notion, so the copy doesn't state them:
- what Kyka or Maison Kyka is
- which part of the Paris kitchen is thermoformed
- the town for Station Road
- the WUNSCH brief
- the Notion draft's "deep blue" for Timeless Duo Blue (it is white with blue flecks)
- the draft's claim about invisible glued joints
- Cradle to Cradle: the certificate on polygood.com expired on 11 June 2026
- CO2 figures: they differ between the polygood.com pages
- "certified food safe": the evidence is a test report, so the copy says "tested for food contact"
- any partnership terms

There are no performance claims, and nothing about what the material used to be.
