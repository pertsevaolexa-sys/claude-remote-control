#!/usr/bin/env python3
"""Rebuild the poster's teal background at print resolution.

The source is a 768x869 CMYK JPEG placed under a rotated matrix, which works out
at ~23 dpi at 18in wide and ~13 dpi at 32in.  Only the part of it that falls on
the page is kept; that crop is de-blocked and resampled to ~150 dpi of the final
32x80in size, staying in DeviceCMYK so the teal does not shift.
"""
import numpy as np, cv2
from PIL import Image
import PIL.JpegImagePlugin as _J

# Store true (non-inverted) CMYK samples, exactly like the poster's own images,
# so the file needs no /Decode array and cannot be double-inverted downstream.
_J.RAWMODE['CMYK'] = 'CMYK'

SRC_JPG  = 'imgs/x95.jpeg'
SRC_MASK = 'imgs/x95_smask.png'
UP = 11                     # 13.2 dpi source * 11 = ~146 dpi at final size
CROP = (275.03, 269.04, 735.84, 869.00)      # x0, y0, x1, y1 in source pixels


def prep(chan, up, denoise_h):
    """De-block one 8-bit channel, then resample smoothly."""
    d = cv2.fastNlMeansDenoising(chan, None, denoise_h, 7, 21)
    d = cv2.GaussianBlur(d.astype(np.float32), (0, 0), 0.6)
    big = cv2.resize(d, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    # kill the interpolation grid; real structure here is tens of source px wide
    return cv2.GaussianBlur(big, (0, 0), up * 0.38)


def crop_sub(arr, box, pad=1):
    x0, y0, x1, y1 = box
    ix0, iy0 = int(np.floor(x0)) - pad, int(np.floor(y0)) - pad
    ix1, iy1 = int(np.ceil(x1)) + pad, int(np.ceil(y1)) + pad
    ix0, iy0 = max(ix0, 0), max(iy0, 0)
    ix1, iy1 = min(ix1, arr.shape[1]), min(iy1, arr.shape[0])
    return arr[iy0:iy1, ix0:ix1], (ix0, iy0, ix1, iy1)


def main():
    cmyk = np.array(Image.open(SRC_JPG))                 # (H,W,4) real DeviceCMYK
    mask = np.array(Image.open(SRC_MASK).convert('L'))
    H, W = cmyk.shape[:2]
    print(f'source {W}x{H} CMYK, crop {CROP}')

    sub, ibox = crop_sub(cmyk, CROP)
    msub, _ = crop_sub(mask, CROP)
    ix0, iy0, ix1, iy1 = ibox
    print(f'integer crop {ix0},{iy0} -> {ix1},{iy1}  ({ix1-ix0}x{iy1-iy0})')

    chans = [prep(sub[:, :, i], UP, 9) for i in range(4)]
    big = np.stack(chans, -1)
    mbig = prep(msub, UP, 6)

    # sub-pixel trim back to the exact float crop
    fx0 = (CROP[0] - ix0) * UP; fy0 = (CROP[1] - iy0) * UP
    fx1 = (CROP[2] - ix0) * UP; fy1 = (CROP[3] - iy0) * UP
    sx0, sy0 = int(round(fx0)), int(round(fy0))
    sx1, sy1 = int(round(fx1)), int(round(fy1))
    big = big[sy0:sy1, sx0:sx1]
    mbig = mbig[sy0:sy1, sx0:sx1]
    print(f'output {big.shape[1]}x{big.shape[0]} px '
          f'({big.shape[1]*big.shape[0]/1e6:.1f} MP)')

    # a whisper of grain so a 46in smooth gradient cannot band on press
    rng = np.random.default_rng(11)
    big = big + rng.normal(0, 0.7, big.shape).astype(np.float32)

    out = np.clip(big + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(out, mode='CMYK').save('bg_hi.jpg', quality=93,
                                           subsampling=0, optimize=True)
    Image.fromarray(np.clip(mbig + 0.5, 0, 255).astype(np.uint8), mode='L') \
        .save('bg_hi_mask.jpg', quality=92, optimize=True)

    # exact crop actually written, in source-pixel units, for the matrix rewrite
    np.save('bg_crop.npy', np.array([ix0 + sx0 / UP, iy0 + sy0 / UP,
                                     ix0 + sx1 / UP, iy0 + sy1 / UP]))
    print('wrote bg_hi.jpg, bg_hi_mask.jpg')


if __name__ == '__main__':
    main()
