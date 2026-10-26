# Design brief: RELIEF, a boutique hotel with Polygood® engraved walls

Working title and building are invented for this concept. No real hotel or brand is implied.
All dimensions are in millimetres unless stated.

## 1. The idea in one paragraph

A 42-room boutique hotel in a converted 1930s concrete-frame print works. The building keeps
its raw frame and the marks of its working life. The new layers are warm, matte and made by
hand: smoked oak, lime plaster, reclaimed parquet, wool, bouclé, ceramic. The signature
material is **Polygood® Wall Tiles**: large panels of recycled polystyrene (old fridges, CD
cases, cutlery) with the tile pattern **CNC-engraved** into the surface. They go wherever water,
wear or the hotel's identity needs a surface: bathrooms, the bar front, the reception counter,
the corridors. The engraving is the hotel's ornament. Standard groove patterns give "tile
without grout"; custom reliefs (arches, flutes, waves) belong only to this hotel. Light is
designed to graze those reliefs, because flat light hides them.

**Mood:** quiet, tactile, warm, layered, crafted. "Curated calm over superficial opulence"
(Andre Fu, Dezeen 2026 trends).

**Style (closest):** custom. Warm minimalism + adaptive-reuse industrial + Japanese-style
restraint. Matte surfaces that absorb light rather than reflect it.

**Build scope:** full design (architecture, materials, furniture, lighting, cameras), in phases.

## 2. How the 2026 research shapes the design

| Trend (Dezeen 2026 hotel coverage) | Decision in RELIEF |
|---|---|
| Keep the building's layers (Jam Hotel Ghent, Hotel Sevilla, The Dean Berlin) | Concrete columns, beams and soffits stay exposed, with visible patch repairs. New work sits inside the old frame. |
| Darker woods: smoked, limed, blackened oak (Aethos, Hoxton, Arthouse, Kimpton Ashbel) | Smoked oak joinery and wall panelling. Reclaimed oak parquet on floors. |
| Lime render and textured plaster instead of painted drywall | Hand-trowelled lime plaster on all new walls and on ceilings in rooms. |
| Matte surfaces that absorb light (Astet Studio, Aethos) | Satin or matte everywhere: Polygood (matte/satin), plaster, oiled wood, wool. Gloss only on glazed ceramics. |
| Chrome back as the accent metal | Brushed chrome and stainless for taps, footrails, tubular shelving. Blackened steel for the existing windows. No brass. |
| Second-hand and restored furniture (The Hoxton) | Lounge chairs and the library sofa are "sourced vintage". Model them as mid-century pieces with visible wear. |
| Local makers named in the design (Crafted at Powdermills, Arthouse) | Ceramic lamps, willow details, mycelium pendant shades. Placeholders labelled with the maker type. |
| Built-in joinery in compact rooms (Kimpton Era "berth") | Each guest room has one continuous smoked-oak wall with wardrobe, desk and window bench. |
| Modular furniture that comes apart (OpenStructures beds at Jam Hotel) | Bolted oak bed frame with visible fixings. |
| Sunken lounge and horseshoe bar (The Dean Munich) | Sunken conversation pit in the lobby, 400 mm deep. |
| Arches (Kimpton Ashbel arches and arch chairs) | Custom "arcade" engraving on the reception counter. Arch-back dining chairs. |
| Colour drenching, olive and burnt orange (Arthouse Glasgow, Powdermills) | Library nook drenched in deep olive: walls, ceiling and joinery. Burnt orange and terracotta as accents. |
| Integrated bathroom systems (Polygood catalogue, Henriette Vienna) | Wall tiles, washstand and shower niche in one Polygood colour per bathroom. |

## 3. Polygood® Wall Tiles: what we know (from Notion)

Source pages are listed in REFERENCES.md.

- **Material:** 100% post-consumer recycled polystyrene. Solid and through-colour, with no
  laminate or coating. A groove shows the same colour as the face, and speckle chips are cut in
  section inside the groove. A knock exposes the same colour, not a substrate.
- **Formats:** slab 2800 × 1400. Tile module 700 × 700 (residential). Thickness 8 or 12
  (12 for high-impact areas). One launch post also mentions 6, so confirm.
- **Finish:** matte or satin.
- **Engraving:** grooves are CNC-machined into the panel, so a wall that looks like a hundred
  tiles is one continuous sheet with no grout. Four standard engravings at launch. Custom
  engraving: send a drawing, Polygood checks what the tooling allows, minimum order applies.
