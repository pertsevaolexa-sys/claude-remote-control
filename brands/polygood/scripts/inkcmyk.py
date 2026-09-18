"""Read back the real DeviceCMYK value that each traced colour had in the source."""
import numpy as np
from PIL import Image


def cmyk_for_palette(rgb_png, cmyk_jpg, palette, tol=26.0):
    rgb = np.array(Image.open(rgb_png).convert('RGB')).astype(np.float32)
    cmyk = np.array(Image.open(cmyk_jpg)).astype(np.float32)
    pal = np.array(palette, np.float32)
    d = ((rgb[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
    lab = d.argmin(-1)
    near = np.sqrt(d.min(-1)) < tol           # ignore JPEG-blended pixels
    out = []
    for i in range(len(pal)):
        sel = (lab == i) & near
        if sel.sum() < 8:
            sel = lab == i
        v = np.median(cmyk[sel], axis=0) / 255.0 if sel.any() else np.zeros(4)
        out.append([round(float(x), 4) for x in v])
    return out
