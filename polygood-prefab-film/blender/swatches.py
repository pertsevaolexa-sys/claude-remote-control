"""Render a look-book of terrazzo colourways, lit as in the film.

    python blender/swatches.py --out <dir> [--palettes navy,arctic] [--samples 64] [--chip-scale 1.0]

For each palette: a close-up of a panel corner (top, bevelled arris and sawn
edge) and a wider view of a 600 x 400 mm panel. Writes <palette>-close.png
and <palette>-wide.png (RGBA, transparent background with shadows).
"""

import argparse
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402  (must come before addon_utils)
import addon_utils  # noqa: E402

from pgscene.geometry import bevel, look_at_matrix, obj, slab_mesh  # noqa: E402
from pgscene.terrazzo import PALETTES, terrazzo_procedural  # noqa: E402


def setup(samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable("cycles", default_set=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Khronos PBR Neutral"
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.86, 0.85, 0.82, 1.0)
    bg.inputs["Strength"].default_value = 0.16
    sc.world = world

    floor_me = bpy.data.meshes.new("Floor")
    s = 20.0
    floor_me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    obj("Floor", floor_me).is_shadow_catcher = True

    # Same rig and exposure as the film (blender/pgscene/film.py)
    for name, loc, target, size, power in (
        ("Key", (-3.2, -3.0, 5.2), (0, 0, 0), 3.0, 320),
        ("Fill", (3.6, -2.2, 2.6), (0, 0, 0.3), 4.0, 110),
        ("Rim", (0.5, 4.2, 3.4), (0, 0, 0.2), 3.0, 170),
    ):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = "RECTANGLE"
        ld.size = ld.size_y = size
        ld.energy = power
        o = obj(name, ld, location=loc)
        o.rotation_euler = look_at_matrix(loc, target).to_euler()
    return sc


def camera(sc, target, dist, elev, az, lens, fstop):
    e, a = math.radians(elev), math.radians(az)
    eye = (
        target[0] + dist * math.cos(e) * math.sin(a),
        target[1] - dist * math.cos(e) * math.cos(a),
        target[2] + dist * math.sin(e),
    )
    cam = bpy.data.cameras.new("Cam")
    cam.lens = lens
    cam.sensor_width = 36
    cam.dof.use_dof = True
    cam.dof.focus_distance = dist
    cam.dof.aperture_fstop = fstop
    o = obj("Cam", cam, location=eye)
    o.rotation_euler = look_at_matrix(eye, target).to_euler()
    sc.camera = o
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--palettes", default=",".join(PALETTES))
    ap.add_argument("--samples", type=int, default=64)
    ap.add_argument("--chip-scale", type=float, default=1.0)
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])
    os.makedirs(args.out, exist_ok=True)

    sc = setup(args.samples)
    rect = [(-0.3, 0.2), (0.3, 0.2), (0.3, -0.2), (-0.3, -0.2)]
    panel = obj("Panel", slab_mesh("Panel", rect))
    panel["tex_off"] = (1000.0, 500.0, 0.0)
    bevel(panel, 0.0008, 3)

    shots = {
        "close": dict(target=(0.235, -0.15, 0.012), dist=0.42, elev=24, az=38, lens=85, fstop=5.6, res=(900, 900)),
        "wide": dict(target=(0.0, 0.0, 0.0095), dist=1.15, elev=52, az=18, lens=50, fstop=11, res=(900, 600)),
    }
    for key in args.palettes.split(","):
        mat = terrazzo_procedural(f"Terrazzo-{key}", PALETTES[key], args.chip_scale)
        panel.data.materials.clear()
        panel.data.materials.append(mat)
        for shot, s in shots.items():
            camera(sc, s["target"], s["dist"], s["elev"], s["az"], s["lens"], s["fstop"])
            sc.render.resolution_x, sc.render.resolution_y = s["res"]
            sc.render.filepath = os.path.join(args.out, f"{key}-{shot}.png")
            bpy.ops.render.render(write_still=True)
            print(f"rendered {key}-{shot}", flush=True)


if __name__ == "__main__":
    main()
