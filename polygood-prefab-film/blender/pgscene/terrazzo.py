"""Procedural recycled-plastic terrazzo, solid through the panel.

Chips are 3D Voronoi cells shrunk away from their edges, so every face of a
part (top, sawn edge, profiled edge) cuts through the same chips, the way a
pressed panel does, and the pattern stays sharp at any zoom. Coordinates are
real sheet millimetres (the "tex_off" object property, as in materials.py),
so a part cut from the sheet keeps the chips it had in the sheet.

A palette is a mottled base plus weighted chip colours. Colourway names here
are working names for choosing a look, not Polygood product names.
"""

from .materials import _combine, _finish, _hex, _math, _mix_color, _new

PALETTES = {
    # Polygood #PS1801 Sapphire Terrazzo. Chip colours and their shares are
    # measured from the flat studio photo in the pattern's Notion page
    # (29_Sapphire_Terrazzo.jpg), with the vivid accents seen in the close-ups.
    "sapphire": {
        "label": "Sapphire Terrazzo #PS1801",
        "style": "packed",
        "binder": "#3B4B57",
        "chips": [
            ("#4D80AF", 0.125),
            ("#538BB5", 0.124),
            ("#456AAD", 0.109),
            ("#4475AB", 0.105),
            ("#5E95BA", 0.102),
            ("#5C82CA", 0.094),
            ("#2E519E", 0.082),
            ("#6CA0C1", 0.067),
            ("#3B699A", 0.066),
            ("#538CCF", 0.049),
            ("#4D6671", 0.033),
            ("#415761", 0.033),
            ("#7C82CF", 0.022),
            ("#2B45B5", 0.05),
            ("#1E8CC8", 0.045),
            ("#2A7F9C", 0.03),
            ("#1E2F78", 0.035),
            ("#83AFCA", 0.012),
            ("#2B3640", 0.075),
        ],
        "granules": [(c, 1) for c in ("#4D80AF", "#538BB5", "#456AAD", "#4475AB", "#5E95BA", "#5C82CA", "#2B45B5", "#1E8CC8")],
    },
    # Polygood #PS1202 Reverse Timeless Duo: near-black recycled polystyrene
    # with sparse white flakes. Measured from the pattern's Notion photos:
    # flakes cover 2-3% of the face, about 2 per 10 x 10 cm, 2-6 mm across,
    # angular with chipped-in notches; cool white on the moulded face, a
    # little creamier where a saw cuts through them. The moulded face is a
    # fine satin; sawn edges are matte charcoal, full of tiny pores.
    "reverse_timeless_duo": {
        "label": "Reverse Timeless Duo #PS1202",
        "style": "flecked",
        "base": "#151617",
        "edge": "#1F2022",
        "chip": "#EEF1F1",
        "chip_cool": "#B9C6D0",
        "chip_cut": "#E7E2D6",
        # CNC cuts leave a dusty grey trench in the black sheet
        "kerf": "#3B3C3F",
        # Regrind for the film's granule shots: mostly black, some white
        "granules": [("#141517", 0.5), ("#1C1D20", 0.36), ("#ECEFF0", 0.14)],
    },
    "navy": {
        "label": "Navy",
        "base": ("#22409A", "#1B3482"),
        "chips": [
            ("#F3F1EA", 0.30),
            ("#9FB9EE", 0.18),
            ("#3E66CF", 0.16),
            ("#8ED3C0", 0.10),
            ("#E6CBA2", 0.08),
            ("#121216", 0.18),
        ],
    },
    "arctic": {
        "label": "Arctic",
        "base": ("#ECEAE3", "#E0DED7"),
        "chips": [
            ("#A3A5A8", 0.30),
            ("#2C2E33", 0.22),
            ("#C9CBCD", 0.28),
            ("#3E66CF", 0.12),
            ("#E6CBA2", 0.08),
        ],
    },
    "charcoal": {
        "label": "Charcoal",
        "base": ("#26272B", "#1E1F22"),
        "chips": [
            ("#F3F1EA", 0.34),
            ("#8E9094", 0.22),
            ("#E8743B", 0.10),
            ("#2FA39A", 0.10),
            ("#E9C46A", 0.12),
            ("#4A6FD1", 0.12),
        ],
    },
    "sage": {
        "label": "Sage",
        "base": ("#91A68E", "#869B83"),
        "chips": [
            ("#F2ECDE", 0.34),
            ("#2F4A3A", 0.24),
            ("#141414", 0.10),
            ("#6E7F4F", 0.16),
            ("#FBFAF6", 0.16),
        ],
    },
    "terracotta": {
        "label": "Terracotta",
        "base": ("#C8765A", "#BC6A50"),
        "chips": [
            ("#F4E7D4", 0.34),
            ("#8E3B26", 0.24),
            ("#5C1F24", 0.14),
            ("#F2B49B", 0.16),
            ("#1A1414", 0.12),
        ],
    },
    "ocean": {
        "label": "Ocean",
        "base": ("#1F6F78", "#195F68"),
        "chips": [
            ("#F4F4EF", 0.30),
            ("#142554", 0.20),
            ("#7FD3D0", 0.20),
            ("#E4D3A8", 0.10),
            ("#0E0F11", 0.20),
        ],
    },
}

