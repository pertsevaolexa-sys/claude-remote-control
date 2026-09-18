#!/usr/bin/env python3
"""Colour-separated raster -> vector (PDF) tracing for flat-colour logo art.

Two strategies:
  vectorize()      per-pixel palette assignment; for art whose colours touch
                   (charts, labels, colour bars)
  vectorize_ink()  one colour per connected ink blob; for flat inks on white
                   paper, where JPEG chroma fringes otherwise ring every glyph
"""
import numpy as np, subprocess, os
from PIL import Image, ImageFilter
from scipy.cluster.vq import kmeans2
from scipy import ndimage
import pymupdf


def palette_from(arr, k, seed=7):
    cen, _ = kmeans2(arr.reshape(-1, 3).astype(np.float64), k,
                     minit='++', iter=120, seed=seed)
    return cen


def assign(arr, cen):
    d = ((arr.reshape(-1, 1, 3).astype(np.float32) - cen[None].astype(np.float32)) ** 2).sum(-1)
    return d.argmin(1).reshape(arr.shape[:2])


def trace_mask(mask, out_pdf, color, dpi, turd=2, alphamax=1.0, opttol=0.2,
               cmyk=None):
    """mask: bool HxW.  potrace fills BLACK, so the bitmap is written inverted."""
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert('1').save(out_pdf + '.pbm')
    subprocess.run(['potrace', '-b', 'pdf', '-C', color, '-t', str(turd),
                    '-a', str(alphamax), '-O', str(opttol), '-r', str(dpi),
                    '-o', out_pdf, out_pdf + '.pbm'], check=True)
    os.remove(out_pdf + '.pbm')
    if cmyk is not None:
        _to_cmyk(out_pdf, cmyk)


def _to_cmyk(pdf_path, cmyk):
    """Swap potrace's DeviceRGB fill for DeviceCMYK, so the traced art stays in
    the same colour space as the rest of the poster."""
    import re
    if max(cmyk) < 0.02:            # plain paper white: leave it alone
        return
    doc = pymupdf.open(pdf_path)
    rep = ' '.join(f'{v:.4f}' for v in cmyk) + ' k'
    # potrace writes `r g b rg` for colours and `n g` for pure greys
    pat = re.compile(r'(?:[\d.]+ [\d.]+ [\d.]+ rg|(?<![\d.])[\d.]+ g)(?=\s|$)')
    for x in range(1, doc.xref_length()):
        if not doc.xref_is_stream(x):
            continue
        try:
            s = doc.xref_stream(x).decode('latin-1')
        except Exception:
            continue
        new = pat.sub(rep, s)
        if new != s:
            doc.update_stream(x, new.encode('latin-1'))
    doc.saveIncr()
    doc.close()


def _compose(layers, W, H, dst):
    doc = pymupdf.open()
    page = doc.new_page(width=W, height=H)          # 1 pt per source pixel
    for p in layers:
        sub = pymupdf.open(p)
        page.show_pdf_page(page.rect, sub, 0)
        sub.close()
        os.remove(p)
    doc.save(dst, garbage=4, deflate=True)
    doc.close()


def _grow_smooth(mask, up, blur, dilate):
    img = Image.fromarray((mask * 255).astype(np.uint8))
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur * up))
    if dilate:
        img = img.filter(ImageFilter.MaxFilter(2 * dilate + 1))
    return np.array(img) > 127