- **Install:** bonded with elastic adhesive in vertical beads. Movement joints between panels.
  Wet areas: waterproofed wall first, joints and perimeters sealed with neutral-cure sanitary
  silicone or MS sealant.
- **Selected tile samples (catalogue):** Oyster, Milky Way #PS1104, Smaragd #PS1321,
  Terracotta #PS1322. The full core palette is said to be available in tile format.
- **Launch engravings:** each catalogue tile sample carries a different groove pattern. These
  are most likely the four engravings available at launch: Smaragd, a vertical stack with wavy
  joints; Milky Way, a vertical stack; Oyster, a grid; Terracotta, a fine vertical stack.
  Photos are in `textures/samples/catalogue/`; the layouts are the `cat_` files in section 4.
- **Growth Collection:** the palette Polygood curated for wet areas (hotel bathrooms, wet
  rooms, washrooms): Cliff #PS2602, Frost #PS2603, Gossamer #PS2406, Haze #PS2407,
  Midnight #PS1707, Oyster #PS2701, Pebble #PS1906, Pumice #PS2405.
- **What each colour was made from** (Notion › All Patterns Images): Milky Way, Terrazzo Nuovo:
  refrigerators. Oyster: refrigerators and consumer electronics. Midnight, Espresso Noir: spools.
  White Lollipop: refrigerators and single-use cutlery. Emerald Ghost: home appliances.
  Translucent colours: mostly CD cases. Smaragd and Terracotta are new tile colours with no
  entry yet.
- **Numbers for captions:** ~3.7 kg CO₂e per m². About half the weight of ceramic. 1–2 hours
  to fit 4–5 m² against 12–18 hours for ceramic.
- **Hotel precedent:** Henriette Stadthotel Vienna. Washstands in Sapphire Terrazzo,
  Emerald Ghost and White Terrazzo, one colour per room scheme, steam-cleaned daily for a year
  and in "impeccable condition". Won the zeig profil award 2026.

### CNC rules the model must respect (Polygood CNC Cutting Manual)

