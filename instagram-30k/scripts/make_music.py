"""Compose and render the soundtrack for the Followers30K composition.

The music is written as a score in Python (pretty_midi) and performed by
recorded instruments from the MuseScore General soundfont (MIT licensed),
rendered with FluidSynth. Timing follows the animation:

  0.0 - 2.6 s   logo draws, digits start rolling -> soft piano, strings swell
  2.67 - 3.37 s the first four digits land       -> rising piano + celesta notes
  3.28 - 3.58 s                                  -> harp glissando into...
  3.6 s         30 000 lands, heart pops          -> full D major bloom
  3.6 - 7.2 s   bubble, floating hearts           -> light piano melody, pizzicato
  7.2 - 8.0 s   end                               -> final chord rings out

Requires: fluidsynth, musescore-general-soundfont (apt), pretty_midi, numpy, scipy
Run:      python3 scripts/make_music.py   ->  public/music.wav
"""

import os
import subprocess
import tempfile
import wave

import numpy as np
import pretty_midi
from scipy.signal import butter, fftconvolve, sosfilt

SF = "/usr/share/sounds/sf3/MuseScore_General_Full.sf3"
SR = 48000
DUR = 8.0
BEAT = 0.45  # 133.3 BPM, so bar 3 starts exactly at the 3.6 s reveal
BAR = BEAT * 4
E8 = BEAT / 2
rng = np.random.default_rng(30)

# GM programs (0-based)
PIANO, CELESTA, GLOCK, PIZZ, HARP, STRINGS = 0, 8, 9, 45, 46, 49


def human(t, amount=0.008):
    return max(0.0, t + rng.uniform(-amount, amount))


def vel(v, spread=5):
    return int(np.clip(v + rng.integers(-spread, spread + 1), 1, 127))


def add(inst, pitch, start, end, velocity, humanize=True):
    s = human(start) if humanize else start
    inst.notes.append(pretty_midi.Note(vel(velocity) if humanize else velocity, pitch, s, max(s + 0.05, end)))


def pedal(inst, times):
    for t in times:
        if t > 0:
            inst.control_changes.append(pretty_midi.ControlChange(64, 0, t - 0.02))
        inst.control_changes.append(pretty_midi.ControlChange(64, 127, t + 0.03))


# ------------------------------------------------------------------ the score

piano = pretty_midi.Instrument(PIANO, name="piano")
celesta = pretty_midi.Instrument(CELESTA, name="celesta")
glock = pretty_midi.Instrument(GLOCK, name="glock")
pizz = pretty_midi.Instrument(PIZZ, name="pizz")
harp = pretty_midi.Instrument(HARP, name="harp")
strings = pretty_midi.Instrument(STRINGS, name="strings")
drums = pretty_midi.Instrument(0, is_drum=True, name="drums")

bar = [i * BAR for i in range(5)]  # 0, 1.8, 3.6, 5.4, 7.2
REVEAL = bar[2]
pedal(piano, [0.0, bar[1], bar[2], bar[3], bar[3] + 2 * BEAT, bar[4]])

# Bar 1 - Gmaj7, gentle arpeggio
add(piano, 43, 0.0, bar[1], 46)
for k, p in enumerate([55, 62, 66, 71, 74, 71, 66, 62]):
    add(piano, p, k * E8, k * E8 + 0.6, 36 + k * 1.5)

# Bar 2 - Asus4, then a breath before the digits land
add(piano, 45, bar[1], REVEAL, 50)
for k, p in enumerate([57, 64, 69, 74]):
    add(piano, p, bar[1] + k * E8, bar[1] + k * E8 + 0.7, 46 + k * 2)

# the first four digits land (frames 80, 87, 94, 101): rising melody
for k, p in enumerate([76, 81, 83, 85]):
    t = (80 + 7 * k) / 30
    add(piano, p, t, t + 0.4, 52 + k * 6, humanize=False)
    add(celesta, p + 12, t, t + 0.4, 40 + k * 6, humanize=False)

# harp glissando into the reveal (D major scale, D4 -> C#6)
gliss = [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81, 83, 85]
for k, p in enumerate(gliss):
    t = 3.28 + k * (0.3 / len(gliss))
    add(harp, p, t, t + 0.8, 40 + k * 3, humanize=False)

# Bar 3 - THE REVEAL: D major bloom
for p in (38, 50):
    add(piano, p, REVEAL, bar[3], 92, humanize=False)
for p in (62, 66, 69, 74, 86):
    add(piano, p, REVEAL, REVEAL + 1.2, 84, humanize=False)
for k, p in enumerate([86, 90, 93, 98]):
    add(glock, p, REVEAL + k * 0.045, REVEAL + 1.0, 62 - k * 4, humanize=False)
drums.notes.append(pretty_midi.Note(42, 49, REVEAL, REVEAL + 2.0))  # soft crash

