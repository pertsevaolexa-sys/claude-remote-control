"""Mix the realistic films' soundtrack from its cues, ready for the Blender edit.

    python3 -I scripts/mix_audio.py [--lufs -14]

Reads the cue list (REALISTIC_CUES in src/config/audio.ts, exported to
blender/scene-data.json by `npm run blender:export`), places each cue file
from public/audio/ at its frame and volume, as Remotion's <Audio> does, and
writes public/audio/realistic-mix.wav for the whole film. Then it masters the
mix like scripts/master_audio.py: gain to the target loudness behind a
brick-wall limiter at -2 dBFS. Needs numpy and ffmpeg on the PATH.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SR = 48000


def read(path):
    with wave.open(path, "rb") as w:
        if w.getframerate() != SR or w.getsampwidth() != 2:
            sys.exit(f"{path}: expected 16-bit {SR} Hz")
        data = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
        return data.reshape(-1, w.getnchannels())


def loudness(path):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
        check=True,
    ).stderr
    summary = out[out.rindex("Summary:") :]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lufs", type=float, default=-14.0)
    args = ap.parse_args()

    with open(os.path.join(ROOT, "blender", "scene-data.json")) as fh:
        data = json.load(fh)
    fps = data["timing"]["FPS"]
    n = int(data["timing"]["DURATION_IN_FRAMES"] / fps * SR)
    mix = np.zeros((n, 2))
    for cue in data["audio"]:
        sig = read(os.path.join(ROOT, "public", cue["src"]))
        if sig.shape[1] == 1:
            sig = np.repeat(sig, 2, axis=1)
        a = int(round(cue["from"] / fps * SR))
        m = min(len(sig), n - a)
        mix[a : a + m] += sig[:m] * cue["volume"]

    out = os.path.join(ROOT, "public", "audio", "realistic-mix.wav")
    raw = out + ".raw.wav"
    with wave.open(raw, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
    before = loudness(raw)
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", raw,
            "-af", f"volume={args.lufs - before:.2f}dB,alimiter=limit=0.794:attack=2:release=60:level=disabled",
            "-c:a", "pcm_s16le", "-ar", str(SR),
            out,
        ],
        check=True,
    )
    os.remove(raw)
    after = loudness(out)
    print(f"{os.path.relpath(out, ROOT)}: {n / SR:.1f} s, {before:.1f} -> {after:.1f} LUFS")
    if abs(after - args.lufs) > 1.0:
        sys.exit(f"loudness {after:.1f} LUFS is off target {args.lufs:.1f}")


if __name__ == "__main__":
    main()
