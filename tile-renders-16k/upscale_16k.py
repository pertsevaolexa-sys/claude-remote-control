"""Faithful 16K upscale for product photos.

Real-ESRGAN (general-x4v3, low denoise) adds 4x detail, which is then locked to the source
with iterative back-projection so the result scaled back down reproduces the original photo's
colours and tones. A Lanczos resize takes it to a 15360 px long edge (16K UHD).

    pip install pillow numpy torch spandrel
    python upscale_16k.py photo1.webp photo2.jpg ...   # writes <name>-16k.jpg next to this script
"""
import sys, urllib.request
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from spandrel import ModelLoader

HERE = Path(__file__).parent
WEIGHTS = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/"
LONG_EDGE, DENOISE, DETAIL, BP_ITERS = 15360, 0.2, 0.8, 3


def load_model():
    paths = []
    for name in ("realesr-general-x4v3.pth", "realesr-general-wdn-x4v3.pth"):
        p = HERE / "models" / name
        if not p.exists():
            p.parent.mkdir(exist_ok=True)
            urllib.request.urlretrieve(WEIGHTS + name, p)
        paths.append(p)
    a, b = (ModelLoader().load_from_file(p).model for p in paths)
    sa, sb = a.state_dict(), b.state_dict()
    a.load_state_dict({k: DENOISE * sa[k] + (1 - DENOISE) * sb[k] for k in sa})
    return a.eval()


@torch.inference_mode()
def sr4(model, x, tile=320, pad=24):
    _, _, h, w = x.shape
    out = torch.zeros(1, 3, h * 4, w * 4)
    for y0 in range(0, h, tile):
        for x0 in range(0, w, tile):
            y1, x1 = min(y0 + tile, h), min(x0 + tile, w)
            py0, px0 = max(y0 - pad, 0), max(x0 - pad, 0)
            o = model(x[:, :, py0:min(y1 + pad, h), px0:min(x1 + pad, w)])
            oy, ox = (y0 - py0) * 4, (x0 - px0) * 4
            out[:, :, y0 * 4:y1 * 4, x0 * 4:x1 * 4] = o[:, :, oy:oy + (y1 - y0) * 4, ox:ox + (x1 - x0) * 4]
    return out.clamp(0, 1)


def faithful4(model, img):
    src = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255.0).permute(2, 0, 1)[None]
    h, w = src.shape[-2:]
    up = lambda t: F.interpolate(t, scale_factor=4, mode="bicubic", align_corners=False)
    base = up(src).clamp(0, 1)
    out = base + DETAIL * (sr4(model, src) - base)
    for _ in range(BP_ITERS):
        down = F.interpolate(out, size=(h, w), mode="bicubic", antialias=True, align_corners=False)
        out = out + up(src - down)
    arr = (out[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8)
    return Image.fromarray(arr)


if __name__ == "__main__":
    torch.set_num_threads(torch.get_num_threads())
    model = load_model()
    for src in sys.argv[1:]:
        img = Image.open(src).convert("RGB")
        s = LONG_EDGE / max(img.size)
        final = faithful4(model, img).resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
        dst = HERE / f"{Path(src).stem}-16k.jpg"
        final.save(dst, quality=95, subsampling=0, optimize=True, dpi=(300, 300))
        print(dst, final.size)
