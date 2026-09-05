# Bow Window Lounge

A real-time 3D reconstruction of a bow-window lounge in a Classical Revival
office floor, modelled from a single photograph. Open `index.html` in any
browser — it is one self-contained file with no build step.

## The room

Everything is set out from the bay: a 3.00 m radius arc swept through 104°,
carrying three double-hung sashes with a 0.95 m sill and a 2.95 m head under
a 3.55 m ceiling. A lacquered counter at 1.05 m follows the same arc, with
three moulded stools and a slatted credenza tucked under its right-hand end.
The order is Corinthian: a 20-flute shaft under a bell, two ranks of acanthus,
corner volutes and an abacus.

## Controls

| Input | Action |
| --- | --- |
| Drag | Orbit |
| Scroll | Dolly |
| Shift + drag | Pan |
| `1`–`4` | Jump to a vantage point |
| Sun slider | Hour of day, 07:00–19:00 |

The bay faces WSW (248° azimuth), so direct sun only reaches the glass through
the afternoon. Before then the room is lit by sky alone — which is why the
morning setting has no sun patch on the floor.

## Notes for anyone editing this

- Built on three.js r149 (UMD build, loaded from jsDelivr).
- **r149 leaves `ColorManagement` in legacy mode, so every `material.color`
  hex is consumed as a LINEAR triple, not sRGB.** Outdoor albedos therefore
  look implausibly dark as hex values (foliage is `0x0a1206`). Textures are
  unaffected — they carry their own `encoding`.
- The bay wall is built twice: a faceted core of boxes that gives it thickness
  and casts the shadows, and a smooth cylindrical skin that is all you ever
  see. The core is set 90 mm behind the skin; closer than that and the two
  z-fight into hairline streaks.
- Mouldings that sit against the bay stop 4 mm short of radius R for the same
  reason — nothing may share a plane with the skin.
- The sun's shadow frustum must enclose the whole room. Where it does not, the
  floor renders as though the wall were not there.
