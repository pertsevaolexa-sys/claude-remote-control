# Stage prompts

Paste one stage at a time into Claude Code, started in this folder. Wait for the report and
approve it before going on. Each stage ends with a saved, incrementally numbered .blend file.

---

## Stage 0: check the setup (changes nothing)

```
Stage 0. Read CLAUDE.md and BRIEF.md. List the Bonsai MCP tools you can use, and say which of
them create IFC elements and which only run Blender Python. Inspect the open Blender scene:
objects, collections, materials, units, render engine, and whether an IFC project is loaded.
Check that textures/grooves/ has the eight .png height maps. Do not change anything. Report
what you found and anything that blocks the brief.
```

## Stage 1: modelling plan (changes nothing)

```
Stage 1. Write the modelling plan for Phase 1 from BRIEF.md: the IFC shell of the whole
building, plus the fitted-out hero zones (ground-floor reception, lobby and bar; one typical
L1 guest room with bathroom type A). List every IFC entity you will create with its
dimensions, the collections, the materials, and the setting-out point for each Polygood wall.
Note every assumption you add. Do not build anything yet. Wait for my approval.
```

## Stage 2: IFC shell

```
Stage 2. Build the approved shell in Bonsai: IfcProject, IfcSite, IfcBuilding, the five
storeys, the grid A–E / 1–3, columns, beams, slabs, external walls and the existing windows
for the whole building. Then the Phase 1 partitions on Ground and L1, and IfcSpaces for
Reception, Lobby, Bar, Room L1-01 and Bathroom L1-01. Name every element. Show me a viewport
screenshot from the south-west and a plan view of Ground and L1. Save relief_v001.blend.
List which objects are IFC and which are visual-only.
```

## Stage 3: material board

```
Stage 3. Create every material in the BRIEF materials library, named exactly as listed. Build
the Polygood materials so the groove height map from textures/grooves/ maps one image to
exactly 700 x 700 mm, with bump strength and distance as given. In a separate collection
"99_MaterialBoard", lay out one 700 x 700 sample of each Polygood colour and groove pairing
from section 4, plus 300 x 300 samples of the other materials, under one raking light from
the left. Render the board at 1920 x 1080 and show it to me. Do not assign materials to the
building yet. Save relief_v002.blend.
```

## Stage 4: Polygood surfaces

```
Stage 4. Model the Polygood surfaces for Phase 1 as real panels: 8 mm (12 mm on the bar
front), 700 mm modules, 2 mm sealed joints, laid out from the setting-out points in the plan.
Bathroom L1-01: Smaragd stack_vertical_87x350 on all walls, plus the niche and washstand.
Reception front: Milky Way arcade, with the one-line horizontal groove across all panels. Bar
front: Terracotta fluted_25. Make them IfcCovering (CLADDING) with Pset_PolygoodWallTile.
Check that grooves line up across every panel joint and show me close-ups of two joints.
Save relief_v003.blend.
```

## Stage 5: other finishes, joinery and furniture

```
Stage 5. Assign the remaining materials to the Phase 1 architecture (parquet, lime plaster,
exposed concrete, limestone, blackened steel windows). Build the joinery and furniture for
the hero zones from the BRIEF furniture schedule, at true size: sunken lounge and bench, bar
and back bar, stools, reception counter, guest-room bed, berth joinery, window bench, lounge
chair, rug, curtains, bathroom fittings. Keep "sourced vintage" pieces visibly worn. Show me
the viewport from C01 and C04 positions. Save relief_v004.blend.
```

## Stage 6: lighting and cameras

```
Stage 6. Set up the day and evening lighting from the brief, with the required grazing
lights on every engraved Polygood surface. Create cameras C01–C06 with the lenses listed.
Do quick low-sample renders from each camera, for both the day and the evening scene, and
show them to me. Tell me where the relief does not read and how you would fix it. Save
relief_v005.blend.
```

## Stage 7: bond study and launch shots

```
Stage 7. Make bathroom variants B (Milky Way herringbone_45), C (Oyster grid_50) and D
(Terracotta tide) as separate collections that swap with bathroom A, without duplicating the
architecture. Set up C07 (same framing as C05 for A–D), C08 (engraved and plain panels side
by side) and C09 (corridor with engraved room numbers on a Milky Way grid_175 dado). Render
test frames. Save relief_v006.blend.
```

## Stage 8: final renders and report

```
Stage 8. Render C01–C09 in Cycles at final quality, at 1920 x 1080, plus 1080 x 1350 versions
of C02, C05, C06 and C07. Save them to renders/. Export the IFC model to relief.ifc. Then
validate the scene and give me the final report: what was built, what is IFC and what is
visual-only, every material still marked APPROX or TEXTURE_NEEDED, and every assumption and
open question.
```

---

## Useful extra prompts

**Swap in real Polygood textures** (once you have sample photos):
```
I have put photos of real samples in textures/samples/. Replace the APPROX or TEXTURE_NEEDED
colour in each matching Polygood material with the photo as a seamless texture at the true
scale (ask me for the scale if it is not in the file name). Keep the groove maps as they are.
Rename the materials without the tag and show me the material board again.
```

**Try a new custom engraving:**
```
Add a new layout to tools/groove_patterns.py called <name>: <describe it>. Its spacing must
divide 700 mm and inside corners must have at least the cutter radius. Run the script, show me
the preview, then put it on the <surface> in place of the current layout.
```

**Phase 2:**
```
Phase 2 from BRIEF.md: library, dining room, public WCs (Midnight grid_175), all guest-room
partitions on L1–L3 with the typical room repeated, and the roof. Plan it first and wait for
my approval.
```