# light melody over the floating hearts
melody = [
    (86, bar[2], 3 * E8),            # D6  (held from the reveal)
    (81, bar[2] + 3 * E8, E8),       # A5
    (83, bar[2] + 2 * BEAT, BEAT),   # B5
    (85, bar[2] + 3 * BEAT, BEAT),   # C#6
    (86, bar[3], 3 * E8),            # D6  over Bm7
    (85, bar[3] + 3 * E8, E8),       # C#6
    (83, bar[3] + 2 * BEAT, BEAT),   # B5  over Gmaj7
    (81, bar[3] + 3 * BEAT, BEAT),   # A5
]
for p, t, d in melody[1:]:
    add(piano, p, t, t + d, 66)
for p, t, d in melody:
    add(celesta, p + 12, t, t + d, 34)

# left hand: flowing broken chords
lh = [
    (bar[2], [38, 45, 50, 54, 57, 54, 50, 45]),          # D
    (bar[3], [35, 42, 47, 50]),                          # Bm
    (bar[3] + 2 * BEAT, [43, 50, 55, 59]),               # G
]
for start, pitches in lh:
    for k, p in enumerate(pitches):
        if start == bar[2] and k == 0:
            continue  # the reveal chord already has the low D
        add(piano, p, start + k * E8, start + k * E8 + 0.5, 54)

# pizzicato strings bounce in 8ths after the reveal
pz = [(bar[2], [50, 57, 62, 57, 50, 57, 62, 57]), (bar[3], [47, 54, 59, 54]), (bar[3] + 2 * BEAT, [43, 50, 55, 50])]
for start, pitches in pz:
    for k, p in enumerate(pitches):
        add(pizz, p, start + k * E8, start + k * E8 + 0.2, 58 if k % 2 == 0 else 46)

# sustained strings, swelling into the reveal
string_chords = [
    (0.0, bar[1], [55, 59, 62, 66], 48),
    (bar[1], REVEAL, [57, 61, 64, 69], 56),
    (REVEAL, bar[3], [50, 57, 62, 66, 69], 74),
    (bar[3], bar[3] + 2 * BEAT, [47, 54, 59, 62, 69], 66),
    (bar[3] + 2 * BEAT, bar[4], [43, 50, 59, 62, 66], 64),
    (bar[4], 9.0, [50, 57, 62, 66, 69], 62),
]
for s, e, ps, v in string_chords:
    for p in ps:
        add(strings, p, s, e + 0.05, v, humanize=False)
for i in range(37):  # expression swell 0 -> 3.6 s
    t = i * 0.1
    strings.control_changes.append(pretty_midi.ControlChange(11, int(30 + 90 * (t / 3.6) ** 1.5), t))
strings.control_changes.append(pretty_midi.ControlChange(11, 105, REVEAL))

# Bar 5 - final chord rings out
for p in (38, 50, 57, 66, 69, 76, 81):
    add(piano, p, bar[4], 8.6, 58)
for k, p in enumerate([50, 57, 62, 66, 69, 74]):
    add(harp, p, bar[4] + k * 0.03, bar[4] + 1.5, 48, humanize=False)
for k, p in enumerate([88, 93]):
    add(celesta, p, bar[4] + 0.06 + k * 0.08, bar[4] + 1.0, 36, humanize=False)

# -------------------------------------------------------------------- render

def lp(x, f):
    return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f):
    return sosfilt(butter(2, f, "high", fs=SR, output="sos"), x, axis=0)


def render(inst):
    pm = pretty_midi.PrettyMIDI(initial_tempo=133.333)
    pm.instruments.append(inst)
    with tempfile.TemporaryDirectory() as d:
        mid, wav = os.path.join(d, "s.mid"), os.path.join(d, "s.wav")
        pm.write(mid)
        subprocess.run(
            ["fluidsynth", "-ni", "-q", "-R", "0", "-C", "0", "-g", "0.8", "-r", str(SR), "-F", wav, SF, mid],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with wave.open(wav) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
            x = x.reshape(-1, w.getnchannels())
    n = int(DUR * SR)
    out = np.zeros((n, 2))
    m = min(n, len(x))
    out[:m] = x[:m]
    return out


# (stem, gain, reverb send)
stems = [
    (piano, 1.0, 0.35),
    (strings, 0.55, 0.6),
    (celesta, 0.55, 0.7),
    (glock, 0.45, 0.7),
    (harp, 0.7, 0.6),
    (pizz, 0.5, 0.4),
    (drums, 0.35, 0.5),
]
n = int(DUR * SR)
dry = np.zeros((n, 2))
send = np.zeros((n, 2))
for inst, g, s in stems:
    x = render(inst) * g
    dry += x
    send += x * s

# concert-hall style reverb: pre-delay + decaying, darkened noise tail
t = np.arange(int(2.6 * SR)) / SR
ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))], axis=1)
ir *= np.exp(-t * 2.6)[:, None]
ir = lp(ir, 5500)
ir = np.concatenate([np.zeros((int(0.025 * SR), 2)), ir])
ir /= np.sqrt(np.sum(ir**2, axis=0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:n] for c in range(2)], axis=1) * 0.35

mix = hp(dry + wet, 35)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 10 ** (-1.5 / 20)
fade = int(0.5 * SR)
mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]

out = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "music.wav"))
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("wrote", out)
