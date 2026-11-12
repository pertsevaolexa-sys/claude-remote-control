# The Polygood® Project Edit: kitchens (November 2026)

Four projects and a call for kitchen-making partners:

1. **Maison Kyka, Paris**: Terrazzo Nuovo worktops in two apartment kitchens, made by Samji Studio.
2. **A thermoformed kitchen, Paris**: an Emerald Ghost worktop and matching table, made by Samji Studio.
3. **Station Road, UK**: a White Lollipop worktop, cut and fitted by WUNSCH.
4. **Verloskundigenpraktijk Oost, the Netherlands**: Espresso Noir tables in a midwifery practice designed by Studio Anne Witten and Maaike Veenstra Interieur. This one is not a kitchen. It runs as "Beyond the kitchen".

After the cases comes a boxed call for kitchen makers ("We're looking for kitchen makers"). Its "Get in touch" button opens https://polygood.com/contact-us/. Then comes the closing line.

## Files

- `copy.json`: all the words, links, credits and image names. Edit here, then rebuild:
  `python3 build_email.py 2026-11-kitchens/copy.json 2026-11-kitchens`
- `mailchimp-code-block.html`: everything under the header. Paste it into a Mailchimp **Code** block, not a Text block, because Text blocks underline the buttons.
- `mailchimp-hero.html`: the Project Edit header with this edition's photo strip.
- `mailchimp-full-email.html`: the whole email, for Mailchimp's "Paste in code".
- `preview.html`: open in a browser to check.
- `images/`: case photos at 1200px wide, the header strip at 720×420, and swatches at 240×240. The swatches are cropped from the official pattern images on polygood.com.

## Before sending

- [ ] **Images.** They point to this GitHub repository, which is now private, so they don't load for readers. Either make the repository public, or upload the nine files in `images/` to Mailchimp and paste each URL into `copy.json`. A case takes it as `image_url`, a pattern as `swatch_url` and the header as `hero.image_url`. Then rebuild.
- [ ] **Project pages.** Publish the four pages on polygood.com. All four buttons return 404 until then:
  `/projects/maison-kyka-paris/`, `/projects/thermoformed-kitchen-paris/`, `/projects/station-road-kitchen/`, `/projects/verloskundigenpraktijk-oost/`.
- [ ] **Samji photographer.** Confirm the photographer's name for both Samji projects. The credits say "Photography: Samji Studio". Samji asks to be on the first credit line with a link to ateliersamji.com, which is done.
- [ ] **Verloskundigenpraktijk Oost credits.** The permission is "use with the appropriate credits", and they are in place: Studio Anne Witten, Maaike Veenstra Interieur, and By Luna Photography (linked). On social media, tag @studio_anne_witten, @maaike.veenstra.interieur and @by.luna.photography.
- [ ] **Partner box.** If you'd rather receive partner enquiries at an email address than through the contact form, change `partner.button_url` to a `mailto:` link.

## Facts deliberately left out

These are not confirmed in Notion, so the copy doesn't state them:
- what Kyka or Maison Kyka is
- which part of the Paris kitchen is thermoformed
- the town for Station Road
- the WUNSCH brief
- the city of the midwifery practice (the photo files say Utrecht)
- who made the practice's tables
- the claim in the Notion draft that the table surface can be cleaned with disinfectant
- any partnership terms

There are no performance claims, and nothing about what the material used to be.