# (cell size mm, share of cells that are chips, shrink from the cell edge)
LAYERS = [
    (11.0, 0.20, 0.09),
    (4.6, 0.28, 0.10),
    (2.0, 0.30, 0.12),
    (0.8, 0.28, 0.16),
]


def _rgb(nt, hex_color):
    n = nt.nodes.new("ShaderNodeRGB")
    n.outputs[0].default_value = _hex(hex_color)
    return n.outputs[0]


def _palette_ramp(nt, chips, fac):
    """Constant colour ramp picking a chip colour by weight."""
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    total = sum(w for _, w in chips)
    starts = [sum(w for _, w in chips[:i]) / total for i in range(len(chips))]
    # Stops are kept sorted, so only append past the last one and set each
    # colour right away (re-sorting would move earlier references)
    els[0].position, els[0].color = 0.0, _hex(chips[0][0])
    els[1].position, els[1].color = starts[1], _hex(chips[1][0])
    for start, (col, _) in zip(starts[2:], chips[2:]):
        els.new(start).color = _hex(col)
    nt.links.new(fac, ramp.inputs["Fac"])
    return ramp.outputs["Color"]


def _sheet_coords(nt):
    """Object position in sheet millimetres, and the object-space normal."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    off = nt.nodes.new("ShaderNodeAttribute")
    off.attribute_type = "OBJECT"
    off.attribute_name = "tex_off"
    offs = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(off.outputs["Vector"], offs.inputs[0])
    xs = _math(nt, "ADD", _math(nt, "MULTIPLY", sep.outputs[0], 1000), offs.outputs[0])
    ys = _math(nt, "SUBTRACT", offs.outputs[1], _math(nt, "MULTIPLY", sep.outputs[1], 1000))
    zs = _math(nt, "MULTIPLY", sep.outputs[2], 1000)
    sepn = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Normal"], sepn.inputs[0])
    return (xs, ys, zs), sepn.outputs[2]


def _voronoi(nt, vec, size_mm, feature, dims="3D"):
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.voronoi_dimensions = dims
    v.feature = feature
    v.inputs["Scale"].default_value = 1.0 / size_mm
    nt.links.new(vec, v.inputs["Vector"])
    return v


def _packed(name, palette, chip_scale=1.0):
    """Densely packed flat chips with thin binder seams, as in Polygood
    terrazzo patterns: flakes of ~7 mm with pockets of ~3 mm ones,
    pressed flat, so a sawn edge cuts them into slivers. The face is
    polished; edges are sanded matte and a little milky."""
    m, nt = _new(name)
    (xs, ys, zs), nz = _sheet_coords(nt)
    p = _combine(nt, xs, ys, zs)

    # Wobble the chip outlines so they aren't straight-edged cells
    warp = nt.nodes.new("ShaderNodeTexNoise")
    warp.noise_dimensions = "3D"
    warp.inputs["Scale"].default_value = 1.0 / 9.0
    warp.inputs["Detail"].default_value = 2.0
    nt.links.new(p, warp.inputs["Vector"])
    centred = nt.nodes.new("ShaderNodeVectorMath")
    centred.operation = "SUBTRACT"
    centred.inputs[1].default_value = (0.5, 0.5, 0.5)
    nt.links.new(warp.outputs["Color"], centred.inputs[0])
    amount = nt.nodes.new("ShaderNodeVectorMath")
    amount.operation = "SCALE"
    amount.inputs["Scale"].default_value = 2.4 * chip_scale
    nt.links.new(centred.outputs[0], amount.inputs[0])
    warped = nt.nodes.new("ShaderNodeVectorMath")
    warped.operation = "ADD"
    nt.links.new(p, warped.inputs[0])
    nt.links.new(amount.outputs[0], warped.inputs[1])
    # Flakes are pressed flat: stretch space through the thickness
    flat = nt.nodes.new("ShaderNodeVectorMath")
    flat.operation = "MULTIPLY"
    flat.inputs[1].default_value = (1.0, 1.0, 3.2)
    nt.links.new(warped.outputs[0], flat.inputs[0])
    q = flat.outputs[0]
    small_q = nt.nodes.new("ShaderNodeVectorMath")
    small_q.operation = "ADD"
    small_q.inputs[1].default_value = (71.3, 29.1, 13.7)
    nt.links.new(q, small_q.inputs[0])

    BIG, SMALL = 7.5 * chip_scale, 3.0 * chip_scale
    big, big_edge = _voronoi(nt, q, BIG, "F1"), _voronoi(nt, q, BIG, "DISTANCE_TO_EDGE")
    sml, sml_edge = (
        _voronoi(nt, small_q.outputs[0], SMALL, "F1"),
        _voronoi(nt, small_q.outputs[0], SMALL, "DISTANCE_TO_EDGE"),
    )
    big_r = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(big.outputs["Color"], big_r.inputs[0])
    sml_r = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(sml.outputs["Color"], sml_r.inputs[0])

    # About a third of the big cells are filled with small chips instead
    use_small = _math(nt, "LESS_THAN", big_r.outputs[1], 0.35)
    pick = _mix_float(nt, use_small, big_r.outputs[0], sml_r.outputs[0])
    shade = _mix_float(nt, use_small, big_r.outputs[2], sml_r.outputs[2])
    # Chips are pressed tight: the binder only shows as a hairline seam
    seam_big = _seam(nt, big_edge.outputs["Distance"], 0.05 / BIG)
    seam_sml = _seam(nt, sml_edge.outputs["Distance"], 0.05 / SMALL)
    inside = _math(nt, "MULTIPLY", seam_big, _mix_float(nt, use_small, 1.0, seam_sml))

    chip = _palette_ramp(nt, palette["chips"], pick)
    # Each chip a touch lighter or darker than its palette colour
    gain = _math(nt, "ADD", 0.84, _math(nt, "MULTIPLY", shade, 0.22))
    chip_scaled = nt.nodes.new("ShaderNodeMix")
    chip_scaled.data_type = "RGBA"
    chip_scaled.blend_type = "MULTIPLY"
    sock = lambda coll, ident: next(x for x in coll if x.identifier == ident)
    sock(chip_scaled.inputs, "Factor_Float").default_value = 1.0
    nt.links.new(chip, sock(chip_scaled.inputs, "A_Color"))
    grey = nt.nodes.new("ShaderNodeCombineColor")
    for i in range(3):
        nt.links.new(gain, grey.inputs[i])
    nt.links.new(grey.outputs[0], sock(chip_scaled.inputs, "B_Color"))
    color = _mix_color(nt, inside, _rgb(nt, palette["binder"]), sock(chip_scaled.outputs, "Result_Color"))

    # Sanded edges read lighter and milkier than the polished face
    side = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", nz), 0.5)
    color = _mix_color(nt, _math(nt, "MULTIPLY", side, 0.14), color, _rgb(nt, "#C9D3E6"))

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(color, bsdf.inputs["Base Color"])
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 1.6
    grain.inputs["Detail"].default_value = 6.0
    nt.links.new(p, grain.inputs["Vector"])
    # Satin face: chips catch the light a little differently
    face_rough = _math(nt, "ADD", 0.26, _math(nt, "MULTIPLY", shade, 0.1))
    rough = _mix_float(nt, side, face_rough, _math(nt, "ADD", 0.48, _math(nt, "MULTIPLY", grain.outputs["Fac"], 0.12)))
    nt.links.new(rough, bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    bsdf.inputs["Subsurface Weight"].default_value = 0.15
    bsdf.inputs["Subsurface Scale"].default_value = 0.002
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.03
    bump.inputs["Distance"].default_value = 0.0002
    nt.links.new(_math(nt, "MULTIPLY", grain.outputs["Fac"], _math(nt, "ADD", 0.3, side)), bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    _finish(nt, bsdf.outputs[0])
    return m


def _vec(nt, op, a, b):
    n = nt.nodes.new("ShaderNodeVectorMath")
    n.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, tuple):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _clamp01(nt, x):
    return _math(nt, "MINIMUM", 1.0, _math(nt, "MAXIMUM", 0.0, x))


def _step(nt, x, edge, soft):
    """0 below edge, 1 above it, over a band of width soft."""
    return _clamp01(nt, _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", x, edge), 1.0 / soft))


def _flakes(nt, p, size, share, layer, soft=0.035):
    """Sparse angular flakes lying flat in the sheet, as pressing leaves
    them: the body is split into wavy layers `layer` mm thick, each with its
    own scatter of 2D Voronoi cells of about `size` mm, a random share of
    which are flakes. A flake is lens-shaped through its layer, so a face
    shows mostly whole flakes and a saw cut shows ovals. Outlines get a few
    chipped-in notches. Returns (mask, mm inside the outline, two per-flake
    randoms)."""
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(p, sep.inputs[0])
    x, y, z = sep.outputs
    # Layers undulate gently, so flakes sit at mixed depths; slow enough
    # that a layer boundary rarely runs through a flake
    sway = nt.nodes.new("ShaderNodeTexNoise")
    sway.noise_dimensions = "2D"
    sway.inputs["Scale"].default_value = 1.0 / 40.0
    nt.links.new(p, sway.inputs["Vector"])
    zl = _math(nt, "DIVIDE", _math(nt, "ADD", z, _math(nt, "MULTIPLY", sway.outputs["Fac"], 1.6 * layer)), layer)
    k = _math(nt, "FLOOR", zl)
    f = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "SUBTRACT", zl, k), 0.5))
    # Fracture lines are straight-ish but never ruler-straight
    warp = nt.nodes.new("ShaderNodeTexNoise")
    warp.noise_dimensions = "3D"
    warp.inputs["Scale"].default_value = 1.0 / 4.0
    warp.inputs["Detail"].default_value = 3.0
    nt.links.new(p, warp.inputs["Vector"])
    wobble = _vec(nt, "SCALE", _vec(nt, "SUBTRACT", warp.outputs["Color"], (0.5, 0.5, 0.5)), None)
    wobble.node.inputs["Scale"].default_value = 0.16 * size
    seed = _combine(nt, _math(nt, "MULTIPLY", k, 37.17), _math(nt, "MULTIPLY", k, 91.31), 0.0)
    q = _vec(nt, "ADD", _vec(nt, "ADD", _combine(nt, x, y, 0.0), wobble), seed)

    cell, edge = _voronoi(nt, q, size, "F1", "2D"), _voronoi(nt, q, size, "DISTANCE_TO_EDGE", "2D")
    rnd = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(cell.outputs["Color"], rnd.inputs[0])
    # Lens: full outline mid-layer, shrinking to nothing at the layer's faces
    lens = _math(nt, "POWER", _math(nt, "MULTIPLY", f, 2.0), 6.0)
    # (0.12 mm in from the cell edge, so neighbouring flakes never fuse)
    d = _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", edge.outputs["Distance"], size), _math(nt, "ADD", 0.12, _math(nt, "MULTIPLY", lens, 0.46 * size)))
    mask = _math(nt, "MULTIPLY", _math(nt, "LESS_THAN", rnd.outputs[0], share), _step(nt, d, 0.0, soft))
    # Notches: small cells that bite into the outline (never into the middle)
    bq = _vec(nt, "ADD", q, (17.1, 5.3, 0.0))
    bite = _voronoi(nt, bq, size * 0.3, "F1", "2D")
    brnd = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(bite.outputs["Color"], brnd.inputs[0])
    in_bite = _math(nt, "LESS_THAN", brnd.outputs[0], 0.25)
    near_rim = _math(nt, "LESS_THAN", d, size * 0.1)
    mask = _math(nt, "MULTIPLY", mask, _math(nt, "SUBTRACT", 1.0, _math(nt, "MULTIPLY", in_bite, near_rim)))
    return mask, d, rnd.outputs[1], rnd.outputs[2]


def _dots(nt, p, size, share, r_min, r_max, offset):
    """Round dots (pores, specks) of r_min..r_max mm, one in a random share
    of `size` mm cells; returns a 0..1 mask, soft at the rim."""
    q = _vec(nt, "ADD", p, offset)
    cell = _voronoi(nt, q, size, "F1")
    rnd = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(cell.outputs["Color"], rnd.inputs[0])
    r = _math(nt, "ADD", r_min, _math(nt, "MULTIPLY", rnd.outputs[1], r_max - r_min))
    d = _math(nt, "MULTIPLY", cell.outputs["Distance"], size)
    inside = _step(nt, _math(nt, "SUBTRACT", r, d), 0.0, 0.03)
    return _math(nt, "MULTIPLY", inside, _math(nt, "LESS_THAN", rnd.outputs[0], share))


def _flecked(name, palette, chip_scale=1.0):
    """Sparse white flakes in a near-black body, as in Polygood's Reverse
    Timeless Duo. Flakes lie flat in the sheet, so a sawn edge cuts them
    into ovals; the moulded face is satin with the odd pinhole, while a sawn
    or milled face is matte, a shade lighter and open-pored."""
    m, nt = _new(name)
    (xs, ys, zs), nz = _sheet_coords(nt)
    p = _combine(nt, xs, ys, zs)
    side = _step(nt, _math(nt, "SUBTRACT", 0.6, _math(nt, "ABSOLUTE", nz)), 0.0, 0.2)

    flake, d, tone, cool = _flakes(nt, p, 5.0 * chip_scale, 0.037, 2.4 * chip_scale)
    # Stray white specks, a few tenths of a millimetre
    speck = _dots(nt, p, 1.4, 0.006, 0.07, 0.17, (3.3, 8.1, 2.2))

    # Flake colour: white, with cool translucent patches, a greyer rim where
    # the flake thins out, and a fine grey speckle (recycled HIPS)
    patches = nt.nodes.new("ShaderNodeTexNoise")
    patches.noise_dimensions = "3D"
    patches.inputs["Scale"].default_value = 1.0 / 1.3
    patches.inputs["Detail"].default_value = 3.0
    nt.links.new(p, patches.inputs["Vector"])
    cool_amt = _math(nt, "MULTIPLY", _step(nt, patches.outputs["Fac"], 0.52, 0.12), _math(nt, "ADD", 0.15, _math(nt, "MULTIPLY", cool, 0.6)))
    white = _mix_color(nt, _math(nt, "MULTIPLY", side, 0.85), _rgb(nt, palette["chip"]), _rgb(nt, palette["chip_cut"]))
    chip = _mix_color(nt, _math(nt, "MULTIPLY", cool_amt, _math(nt, "SUBTRACT", 1.0, side)), white, _rgb(nt, palette["chip_cool"]))
    rim = _math(nt, "SUBTRACT", 1.0, _step(nt, d, 0.04, 0.22))
    chip = _mix_color(nt, _math(nt, "MULTIPLY", rim, 0.45), chip, _rgb(nt, palette["chip_cool"]))
    grit = _dots(nt, p, 0.32, 0.22, 0.02, 0.05, (1.7, 4.4, 0.9))
    chip = _mix_color(nt, _math(nt, "MULTIPLY", grit, 0.55), chip, _rgb(nt, "#6F7476"))
    # Each flake its own white, from paper-white to a light grey
    gain = _math(nt, "ADD", 0.78, _math(nt, "MULTIPLY", tone, 0.24))
    shade = nt.nodes.new("ShaderNodeCombineColor")
    for i in range(3):
        nt.links.new(gain, shade.inputs[i])
    tinted = nt.nodes.new("ShaderNodeMix")
    tinted.data_type = "RGBA"
    tinted.blend_type = "MULTIPLY"
    sock = lambda coll, ident: next(x for x in coll if x.identifier == ident)
    sock(tinted.inputs, "Factor_Float").default_value = 1.0
    nt.links.new(chip, sock(tinted.inputs, "A_Color"))
    nt.links.new(shade.outputs[0], sock(tinted.inputs, "B_Color"))
    chip = sock(tinted.outputs, "Result_Color")

    # Body: faint mottle, lighter and open-pored where it has been cut
    mottle = nt.nodes.new("ShaderNodeTexNoise")
    mottle.noise_dimensions = "3D"
    mottle.inputs["Scale"].default_value = 1.0 / 14.0
    mottle.inputs["Detail"].default_value = 4.0
    nt.links.new(p, mottle.inputs["Vector"])
    body = _mix_color(nt, side, _rgb(nt, palette["base"]), _rgb(nt, palette["edge"]))
    body = _mix_color(nt, _math(nt, "MULTIPLY", mottle.outputs["Fac"], 0.35), body, _rgb(nt, "#0E0F10"))
    pore_share = _mix_float(nt, side, 0.05, 0.38)
    pores = _dots(nt, p, 0.75, pore_share, 0.08, 0.32, (9.9, 2.4, 6.6))
    pores = _math(nt, "MULTIPLY", pores, _math(nt, "SUBTRACT", 1.0, flake))
    color = _mix_color(nt, flake, body, chip)
    color = _mix_color(nt, _math(nt, "MULTIPLY", speck, 0.8), color, _rgb(nt, "#C9CCCB"))
    color = _mix_color(nt, _math(nt, "MULTIPLY", pores, 0.85), color, _rgb(nt, "#050506"))

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(color, bsdf.inputs["Base Color"])
    bsdf.inputs["IOR"].default_value = 1.59  # polystyrene
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.noise_dimensions = "3D"
    grain.inputs["Scale"].default_value = 1.0 / 0.11
    grain.inputs["Detail"].default_value = 2.0
    nt.links.new(p, grain.inputs["Vector"])
    face_rough = _math(nt, "ADD", 0.46, _math(nt, "MULTIPLY", grain.outputs["Fac"], 0.1))
    face_rough = _math(nt, "SUBTRACT", face_rough, _math(nt, "MULTIPLY", flake, 0.08))
    rough = _mix_float(nt, side, face_rough, _math(nt, "ADD", 0.66, _math(nt, "MULTIPLY", grain.outputs["Fac"], 0.14)))
    rough = _math(nt, "MAXIMUM", rough, _math(nt, "MULTIPLY", pores, 0.9))
    nt.links.new(rough, bsdf.inputs["Roughness"])
    # Light wanders a little inside the white flakes, not in the carbon black
    nt.links.new(_math(nt, "MULTIPLY", flake, 0.35), bsdf.inputs["Subsurface Weight"])
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 1.0, 1.0)
    bsdf.inputs["Subsurface Scale"].default_value = 0.0005
    # Sawn faces have a faint dusty sheen
    nt.links.new(_math(nt, "MULTIPLY", side, 0.15), bsdf.inputs["Sheen Weight"])
    bsdf.inputs["Sheen Roughness"].default_value = 0.6

    # Fine satin grain on the face, coarse tooling grain and pinholes on cuts
    height = _math(nt, "MULTIPLY", grain.outputs["Fac"], _math(nt, "ADD", 0.25, _math(nt, "MULTIPLY", side, 0.75)))
    height = _math(nt, "SUBTRACT", height, pores)
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.00004
    nt.links.new(height, bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    _finish(nt, bsdf.outputs[0])
    return m


def _mix_float(nt, fac, a, b):
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    sock = lambda coll, ident: next(x for x in coll if x.identifier == ident)
    for ident, v in (("Factor_Float", fac), ("A_Float", a), ("B_Float", b)):
        if isinstance(v, (int, float)):
            sock(mix.inputs, ident).default_value = v
        else:
            nt.links.new(v, sock(mix.inputs, ident))
    return sock(mix.outputs, "Result_Float")


def _seam(nt, distance, width):
    """0 on a binder seam, 1 inside a chip, over a few hundredths of a mm."""
    s = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", distance, width), 1.0 / max(width * 0.35, 1e-4))
    return _math(nt, "MINIMUM", 1.0, _math(nt, "MAXIMUM", 0.0, s))


def terrazzo_procedural(name, palette, chip_scale=1.0):
    """Material for terrazzo slabs; palette is a PALETTES entry, chip_scale
    resizes every chip layer (1.0 = the sizes in LAYERS)."""
    if palette.get("style") == "packed":
        return _packed(name, palette, chip_scale)
    if palette.get("style") == "flecked":
        return _flecked(name, palette, chip_scale)
    m, nt = _new(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    off = nt.nodes.new("ShaderNodeAttribute")
    off.attribute_type = "OBJECT"
    off.attribute_name = "tex_off"
    offs = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(off.outputs["Vector"], offs.inputs[0])

    # Sheet millimetres (x right, y down the sheet, z up through the thickness)
    xs = _math(nt, "ADD", _math(nt, "MULTIPLY", sep.outputs[0], 1000), offs.outputs[0])
    ys = _math(nt, "SUBTRACT", offs.outputs[1], _math(nt, "MULTIPLY", sep.outputs[1], 1000))
    zs = _math(nt, "MULTIPLY", sep.outputs[2], 1000)
    p = _combine(nt, xs, ys, zs)

    # Mottled base, as pressed recycled plastic is never one flat colour
    mottle = nt.nodes.new("ShaderNodeTexNoise")
    mottle.noise_dimensions = "3D"
    mottle.inputs["Scale"].default_value = 0.018
    mottle.inputs["Detail"].default_value = 4.0
    mottle.inputs["Roughness"].default_value = 0.55
    nt.links.new(p, mottle.inputs["Vector"])
    base_a, base_b = palette["base"]
    color = _mix_color(nt, mottle.outputs["Fac"], _rgb(nt, base_a), _rgb(nt, base_b))
    chip_any = None

    for i, (size, density, shrink) in enumerate(LAYERS):
        size *= chip_scale
        shifted = nt.nodes.new("ShaderNodeVectorMath")
        shifted.operation = "ADD"
        shifted.inputs[1].default_value = (37.3 * (i + 1), 11.9 * (i + 1), 5.3 * (i + 1))
        nt.links.new(p, shifted.inputs[0])

        cells = nt.nodes.new("ShaderNodeTexVoronoi")
        cells.voronoi_dimensions = "3D"
        cells.feature = "F1"
        cells.inputs["Scale"].default_value = 1.0 / size
        nt.links.new(shifted.outputs[0], cells.inputs["Vector"])
        edge = nt.nodes.new("ShaderNodeTexVoronoi")
        edge.voronoi_dimensions = "3D"
        edge.feature = "DISTANCE_TO_EDGE"
        edge.inputs["Scale"].default_value = 1.0 / size
        nt.links.new(shifted.outputs[0], edge.inputs["Vector"])

        rnd = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(cells.outputs["Color"], rnd.inputs[0])
        pick, gate_val, var = rnd.outputs[0], rnd.outputs[1], rnd.outputs[2]

        gate = _math(nt, "LESS_THAN", gate_val, density)
        thr = _math(nt, "ADD", _math(nt, "MULTIPLY", var, 0.12), shrink)
        # ~0.06 mm anti-aliased chip edge, whatever the cell size
        soft = 0.06 / size
        mask = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", edge.outputs["Distance"], thr), 1.0 / soft)
        mask = _math(nt, "MINIMUM", 1.0, _math(nt, "MAXIMUM", 0.0, mask))
        mask = _math(nt, "MULTIPLY", mask, gate)
        chip_col = _palette_ramp(nt, palette["chips"], pick)
        color = _mix_color(nt, mask, color, chip_col)
        chip_any = mask if chip_any is None else _math(nt, "MAXIMUM", chip_any, mask)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(color, bsdf.inputs["Base Color"])
    # Sanded satin finish; chips polish a touch glossier than the binder
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 0.9
    grain.inputs["Detail"].default_value = 6.0
    nt.links.new(p, grain.inputs["Vector"])
    rough = _math(nt, "ADD", 0.40, _math(nt, "MULTIPLY", grain.outputs["Fac"], 0.12))
    rough = _math(nt, "SUBTRACT", rough, _math(nt, "MULTIPLY", chip_any, 0.07))
    nt.links.new(rough, bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    # A little light travels into the plastic, softening the chips' edges
    bsdf.inputs["Subsurface Weight"].default_value = 0.08
    bsdf.inputs["Subsurface Scale"].default_value = 0.0015
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.05
    bump.inputs["Distance"].default_value = 0.0002
    nt.links.new(grain.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    _finish(nt, bsdf.outputs[0])
    return m
