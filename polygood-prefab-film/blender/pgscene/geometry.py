"""Mesh and curve builders (metres, Z up)."""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector


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


def bisect_x(me, step, x0, x1):
    """Add vertical cut lines every `step` along X, so the mesh can bend."""
    bm = bmesh.new()
    bm.from_mesh(me)
    x = x0 + step
    while x < x1 - 1e-6:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(x, 0, 0), plane_no=(1, 0, 0))
        x += step
    bm.to_mesh(me)
    bm.free()


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
