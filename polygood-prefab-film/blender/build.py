"""Build the realistic Blender scene for one format and bake its animation.

    python blender/build.py --variant reels
    python blender/build.py --variant linkedin

Writes blender/blend/polygood-<variant>.blend, plus, in
public/renders3d/<variant>/: anchors.json (screen positions of 3D points for
the Remotion overlays) and frames.json (which frames are identical, so holds
render once). Needs the `bpy` module (pip install bpy) and an up-to-date
blender/scene-data.json (node blender/export-scene-data.mjs).
"""

import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402  (must come before addon_utils)
import addon_utils  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

from pgscene.common import DATA, LAST_3D_FRAME, PROJECT, S3, SCENES, Recorder, local, ramp  # noqa: E402
from pgscene.film import Film  # noqa: E402
from pgscene.geometry import obj  # noqa: E402
from pgscene.materials import Library  # noqa: E402


def setup_scene(layout, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable("cycles", default_set=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 2
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.use_persistent_data = True
    sc.render.film_transparent = True
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.25
    sc.render.motion_blur_position = "START"
    sc.render.resolution_x = layout["width"]
    sc.render.resolution_y = layout["height"]
    sc.render.resolution_percentage = 100
    sc.render.fps = DATA["timing"]["FPS"]
    sc.frame_start = 0
    sc.frame_end = LAST_3D_FRAME
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.compression = 30
    sc.view_settings.view_transform = "Khronos PBR Neutral"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0

    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.86, 0.85, 0.82, 1.0)
    bg.inputs["Strength"].default_value = 0.16
    sc.world = world

    # Infinite floor that only records shadows; Remotion supplies the paper.
    floor_me = bpy.data.meshes.new("Floor")
    s = 40.0
    floor_me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    floor = obj("Floor", floor_me)
    floor.is_shadow_catcher = True
    return sc


def hold_cuts(rec):
    """Repeat each scene's last values just after it, so motion blur never
    smears across a cut between scenes."""
    ends = [s["from"] + s["durationInFrames"] - 1 for s in SCENES.values()][:5]
    for ch in rec.channels.values():
        for e in ends:
            if e in ch["values"]:
                ch["values"][e + 0.6] = ch["values"][e]


def dedupe(rec):
    sig = {f: hash(rec.state_signature(f)) for f in range(0, LAST_3D_FRAME + 1)}
    canonical, seen = {}, {}
    for f in range(0, LAST_3D_FRAME + 1):
        key = (sig.get(f - 1), sig[f], sig.get(f + 1))
        canonical[f] = seen.setdefault(key, f)
    return canonical


def project(sc, cam, point, W, H):
    v = world_to_camera_view(sc, cam, Vector(point))
    return [round(v.x * W, 2), round((1 - v.y) * H, 2)]


def anchors(sc, film, layout):
    W, H = layout["width"], layout["height"]
    out = {}
    prof = DATA["profiles"]
    n = prof["points"]
    contours = [film.profile_sections[i][:n] for i in range(4)]
    for f in range(0, LAST_3D_FRAME + 1):
        rec = {}
        l3 = local("edges", f)
        l5 = local("benefits", f)
        if 0 <= l3 < SCENES["edges"]["durationInFrames"] or 0 <= l5 < SCENES["benefits"]["durationInFrames"]:
            sc.frame_set(f)
        else:
            continue
        cam = sc.camera
        if 0 <= l3 < SCENES["edges"]["durationInFrames"]:
            t = [ramp(l3, r, "inOut") for r in S3["morphs"]]
            w = [1 - t[0], t[0] * (1 - t[1]), t[1] * (1 - t[2]), t[2]]
            mw = film.tabletop.matrix_world
            pts = []
            for i in range(0, n, 4):
                y = sum(w[k] * contours[k][i][0] for k in range(4))
                z = sum(w[k] * contours[k][i][1] for k in range(4))
                pts.append(project(sc, cam, mw @ Vector((0.8, y, z)), W, H))
            rec["contour"] = pts
            top, bot = 0.019, 0.0
            edge = 0.4
            for name, (yy, zz) in {
                "extTopA": (edge + 0.0015, top),
                "extTopB": (edge + 0.010, top),
                "extBotA": (edge + 0.0015, bot),
                "extBotB": (edge + 0.010, bot),
                "dimTop": (edge + 0.0075, top),
                "dimBot": (edge + 0.0075, bot),
                "label": (edge + 0.011, top / 2),
            }.items():
                rec[name] = project(sc, cam, mw @ Vector((0.8, yy, zz)), W, H)
        if 0 <= l5 < SCENES["benefits"]["durationInFrames"]:
            root = film.stack_root.matrix_world
            pa, pb = film.pallet_a.location, film.pallet_b.location
            rec["sheets"] = project(sc, cam, root @ Vector((pa.x + 0.3, pa.y - 0.72, 0.0)), W, H)
            rec["parts"] = project(sc, cam, root @ Vector((pb.x + 0.2, pb.y - 0.5, 0.0)), W, H)
            nx, ny = film.new_panel_origin
            rec["strip"] = project(sc, cam, root @ Vector((nx, ny - 0.22, 0.019)), W, H)  # front-left corner
            rec["stripEnd"] = project(sc, cam, root @ Vector((nx + 2.6, ny - 0.22, 0.019)), W, H)  # front-right corner
        out[f] = rec
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", default="reels", choices=["reels", "linkedin"])
    ap.add_argument("--samples", type=int, default=32)
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])

    layout = DATA["layouts"][args.variant]
    sc = setup_scene(layout, args.samples)
    mats = Library()
    rec = Recorder()
    film = Film(layout, rec, mats)
    film.lights()
    for f in range(0, LAST_3D_FRAME + 1):
        film.update(f)
        film.update_lights(f)
    canonical = dedupe(rec)
    hold_cuts(rec)
    rec.write()

    out_dir = os.path.join(PROJECT, "public", "renders3d", args.variant)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "frames.json"), "w") as fh:
        json.dump({"canonical": canonical}, fh)
    with open(os.path.join(out_dir, "anchors.json"), "w") as fh:
        json.dump({"width": layout["width"], "height": layout["height"], "frames": anchors(sc, film, layout)}, fh)

    blend_dir = os.path.join(HERE, "blend")
    os.makedirs(blend_dir, exist_ok=True)
    path = os.path.join(blend_dir, f"polygood-{args.variant}.blend")
    sc.frame_set(0)
    bpy.ops.wm.save_as_mainfile(filepath=path, relative_remap=True)
    unique = len(set(canonical.values()))
    print(f"saved {path}; {unique} unique of {len(canonical)} frames")


if __name__ == "__main__":
    main()
