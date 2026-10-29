"""Mesh and curve builders (metres, Z up)."""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector, geometry


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _open(loop):
    pts = [tuple(p) for p in loop]
    if len(pts) > 2 and math.dist(pts[0], pts[-1]) < 1e-9:
        pts = pts[:-1]
    return pts


def slab_mesh(name, outer, holes=(), thickness=0.019):
    """Solid slab from a closed outline (and holes) in the local XY plane,
    from z = 0 to z = thickness."""
    cu = bpy.data.curves.new(name + "-profile", "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    for loop in [outer, *holes]:
        pts = _open(loop)
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, (x, y) in zip(sp.points, pts):
            p.co = (x, y, 0.0, 1.0)
        sp.use_cyclic_u = True
    cu.extrude = thickness / 2
    tmp = link(bpy.data.objects.new(name + "-tmp", cu))
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    me.name = name
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.transform(Matrix.Translation((0, 0, thickness / 2)))
    return me


def add_slab(bm, outer, holes, z0, z1, top=True, bottom=True):
    """Add to bm a slab from z0 to z1 whose outline is `outer` with `holes`
    (counter-clockwise (x, y) loops, metres). Caps are tessellated, so any
    number of holes works; walls face out of the material. Returns
    (top faces, bottom faces, wall faces)."""
    loops = [outer, *holes]
    flat = [Vector((x, y, 0.0)) for loop in loops for x, y in loop]
    tris = geometry.tessellate_polygon([[Vector((x, y, 0.0)) for x, y in loop] for loop in loops])
    vb = [bm.verts.new((p.x, p.y, z0)) for p in flat]
    vt = [bm.verts.new((p.x, p.y, z1)) for p in flat]
    tops, bottoms, walls = [], [], []
    for a, b, c in tris:
        # tessellation winding varies: make the top face up
        ccw = (flat[b] - flat[a]).cross(flat[c] - flat[a]).z > 0
        a, b, c = (a, b, c) if ccw else (a, c, b)
        if top:
            tops.append(bm.faces.new((vt[a], vt[b], vt[c])))
        if bottom:
            bottoms.append(bm.faces.new((vb[a], vb[c], vb[b])))
    start = 0
    for k, loop in enumerate(loops):
        n = len(loop)
        for i in range(n):
            i0, i1 = start + i, start + (i + 1) % n
            quad = (vb[i0], vb[i1], vt[i1], vt[i0])
            walls.append(bm.faces.new(quad if k == 0 else tuple(reversed(quad))))
        start += n
    return tops, bottoms, walls


def bisect_x(bm, step, x0, x1):
    """Add vertical cut lines every `step` along X, so the mesh can bend."""
    x = x0 + step
    while x < x1 - 1e-6:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(x, 0, 0), plane_no=(1, 0, 0))
        x += step


def obj(name, data, material=None, location=(0, 0, 0), parent=None):
    o = link(bpy.data.objects.new(name, data))
    if material is not None and data is not None:
        data.materials.append(material)
    o.location = location
    if parent is not None:
        o.parent = parent
    return o


def ribbon(name, polylines, width, material, z=0.0, flatten=0.12):
    """Flat painted line along polylines (XY, metres). Revealed by animating
    the curve's bevel_factor_end (fraction of each spline's length)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.twist_mode = "Z_UP"
    cu.bevel_mode = "ROUND"
    cu.bevel_depth = width / 2
    cu.bevel_resolution = 0
    cu.use_fill_caps = False
    cu.bevel_factor_mapping_start = "SPLINE"
    cu.bevel_factor_mapping_end = "SPLINE"
    for pl in polylines:
        pts = [tuple(p) for p in pl]
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, (x, y) in zip(sp.points, pts):
            p.co = (x, y, 0.0, 1.0)
    o = obj(name, cu, material, (0, 0, z))
    o.scale = (1, 1, flatten)
    return o


def tube(name, points, radius, material, parent=None):
    """Round line through 3D points: a callout drawn into the scene. Reveal
    it with bevel_factor_end."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_mode = "ROUND"
    cu.bevel_depth = radius
    cu.bevel_resolution = 2
    cu.use_fill_caps = True
    cu.bevel_factor_mapping_end = "SPLINE"
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for p, (x, y, z) in zip(sp.points, points):
        p.co = (x, y, z, 1.0)
    return obj(name, cu, material, parent=parent)


def box_mesh(name, size, center=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def cylinder_mesh(name, radius, depth, center=(0, 0, 0), segments=48, radius2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        segments=segments,
        radius1=radius,
        radius2=radius if radius2 is None else radius2,
        depth=depth,
    )
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def bevel(o, width=0.002, segments=2):
    m = o.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    return m


def look_at_matrix(eye, target):
    """Rotation for a camera at eye looking at target, Z up (top-down falls
    back to +Y as screen-up)."""
    eye, target = Vector(eye), Vector(target)
    f = (target - eye).normalized()
    r = f.cross(Vector((0, 0, 1)))
    if r.length < 1e-5:
        r = Vector((1, 0, 0))
    r.normalize()
    u = r.cross(f).normalized()
    return Matrix((r, u, -f)).transposed().to_3x3()
