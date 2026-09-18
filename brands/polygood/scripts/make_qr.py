#!/usr/bin/env python3
"""Redraw the QR as vector rectangles.

The source QR is a 528px bitmap on a 16px module grid, so its module matrix can
be read off exactly -- the vector version is a lossless copy, not a trace, and
scans identically at any size.
"""
import numpy as np, pymupdf

INK = (0.8431, 0.7529, 0.6, 1.0)     # the rich black the source bitmap was filled with
MODULE = 16.0                        # 1 pt per source pixel keeps the 528pt page square


def main(grid_path='qr_grid.npy', out='vec/qr.pdf'):
    grid = np.load(grid_path)
    n = grid.shape[0]
    doc = pymupdf.open()
    page = doc.new_page(width=n * MODULE, height=n * MODULE)
    shape = page.new_shape()
    runs = 0
    for r in range(n):                           # merge horizontal runs of modules
        c = 0
        while c < n:
            if grid[r, c]:
                c2 = c
                while c2 + 1 < n and grid[r, c2 + 1]:
                    c2 += 1
                shape.draw_rect(pymupdf.Rect(c * MODULE, r * MODULE,
                                             (c2 + 1) * MODULE, (r + 1) * MODULE))
                runs += 1
                c = c2 + 1
            else:
                c += 1
    shape.finish(fill=INK, color=None, width=0)
    shape.commit()
    doc.save(out, garbage=4, deflate=True)
    print(f'[ok] {out}: {n}x{n} modules as {runs} rects')

    try:                                          # sanity check: it still scans
        import cv2
        pix = pymupdf.open(out)[0].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5),
                                              colorspace=pymupdf.csGRAY, alpha=False)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width)
        print('     decodes to:', cv2.QRCodeDetector().detectAndDecode(img)[0])
    except ImportError:
        pass


if __name__ == '__main__':
    main()
