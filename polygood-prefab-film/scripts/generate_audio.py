"""Synthesise the film's sound design from scratch.

Every cue is generated here with numpy (sines, filtered noise, envelopes), so
the files are original and carry no third-party licence. They are deliberately
restrained placeholders: swap any of them for licensed library sounds by
replacing the file in public/audio/ (see README, "Audio").

Where each cue sits on the timeline is set in src/config/audio.ts, not here.

Usage:  python3 -I scripts/generate_audio.py
"""

import os
import wave

import numpy as np

SR = 48000
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio")
rng = np.random.default_rng(7)


def t_axis(seconds):
    return np.arange(int(SR * seconds)) / SR


def band(signal, lo, hi, soft=0.15):
    """Band-pass by shaping the spectrum (smooth edges to avoid ringing)."""
    spec = np.fft.rfft(signal)
    f = np.fft.rfftfreq(len(signal), 1 / SR)
    lo_gain = 1 / (1 + np.exp(-(f - lo) / max(lo * soft, 1)))
    hi_gain = 1 / (1 + np.exp((f - hi) / max(hi * soft, 1)))
    return np.fft.irfft(spec * lo_gain * hi_gain, n=len(signal))


def noise(seconds):
    return rng.standard_normal(int(SR * seconds))


def env_adsr(n, a, d, s, r, sustain_level=0.7):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    s_len = max(0, n - a - d - r)
    e = np.concatenate(
        [
            np.linspace(0, 1, a, endpoint=False) ** 2,
            np.linspace(1, sustain_level, d, endpoint=False),
            np.full(s_len, sustain_level),
            np.linspace(sustain_level, 0, r) ** 1.5,
        ]
    )
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def fade(sig, fade_in=0.005, fade_out=0.02):
    n = len(sig)
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    e = np.ones(n)
    if fi:
        e[:fi] = np.linspace(0, 1, fi)
    if fo:
        e[-fo:] = np.linspace(1, 0, fo)
    return sig * e


def normalise(sig, peak_db):
    peak = np.max(np.abs(sig)) or 1
    return sig / peak * (10 ** (peak_db / 20))


def stereo(sig, width=0.0, delay_ms=0.0):
    d = int(delay_ms * SR / 1000)
    right = np.concatenate([np.zeros(d), sig])[: len(sig)] if d else sig
    left = sig * (1 - width / 2) + right * (width / 2)
    right = right * (1 - width / 2) + sig * (width / 2)
    return np.stack([left, right], axis=1)


def write(name, sig):
    if sig.ndim == 1:
        sig = stereo(sig)
    data = (np.clip(sig, -1, 1) * 32767).astype("<i2")
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"wrote {name}  {len(sig) / SR:.2f}s")


def pad():
    """Low atmospheric pad in D, fading out under the resolving note."""
    secs = 28.0
    t = t_axis(secs)
    freqs = [73.42, 110.0, 146.83, 185.0, 220.0]
    gains = [0.9, 0.55, 0.5, 0.22, 0.18]
    left = np.zeros_like(t)
    right = np.zeros_like(t)
    for f, g in zip(freqs, gains):
        lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.11 + f / 4000) * t)
        left += g * lfo * np.sin(2 * np.pi * f * 0.9985 * t)
        right += g * lfo * np.sin(2 * np.pi * f * 1.0015 * t + 0.6)
    air = band(noise(secs), 300, 1800) * 0.05
    left += air
    right += np.roll(air, 900)
    e = np.ones_like(t)
    fi = int(1.6 * SR)
    e[:fi] = np.linspace(0, 1, fi) ** 2
    fo_start = int(26.4 * SR)
    e[fo_start:] = np.linspace(1, 0, len(t) - fo_start) ** 1.6
    sig = np.stack([left * e, right * e], axis=1)
    return normalise(sig, -11)


def plotter():
    """Pen-plotter scratch: bursts of fine paper noise following the strokes."""
    secs = 1.75
    t = t_axis(secs)
    base = band(noise(secs), 2500, 9000)
    strokes = np.zeros_like(t)
    pos = 0.02
    while pos < secs - 0.05:
        length = rng.uniform(0.06, 0.16)
        s, e = int(pos * SR), int(min(secs, pos + length) * SR)
        strokes[s:e] = np.hanning(e - s) ** 0.4 * rng.uniform(0.6, 1.0)
        pos += length + rng.uniform(0.015, 0.05)
    grain = 1 + 0.6 * np.sign(np.sin(2 * np.pi * 37 * t))  # fibre texture
    sig = base * strokes * grain
    sig += 0.25 * band(noise(secs), 400, 1200) * strokes  # pen body
    return normalise(fade(sig), -10)