def vectorize(src, dst, k=None, palette=None, up=8, turd=None, drop_white=True,
              white_thr=238, dilate=1, alpha_src=None, blur=0.0, alphamax=1.0,
              opttol=0.2, order=None, cmyk=None, verbose=True):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    base = np.array(im.filter(ImageFilter.MedianFilter(3)))
    cen = np.array(palette, float) if palette is not None else palette_from(base, k)

    lab = assign(np.array(im.resize((W * up, H * up), Image.LANCZOS)), cen)

    opaque = None
    if alpha_src:                       # honour the PDF soft mask
        am = Image.open(alpha_src).convert('L').resize((W * up, H * up), Image.LANCZOS)
        opaque = np.array(am) > 128

    counts = np.bincount(lab.ravel(), minlength=len(cen))
    turd = turd if turd is not None else max(2, (up * up) // 3)
    layers = []
    seq = order if order is not None else list(np.argsort(-counts))
    for i in seq:                       # paint order: background -> foreground
        if counts[i] == 0:
            continue
        col = np.clip(cen[i], 0, 255).astype(int)
        hexc = '#%02x%02x%02x' % tuple(col)
        if drop_white and (col >= white_thr).all():
            if verbose: print(f'   skip white {hexc}  {counts[i]}')
            continue
        mask = lab == i
        if opaque is not None:
            mask &= opaque
        if not mask.any():
            continue
        b_i = blur[i] if isinstance(blur, (list, tuple)) else blur
        mask = _grow_smooth(mask, up, b_i, dilate)
        p = f'{dst}.L{i}.pdf'
        trace_mask(mask, p, hexc, dpi=72.0 * up, turd=turd,
                   alphamax=alphamax, opttol=opttol,
                   cmyk=(cmyk[i] if cmyk is not None else None))
        layers.append(p)
        if verbose: print(f'   layer {hexc}  px={counts[i]}')

    _compose(layers, W, H, dst)
    print(f'[ok] {src} -> {dst}   src {W}x{H}px, traced at {up}x')


def vectorize_ink(src, dst, inks, up=8, white=250.0, ink_thr=0.32, core=0.72,
                  turd=None, min_px=4, alphamax=1.0, opttol=0.2, blur=0.0,
                  cmyk=None, verbose=True):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    a = np.array(im).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
    alpha = np.clip(1.0 - lum / white, 0, 1)

    lblmap, n = ndimage.label(alpha > ink_thr, structure=np.ones((3, 3)))
    inks = np.array(inks, float)
    comp_col = np.full(n + 1, -1, int)          # label 0 is paper, never an ink
    for c in range(1, n + 1):
        sel = lblmap == c
        if sel.sum() < min_px:
            continue
        strong = sel & (alpha > core)
        use = strong if strong.sum() >= max(3, min_px // 2) else sel
        al = np.clip(alpha[use][:, None], 0.25, 1)
        # un-blend the observed colour from the white paper behind it
        pure = np.clip((255.0 + (a[use] - 255.0) / al).mean(0), 0, 255)
        comp_col[c] = int(((inks - pure) ** 2).sum(1).argmin())

    turd = turd if turd is not None else max(2, (up * up) // 3)
    layers = []
    for i, col in enumerate(inks):
        sel = np.isin(lblmap, np.where(comp_col == i)[0])
        if not sel.any():
            continue
        cov = np.where(sel, alpha, 0.0)
        img = Image.fromarray((cov * 255).astype(np.uint8)).resize(
            (W * up, H * up), Image.LANCZOS)
        b_i = blur[i] if isinstance(blur, (list, tuple)) else blur
        if b_i:
            img = img.filter(ImageFilter.GaussianBlur(b_i * up))
        hexc = '#%02x%02x%02x' % tuple(np.clip(col, 0, 255).astype(int))
        p = f'{dst}.I{i}.pdf'
        trace_mask(np.array(img) > 127, p, hexc, dpi=72.0 * up, turd=turd,
                   alphamax=alphamax, opttol=opttol,
                   cmyk=(cmyk[i] if cmyk is not None else None))
        layers.append(p)
        if verbose:
            print(f'   ink {hexc}  blobs={(comp_col == i).sum()}  px={sel.sum()}')

    _compose(layers, W, H, dst)
    print(f'[ok] {src} -> {dst}   src {W}x{H}px, {n} blobs, traced at {up}x')
