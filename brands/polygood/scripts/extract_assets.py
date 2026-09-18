#!/usr/bin/env python3
"""Pull the raster assets out of the source poster so the rest of the pipeline
can rebuild them.  Writes imgs/x<xref>.<ext> (original bytes), x<xref>_rgb.png
(for tracing) and x<xref>_smask.png, plus qr_grid.npy (the QR module matrix).
"""
import os
import numpy as np
import pymupdf

SRC = os.environ.get('POSTER_SRC', 'Poster-GExpo-18x44-2-inches.pdf')
QR_XREF, QR_MODULE = 5, 16          # the QR is stored as a 528px, 16px-per-module bitmap


def main():
    os.makedirs('imgs', exist_ok=True)
    doc = pymupdf.open(SRC)
    page = doc[0]
    print(f'{SRC}: {page.rect.width/72:g} x {page.rect.height/72:g} in')

    for xref, smask, w, h, *_ in page.get_images(full=True):
        info = doc.extract_image(xref)
        open(f'imgs/x{xref}.{info["ext"]}', 'wb').write(info['image'])
        pix = pymupdf.Pixmap(doc, xref)
        if pix.colorspace and pix.colorspace.n == 4:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        pix.save(f'imgs/x{xref}_rgb.png')
        if smask:
            pymupdf.Pixmap(doc, smask).save(f'imgs/x{xref}_smask.png')
        rect = page.get_image_rects(xref)[0]
        print(f'  xref {xref:3d}  {w}x{h}px  placed {rect.width/72:.2f}x{rect.height/72:.2f} in'
              f'  -> {w/(rect.width/72):.0f} dpi')

    # QR: read the module matrix straight off its soft mask, losslessly
    from PIL import Image
    sm = np.array(Image.open(f'imgs/x{QR_XREF}_smask.png').convert('L')) > 127
    n = sm.shape[0] // QR_MODULE
    grid = np.array([[sm[r*QR_MODULE:(r+1)*QR_MODULE, c*QR_MODULE:(c+1)*QR_MODULE].mean() > .5
                      for c in range(n)] for r in range(n)])
    np.save('qr_grid.npy', grid)
    print(f'  QR grid {n}x{n} modules, {grid.sum()} dark')


if __name__ == '__main__':
    main()