| Rule | Value |
|---|---|
| Groove width | Equals the cutter diameter: **6.35** (1/4" end mill) or **4.0** (5/32") |
| Max depth per pass | 4.0 with 1/4", 3.0 with 5/32". Translucent patterns and Pebble: 2.5 / 2.0 |
| Design groove depth (assumption, confirm) | **2.5** on 8 mm tiles, **3.0** on 12 mm tiles |
| Groove ends and inside corners | Round, radius = cutter radius (end mill). No sharp inside corners. |
| Broad shallow fields | 80 mm (3.15") face cutter, 1 mm passes. Could make wide, very low relief bands. Ask Polygood first. |
| Groove spacing | Must divide 700, so the pattern runs on across panels and slabs |

### Colours and textures

Six patterns have photo textures in `textures/samples/`, cut from the studio photos in Notion ›
Marketing team space › All Patterns Images. Each is 2048 × 2048 px, seamless, with the studio
lighting evened out. Each texture covers 90% of the width of the photographed sample panel. The
sample size isn't recorded in Notion, so **assume one texture tile = 180 × 180 mm** and adjust
it on the material board until the chips look right. Smaragd and Terracotta have no Notion
photos yet, only the small catalogue tile photos, so they stay colour approximations.

| Pattern | Code | Texture | Average colour | Notes |
|---|---|---|---|---|
| Smaragd | #PS1321 | none yet (APPROX) | `#1C382D` | Deep green, fine tonal speckle. Colour from the catalogue tile photo |
| Terracotta | #PS1322 | none yet (APPROX) | `#853930` | Red-brown, fine tonal speckle. Colour from the catalogue tile photo |
| Milky Way | #PS1104 | `MilkyWay_PS1104.jpg` | `#D9DBD8` | Plain near-white |
| Oyster | #PS2701 | `Oyster_PS2701.jpg` | `#CCCCC8` | White and grey chips with fine dark outlines |
| Midnight | #PS1707 | `Midnight_PS1707.jpg` | `#0E0E0E` | Black with a few pale chips |
| Espresso Noir | #PS2114 | `EspressoNoir_PS2114.jpg` | `#544844` | Dark brown with pale flecks; the photo is slightly soft |
| Terrazzo Nuovo | #PS1901 | `TerrazzoNuovo_PS1901.jpg` | `#D3D3C8` | Cream terrazzo with grey, black and ochre chips |
| White Lollipop | #PS1601 | `WhiteLollipop_PS1601.jpg` | `#D8D9D6` | White with small colour chips |

**Polygood shader starting point (Principled BSDF):** roughness 0.55 (satin) or 0.65 (matte),
IOR 1.59 (polystyrene), no coat, no metallic. Inside the groove, roughness +0.1 (machined
surface). Bump from the groove height map: strength 0.8, distance 2.5 mm. For close-ups, use
real geometry or displacement, not bump.

## 4. Engraving concepts (the core of the design)

Groove layouts are generated by `tools/groove_patterns.py` into `textures/grooves/`. Each layout
has an SVG (drawing for Polygood, or curves for Blender) and a tileable PNG height map
(2 px/mm, 1400 × 1400 px = one 700 mm module).

| Layout file | Type | Where in RELIEF | Idea |
|---|---|---|---|
| `cat_wave_stack_117x350` | **Launch engraving** | Bathroom type A, Smaragd | Slim vertical tiles with wavy joints, exactly the catalogue sample |
| `cat_stack_117x350` | **Launch engraving** | Bathroom type B, Milky Way | Quiet white vertical stack |
| `cat_grid_140x175` | **Launch engraving** | Bathroom type C, Oyster | Grid over the chip pattern |
| `cat_stack_44x175` | **Launch engraving** | Bathroom type D, Terracotta | Fine, dense vertical stack in red-brown |
| `grid_175` | Standard look | Public WCs, Midnight | A dark, moody WC: black grid, chrome, one warm light |
| `tide` | **Custom** | Corner suite bathroom (Phase 3), Terracotta | Horizontal waves: water, made from what was thrown away |
| `fluted_25` | **Custom** | Bar front, Terracotta, 12 mm | Reeded relief, lit from below so every flute reads |
| `arcade` | **Custom** | Reception counter front, Milky Way | Nested arches: the hotel's own motif, "your pattern, cut to order" |
| `grid_175` | Standard look | Corridor dado, Milky Way, 12 mm | Calm large grid, with **room numbers engraved** beside each door |
| `running_bond_175x87` | Standard look | Back-bar splashback (option) | Classic brick bond, no grout |
| `herringbone_45`, `grid_50`, `stack_vertical_87x350` | Options | Alternatives for any wall | Extra layouts to test on the material board |

**Bond study:** bathrooms A–D use the same room, the same camera and the same system, each
with one of the four launch engravings in its catalogue colour. This makes the "same tile,
four bonds, four rooms" image set from the wall tile launch plan, using the real products.

**Signature detail, "one line, no joints":** in the bar and on the reception front, one
engraved horizontal line runs the full length of the counter, across the panel joints. It
shows that the surface is continuous and is cut, not grouted.

**Setting out:** start every groove field from the wall's centreline or from a defined datum
corner, never at random. A bad first row stays visible for the whole elevation (Notion, LI 5).
Panel joints fall on groove lines wherever possible.

## 5. Building and spaces

### Shell (existing, kept)

- Footprint 24 000 (X, street front, south) × 16 000 (Y). Four storeys: Ground, L1, L2, L3, plus roof.
- Structural grid: X lines A–E at 6 000 centres; Y lines 1–3 at 8 000 centres.
  Concrete columns 400 × 400. Downstand beams 400 × 500 on grid lines.
- Floor-to-floor: Ground 4 500; L1–L3 3 300. Slabs 250, exposed soffits.
- External walls 300 (brick infill in the concrete frame).
- Existing steel windows, blackened: Ground 2 400 wide × 3 200 high, sill 450, two per bay on the
  south front. Upper floors 2 400 × 2 200, sill 900, one per room.
- New partitions: guest-room party walls 150, corridor walls 150, other partitions 100.

### Ground floor (Phase 1 hero zone: lobby, reception, bar)

| Space | Where | Size | Key elements |
|---|---|---|---|
| Entrance and reception | South, bay B–C | 6 000 × 6 000 | Reception counter 3 000 × 750 × 1 050 h, front in Milky Way `arcade` with the one-line detail, top honed limestone 30 |
| Lobby lounge | South, bay C–D | 6 000 × 8 000 | Sunken pit 3 600 × 4 800, 400 deep, U-shaped built-in bouclé bench, wool rug 3 000 × 2 400 |
| Bar | South, bay D–E | 6 000 × 8 000 | Straight bar 5 000 long, worktop 600 deep at 1 100 h. Front Terracotta `fluted_25`, 12 mm. Top Polygood Espresso Noir. Brushed chrome footrail Ø40. Back bar: chrome tubular shelves over smoked-oak cupboards 900 h |
| Library nook | South, bay A–B | 6 000 × 6 000 | Drenched in deep olive `#4B5135`: walls, ceiling, joinery. Floor-to-ceiling oak shelving, vintage sofa |
| All-day dining | North, bay A–C | 12 000 × 8 000 | Polygood tabletops (White Lollipop and Terrazzo Nuovo), arch-back chairs, mycelium pendants |
| Core | North, bay C–D | 6 000 × 8 000 | Stair, lift, risers (shell only in Phase 1) |
| Public WCs | North, bay D | about 3 000 × 4 000 | Midnight `grid_175`, Polygood vanity in the same colour, chrome taps |
| Back of house | North, bay E | 6 000 × 8 000 | Shell only |

### Upper floors L1–L3 (Phase 1: one typical room + its bathroom)

- Central corridor 1 600 wide along X, between Y = 7 200 and 8 800.
- Rooms 3 000 wide on centres (party walls on every grid line and halfway between),
  7 200 deep from corridor wall to façade. South side: 8 rooms. North side: 6 rooms (core takes
  bay C–D). 14 rooms per floor, 42 in total.
- Corridor: Milky Way `grid_175` dado to 1 200 h, 12 mm (trolley knocks), lime plaster above,
  engraved room numbers 120 high next to each door, grazed by a linear light at dado top.

### Typical guest room (about 21 m²)

- Clear width about 2 850, clear depth about 6 900 (corridor wall to the inside of the façade).
  Ceiling: exposed concrete soffit with a lime-plaster raft, 3 000 clear. Bathroom ceiling
  dropped to 2 400.
- Entry zone, first 2 200 from the corridor: an entry passage 900 wide along one side wall, and
  the bathroom (1 950 × 2 200) beside it. Bathroom door 700, opening off the passage.
- Sleeping zone toward the window: bed 1 600 × 2 000, headboard against the bathroom wall,
  centred, facing the window (625 clear each side).
- From the foot of the bed to the window, along one side wall: continuous smoked-oak "berth"
  joinery, 600 deep, about 2 600 long. Wardrobe 900, desk 1 100 at 750 h, open shelf 600.
  Window bench across the window wall, 500 deep, seat 450 h. Vintage bouclé lounge chair.
  Wool rug 1 600 × 2 300. Full-height linen curtains on a ceiling track.
- Floor: reclaimed oak parquet, planks 90 × 600, straight lay (no herringbone, so the floor
  doesn't compete with the walls).
- Walls: lime plaster, warm white. Headboard: linen-upholstered, 1 100 h, on a smoked-oak
  rail. Wall-mounted oak bedside shelves with ceramic lamps.

### Guest bathroom (hero space)

- 1 950 × 2 200. Walk-in shower across the far end, 1 950 × 900, against the corridor wall,
  with an 8 mm frameless glass screen and chrome fittings. That 1 950-wide shower wall is the
  hero elevation (C05). Washstand on one side wall, wall-hung WC on the other.
- **All walls full height in Polygood Wall Tiles, 8 mm**, in one colour per bathroom type
  (A–D, section 4). Panel joints colour-matched and sealed.
- Shower niche 600 × 300 × 100 lined in the same Polygood.
- Polygood washstand 900 × 450 in the same colour, chrome tap, round mirror Ø700.
- Linear LED in a 50 mm ceiling slot 60 mm off the shower wall, to graze the grooves.

## 6. Materials library

Name every Blender material exactly as below. Shader values are a starting point. Texture
files, where they exist, take priority over procedural approximations, and approximations
keep the `APPROX` tag in their name until they are replaced. Polygood photo textures are in
`textures/samples/`, one tile = 180 × 180 mm to start with. The groove height map goes on top
at its own scale (one image = 700 × 700 mm).

| Material name | Used for | Base colour | Roughness | Other |
|---|---|---|---|---|
| `PG_Smaragd_PS1321_APPROX` | Bathroom A | `#1C382D` | 0.55 | IOR 1.59, speckle ±6% value, groove map |
| `PG_MilkyWay_PS1104` | Bathroom B, reception front, corridor dado | `MilkyWay_PS1104.jpg` | 0.55 | Groove map per location |
| `PG_Oyster_PS2701` | Bathroom C | `Oyster_PS2701.jpg` | 0.60 | Groove map |
| `PG_Terracotta_PS1322_APPROX` | Bathroom D, bar front | `#853930` | 0.55 | Groove map per location |
| `PG_Midnight_PS1707` | Public WCs | `Midnight_PS1707.jpg` | 0.60 | Groove map |
| `PG_EspressoNoir_PS2114` | Bar top | `EspressoNoir_PS2114.jpg` | 0.50 | No grooves |
| `PG_TerrazzoNuovo_PS1901` | Coffee table, dining tables | `TerrazzoNuovo_PS1901.jpg` | 0.50 | No grooves |
| `PG_WhiteLollipop_PS1601` | Dining tables | `WhiteLollipop_PS1601.jpg` | 0.50 | No grooves |
| `Oak_Smoked` | Joinery, panelling | `#5A4632` | 0.50 | Grain texture, boards 180 wide |
| `Oak_Parquet_Reclaimed` | Floors | `#8A6A4A`, varied | 0.50 | Planks 90 × 600, slight colour variation per plank |
| `Plaster_Lime_WarmWhite` | Walls, ceilings | `#E8E1D6` | 0.88 | Low-frequency trowel bump, strength 0.3 |
| `Plaster_Lime_Olive` | Library nook | `#4B5135` | 0.85 | Same bump |
| `Concrete_Existing` | Frame, soffits | `#9A968F` | 0.80 | Formwork marks, patch repairs |
| `Limestone_Honed` | Reception top, thresholds | `#D8CDB8` | 0.60 | Fine fossil speckle |
| `Chrome_Brushed` | Taps, footrail, shelving | `#C8C8C8` | 0.30 | Metallic 1, anisotropic 0.5 |
| `Steel_Blackened` | Windows | `#2A2A2A` | 0.50 | Metallic 1 |
| `Boucle_Wool` | Sunken bench, lounge chair | `#E6DFD2` | 1.00 | Sheen 0.5, fine loop bump |
| `Velvet_Olive` | Library sofa | `#4F5636` | 0.90 | Sheen 0.8 |
| `Linen_Natural` | Headboards, curtains | `#D9D0C1` | 0.95 | Weave bump |
| `Leather_Tan` | Vintage chairs | `#8A5A3A` | 0.45 | Wear on edges |
| `Ceramic_Glazed_Ochre` | Lamps | `#9C7A3C` | 0.20 | Glaze pooling |
| `Mycelium` | Pendant shades | `#D9CBB0` | 0.95 | Subsurface 0.1 |
| `Willow_Woven` | Chair seats, baskets | `#A88A5E` | 0.80 | Weave texture |
| `Wool_Rug_Earth` | Rugs | `#7A6A55` | 1.00 | Tufted bump |
| `Glass_Clear` | Shower screen, windows | white | 0.00 | Transmission 1, IOR 1.5 |

**Palette:** warm whites, sand, earthy browns, smoked oak, deep olive, burnt orange `#B5562B`
and terracotta as accents, deep green in bathroom A.

## 7. Furniture schedule

| Item | Size (w × d × h) | Material | Notes |
|---|---|---|---|
| Sunken-pit bench, U-shaped | seat depth 800, seat 420 above pit floor | `Boucle_Wool`, oak plinth | Built-in |
| Lounge chairs ×2, lobby | 750 × 800 × 700 | `Leather_Tan`, oak | Sourced vintage, mid-century |
| Coffee table, lobby | 1 200 × 600 × 350 | Polygood Terrazzo Nuovo top, oak base | |
| Reception counter | 3 000 × 750 × 1 050 | Milky Way `arcade` front, limestone top | Recessed floor uplight grazing the front |
| Bar counter | 5 000 × 600 × 1 100 | Terracotta `fluted_25` front, Espresso Noir top | LED strip under the overhang grazes the flutes |
| Bar stools ×7 | seat Ø380, 750 h | Oak seat, brushed chrome tube | |
| Back bar | 5 000 × 450 × 2 400 | Smoked oak base, chrome tubular shelves | |
| Library sofa | 2 200 × 900 × 750 | `Velvet_Olive` | Sourced vintage |
| Library shelving | floor to ceiling | `Oak_Smoked` | Books, ceramics |
| Dining tables | 700 × 700 and 1 400 × 700, 740 h | Polygood tops 20 thick, oak bases | Mix White Lollipop and Terrazzo Nuovo |
| Arch-back dining chairs | 480 × 520, seat 450 | Smoked oak, woven willow seat | |
| Pendants, dining | Ø500 | `Mycelium` | Over each table |
| Guest bed | 1 600 × 2 000 | Bolted oak frame, linen headboard 1 100 h | Visible fixings |
| Berth joinery | about 2 600 × 600 × 2 400 | `Oak_Smoked` | Wardrobe, desk, open shelf; window bench separate |
| Lounge chair, room | 700 × 750 × 720 | `Boucle_Wool` | Sourced vintage |
| Bedside lamps | Ø180 × 350 | `Ceramic_Glazed_Ochre` | Local-maker placeholder |
| Washstand | 900 × 450 × 850 h | Polygood, same colour as walls | Integrated bathroom system |

## 8. Lighting

- **Day scene:** sun from the south-west, 25° elevation, about 5 000 K, entering through the
  south windows. Sky light for fill.
- **Evening scene:** interior lights at 2 700 K. Lower overall level, pools of light, deep
  shadows.
- **Raking light is required.** Every engraved Polygood surface gets a grazing source:
  ceiling slot LEDs in bathrooms and along the corridor dado, a floor uplight for the
  reception front, an under-counter strip for the bar flutes. Flat light kills the relief.
- Pendants and table lamps give warm points. No uniform ceiling downlights.

## 9. Cameras and deliverables

Renders in Cycles with the AgX view transform. Sizes: 1920 × 1080, 1080 × 1350 (Instagram 4:5)
and 1080 × 1920 (Stories).

| Camera | Shot | Lens | Content-plan use |
|---|---|---|---|
| C01 | Lobby wide, from the entrance toward the bar, eye level 1 500 | 24 mm | Hero image |
| C02 | Bar front, low angle, raking light | 50 mm | "Engraved and plain, raking light" |
| C03 | Reception front, straight elevation | 35 mm or orthographic | "Custom engraving: your pattern, cut to order" |
| C04 | Guest room from the door toward the window | 18 mm | Room hero |
| C05 | Bathroom shower wall at room scale | 24 mm | "Full elevation, no argument" |
| C06 | Groove macro across a panel joint | 100 mm | "The joints are cut, not grouted" |
| C07 | Bond study: C05 framing in bathrooms A, B, C, D | 24 mm | "Same tile, four bonds, four rooms" |
| C08 | Engraved and plain panels side by side | 50 mm | Launch carousel |
| C09 | Corridor with engraved room numbers | 24 mm | Wayfinding detail |
| C10 | Street view (optional, Phase 2) | 35 mm | Context |

Still frames from C01–C09 can also be cut into the short "install film" the launch plan asks for.

## 10. Phases

1. **Phase 1:** IFC shell of the whole building (grid, columns, slabs, external walls, windows),
   fitted out only in the hero zones: ground-floor reception, lobby and bar; one typical guest
   room on L1 with bathroom type A. Cameras C01–C06.
2. **Phase 1b:** bathroom variants B, C, D for the bond study (C07), engraved vs plain (C08),
   corridor (C09).
3. **Phase 2:** library, dining, public WCs, all room partitions on L1–L3, roof.
4. **Phase 3:** corner suite, exterior, animation stills.

## 11. Open questions and assumptions

- **Oyster product code:** the tile catalogue prints Oyster as #PS2602. The pattern database
  (All Patterns Images) gives Oyster #PS2701 and Cliff #PS2602, and so does the Grey Sample Box
  for Cliff. This brief uses #PS2701. The catalogue probably needs a correction.
- **Wet-area palette:** the catalogue presents the Growth Collection as the wet-area range.
  Confirm that Milky Way, Smaragd and Terracotta are approved for showers too.
- **Groove depth** is assumed (2.5 on 8 mm, 3.0 on 12 mm). Confirm with Polygood.
- **Thickness options:** 8 / 12 (catalogue) or 6 / 8 / 12 (launch post).
- **Panel joint width** is assumed at 2 mm, sealed and colour-matched.
- **Smaragd and Terracotta** have no photo textures yet; ask the Polygood team for flat photos.
  The other six use studio photos from Notion at an assumed scale of 180 mm per texture tile.
- **Launch engravings:** the four `cat_` layouts are measured by eye from the catalogue tile
  photos. Confirm their names and exact sizes with Polygood.
- **Countertop and tabletop thickness** for Polygood is assumed at 20. Confirm.
- **Wet-zone approval** (constantly wet or splash only) is still an open item in the launch
  brief. For marketing renders the brief assumes full shower use, as in the catalogue.
- **Translucent patterns in tile format** are not confirmed, so they are left out.
- Hotel name, building and room count are design assumptions.
