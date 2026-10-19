"""Materials. Every material can fade through the object's colour alpha
(Object Info > Alpha), which the baked animation drives."""

import os

import bpy

from .common import DATA, PUBLIC, SHEET_H, SHEET_W


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


def _img(path, colorspace="sRGB"):
    full = os.path.join(PUBLIC, path)
    for im in bpy.data.images:
        if bpy.path.abspath(im.filepath) == full:
            return im
    im = bpy.data.images.load(full)
    im.colorspace_settings.name = colorspace
    return im


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


def terrazzo(name="Terrazzo", slab_ends=False):
    """Recycled-plastic surface mapped by real sheet coordinates.

    Objects carry a custom property "tex_off" = (ox, oy, 0): the sheet
    position (mm) of their local origin, with local +X = sheet +x and local
    +Y = sheet -y. Faces are box-projected so cut edges show chips through the
    thickness. Within the macro/mid regions the top face switches to the
    higher-resolution crops (zoom pyramid). With slab_ends, faces looking
    along local X use the macro crop tiled, for the edge close-up."""
    m, nt = _new(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    off = nt.nodes.new("ShaderNodeAttribute")
    off.attribute_type = "OBJECT"
    off.attribute_name = "tex_off"
    offs = nt.nodes.new("ShaderNodeSeparateXYZ")
    tc.location, sep.location, off.location, offs.location = (-1600, 0), (-1400, 0), (-1600, -300), (-1400, -300)
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(off.outputs["Vector"], offs.inputs[0])

    # Sheet coordinates in mm
    xs = _math(nt, "ADD", _math(nt, "MULTIPLY", sep.outputs[0], 1000), offs.outputs[0])
    ys = _math(nt, "SUBTRACT", offs.outputs[1], _math(nt, "MULTIPLY", sep.outputs[1], 1000))
    zs = _math(nt, "MULTIPLY", sep.outputs[2], 1000)

    u = _math(nt, "DIVIDE", xs, SHEET_W)
    v = _math(nt, "SUBTRACT", 1.0, _math(nt, "DIVIDE", ys, SHEET_H))
    w = _math(nt, "DIVIDE", zs, SHEET_H)
    yu = _math(nt, "DIVIDE", ys, SHEET_W)

    # Tri-planar lookup built by hand: Cycles' BOX projection swaps the axes
    # on Z faces, which stretches the chips on a 2:1 sheet.
    sheet_img = _img(DATA["assets"]["material"]["sheet"])

    def planar(vec, loc):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = sheet_img
        t.extension = "MIRROR"
        t.location = loc
        nt.links.new(vec, t.inputs["Vector"])
        return t.outputs["Color"]

    c_top = planar(_combine(nt, u, v, 0.0, (-900, 200)), (-700, 200))
    c_xface = planar(_combine(nt, yu, w, 0.0, (-900, 0)), (-700, 0))
    c_yface = planar(_combine(nt, u, w, 0.0, (-900, -200)), (-700, -200))

    sepn = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Normal"], sepn.inputs[0])
    wx, wy, wz = (_math(nt, "POWER", _math(nt, "ABSOLUTE", sepn.outputs[i]), 4.0) for i in range(3))
    wxy = _math(nt, "ADD", wx, wy)
    side = _mix_color(nt, _math(nt, "DIVIDE", wy, _math(nt, "ADD", wxy, 1e-6)), c_xface, c_yface)
    color = _mix_color(nt, _math(nt, "DIVIDE", wz, _math(nt, "ADD", _math(nt, "ADD", wxy, wz), 1e-6)), side, c_top)

    # Top-facing mask (object space normal z)
    up = _math(nt, "GREATER_THAN", sepn.outputs[2], 0.5)

    for level in DATA["assets"]["materialLevels"]:
        r = level["region"]
        f = level["feather"]
        lu = _math(nt, "DIVIDE", _math(nt, "SUBTRACT", xs, r["x"]), r["w"])
        lv = _math(nt, "SUBTRACT", 1.0, _math(nt, "DIVIDE", _math(nt, "SUBTRACT", ys, r["y"]), r["h"]))
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = _img(level["src"])
        tex.extension = "CLIP"
        nt.links.new(_combine(nt, lu, lv, 0.0), tex.inputs["Vector"])
        # Feathered rectangle mask in mm
        def edge(dist):
            return _math(nt, "MINIMUM", 1.0, _math(nt, "MAXIMUM", 0.0, _math(nt, "DIVIDE", dist, f)))

        dx0 = edge(_math(nt, "SUBTRACT", xs, r["x"]))
        dx1 = edge(_math(nt, "SUBTRACT", r["x"] + r["w"], xs))
        dy0 = edge(_math(nt, "SUBTRACT", ys, r["y"]))
        dy1 = edge(_math(nt, "SUBTRACT", r["y"] + r["h"], ys))
        mask = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", dx0, dx1), _math(nt, "MULTIPLY", dy0, dy1))
        mask = _math(nt, "MULTIPLY", mask, up)
        color = _mix_color(nt, mask, color, tex.outputs["Color"])

    if slab_ends:
        # Faces looking along local X: macro crop tiled at true scale.
        mac = DATA["assets"]["materialLevels"][-1]["region"]
        tu = _math(nt, "DIVIDE", ys, mac["w"])
        tv = _math(nt, "DIVIDE", zs, mac["h"])
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = _img(DATA["assets"]["materialLevels"][-1]["src"])
        tex.extension = "MIRROR"
        nt.links.new(_combine(nt, tu, tv, 0.0), tex.inputs["Vector"])
        ends = _math(nt, "GREATER_THAN", _math(nt, "ABSOLUTE", sepn.outputs[0]), 0.6)
        color = _mix_color(nt, ends, color, tex.outputs["Color"])

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (200, 0)
    nt.links.new(color, bsdf.inputs["Base Color"])
    # Slightly glossier light chips, satin overall (sanded, sealed surface)
    lum = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(color, lum.inputs[0])
    rough = _math(nt, "SUBTRACT", 0.46, _math(nt, "MULTIPLY", lum.outputs[0], 0.14))
    nt.links.new(rough, bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    # Micro surface: fine noise bump, scaled in metres
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    noise.inputs["Detail"].default_value = 4.0
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.0003
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    _finish(nt, bsdf.outputs[0])
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
        self.terrazzo = terrazzo("Terrazzo")
        self.slab = terrazzo("TerrazzoSlab", slab_ends=True)
        self.ink = principled("Ink", "#F7F6F2", roughness=0.62)
        self.kerf = principled("Kerf", "#0B0D14", roughness=0.92)
        self.aluminium = brushed_aluminium()
        self.dark = principled("Black", "#16171A", roughness=0.42)
        self.steel = principled("Steel", "#9EA3AA", roughness=0.25, metallic=1.0)
        self.accent = principled("AccentLED", c["accent"], roughness=0.35, emission=c["accent"], strength=3.0)
        self.pen_body = principled("PenBody", "#EDEBE6", roughness=0.35, coat=0.5)
        self.wood = wood()
        self.chips = [
            principled(f"Chip{i}", col, roughness=0.4)
            for i, col in enumerate(["#F2EFE8", "#A9C0EC", "#3D63C9", "#142554", "#101012", "#8ED3C0", "#E4C9A0", "#23408E"])
        ]
