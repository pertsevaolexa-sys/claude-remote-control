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


def _voronoi(nt, vec, size_mm, feature):
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.voronoi_dimensions = "3D"
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
