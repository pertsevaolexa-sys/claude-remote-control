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


def midi_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def music():
    """Music bed for the realistic films, voiced for phone speakers: a soft
    plucked arpeggio (400 Hz to 1.5 kHz plus overtones) over a warm pad, at
    120 BPM so
    every chord change lands on a scene cut (0, 4, 9, 14, 19.5, 25 s). A light
    pulse builds from scene 02; under the logo it resolves on D and decays to
    nothing by 29.2 s, inside the film's silent last half second."""
    r = np.random.default_rng(11)  # own generator: the other cues stay identical
    secs = 29.2
    n = int(secs * SR)
    t = np.arange(n) / SR
    beat = 0.5
    # (start s, pad voicing, arpeggio tones), MIDI note numbers
    sections = [
        (0.0, [50, 57, 62, 64, 66], [62, 66, 69, 74, 76]),  # D add9
        (4.0, [47, 54, 59, 62, 66], [59, 62, 66, 69, 74]),  # Bm7
        (9.0, [43, 55, 59, 62, 66], [55, 59, 62, 66, 71]),  # Gmaj7
        (14.0, [52, 59, 62, 66, 67], [59, 62, 66, 67, 71]),  # Em9
        (19.5, [45, 57, 62, 64, 69], [57, 62, 64, 69, 74]),  # Asus4
        (22.5, [45, 57, 61, 64, 69], [57, 61, 64, 69, 73]),  # A
        (25.0, [50, 57, 62, 66, 69], [62, 66, 69, 74, 78]),  # D
    ]
    ends = [s[0] for s in sections[1:]] + [secs]
    left, right = np.zeros(n), np.zeros(n)

    # Warm pad: band-limited sawtooth per chord tone, crossfading at changes
    for (start, voicing, _), end in zip(sections, ends):
        a, b = int(start * SR), int(min(secs, end + 0.35) * SR)
        tt = t[a:b] - start
        seg_l, seg_r = np.zeros(b - a), np.zeros(b - a)
        for j, note in enumerate(voicing):
            f = midi_hz(note)
            weight = 0.4 if j == 0 else 1.0  # light bass: phones can't play it
            for k in range(1, 20):
                if k * f > 4000:
                    break
                g = weight * (1 / k) * np.exp(-k * f / 2600)
                seg_l += g * np.sin(2 * np.pi * k * f * 0.998 * tt)
                seg_r += g * np.sin(2 * np.pi * k * f * 1.002 * tt + 0.4 * k)
        env = np.clip(tt / 0.35, 0, 1) * np.clip((end + 0.35 - start - tt) / 0.35, 0, 1)
        if start >= 25.0:  # final chord rings out and decays to zero
            env = np.clip(tt / 0.2, 0, 1) * np.exp(-tt * 0.9) * np.clip((secs - start - tt) / 0.6, 0, 1)
        left[a:b] += seg_l * env * 0.05
        right[a:b] += seg_r * env * 0.05

    def pluck(f, dur=0.6):
        m = int(dur * SR)
        tt = np.arange(m) / SR
        sig = (
            np.sin(2 * np.pi * f * tt) * np.exp(-tt * 5.5)
            + 0.5 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 9)
            + 0.25 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 13)
            + 0.1 * np.sin(2 * np.pi * 3.98 * f * tt) * np.exp(-tt * 18)
        )
        return sig * np.clip(tt / 0.003, 0, 1)

    def place(sig, at, gain, pan):
        a = int(at * SR)
        if a >= n:
            return
        m = min(len(sig), n - a)
        left[a : a + m] += sig[:m] * gain * (1 - pan)
        right[a : a + m] += sig[:m] * gain * (1 + pan)

    # Arpeggio: quarter notes in scene 01, eighth notes from scene 02
    pattern = [0, 2, 4, 2, 1, 3, 4, 3]
    step = 0
    for (start, _, tones), end in zip(sections, ends):
        if start >= 25.0:
            # Last gesture under the logo: three rising notes, then let it ring
            for i, note in enumerate(tones[2:]):
                place(pluck(midi_hz(note + 12), 1.6), start + i * beat / 2, 0.22, (-0.3, 0.0, 0.3)[i])
            break
        sub = beat if start < 4.0 else beat / 2
        at = start
        while at < end - 1e-6:
            note = tones[pattern[step % len(pattern)]]
            accent = 1.0 if abs((at / beat) % 2) < 1e-6 else 0.75
            place(pluck(midi_hz(note + 12)), at, 0.16 * accent, 0.25 if step % 2 else -0.25)
            step += 1
            at += sub

    # Pulse: soft kick with an audible click on the beat (from scene 03),
    # shaker on the off-beat eighths (from scene 02)
    kick_len = int(0.3 * SR)
    kt = np.arange(kick_len) / SR
    kick = np.sin(2 * np.pi * np.cumsum(55 + 110 * np.exp(-kt * 30)) / SR) * np.exp(-kt * 12)
    kick += band(r.standard_normal(kick_len), 1200, 4000) * np.exp(-kt * 120) * 0.25
    shake_len = int(0.06 * SR)
    st = np.arange(shake_len) / SR
    for i in range(int(25.0 / beat)):
        at = i * beat
        if at >= 9.0:
            place(kick, at, 0.22 if i % 2 == 0 else 0.14, 0.0)
        if at >= 4.0:
            shaker = band(r.standard_normal(shake_len), 5000, 11000) * np.exp(-st * 70)
            place(shaker, at + beat / 2, 0.05, 0.2)

    # A little space: one soft echo of everything, a dotted eighth later
    d = int(0.375 * SR)
    left[d:] += 0.22 * right[:-d]
    right[d:] += 0.22 * left[:-d]

    sig = np.stack([left, right], axis=1)
    sig[: int(0.4 * SR)] *= np.linspace(0, 1, int(0.4 * SR))[:, None] ** 2
    sig[-int(0.05 * SR) :] = 0
    return normalise(sig, -6)


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
    write("music.wav", music())


if __name__ == "__main__":
    main()
