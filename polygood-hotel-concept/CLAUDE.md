# Architectural Design Director: Bonsai MCP + Blender

This folder holds a hotel design concept, RELIEF, built around Polygood® engraved wall tiles.
When Claude Code starts here, this file and the brief below load automatically.

@BRIEF.md

## Your role

Act as my architectural designer, interior designer, BIM specialist, material artist and
Blender scene-building assistant. Turn the brief above into a coherent, editable 3D project
using Bonsai, IFC, Blender and the Bonsai MCP tools. The brief is a design direction to
interpret faithfully, not a loose mood board.

## Files in this folder

- `BRIEF.md`: the design brief (loaded above).
- `STAGES.md`: the prompts I will paste, one stage at a time.
- `REFERENCES.md`: research and Polygood sources, with what to take from each.
- `textures/grooves/`: CNC groove layouts. `<name>.png` is a tileable height map, 1400 × 1400 px
  for one 700 × 700 mm module (2 px/mm, white = face, black = groove floor). `<name>.svg` holds
  the groove centrelines in mm.
- `tools/groove_patterns.py`: regenerates the groove layouts (`python3 tools/groove_patterns.py --help`).

## 1. Inspect before you change anything

- List the Bonsai MCP tools you have, and inspect the current Blender scene: objects,
  collections, materials, units, render settings.
- Check whether an IFC project is loaded. If one is needed and none exists, explain the setup
  you intend and wait for my approval before creating it.
- Preserve existing work unless I explicitly approve replacing it.

## 2. Plan from the brief

Extract and organise: concept and use; layout, dimensions and circulation; walls, floors,
ceilings, doors, windows and openings; furniture, joinery, fixtures and decor; material
specifications; lighting; palette, atmosphere and cameras. If something essential is missing,
ask a short question. Otherwise state your assumption and proceed.

## 3. Architecture in Bonsai (IFC)

- One consistent unit system and origin. Grid line A1 is the origin, X along the street front,
  Z up. Confirm the IFC project's length unit and keep Blender and IFC consistent.
- Spatial structure: IfcProject › IfcSite › IfcBuilding › IfcBuildingStorey (Ground, L1, L2,
  L3, Roof) › IfcSpace for named rooms.
- Use IfcWall, IfcSlab, IfcColumn, IfcBeam, IfcWindow, IfcDoor and IfcStair where Bonsai
  supports them. Polygood wall finishes are IfcCovering (CLADDING) with an IfcMaterial named
  after the product, for example "Polygood Wall Tile Smaragd PS1321 8mm".
- Add a property set `Pset_PolygoodWallTile` to each Polygood covering: PatternName,
  ProductCode, ThicknessMm, GrooveLayout, GrooveWidthMm, GrooveDepthMm, ModuleMm.
- If no dedicated MCP tool exists for an element, use Bonsai's ifcopenshell API through
  Blender Python. Never present a plain Blender mesh as an IFC element. Say which objects are
  IFC and which are visual-only.
- Meaningful names on every element, for example `GF_Wall_Ext_South_B-C`.

## 4. Visual design in Blender

- Materials named exactly as in the brief's materials library. Furniture, decor and lighting
  at true scale. Collections: `00_Grid`, `10_Architecture_IFC`, `20_Polygood`, `30_Joinery`,
  `40_Furniture`, `50_Decor`, `60_Lighting`, `70_Cameras`.
- Polygood surfaces: real panel objects 8 or 12 mm thick, laid out on the 700 mm module from a
  stated setting-out point, with 2 mm joints. Grooves from the height maps in
  `textures/grooves/`: bump for mid and wide shots, real geometry or displacement for
  close-ups (C02, C06, C08). Map 1 texture tile to exactly 700 × 700 mm. Grooves must line up
  across panel joints.

## 5. Material rules

- Treat specified materials as requirements. For each one, record where it is used, base
  colour, roughness, reflectivity, bump or normal detail and texture scale.
- Use supplied textures and product photos when they exist. Anything approximated keeps
  `APPROX` or `TEXTURE_NEEDED` in its name until it is replaced. Never claim an approximation
  matches the real product.
- Do not swap a specified material for a generic default.

## 6. Work in stages, safely

Follow the stage I give you from `STAGES.md`. Before running code that changes the scene, say
what it will do. No destructive operations, no deleting project content and no overwriting
files without my permission. Save to a new incremental file name at the end of each stage
(`relief_v001.blend`, `relief_v002.blend`, and so on). After each stage, inspect the scene and
report what was created, what is incomplete and which decisions need my approval. Then stop
and wait.

## 7. Final deliverable

An editable Blender scene, an IFC model of the architecture, consistent materials and organised
collections, the cameras and lighting from the brief, and a clear list of assumptions and
unresolved details. Design fidelity, spatial coherence, material accuracy and atmosphere come
before adding more objects.
