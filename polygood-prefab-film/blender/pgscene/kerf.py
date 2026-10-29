"""Kerf-bending lattice for the scene 04 panel.

Polygood's kerf bending (by CNC milling): the router mills a lattice of
lens-shaped pockets into the back of the panel, leaving a thin skin, so the
panel bends without thermoforming (see the "3d shaping" FLEX samples in
Notion). Pockets stand upright in staggered columns, parallel to the bend
axis, and run off the top and bottom edges, which then show as a comb.

All dimensions in panel millimetres: x from the left edge, y up from the
bottom edge.
"""

import math

POCKET_W = 28.0  # width of a pocket
POCKET_L = 170.0  # length, along the bend axis
PITCH_X = 40.0  # column spacing (12 mm ribs at the pockets' widest)
PITCH_Y = 190.0  # pocket spacing within a column
MARGIN = 20.0  # solid strip along the left and right edges
SKIN = 3.0  # material left under the pockets


def lens(cx, cy, n=24):
    """Pocket outline, counter-clockwise: a lens with rounded tips."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c = math.cos(t)
        pts.append((cx + POCKET_W / 2 * math.copysign(abs(c) ** 1.4, c), cy + POCKET_L / 2 * math.sin(t)))
    return pts


def _clip(poly, y, keep_below):
    """Sutherland–Hodgman against the line y; keeps the side below or above."""
    inside = (lambda p: p[1] <= y) if keep_below else (lambda p: p[1] >= y)
    out = []
    for i, cur in enumerate(poly):
        prev = poly[i - 1]
        if inside(cur):
            if not inside(prev):
                out.append(_cross(prev, cur, y))
            out.append(cur)
        elif inside(prev):
            out.append(_cross(prev, cur, y))
    return out


def _cross(a, b, y):
    t = (y - a[1]) / (b[1] - a[1])
    return (a[0] + t * (b[0] - a[0]), y)


def _chain(poly, y):
    """The clipped outline minus its straight run along y, as a path from
    one end of that run to the other (counter-clockwise order)."""
    n = len(poly)
    on = [abs(p[1] - y) < 1e-9 for p in poly]
    # start right after the last point on the line that is followed by one off it
    for i in range(n):
        if on[i] and not on[(i + 1) % n]:
            start = i
            break
    path = [poly[start]]
    i = (start + 1) % n
    while not on[i]:
        path.append(poly[i])
        i = (i + 1) % n
    path.append(poly[i])
    return path


def lattice(width, height):
    """Returns (outer, holes, pockets).

    outer: the rib layer's outline, the panel rectangle with notches where
    pockets run off the top and bottom edges; holes: pockets wholly inside;
    pockets: every pocket as (clipped outline, (cx, cy)), for the plugs that
    hide them until the router reaches them.
    """
    ncol = int((width - 2 * MARGIN - POCKET_W) // PITCH_X) + 1
    x0 = (width - (ncol - 1) * PITCH_X) / 2
    holes, pockets, top, bottom = [], [], [], []
    for i in range(ncol):
        cx = x0 + i * PITCH_X
        # alternate columns are staggered; both run off the top edge
        cy = height + (0.18 if i % 2 == 0 else -0.38) * POCKET_L
        while cy + POCKET_L / 2 > 0:
            poly = lens(cx, cy)
            if cy + POCKET_L / 2 > height:
                poly = _clip(poly, height, keep_below=True)
                top.append((cx, poly))
            elif cy - POCKET_L / 2 < 0:
                poly = _clip(poly, 0.0, keep_below=False)
                bottom.append((cx, poly))
            else:
                holes.append(poly)
            pockets.append((poly, (cx, cy)))
            cy -= PITCH_Y

    # Rectangle, counter-clockwise, diving round each notch on the way
    outer = [(0.0, 0.0)]
    for _, poly in sorted(bottom):
        outer += list(reversed(_chain(poly, 0.0)))
    outer += [(width, 0.0), (width, height)]
    for _, poly in sorted(top, reverse=True):
        outer += list(reversed(_chain(poly, height)))
    outer.append((0.0, height))
    return outer, holes, pockets
