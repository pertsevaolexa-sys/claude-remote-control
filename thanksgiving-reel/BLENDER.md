# Blender version: plan

The Remotion film is the animatic and the final edit. In Blender we remake only the table and the cooking, where 3D makes the patterns look real, and bring those shots back into Remotion as video layers. The homepage hero, the product pages, the captions, the thank-you scene and the end card stay in Remotion, so the type and layout stay exactly on brand.

## What carries over

Layout. `src/table/layout.ts` places everything in world units of about 1 mm, seen from above. Use the same numbers in Blender with the scene unit set to millimetres: x to the right, y down the table (Blender's -Y), tabletop at Z = 0. The table runs roughly from x 0 to 1040 and y 0 to 1750.

Timing. `COURSES` in the same file gives each course's frames: product page, lift, cooking, finished dish. The shot list in SCRIPT.md gives the same thing in seconds. Render each Blender shot to exactly those frame ranges at 30 fps.

Camera. `cameraAt(frame)` gives the camera centre (x, y) and zoom for every frame. An orthographic camera looking straight down matches the Remotion framing one to one: set Sensor Fit to Horizontal, Orthographic Scale to `1080 / zoom` mm, and place the camera over (x, y), offset so the dish sits at screen y 860 of 1920 (730 for the turkey). For more depth, switch to a 50 mm lens about 1.4 m up, tilted 10 degrees, and keep the same targets.

## Materials

Every surface uses a real pattern texture from `public/patterns/`. Each image is the face of a 120 × 180 mm sample (the size on the product pages), cropped to about 110 × 150 mm, so map one image to 110 × 150 mm of surface to get the true scale of the chips and veins.

| Finish on polygood.com | Patterns | Roughness |
|---|---|---|
| Gloss | Translucent Burgundy, Translucent Glitter Gold, Translucent Orange, Translucent Bronze | 0.12 |
| Satin | Marbellous | 0.35 |
| Matte | Milky Way, Frost | 0.6 |

For the Translucent Collection, add some transmission (Transmission Weight around 0.3) so light shows through thin edges. Samples are 12 mm thick, and the edge shows the same pattern as the face.

## The cooking, in 3D

Pour (cranberry sauce, cornbread, pumpkin pie). The 12 mm sample tips over the dish and shrinks while a stream runs from its lowest corner into the middle of the dish. The stream can be a curve with a bevel and the pattern material, its start and end animated, rather than a fluid simulation. The fill is a thin disc inside the dish scaling up from the centre, with a shape key for the meniscus.

Chop (mashed potatoes). Cut the sample into a 4 × 4 grid with Cell Fracture or an array of cubes, let the pieces drop into the bowl with rigid bodies, then cross over to a sculpted mash surface with the Marbellous material. The butter pat is a small Translucent Orange slab.

Roast (turkey). A modelled bird with the Translucent Bronze material. Darken the edges over the roast with an ambient-occlusion mask driving a mix towards a deeper brown, then place the sage (Translucent Glitter Green) and cranberries (Translucent Burgundy).

Steam over the hot dishes: a small smoke domain, or a few planes with a volume shader drifting up.

## Light and render

One large soft area light from the top left for daylight, a light grey world, and two small warm point lights in the candles. Cycles, 1080 × 1920, 30 fps, PNG or EXR sequences per shot.

## Back into Remotion

Replace the `World` layer in `src/scenes/TableScene.tsx` with the Blender render for that stretch of frames, for example `<Video src={staticFile("blender/table.mp4")} />` from `@remotion/media`. Leave the product pages, the cooking overlays you still want, the captions and the logo header on top. Then render as in the README.
