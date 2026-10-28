"""Render the finished film from one of the .blend files, on a Mac GPU.

    /Applications/Blender.app/Contents/MacOS/Blender -b blender/blend/polygood-reels.blend -P blender/render_mac.py
    ... -- --samples 32     quicker draft (default: the file's 64)
    ... -- --only 3d        just the 3D frames
    ... -- --only film      just the final MP4 (the 3D frames must exist)

1. Turns on the Metal GPU (falls back to the CPU if there is none).
2. Renders scene "3D" into public/renders3d/<format>/frame_0000.png ...
   Frames already on disk are skipped, so stopping and running it again
   carries on where it stopped.
3. Renders scene "Film" (the edit: footage, text, logo, sound) into
   renders/polygood-blender-<format>-<size>.mp4.
"""

import argparse
import sys
import time

import bpy


def use_gpu():
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("METAL", "OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            prefs.compute_device_type = kind
        except TypeError:
            continue
        prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type == kind]
        if gpus:
            for d in prefs.devices:
                d.use = d.type == kind
            print(f"GPU: {', '.join(d.name for d in gpus)} ({kind})", flush=True)
            return "GPU"
    print("No GPU found: rendering on the CPU (slower).", flush=True)
    return "CPU"


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=None)
    ap.add_argument("--only", choices=("3d", "film"), default=None)
    args = ap.parse_args(argv)

    three_d, film = bpy.data.scenes["3D"], bpy.data.scenes["Film"]
    three_d.cycles.device = use_gpu()
    if args.samples:
        three_d.cycles.samples = args.samples

    t = time.time()
    if args.only != "film":
        print(f"Rendering 3D frames {three_d.frame_start}-{three_d.frame_end} to {three_d.render.filepath}", flush=True)
        bpy.ops.render.render(animation=True, scene=three_d.name)
        print(f"3D done in {(time.time() - t) / 60:.0f} min", flush=True)
    if args.only != "3d":
        print(f"Rendering the film to {film.render.filepath}", flush=True)
        bpy.ops.render.render(animation=True, scene=film.name)
        print(f"Done: {bpy.path.abspath(film.render.filepath)}", flush=True)


main()
