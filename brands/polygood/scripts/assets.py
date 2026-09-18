#!/usr/bin/env python3
"""Rebuild every low-resolution asset of the poster as resolution-independent art.

Each entry gives the RGB palette used to separate the colours and the DeviceCMYK
value each of those colours actually had in the source file, so the traced art
prints in the same ink as the rest of the poster.
"""
import sys
from vectorize import vectorize, vectorize_ink
from inkcmyk import cmyk_for_palette

P41 = [[255, 255, 255], [16, 16, 18], [183, 20, 55]]
P29 = [[255, 255, 255], [26, 29, 31], [180, 205, 188], [117, 138, 119], [42, 99, 88]]
P39 = [[255, 255, 255], [215, 216, 216], [174, 179, 179], [125, 129, 129],
       [35, 32, 34], [63, 143, 79], [168, 196, 106], [224, 160, 52], [192, 38, 45]]
P36 = [[0, 0, 0], [255, 255, 255], [222, 222, 224], [209, 184, 203],
       [164, 156, 165], [116, 112, 118], [38, 40, 43]]


def main():
    c41 = cmyk_for_palette('imgs/x41_rgb.png', 'imgs/x41.jpeg', P41)
    c29 = cmyk_for_palette('imgs/x29_rgb.png', 'imgs/x29.jpeg', P29)
    c39 = cmyk_for_palette('imgs/x39_rgb.png', 'imgs/x39.jpeg', P39)
    c36 = cmyk_for_palette('imgs/x36_rgb.png', 'imgs/x36.jpeg', P36)

    # IISG / UL — two flat inks on white, so trace blob-by-blob
    vectorize_ink('imgs/x41_rgb.png', 'vec/x41.pdf', inks=P41[1:], up=10, turd=20,
                  blur=[0.30, 0.50], cmyk=c41[1:])

    # EPD — black wordmark + a four-swatch bar
    vectorize('imgs/x29_rgb.png', 'vec/x29.pdf', palette=P29, up=8, turd=16,
              blur=0.05, dilate=1, order=[0, 2, 3, 4, 1], cmyk=c29)

    # French indoor-air emissions label
    vectorize('imgs/x39_rgb.png', 'vec/x39.pdf', palette=P39, up=8, turd=90,
              blur=0.05, dilate=1, order=[0, 1, 2, 3, 6, 7, 8, 5, 4], cmyk=c39)

    # ASCB / Quay Audit ISO marks (black area is knocked out by the soft mask)
    vectorize('imgs/x36_rgb.png', 'vec/x36.pdf', palette=P36, up=6, turd=10,
              blur=0.04, dilate=1, drop_white=False, alpha_src='imgs/x36_smask.png',
              order=list(range(7)), cmyk=c36)


if __name__ == '__main__':
    main()
