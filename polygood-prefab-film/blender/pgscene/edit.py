"""The finished film as a Video Sequencer edit (scene "Film").

The 3D scene renders frames 0-749 as RGBA PNGs. This scene lays them on
paper and adds everything the Remotion version drew on top:
- headlines (line by line behind masks) and, on LinkedIn, the spec lines;
- the process checklist, the edge-profile labels, the thickness label and
  the stack labels (the last two follow the 3D, via projected anchors);
- the toolpath wipe from scene 03 into scene 04, the dissolve to paper at
  the end of scene 05, the logo animation and the soundtrack.
Rendering this scene writes the final MP4.

Positions reproduce the CSS layout of the Remotion components, measured
against Remotion renders (baseline offsets below). Colours are given as
display sRGB, which is how the sequencer takes them.
"""

import os

import blf
import bpy

from .common import DATA, PROJECT, S1, S2, S3, S4, S5, SCENES, lerp, ramp

FPS = DATA["timing"]["FPS"]
END = DATA["timing"]["DURATION_IN_FRAMES"]
CHECK = DATA["timing"]["CHECKLIST"]
DUR = DATA["durations"]
COPY = DATA["copy"]
FONT = os.path.join(PROJECT, "public", "fonts", "PPNeueMontreal-Book.otf")
OVERLAY = os.path.join(PROJECT, "blender", "assets", "overlay")

# Baseline below the text strip's top anchor, in em (measured in Blender)
VSE_BASELINE = 0.94
# CSS baselines in em, measured on Remotion renders of the same layout
HEADLINE_BASELINE = 0.872  # below the top of a line box with line-height 1
CHECK_BASELINE = 0.43  # below a checklist row's centre
LABEL_BASELINE = 0.36  # below the centre of a line-height:normal label
NORMAL_TOP_BASELINE = 0.97  # below the top of a line-height:normal box


def srgb(hex_color, alpha=None):
    h = hex_color.lstrip("#")
    c = tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return c if alpha is None else (*c, alpha)


PAPER = srgb(DATA["colors"]["paper"])
INK = srgb(DATA["colors"]["ink"])
PENDING = srgb(DATA["colors"]["pending"])
ACCENT = srgb(DATA["colors"]["accent"])


def mix(a, b, t):
    return tuple(lerp(x, y, t) for x, y in zip(a, b))


