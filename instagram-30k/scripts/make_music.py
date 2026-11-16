"""Synthesise the soundtrack for the Followers30K composition.

Everything is generated from scratch (no samples), so the track is fully
owned and lines up with the animation frame by frame:

  0.0 - 1.5 s  logo draws on        -> soft shimmer swell, pad + arpeggio
  1.4 - 3.6 s  digits roll          -> ticks for every digit change
  2.67 - 3.4 s digits land (8ths)   -> rising bell notes
  3.6 s        30 000 lands + heart -> impact, beat drops
  3.73 s       notification bubble  -> "bloop"
  7.33 s       ending                -> final chord rings out

Run:  python3 scripts/make_music.py   (needs numpy + scipy)
Writes public/music.wav
"""

import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
FPS = 30
DUR = 8.0
N = int(SR * DUR)
rng = np.random.default_rng(30000)

BEAT = 0.466667  # 128.6 BPM: two 16ths = the 7-frame gap between digit landings
DROP = 3.6  # frame 108, the last digit lands
BAR = BEAT * 4


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def place(buf, start, sig, gain=1.0):
    i = int(round(start * SR))
    if i >= len(buf):
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env(n, a, d, s, r, length):
    """ADSR envelope, times in seconds, length = held duration."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-6), e)
    e = np.where((t >= a + d) & (t < length), s, e)
    e = np.where(t >= length, s * np.exp(-(t - length) / max(r, 1e-6) * 4), e)
    return e


# ---------------------------------------------------------------- instruments


def pad_note(m, length, gain=1.0):
    n = int((length + 1.5) * SR)
    t = np.arange(n) / SR
    f = midi(m)
    x = np.zeros(n)
    for det in (-0.09, 0.0, 0.08):  # detuned voices, in semitones
        fd = f * 2 ** (det / 12)
        ph = rng.random() * 2 * np.pi
        for k in range(1, 14):
            if fd * k > 9000:
                break
            x += np.sin(2 * np.pi * fd * k * t + ph * k) / k
    x = lp(x, 2400)
    return x * env(n, 0.35, 0.4, 0.8, 1.2, length) * gain * 0.05


def pluck(m, gain=1.0, decay=0.28):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = midi(m)
    x = np.zeros(n)
    for k in range(1, 12):
        if f * k > 12000:
            break
        x += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (1 / decay) * (1 + 0.45 * k))
    x *= np.minimum(1, t / 0.002)
    return x * gain * 0.22


def bell(m, gain=1.0):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = midi(m)
    mod = 2.2 * np.exp(-t * 6) * np.sin(2 * np.pi * f * 3.5 * t)
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.4)
    x += 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
    x *= np.minimum(1, t / 0.001)
    return x * gain * 0.25


def kick(gain=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7)
    x += hp(rng.standard_normal(n), 2000) * np.exp(-t * 300) * 0.25
    return np.tanh(x * 1.6) * gain * 0.8


def clap(gain=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 3000)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) * 90), 0)
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) * 14) * 0.5, 0)
    return noise * e * gain * 0.35


def hat(gain=1.0, decay=45):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500) * np.exp(-t * decay) * gain * 0.12


def crash(gain=1.0):
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4500) * np.exp(-t * 1.9) * gain * 0.13


def boom(gain=1.0):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 10)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6) * gain * 0.7


def bass_note(m, length, gain=1.0):
    n = int((length + 0.1) * SR)
    t = np.arange(n) / SR
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return lp(x, 700) * env(n, 0.005, 0.1, 0.85, 0.08, length) * gain * 0.32


def tick(gain=1.0):
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 400) * gain * 0.09


def bloop(gain=1.0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = 500 + 1300 * (1 - np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * np.minimum(1, t / 0.003) * gain * 0.3


def riser(start, end, gain=1.0):
    n = int((end - start) * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    steps = 24
    for s in range(steps):  # band sweeps upward, crossfaded in chunks
        a, b = s * n // steps, (s + 1) * n // steps
        centre = 400 * (16 ** (s / steps))
        seg = bp(noise, centre * 0.7, min(centre * 1.6, 18000))[a:b]
        out[a:b] = seg
    return out * (t**2.2) * gain * 0.25


# ------------------------------------------------- timing from the animation


def cubic_bezier(x1, y1, x2, y2):
    def f(x):
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            bx = 3 * (1 - mid) ** 2 * mid * x1 + 3 * (1 - mid) * mid**2 * x2 + mid**3
            lo, hi = (mid, hi) if bx < x else (lo, mid)
        u = (lo + hi) / 2
        return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u**2 * y2 + u**3

    return f


def digit_change_frames():
    """Frames where any roller digit changes (mirrors DigitRoller in Composition.tsx)."""
    ease = cubic_bezier(0.22, 0.61, 0.2, 1)
    digits = [3, 0, 0, 0, 0]
    counts = {}
    for i, d in enumerate(digits):
        target = (2 + i) * 10 + d
        start, end = 42, 108 - (4 - i) * 7
        prev = 0
        for fr in range(start, end + 1):
            p = ease(min(1, (fr - start) / (end - start)))
            cur = int(np.floor(p * target + 1e-6))
            if cur != prev:
                counts[fr] = counts.get(fr, 0) + 1
            prev = cur
    return counts


# --------------------------------------------------------------- arrangement

dry = np.zeros(N)
wet_send = np.zeros(N)  # goes through reverb
drums = np.zeros(N)
kick_env = np.ones(N)  # for sidechain ducking

bar_starts = [DROP - 2 * BAR, DROP - BAR, DROP, DROP + BAR]
chords = [
    ([55, 59, 62, 66], 43, "Gmaj7"),
    ([57, 61, 64, 69], 45, "A"),
    ([62, 66, 69, 73], 38, "Dmaj7"),
    ([59, 62, 66, 69], 35, "Bm7"),
]
END_HIT = DROP + 2 * BAR  # 7.33 s

# pads
for (notes, _, _), bs in zip(chords, bar_starts):
    for m in notes:
        g = 0.5 if bs < DROP else 1.0
        sig = pad_note(m, BAR, g)
        place(dry, bs, sig, 0.6)
        place(wet_send, bs, sig, 0.5)

# logo draw-on shimmer (0.27 - 1.5 s)
n = int(1.6 * SR)
t = np.arange(n) / SR
shimmer = sum(np.sin(2 * np.pi * midi(m) * t) for m in (86, 90, 93, 97)) * 0.06
shimmer *= np.sin(np.pi * np.clip(t / 1.6, 0, 1)) ** 2
place(wet_send, 0.2, shimmer, 0.8)
place(dry, 0.2, lp(rng.standard_normal(n), 3000) * np.sin(np.pi * t / 1.6) ** 3 * 0.04)

# arpeggio: 16ths over chord tones, filter opening through the intro
arp_shape = [0, 1, 2, 3, 2, 1, 0, 1]
sixteenth = BEAT / 4
for (notes, _, _), bs in zip(chords, bar_starts):
    tones = notes + [m + 12 for m in notes]
    for k in range(16):
        st = bs + k * sixteenth
        if st < 0.4 or st >= END_HIT:
            continue
        m = tones[(arp_shape[k % 8] + (k // 8) * 2) % len(tones)] + 12
        intro = st < DROP
        g = (0.25 + 0.55 * (st / DROP)) if intro else 0.9
        sig = pluck(m, g, decay=0.18 if intro else 0.26)
        if intro:
            sig = lp(sig, 900 + 5000 * (st / DROP))
        place(dry, st, sig, 0.7)
        place(wet_send, st, sig, 0.45)

# rolling-digit ticks
for fr, c in digit_change_frames().items():
    place(dry, fr / FPS, tick(min(1.0, 0.45 + 0.25 * c)))

# digit landings: rising bell notes on 8ths, the last lands with the drop
for k, m in enumerate([69, 71, 73, 74]):
    st = (80 + 7 * k) / FPS
    sig = bell(m + 12, 0.7 + 0.1 * k)
    place(dry, st, sig, 0.6)
    place(wet_send, st, sig, 0.6)

# riser into the drop
place(dry, DROP - BAR, riser(DROP - BAR, DROP), 1.0)

# the drop: impact + heart pop
place(drums, DROP, boom(), 1.0)
place(drums, DROP, crash(), 1.0)
for m in (74, 78, 81, 85):  # bright Dmaj7 stab
    sig = bell(m + 12, 0.8)
    place(dry, DROP, sig, 0.5)
    place(wet_send, DROP, sig, 0.8)
place(dry, DROP + 0.01, bloop(0.8))
place(dry, 112 / FPS, bloop(1.0))  # notification bubble

# groove after the drop
beat_times = [DROP + i * BEAT for i in range(int((END_HIT - DROP) / BEAT + 0.5))]
for i, bt in enumerate(beat_times):
    place(drums, bt, kick(1.0 if i else 1.15))
    a = int(bt * SR)
    b = min(N, a + int(0.25 * SR))
    kick_env[a:b] = np.minimum(kick_env[a:b], 1 - 0.7 * np.exp(-np.arange(b - a) / SR * 14))
    if i % 2 == 1:
        place(drums, bt, clap())
        place(wet_send, bt, clap(), 0.4)
    place(drums, bt + BEAT / 2, hat(1.0))
    place(drums, bt + BEAT / 4, hat(0.35, 70))
    place(drums, bt + 3 * BEAT / 4, hat(0.35, 70))

# bass: 8ths on the root after the drop
bass = np.zeros(N)
for (_, root, _), bs in zip(chords[2:], bar_starts[2:]):
    for k in range(8):
        st = bs + k * BEAT / 2
        if st >= END_HIT:
            continue
        place(bass, st, bass_note(root + (12 if k % 4 == 3 else 0), BEAT / 2 * 0.8))
dry += bass * kick_env

# ending: everything stops, a Dmaj9 rings out
for m in (50, 62, 66, 69, 73, 76):
    for sig in (pad_note(m, 0.4, 1.4), pluck(m + 12, 0.35)):
        place(dry, END_HIT, sig, 0.7)
        place(wet_send, END_HIT, sig, 0.9)
place(dry, END_HIT, bell(86, 0.6), 0.5)
place(wet_send, END_HIT, bell(86, 0.6), 0.8)
place(drums, END_HIT, crash(0.6))

# duck pads/plucks a little under the kick
dry *= 0.6 + 0.4 * kick_env

# ------------------------------------------------------------------- mixdown


def reverb_ir(seconds=2.2):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    irs = []
    for _ in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 3.2)
        irs.append(lp(ir, 6000))
    return irs


irs = reverb_ir()
left = dry + drums
right = dry.copy() + drums
wl = fftconvolve(wet_send, irs[0])[:N] * 0.12
wr = fftconvolve(wet_send, irs[1])[:N] * 0.12
left += wl
right += wr
# slight stereo width on the arp/pad bus via a short delay on one side
right[300:] += dry[:-300] * 0.12

stereo = np.stack([left, right], axis=1)
stereo = hp(stereo.T, 30).T
stereo /= np.max(np.abs(stereo)) + 1e-9
stereo = np.tanh(stereo * 1.15) / np.tanh(1.15)  # gentle limiting
stereo *= 10 ** (-1 / 20)  # -1 dBFS peak

fade_in = int(0.03 * SR)
stereo[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(0.45 * SR)
stereo[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5

out = os.path.join(os.path.dirname(__file__), "..", "public", "music.wav")
pcm = (stereo * 32767).astype(np.int16)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", os.path.normpath(out), f"{DUR}s")
