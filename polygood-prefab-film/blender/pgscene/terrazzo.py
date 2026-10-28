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
    pos = 0.0
    for i, (col, w) in enumerate(chips):
        el = els[0] if i == 0 else (els[1] if i == 1 else els.new(0.0))
        el.position = pos
        el.color = _hex(col)
        pos += w / total
    nt.links.new(fac, ramp.inputs["Fac"])
    return ramp.outputs["Color"]


def terrazzo_procedural(name, palette, chip_scale=1.0):
    """Material for terrazzo slabs; palette is a PALETTES entry, chip_scale
    resizes every chip layer (1.0 = the sizes in LAYERS)."""
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