def spindle():
    """Spindle whir rising as the cut proceeds."""
    secs = 1.55
    t = t_axis(secs)
    f = 180 + 520 * (t / secs) ** 1.4
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) * 0.5 + np.sin(2 * phase) * 0.25 + np.sin(3.01 * phase) * 0.12
    hiss = band(noise(secs), 1500, 6000) * 0.25
    e = np.clip(t / 0.25, 0, 1) * (0.4 + 0.6 * t / secs)
    e *= np.clip((secs - t) / 0.12, 0, 1)
    return normalise((tone + hiss) * e, -12)


def click():
    """Soft confirmation click for checklist ticks."""
    secs = 0.09
    t = t_axis(secs)
    body = np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 90)
    transient = band(noise(secs), 3000, 9000) * np.exp(-t * 400) * 0.6
    return normalise(fade(body + transient, 0.0005, 0.01), -8)


def mech_click():
    """Mechanical detent click for each edge-profile change."""
    secs = 0.14
    t = t_axis(secs)
    knock = np.sin(2 * np.pi * 620 * t) * np.exp(-t * 60)
    snap = band(noise(secs), 1200, 5000) * np.exp(-t * 220)
    second = np.zeros_like(t)
    off = int(0.018 * SR)
    second[off:] = (band(noise(secs), 2000, 7000) * np.exp(-t * 300))[: len(t) - off] * 0.5
    return normalise(fade(knock * 0.6 + snap + second, 0.0005, 0.01), -7)


def cnc_engrave():
    """CNC engraving: a high, slightly gritty tone with chatter."""
    secs = 1.6
    t = t_axis(secs)
    f = 1150 + 40 * np.sin(2 * np.pi * 3 * t)
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(phase) + 0.35 * np.sin(2 * phase)
    chatter = 1 + 0.35 * np.sin(2 * np.pi * 42 * t)
    grit = band(noise(secs), 3000, 10000) * 0.35
    e = np.clip(t / 0.08, 0, 1) * np.clip((secs - t) / 0.1, 0, 1)
    return normalise((tone * chatter * 0.5 + grit) * e, -15)


def flex():
    """Soft panel flex: a low swell with a gentle creak."""
    secs = 1.2
    t = t_axis(secs)
    swell = band(noise(secs), 80, 400) * np.sin(np.pi * t / secs) ** 2
    f = 140 - 50 * t / secs
    creak_phase = 2 * np.pi * np.cumsum(f) / SR
    creak = np.sign(np.sin(creak_phase)) * 0.08 * band(noise(secs), 200, 900)
    creak *= np.sin(np.pi * np.clip((t - 0.2) / 0.5, 0, 1)) ** 2
    return normalise(fade(swell + creak, 0.02, 0.1), -11)


def tap():
    """Single dry tap of a panel settling on the stack."""
    secs = 0.28
    t = t_axis(secs)
    thump = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 35)
    knock = band(noise(secs), 600, 3500) * np.exp(-t * 90)
    return normalise(fade(thump * 0.8 + knock, 0.0005, 0.04), -5)


def resolve():
    """One restrained resolving note (D4), decaying naturally."""
    secs = 1.4
    t = t_axis(secs)
    f = 293.66
    partials = [(1, 1.0), (2, 0.28), (3, 0.1), (4.01, 0.05)]
    sig = sum(g * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (2.6 + m)) for m, g in partials)
    sig += 0.35 * np.sin(2 * np.pi * f / 2 * t) * np.exp(-t * 2.2)
    sig *= np.clip(t / 0.02, 0, 1)
    sig *= np.clip((secs - t) / 0.35, 0, 1)  # reaches zero inside the file
    return normalise(stereo(sig, 0.3, 11), -9)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    write("pad.wav", pad())
    write("plotter.wav", plotter())
    write("spindle.wav", spindle())
    write("click.wav", click())
    write("mech-click.wav", mech_click())
    write("cnc-engrave.wav", cnc_engrave())
    write("flex.wav", flex())
    write("tap.wav", tap())
    write("resolve.wav", resolve())


if __name__ == "__main__":
    main()
