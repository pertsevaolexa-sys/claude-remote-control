"""Props: a gantry CNC router, a plotter pen and shipping pallets."""

import bpy

from .geometry import bevel, box_mesh, cylinder_mesh, obj

# Gantry geometry (metres). The tool tip sits SPINDLE_Y in front of the beam.
RAIL_X = 1.62
RAIL_LEN = 4.4
BEAM_Z = 0.36
SPINDLE_Y = -0.15
TIP_UP = 0.045  # tool tip above the material on rapid moves


class Gantry:
    """root (moves in Y, carries rails offset) → bridge → carriage (X) → head (Z).
    Place the tool tip with set_tool(x, y, z_tip)."""

    def __init__(self, mats, name="CNC"):
        self.root = obj(name, None)
        self.rails = obj(name + "-rails", None)
        for s in (-1, 1):
            r = obj(f"{name}-rail{s}", box_mesh("rail", (0.07, RAIL_LEN, 0.07), (s * RAIL_X, 0, 0.035)), mats.aluminium, parent=self.rails)
            bevel(r, 0.004)
            obj(f"{name}-railcap{s}", box_mesh("railcap", (0.03, RAIL_LEN, 0.012), (s * RAIL_X, 0, 0.076)), mats.steel, parent=self.rails)

        self.bridge = obj(name + "-bridge", None, parent=self.root)
        for s in (-1, 1):
            up = obj(f"{name}-upright{s}", box_mesh("upright", (0.06, 0.26, BEAM_Z + 0.08), (s * RAIL_X, 0, (BEAM_Z + 0.08) / 2 + 0.06)), mats.aluminium, parent=self.bridge)
            bevel(up, 0.006)
            obj(f"{name}-shoe{s}", box_mesh("shoe", (0.11, 0.3, 0.05), (s * RAIL_X, 0, 0.095)), mats.dark, parent=self.bridge)
        beam = obj(name + "-beam", box_mesh("beam", (2 * RAIL_X + 0.06, 0.14, 0.18), (0, 0, BEAM_Z + 0.07)), mats.aluminium, parent=self.bridge)
        bevel(beam, 0.006)
        obj(name + "-beamrail", box_mesh("beamrail", (2 * RAIL_X, 0.02, 0.025), (0, -0.08, BEAM_Z + 0.11)), mats.steel, parent=self.bridge)
        obj(name + "-chain", box_mesh("chain", (2 * RAIL_X - 0.2, 0.06, 0.035), (0, 0.02, BEAM_Z + 0.18)), mats.dark, parent=self.bridge)

        self.carriage = obj(name + "-carriage", None, parent=self.root)
        plate = obj(name + "-plate", box_mesh("plate", (0.24, 0.03, 0.3), (0, -0.095, BEAM_Z + 0.03)), mats.aluminium, parent=self.carriage)
        bevel(plate, 0.004)
        obj(name + "-zrail", box_mesh("zrail", (0.12, 0.03, 0.34), (0, -0.115, BEAM_Z - 0.02)), mats.dark, parent=self.carriage)

        # Head: everything that moves in Z. Its parts sit SPINDLE_Y in front of
        # the beam, so the tool tip is at head origin + (0, SPINDLE_Y, 0).
        self.head = obj(name + "-head", None, parent=self.carriage)
        y = SPINDLE_Y
        obj(name + "-mount", box_mesh("mount", (0.13, 0.05, 0.12), (0, y + 0.03, 0.27)), mats.dark, parent=self.head)
        sp = obj(name + "-spindle", cylinder_mesh("spindle", 0.042, 0.2, (0, y, 0.21)), mats.dark, parent=self.head)
        obj(name + "-cap", cylinder_mesh("cap", 0.044, 0.025, (0, y, 0.32)), mats.aluminium, parent=self.head)
        obj(name + "-led", cylinder_mesh("led", 0.0435, 0.008, (0, y, 0.125)), mats.accent, parent=self.head)
        obj(name + "-nut", cylinder_mesh("nut", 0.018, 0.03, (0, y, 0.095), radius2=0.014), mats.steel, parent=self.head)
        obj(name + "-collet", cylinder_mesh("collet", 0.01, 0.03, (0, y, 0.068), radius2=0.006), mats.steel, parent=self.head)
        obj(name + "-bit", cylinder_mesh("bit", 0.003, 0.055, (0, y, 0.0275), segments=16), mats.steel, parent=self.head)
        self.spindle = sp

        self.all = [self.root, self.rails]

    def set_tool(self, rec, frame, x, y, z_tip, rails_y=None):
        """Tool tip at (x, y, z_tip) in world metres."""
        rec.set(self.root, "location", (0.0, y - SPINDLE_Y, 0.0), frame)
        rec.set(self.carriage, "location", (x, 0.0, 0.0), frame)
        rec.set(self.head, "location", (0.0, 0.0, z_tip), frame)
        rec.set(self.rails, "location", (0.0, 0.0 if rails_y is None else rails_y, 0.0), frame)

    def visible(self, rec, frame, on):
        for o in self.iter_objects():
            rec.set(o, "hide_render", not on, frame)

    def iter_objects(self):
        def walk(o):
            yield o
            for c in o.children:
                yield from walk(c)

        yield from walk(self.root)
        yield from walk(self.rails)


def pen(mats, name="Pen"):
    """Plotter pen, origin at the nib, leaning slightly."""
    root = obj(name, None)
    obj(name + "-tip", cylinder_mesh("tip", 0.0012, 0.006, (0, 0, 0.003), segments=16, radius2=0.004), mats.dark, parent=root)
    obj(name + "-cone", cylinder_mesh("cone", 0.004, 0.014, (0, 0, 0.013), radius2=0.0075), mats.dark, parent=root)
    obj(name + "-body", cylinder_mesh("body", 0.0075, 0.11, (0, 0, 0.075)), mats.pen_body, parent=root)
    obj(name + "-band", cylinder_mesh("band", 0.0077, 0.006, (0, 0, 0.05)), mats.accent, parent=root)
    root.rotation_euler = (0.32, 0.0, 0.5)
    return root


def pallet(mats, name, length, width):
    """Pallet with bearers and top boards, origin at the floor centre, top at
    z = 0.144."""
    root = obj(name, None)
    for i, y in enumerate((-width / 2 + 0.05, 0.0, width / 2 - 0.05)):
        obj(f"{name}-bearer{i}", box_mesh("bearer", (length, 0.1, 0.1), (0, y, 0.05)), mats.wood, parent=root)
    n = max(5, int(length / 0.22))
    for i in range(n):
        x = -length / 2 + 0.06 + i * (length - 0.12) / (n - 1)
        obj(f"{name}-board{i}", box_mesh("board", (0.12, width, 0.022), (x, 0, 0.111)), mats.wood, parent=root)
    obj(f"{name}-deck", box_mesh("deck", (length, width, 0.022), (0, 0, 0.133)), mats.wood, parent=root)
    return root


PALLET_TOP = 0.144
