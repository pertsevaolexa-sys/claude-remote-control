#!/usr/bin/env python3
"""Assemble the 32 x 80 in roll-up from the 18 x 44.2 in original.

Everything that was already vector (all type, rules, the pill outlines) is simply
re-scaled, so it stays mathematically sharp at any size.  The raster assets that
would have fallen to 12-80 dpi at the new size are swapped out first: the
background for a de-blocked ~146 dpi CMYK resample, the QR and the four
certification marks for traced vector art.
"""
import os, re, numpy as np, pymupdf

SRC   = os.environ.get('POSTER_SRC', 'Poster-GExpo-18x44-2-inches.pdf')
WORK  = 'work.pdf'
OUT   = 'Polygood-Poster-32x80in.pdf'

PAGE_W, PAGE_H = 32 * 72.0, 80 * 72.0       # 2304 x 5760 pt
BG_XREF, BG_SMASK, BG_FORM = 95, 96, 97
BG_M = (-43128.3, 2487.74, 2814.68, 48796.4, 39351.9, 23732.3)
BG_W, BG_H = 768, 869

# xref -> traced vector replacement.  Placements are all axis-aligned, so the
# original bbox scaled by the page ratio lands them exactly.
VECTORS = {5: 'vec/qr.pdf', 41: 'vec/x41.pdf', 39: 'vec/x39.pdf',
           36: 'vec/x36.pdf', 29: 'vec/x29.pdf'}


def new_matrix(crop):
    """Placement matrix for a sub-rectangle of the original background image."""
    x0, y0, x1, y1 = crop
    sx, sy = (x1 - x0) / BG_W, (y1 - y0) / BG_H
    tx, ty = x0 / BG_W, (BG_H - y1) / BG_H
    a, b, c, d, e, f = BG_M
    return (sx * a, sx * b, sy * c, sy * d,
            tx * a + ty * c + e, tx * b + ty * d + f)


def unused_xobjects(doc, page):
    entries = re.findall(r'/([A-Za-z0-9]+) \d+ 0 R',
                         doc.xref_get_key(page.xref, 'Resources/XObject')[1])
    content = b''.join(doc.xref_stream(x) for x in page.get_contents()).decode('latin-1')
    drawn = set(re.findall(r'/([A-Za-z0-9]+)\s+Do', content))
    return [n for n in entries if n not in drawn]


def blank(page, xref):
    """Drop a raster that a vector version is about to replace."""
    page.delete_image(xref)          # swaps in a 1x1 fully transparent pixmap
    page.parent.xref_set_key(xref, 'Decode', 'null')


def main():
    doc = pymupdf.open(SRC)
    src_page = doc[0]
    rects = {x: src_page.get_image_rects(x)[0] for x in VECTORS}

    # ---- background: higher-resolution crop + matching placement -------------
    src_page.replace_image(BG_XREF, filename='bg_hi.jpg')
    src_page.replace_image(BG_SMASK, filename='bg_hi_mask.jpg')
    doc.xref_set_key(BG_XREF, 'ColorSpace', '/DeviceCMYK')
    doc.xref_set_key(BG_XREF, 'Decode', 'null')      # samples are already true CMYK
    doc.xref_set_key(BG_XREF, 'SMask', f'{BG_SMASK} 0 R')   # replace_image drops it
    doc.xref_set_key(BG_SMASK, 'ColorSpace', '/DeviceGray')
    doc.xref_set_key(BG_SMASK, 'Decode', 'null')

    m = new_matrix(np.load('bg_crop.npy'))
    s = doc.xref_stream(BG_FORM).decode('latin-1')
    old = ' '.join(f'{v:g}' for v in BG_M) + ' cm'
    assert old in s, 'background placement matrix not found'
    doc.update_stream(BG_FORM,
                      s.replace(old, ' '.join(f'{v:.6f}' for v in m) + ' cm').encode('latin-1'))

    # ---- retire the rasters that vector art takes over ----------------------
    for x in VECTORS:
        blank(src_page, x)
    doc.save(WORK, garbage=4, deflate=True)
    doc.close()

    # ---- grow the page itself -----------------------------------------------
    # The page is enlarged in place rather than drawn into a new one: wrapping it
    # in a form XObject would re-tag its transparency group and shift how the
    # background's soft mask composites.  A leading `cm` scales every existing
    # operator instead, so the artwork is untouched.
    out = pymupdf.open(WORK)
    page = out[0]
    scale = PAGE_W / page.rect.width
    lift = PAGE_H - page.rect.height * scale        # extra height, parked at the foot

    pre = out.get_new_xref()
    out.update_object(pre, '<<>>')
    out.update_stream(pre, f'q {scale:.9f} 0 0 {scale:.9f} 0 {lift:.6f} cm\n'.encode())
    post = out.get_new_xref()
    out.update_object(post, '<<>>')
    out.update_stream(post, b'\nQ\n')
    contents = out.xref_get_key(page.xref, 'Contents')
    inner = contents[1] if contents[0] == 'array' else f'[{contents[1]}]'
    out.xref_set_key(page.xref, 'Contents', f'[{pre} 0 R {inner[1:-1]} {post} 0 R]')

    box = f'[0 0 {PAGE_W:g} {PAGE_H:g}]'
    for k in ('MediaBox', 'CropBox'):
        out.xref_set_key(page.xref, k, box)
    for k in ('BleedBox', 'TrimBox', 'ArtBox'):
        if out.xref_get_key(page.xref, k)[0] != 'null':
            out.xref_set_key(page.xref, k, box)
    out.reload_page(page)
    page = out[0]

    # ---- lay the vector art back in -----------------------------------------
    for x, path in VECTORS.items():
        r = rects[x] * scale
        page.show_pdf_page(r, pymupdf.open(path), 0)
        print(f'  vector {path:14s} -> {r.width/72:.2f} x {r.height/72:.2f} in')

    # replace_image parks a spare copy of every image it swaps in the page
    # resources; nothing draws them, but they keep ~6 MB alive through GC.
    drop = unused_xobjects(out, page)
    for name in drop:
        out.xref_set_key(page.xref, f'Resources/XObject/{name}', 'null')
    print(f'  dropped {len(drop)} unreferenced xobject(s): {", ".join(drop)}')

    out.set_metadata({'title': 'Polygood - Surface material with a second life'})
    out.save(OUT, garbage=4, deflate=True)
    print(f'\n{OUT}: {page.rect.width/72:g} x {page.rect.height/72:g} in, '
          f'scale x{scale:.4f}, {lift/72:.2f} in added at the foot')


if __name__ == '__main__':
    main()
