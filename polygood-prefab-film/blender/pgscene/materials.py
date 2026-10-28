"""Materials. Every material can fade through the object's colour alpha
(Object Info > Alpha), which the baked animation drives."""

import bpy

from .common import DATA

# The panel pattern used throughout the film: a key of terrazzo.PALETTES
PATTERN = "reverse_timeless_duo"


def _hex(h):
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


def _new(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    return m, nt


def _finish(nt, shader_socket, x=600):
    """Mix the shader with transparency by object alpha, then output."""
    info = nt.nodes.new("ShaderNodeObjectInfo")
    transp = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    info.location, transp.location, mix.location, out.location = (x - 300, 300), (x - 300, 150), (x, 0), (x + 200, 0)
    nt.links.new(info.outputs["Alpha"], mix.inputs["Fac"])
    nt.links.new(transp.outputs[0], mix.inputs[1])
    nt.links.new(shader_socket, mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])


def _math(nt, op, a, b=None, loc=(0, 0)):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.location = loc
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _mix_color(nt, fac, a, b):
    """RGBA mix; picks the colour sockets by identifier (the Mix node has one
    socket per data type with the same display name)."""
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    sock = lambda coll, ident: next(s for s in coll if s.identifier == ident)
    nt.links.new(fac, sock(mix.inputs, "Factor_Float"))
    nt.links.new(a, sock(mix.inputs, "A_Color"))
    nt.links.new(b, sock(mix.inputs, "B_Color"))
    return sock(mix.outputs, "Result_Color")


def _combine(nt, x, y, z, loc=(0, 0)):
    n = nt.nodes.new("ShaderNodeCombineXYZ")
    n.location = loc
    for i, v in enumerate((x, y, z)):
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def emission(name, color, strength=1.0):
    """Flat unlit colour, for graphic lines drawn into the 3D (callouts)."""
    m, nt = _new(name)
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = _hex(color)
    e.inputs["Strength"].default_value = strength
    _finish(nt, e.outputs[0])
    return m


def principled(name, color, roughness=0.5, metallic=0.0, emission=None, strength=0.0, coat=0.0):
    m, nt = _new(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = _hex(color) if isinstance(color, str) else color
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Metallic"].default_value = metallic
    if coat:
        b.inputs["Coat Weight"].default_value = coat
    if emission:
        b.inputs["Emission Color"].default_value = _hex(emission)
        b.inputs["Emission Strength"].default_value = strength
    _finish(nt, b.outputs[0])
    return m


def brushed_aluminium(name="Aluminium"):
    m, nt = _new(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 400.0)
    nt.links.new(tc.outputs["Object"], mapping.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 60.0
    nt.links.new(mapping.outputs[0], noise.inputs["Vector"])
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = _hex("#C9CCD1")
    b.inputs["Metallic"].default_value = 1.0
    rough = _math(nt, "ADD", 0.22, _math(nt, "MULTIPLY", noise.outputs["Fac"], 0.12))
    nt.links.new(rough, b.inputs["Roughness"])
    _finish(nt, b.outputs[0])
    return m


def wood(name="PalletWood"):
    m, nt = _new(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (4.0, 40.0, 40.0)
    nt.links.new(tc.outputs["Object"], mapping.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 3.0
    nt.links.new(mapping.outputs[0], wave.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = _hex("#B48B5E")
    ramp.color_ramp.elements[1].color = _hex("#D9B98C")
    nt.links.new(wave.outputs["Fac"], ramp.inputs[0])
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.8
    _finish(nt, b.outputs[0])
    return m


class Library:
    """Builds each material once."""

    def __init__(self):
        c = DATA["colors"]
        from .terrazzo import PALETTES, terrazzo_procedural

        # Polygood #PS1202 Reverse Timeless Duo, solid through every part
        palette = PALETTES[PATTERN]
        self.terrazzo = terrazzo_procedural(palette["label"], palette)
        self.slab = self.terrazzo
        self.line_accent = emission("Callout accent", c["accent"])
        self.line_ink = emission("Callout ink", c["ink"])
        self.ink = principled("Ink", "#F7F6F2", roughness=0.62)
        self.kerf = principled("Kerf", palette.get("kerf", "#0B0D14"), roughness=0.92)
        self.aluminium = brushed_aluminium()
        self.dark = principled("Black", "#16171A", roughness=0.42)
        self.steel = principled("Steel", "#9EA3AA", roughness=0.25, metallic=1.0)
        self.accent = principled("AccentLED", c["accent"], roughness=0.35, emission=c["accent"], strength=3.0)
        self.pen_body = principled("PenBody", "#EDEBE6", roughness=0.35, coat=0.5)
        self.wood = wood()
        # Regrind of the same plastic, for the offcuts turned into new panel.
        # The film picks one per granule at random, so repeat by weight.
        grains = [(principled(f"Granule{i}", col, roughness=0.4), w) for i, (col, w) in enumerate(palette["granules"])]
        self.chips = [m for m, w in grains for _ in range(max(1, round(w * 14)))]
