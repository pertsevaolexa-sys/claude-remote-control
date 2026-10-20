"""Bring a rendered film's soundtrack up to social-media loudness, in place.

    python3 -I scripts/master_audio.py out/polygood-realistic-reels-1080x1920.mp4 [--lufs -14]

The Remotion mix sits at -23 LUFS (broadcast level), which is barely audible
on a phone next to other posts. This measures the integrated loudness,
applies the gain needed to reach the target, and catches the few transients
that would then clip with a brick-wall limiter at -2 dBFS. The video stream is
copied untouched. Needs ffmpeg on the PATH.
"""

import argparse
import os
import re
import subprocess
import sys


def loudness(path):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=True,
    ).stderr
    summary = out[out.rindex("Summary:") :]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    return i, tp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--lufs", type=float, default=-14.0)
    args = ap.parse_args()

    before, peak = loudness(args.path)
    gain = args.lufs - before
    tmp = args.path + ".master.mp4"
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", args.path,
            "-c:v", "copy",
            "-af", f"volume={gain:.2f}dB,alimiter=limit=0.794:attack=2:release=60:level=disabled",
            "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
            "-movflags", "+faststart",
            tmp,
        ],
        check=True,
    )
    os.replace(tmp, args.path)
    after, peak_after = loudness(args.path)
    print(f"{args.path}: {before:.1f} -> {after:.1f} LUFS, true peak {peak:.1f} -> {peak_after:.1f} dBFS")
    if abs(after - args.lufs) > 1.0:
        sys.exit(f"loudness {after:.1f} LUFS is off target {args.lufs:.1f}")


if __name__ == "__main__":
    main()