class Edit:
    def __init__(self, layout, variant, frames_dir, anchors, rel):
        """frames_dir: where the 3D scene writes frame_0000.png...;
        rel: turns an absolute path into a //-relative one for the .blend."""
        self.L = layout
        self.variant = variant
        self.W, self.H = layout["width"], layout["height"]
        self.anchors = anchors
        self.rel = rel
        self.frames_dir = frames_dir
        sc = bpy.data.scenes.new("Film")
        self.sc = sc
        sc.render.resolution_x, sc.render.resolution_y = self.W, self.H
        sc.render.resolution_percentage = 100
        sc.render.fps = FPS
        sc.frame_start, sc.frame_end = 0, END - 1
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"
        sc.render.use_sequencer = True
        sc.render.image_settings.media_type = "VIDEO"
        sc.render.image_settings.file_format = "FFMPEG"
        ff = sc.render.ffmpeg
        ff.format, ff.codec = "MPEG4", "H264"
        ff.constant_rate_factor, ff.ffmpeg_preset = "HIGH", "GOOD"
        ff.audio_codec, ff.audio_bitrate, ff.audio_mixrate, ff.audio_channels = "AAC", 320, 48000, "STEREO"
        size = f"{self.W}x{self.H}"
        sc.render.filepath = rel(os.path.join(PROJECT, "renders", f"polygood-blender-{variant}-{size}.mp4"))
        self.ed = sc.sequence_editor_create()
        self.S = self.ed.strips
        self.font = bpy.data.fonts.load(FONT)
        self.font.pack()
        self.fid = blf.load(FONT)
        self.n = 0
        # Per-frame keys: straight lines between them, no overshoot
        bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"

    # -------------------------------------------------------------- helpers

    def name(self, base):
        self.n += 1
        return f"{base}.{self.n:03d}"

    def text_width(self, text, size):
        blf.size(self.fid, size)
        return blf.dimensions(self.fid, text)[0]

    def keys(self, strip, path, frames, fn, index=-1):
        """Key strip.path to fn(frame) on the frames where it changes."""
        vals = [fn(f) for f in frames]
        for i, (f, v) in enumerate(zip(frames, vals)):
            prev = vals[i - 1] if i else None
            nxt = vals[i + 1] if i + 1 < len(vals) else None
            if v != prev or v != nxt:
                target = strip
                parts = path.split(".")
                for p in parts[:-1]:
                    target = getattr(target, p)
                setattr(target, parts[-1], v)
                target.keyframe_insert(parts[-1], frame=f, index=index)

    def text(self, text, size, start, end, channel, color=INK, anchor_x="LEFT"):
        t = self.S.new_effect(name=self.name("Text"), type="TEXT", channel=channel, frame_start=start, length=end - start)
        t.text, t.font, t.font_size = text, self.font, size
        t.color = (*color, 1.0)
        t.anchor_x, t.anchor_y = anchor_x, "TOP"
        t.alignment_x = anchor_x if anchor_x != "CENTER" else "CENTER"
        return t

    def place_text(self, t, x, baseline, size):
        t.location = (x / self.W, 1 - (baseline - VSE_BASELINE * size) / self.H)

    def image(self, filename, start, end, channel, px_size, native):
        st = self.S.new_image(name=self.name(os.path.splitext(filename)[0]), filepath=os.path.join(OVERLAY, filename), channel=channel, frame_start=start)
        st.frame_final_duration = end - start
        st.directory = self.rel(OVERLAY) + os.sep
        s = px_size / native
        st.transform.scale_x = st.transform.scale_y = s
        return st

    def at(self, st, cx, cy):
        st.transform.offset_x = cx - self.W / 2
        st.transform.offset_y = self.H / 2 - cy

    def rect(self, color, start, end, channel):
        """Colour strip cropped to a rectangle (set with crop_to)."""
        c = self.S.new_effect(name=self.name("Rect"), type="COLOR", channel=channel, frame_start=start, length=end - start)
        c.color = color
        return c

    def crop_box(self, x0, y0, x1, y1):
        W, H = self.W, self.H
        x0, x1 = max(0, min(W, round(x0))), max(0, min(W, round(x1)))
        y0, y1 = max(0, min(H, round(y0))), max(0, min(H, round(y1)))
        return x0, W - x1, y0, H - y1  # min_x, max_x, max_y (top), min_y (bottom)

    def key_rect(self, strip, frames, box_fn, alpha_fn):
        """Animate a rectangle given as (x0, y0, x1, y1) per frame (None hides)."""
        boxes = {f: box_fn(f) for f in frames}

        def crop(f, i):
            b = boxes[f]
            return 0 if b is None else self.crop_box(*b)[i]

        for i, path in enumerate(("crop.min_x", "crop.max_x", "crop.max_y", "crop.min_y")):
            self.keys(strip, path, frames, lambda f, i=i: crop(f, i))
        self.keys(strip, "blend_alpha", frames, lambda f: 0.0 if boxes[f] is None else alpha_fn(f))

    # -------------------------------------------------------------- layers

    def build(self):
        self.footage()
        for key, label in (("drawing", True), ("cutting", False), ("edges", False), ("cnc", True), ("benefits", False)):
            self.headline(key, label)
        self.checklist()
        self.edge_labels()
        self.stack_labels()
        self.wipe()
        self.logo()
        self.sound()
        return self.sc

    def footage(self):
        self.rect(PAPER, 0, END, 1).name = "Paper"
        last = SCENES["benefits"]["from"] + S5["labelsOut"][0] - 4 - 1  # last frame before the 3D fade
        seq = self.S.new_image(name="3D", filepath=os.path.join(self.frames_dir, "frame_0000.png"), channel=2, frame_start=0)
        seq.directory = self.rel(self.frames_dir) + os.sep
        for f in range(1, last + 1):
            seq.elements.append(f"frame_{f:04d}.png")
        # Scene 05 clears to paper: hold that frame and dissolve it
        hold = self.S.new_image(name="3D hold", filepath=os.path.join(self.frames_dir, f"frame_{last:04d}.png"), channel=2, frame_start=last + 1)
        hold.directory = seq.directory
        end3d = SCENES["endCard"]["from"]
        hold.frame_final_duration = end3d - last - 1
        b = SCENES["benefits"]["from"]
        self.keys(hold, "blend_alpha", range(last + 1, end3d), lambda f: 1 - ramp(f - b, (S5["labelsOut"][0] - 4, S5["stripOut"][1]), "in"))

    def headline(self, key, label):
        L, sc = self.L, SCENES[key]
        start, end = sc["from"], sc["from"] + sc["durationInFrames"]
        timing = {"drawing": S1, "cutting": S2, "edges": S3, "cnc": S4, "benefits": S5}[key]
        t_in, t_out = timing["headlineIn"], timing["headlineOut"]
        S = L["headline"]["size"]
        LH, pad = S, 0.22 * S
        padx = 0.2 * S if label else 0.0
        x, y = L["headline"]["x"], L["headline"]["y"]
        frames = range(start, end)
        lines = COPY["headlines"][key]
        for i, line in enumerate(lines):
            top = y + i * LH
            band = (top, top + LH + pad)
            elem_h = LH + pad if label else LH

            def offset(f, i=i, elem_h=elem_h):
                l = f - start
                enter = ramp(l, (t_in + i * DUR["lineStaggerIn"], t_in + i * DUR["lineStaggerIn"] + DUR["lineIn"]))
                leave = t_out + i * DUR["lineStaggerOut"]
                exit_ = ramp(l, (leave, leave + DUR["lineOut"]), "in")
                return ((1 - enter) * 1.3 - exit_ * 1.3) * elem_h

            if label:
                box = self.rect(PAPER, start, end, 10 + 2 * i)
                w = self.text_width(line, S)

                def bbox(f, top=top, band=band, w=w, offset=offset):
                    y0, y1 = top + offset(f), top + offset(f) + LH + pad
                    y0, y1 = max(y0, band[0]), min(y1, band[1])
                    return None if y1 - y0 < 0.5 else (x - padx, y0, x + w + padx, y1)

                self.key_rect(box, frames, bbox, lambda f: 1.0)
            t = self.text(line, S, start, end, 11 + 2 * i)
            t.crop.max_y = round(band[0])
            t.crop.min_y = round(self.H - band[1])
            self.keys(t, "location", frames, lambda f, top=top, offset=offset: (x / self.W, 1 - (top + HEADLINE_BASELINE * S + offset(f) - VSE_BASELINE * S) / self.H))
        spec = COPY["specs"].get(key)
        if spec and L["spec"]["show"]:
            self.spec(spec, start, end, t_in, t_out, y + len(lines) * LH + pad, label, padx)

    def spec(self, spec, start, end, t_in, t_out, block_top, label, padx):
        L = self.L
        s, gap = L["spec"]["size"], L["spec"]["gap"]
        # The headline block caps the spec's width as well (CSS max-width)
        maxw = min(L["spec"]["maxWidth"], L["headline"]["maxWidth"])
        x = L["headline"]["x"]
        top = block_top + gap
        lines = self.balanced(spec, s, maxw)
        lh = 1.32 * s
        frames = range(start, end)

        def alpha(f):
            l = f - start
            return ramp(l, (t_in + 10, t_in + 30)) * (1 - ramp(l, (t_out - 2, t_out + 10), "in"))

        def dy(f):
            return (1 - ramp(f - start, (t_in + 10, t_in + 30))) * 14

        for i, line in enumerate(lines):
            base = top + (lh - 1.22 * s) / 2 + NORMAL_TOP_BASELINE * s + i * lh
            if label:
                w = self.text_width(line, s)
                box = self.rect(PAPER, start, end, 16 + 2 * i)
                self.key_rect(box, frames, lambda f, base=base, w=w: (x - padx, base + dy(f) - 1.07 * s, x + w + padx, base + dy(f) + 0.35 * s), alpha)
            t = self.text(line, s, start, end, 17 + 2 * i)
            self.keys(t, "location", frames, lambda f, base=base: (x / self.W, 1 - (base + dy(f) - VSE_BASELINE * s) / self.H))
            self.keys(t, "blend_alpha", frames, alpha)

    def balanced(self, text, size, maxw):
        """Break text into the fewest lines that fit maxw, as evenly as
        CSS text-wrap: balance does, but after a "·" between spec items
        whenever that fits."""
        words = text.split(" ")
        if self.text_width(text, size) <= maxw:
            return [text]
        best = None
        for k in range(1, len(words)):
            a, b = " ".join(words[:k]), " ".join(words[k:])
            wa, wb = self.text_width(a, size), self.text_width(b, size)
            if wa <= maxw and wb <= maxw:
                key = (not a.endswith("·"), max(wa, wb))
                if best is None or key < best[0]:
                    best = (key, [a, b])
        return best[1] if best else [text]

    def checklist(self):
        c = self.L["checklist"]
        size, row = c["size"], c["row"]
        box = round(size * 0.82)
        gap = size * 0.5
        width = box + gap + max(self.text_width(t, size) for t in COPY["checklist"])
        left = self.W - c["right"] - width
        start, end = CHECK["appear"], CHECK["disappear"] + 14
        frames = range(start, end)
        checks = [CHECK["checks"][k] for k in ("cut", "edged", "machined", "curved")]
        out = lambda f: ramp(f, (CHECK["disappear"], CHECK["disappear"] + 14), "in")
        for i, (item, at) in enumerate(zip(COPY["checklist"], checks)):
            cy = c["top"] + i * row + row / 2
            appear = lambda f, i=i: ramp(f, (start + i * 2, start + i * 2 + 14))
            vis = lambda f, appear=appear: appear(f) * (1 - out(f))
            dy = lambda f, appear=appear: (1 - appear(f)) * 10
            fill = lambda f, at=at: ramp(f, (at, at + 7))
            tick = lambda f, at=at: ramp(f, (at + 2, at + 12))
            pulse = lambda f, at=at: ramp(f, (at, at + 4)) * (1 - ramp(f, (at + 4, at + 14)))
            for j, (name, alpha) in enumerate((
                ("check-pending.png", lambda f, vis=vis, fill=fill: vis(f) * (1 - fill(f))),
                ("check-done.png", lambda f, vis=vis, fill=fill: vis(f) * fill(f)),
                ("check-tick.png", lambda f, vis=vis, tick=tick: vis(f) if tick(f) > 0 else 0.0),
            )):
                st = self.image(name, start, end, 30 + i * 4 + j, box, 200)
                self.at(st, left + box / 2, cy)
                self.keys(st, "blend_alpha", frames, alpha)
                self.keys(st, "transform.offset_y", frames, lambda f, dy=dy: self.H / 2 - cy - dy(f))
                s0 = box / 200
                self.keys(st, "transform.scale_x", frames, lambda f, pulse=pulse: s0 * (1 + 0.12 * pulse(f)))
                self.keys(st, "transform.scale_y", frames, lambda f, pulse=pulse: s0 * (1 + 0.12 * pulse(f)))
                if name == "check-tick.png":
                    self.keys(st, "crop.max_x", frames, lambda f, tick=tick: round(200 * (1 - tick(f))))
            t = self.text(item, size, start, end, 33 + i * 4, PENDING)
            tx = left + box + gap
            self.keys(t, "location", frames, lambda f, dy=dy, tx=tx, cy=cy: (tx / self.W, 1 - (cy + CHECK_BASELINE * size + dy(f) - VSE_BASELINE * size) / self.H))
            self.keys(t, "color", frames, lambda f, fill=fill: (*mix(PENDING, INK, fill(f)), 1.0))
            self.keys(t, "blend_alpha", frames, vis)

    def profile_state(self, l):
        mids = [(a + b) / 2 for a, b in S3["morphs"]]
        active = -1
        for i, m in enumerate(mids):
            if l >= m:
                active = i
        lits = [ramp(l, (m, m + 6)) if i == active else 0.0 for i, m in enumerate(mids)]
        appears = [ramp(l, (S3["zoom"][0] + i * 2, S3["zoom"][0] + i * 2 + 14)) for i in range(len(mids))]
        return lits, appears

    def edge_labels(self):
        """Profile list and thickness label of scene 03, plus their copies
        that the scene 04 wipe crops away."""
        s3 = SCENES["edges"]["from"]
        end3 = s3 + SCENES["edges"]["durationInFrames"]
        sec = self.L["section"]
        size, row = sec["labelSize"], sec["labelRow"]
        sq = size * 0.32
        gap = size * 0.45
        x0 = self.L["marginX"]
        frames = range(s3, end3)
        wipe_frames = range(end3, end3 + S4["sweep"][1] + 1)
        sweep = self.sweep_x
        for i, label in enumerate(COPY["edgeProfiles"]):
            cy = sec["labelsY"] + i * row + row / 2
            for part, (start, end, fr) in (("live", (s3, end3, frames)), ("wipe", (end3, wipe_frames.stop, wipe_frames))):
                state = (lambda f: f - s3) if part == "live" else (lambda f: SCENES["edges"]["durationInFrames"] - 1)
                lit = lambda f, state=state, i=i: self.profile_state(state(f))[0][i]
                appear = lambda f, state=state, i=i: self.profile_state(state(f))[1][i]
                dy = lambda f, appear=appear: (1 - appear(f)) * 12
                for name, alpha in (
                    ("profile-pending.png", lambda f, appear=appear, lit=lit: appear(f) * (1 - lit(f))),
                    ("profile-lit.png", lambda f, appear=appear, lit=lit: appear(f) * lit(f)),
                ):
                    st = self.image(name, start, end, 50 + i * 3 + (name == "profile-lit.png"), sq, 100)
                    self.at(st, x0 + sq / 2, cy)
                    self.keys(st, "blend_alpha", fr, alpha)
                    self.keys(st, "transform.offset_y", fr, lambda f, dy=dy: self.H / 2 - cy - dy(f))
                    if part == "wipe":
                        left = x0
                        self.keys(st, "crop.min_x", fr, lambda f, left=left: max(0, min(100, round((sweep(f) - left) / sq * 100))))
                t = self.text(label, size, start, end, 52 + i * 3, PENDING)
                tx = x0 + sq + gap
                self.keys(t, "location", fr, lambda f, dy=dy, tx=tx, cy=cy: (tx / self.W, 1 - (cy + LABEL_BASELINE * size + dy(f) - VSE_BASELINE * size) / self.H))
                self.keys(t, "color", fr, lambda f, lit=lit: (*mix(PENDING, INK, lit(f)), 1.0))
                self.keys(t, "blend_alpha", fr, appear)
                if part == "wipe":
                    self.keys(t, "crop.min_x", fr, lambda f: max(0, min(self.W, round(sweep(f)))))

        # "12 or 19 mm", beside the dimension line drawn in the 3D frames
        lsize = size * 0.72
        thick = lambda f: ramp(f - s3, S3["thickness"])
        for part, (start, end, fr) in (("live", (s3, end3, frames)), ("wipe", (end3, wipe_frames.stop, wipe_frames))):
            src = (lambda f: f) if part == "live" else (lambda f: end3 - 1)
            t = self.text(COPY["claims"]["thicknessLabel"], lsize, start, end, 62)
            self.keys(t, "location", fr, lambda f, src=src: self.label_loc(self.anchors[src(f)]["label"], lsize))
            self.keys(t, "blend_alpha", fr, lambda f, src=src: thick(src(f)))
            if part == "wipe":
                self.keys(t, "crop.min_x", fr, lambda f: max(0, min(self.W, round(sweep(f)))))

    def label_loc(self, p, size):
        # CSS: left at p.x, vertically centred on p.y (line-height normal)
        return (p[0] / self.W, 1 - (p[1] + LABEL_BASELINE * size - VSE_BASELINE * size) / self.H)

    def stack_labels(self):
        """The three labels in one column on the headline's margin, evenly
        spaced down the staircase of objects: under the sheets pallet, level
        with the parts pallet, under the new strip."""
        b = SCENES["benefits"]["from"]
        end = b + SCENES["benefits"]["durationInFrames"]
        size = self.L["stacks"]["labelSize"]
        x, lh = self.L["headline"]["x"], 1.2 * size
        frames = range(b, end)
        out = lambda f: 1 - ramp(f - b, S5["labelsOut"], "in")

        def tops(f):
            a = self.anchors[f]
            first = a["sheetsCorner"][1] + 2 * size
            last = a["strip"][1] + 2 * size
            return first, (first + last) / 2, last

        ch = 70
        for row, (text, window) in enumerate((
            (COPY["stackLabels"]["sheets"], (S5["sheets"][1] - 4, S5["sheets"][1] + 10)),
            (COPY["stackLabels"]["parts"], (S5["settle"] - 2, S5["settle"] + 12)),
            (COPY["stackLabels"]["offcuts"], (S5["granules"][0] + 6, S5["granules"][0] + 22)),
        )):
            # A narrow column: long labels wrap to two balanced lines
            for i, line in enumerate(self.balanced(text, size, 8 * size)):
                t = self.text(line, size, b, end, ch)
                ch += 1

                def loc(f, row=row, i=i):
                    base = tops(f)[row] + NORMAL_TOP_BASELINE * size + i * lh
                    return (x / self.W, 1 - (base - VSE_BASELINE * size) / self.H)

                self.keys(t, "location", frames, loc)
                self.keys(t, "blend_alpha", frames, lambda f, window=window: ramp(f - b, window) * out(f))

    def sweep_x(self, f):
        l4 = f - SCENES["cnc"]["from"]
        return lerp(-60, self.W + 60, ramp(l4, S4["sweep"], "inOut"))

    def wipe(self):
        """A toolpath crosses the frame: behind it scene 04, ahead of it the
        last frame of scene 03 (with its callouts, drawn in 3D)."""
        s4 = SCENES["cnc"]["from"]
        start, end = s4, s4 + S4["sweep"][1] + 1
        frames = range(start, end)
        last3 = s4 - 1
        hold = self.S.new_image(name="3D hold S3", filepath=os.path.join(self.frames_dir, f"frame_{last3:04d}.png"), channel=3, frame_start=start)
        hold.directory = self.rel(self.frames_dir) + os.sep
        hold.frame_final_duration = end - start
        self.keys(hold, "crop.min_x", frames, lambda f: max(0, min(self.W, round(self.sweep_x(f)))))
        # The renders are transparent: keep scene 04 to the left of the line
        seq = self.S["3D"]
        self.keys(seq, "crop.max_x", range(start - 1, end + 1), lambda f: self.W - max(0, min(self.W, round(self.sweep_x(f)))) if start <= f < end else 0)
        cy = self.L["section"]["cy"]
        line = self.rect(ACCENT, start, end, 80)
        self.key_rect(line, frames, lambda f: (self.sweep_x(f) - 0.75, 0, self.sweep_x(f) + 0.75, self.H), lambda f: 0.55)
        stroke = self.rect(ACCENT, start, end, 81)
        self.key_rect(stroke, frames, lambda f: (self.sweep_x(f) - 140, cy - 1.6, self.sweep_x(f), cy + 1.6), lambda f: 1.0)
        head = self.image("toolhead.png", start, end, 82, 48, 192)
        self.at(head, 0, cy)
        self.keys(head, "transform.offset_x", frames, lambda f: self.sweep_x(f) - self.W / 2)

    def logo(self):
        clip = DATA["assets"]["endCardVideo"]
        start = SCENES["endCard"]["from"]
        path = os.path.join(PROJECT, "public", clip["src"])
        mv = self.S.new_movie(name="Logo", filepath=path, channel=2, frame_start=start)
        mv.filepath = self.rel(path)
        mv.frame_final_duration = clip["durationInFrames"]
        box = clip["contentBox"]
        s = self.L["endCard"]["lockupWidthPx"] / box["w"]
        mv.transform.scale_x = mv.transform.scale_y = s
        # centre the lockup itself, not the clip frame
        mv.transform.offset_x = -((box["x"] + box["w"] / 2) - clip["width"] / 2) * s
        mv.transform.offset_y = ((box["y"] + box["h"] / 2) - clip["height"] / 2) * s
        top = self.H / 2 - (box["y"] + box["h"] / 2) * s
        h = clip["height"] * s
        fh = 0.18 * h
        for name, cy in (("feather-top.png", top + fh / 2), ("feather-bottom.png", top + h - fh / 2)):
            st = self.image(name, start, start + clip["durationInFrames"], 3, 1, 1)
            st.transform.scale_x = self.W / 4
            st.transform.scale_y = fh / 256
            self.at(st, self.W / 2, cy)

    def sound(self):
        path = os.path.join(PROJECT, "public", "audio", "realistic-mix.wav")
        snd = self.S.new_sound(name="Soundtrack", filepath=path, channel=90, frame_start=0)
        snd.sound.filepath = self.rel(path)
