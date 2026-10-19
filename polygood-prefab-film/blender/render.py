"""Render frames of a built .blend to public/renders3d/<variant>/.

    python blender/render.py --variant reels [--start 0 --end 749]
                             [--samples 32] [--scale 100] [--frames 0,120,300]

Resumable: frames already on disk are skipped. Frames that frames.json marks
as identical to an earlier frame are copied instead of rendered.
"""

import argparse
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)

import bpy  # noqa: E402  (must come before addon_utils)
import addon_utils  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variant", default="reels")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=None)
    ap.add_argument("--frames", default=None, help="comma-separated list, overrides start/end")
    ap.add_argument("--samples", type=int, default=None)
    ap.add_argument("--scale", type=int, default=100)
    ap.add_argument("--out", default=None)
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])

    blend = os.path.join(HERE, "blend", f"polygood-{args.variant}.blend")
    bpy.ops.wm.open_mainfile(filepath=blend)
    addon_utils.enable("cycles", default_set=True)
    sc = bpy.context.scene
    sc.cycles.device = "CPU"
    if args.samples:
        sc.cycles.samples = args.samples
    sc.render.resolution_percentage = args.scale

    out_dir = args.out or os.path.join(PROJECT, "public", "renders3d", args.variant)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(PROJECT, "public", "renders3d", args.variant, "frames.json")) as fh:
        canonical = {int(k): v for k, v in json.load(fh)["canonical"].items()}

    if args.frames:
        frames = [int(x) for x in args.frames.split(",")]
    else:
        end = sc.frame_end if args.end is None else args.end
        frames = list(range(args.start, end + 1))

    t0 = time.time()
    rendered = 0
    for f in frames:
        path = os.path.join(out_dir, f"frame_{f:04d}.png")
        if os.path.exists(path):
            continue
        src = canonical.get(f, f)
        src_path = os.path.join(out_dir, f"frame_{src:04d}.png")
        if src != f and os.path.exists(src_path) and not args.frames:
            shutil.copyfile(src_path, path)
            continue
        sc.frame_set(f)
        sc.render.filepath = path
        t = time.time()
        bpy.ops.render.render(write_still=True)
        rendered += 1
        print(f"frame {f} {time.time() - t:.1f}s", flush=True)
    print(f"done: {rendered} rendered in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
