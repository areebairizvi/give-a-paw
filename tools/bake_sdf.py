"""Bake a mesh into a signed distance field the site can ray-march.

    python tools/bake_sdf.py ollie-socket.glb --res 160 --name "Ollie socket"

Accepts STL, OBJ, PLY, 3MF, or GLB (Draco GLBs are decoded through the
gltf-transform toolchain). Writes <stem>.sdf next to the input, plus a
mid-plane preview PNG in the scratch directory when --preview is given.

The .sdf format (gzip-compressed, single file):
    4 bytes   magic "SDF1"
    4 bytes   header length (uint32 little-endian)
    N bytes   header JSON (utf-8)
    rest      uint8 voxels, x fastest, then y, then z

    header: {"dims":[nx,ny,nz], "bounds":[[x0,y0,z0],[x1,y1,z1]],
             "band":b, "encoding":"u8", "units":"mm", "name":..., "source":...}

Each voxel is signed distance clamped to [-band, +band] and mapped to
0..255 (127.5 = the surface). Negative is inside. The viewer decodes with
d = (v/255*2 - 1) * band, which is what makes sphere tracing possible: the
sampled value is a true (clamped) distance bound.

How the field is computed - and why it is not trimesh.proximity:
  * Distance:  a KD-tree over a dense surface sample (millions of points),
    queried for every voxel. Error is bounded by half the sample spacing,
    which is a small fraction of a voxel. trimesh's exact closest-point query
    is two orders of magnitude slower and gains nothing visible.
  * Sign:      near the surface, from the sampled point's face normal (the
    pseudonormal test); away from it, from a voxel flood fill at twice the
    grid resolution. The near-surface test is what avoids a staircase on the
    surface; the flood fill is what stays right deep inside thin shells,
    where a single normal can mislead.
Meshes with a few non-manifold edges but no open boundary edges (typical of
decimated exports) bake fine; a mesh with holes will leak the flood fill.
"""
import argparse
import gzip
import json
import pathlib
import struct
import subprocess
import sys
import time

import numpy as np
import trimesh
from scipy.spatial import cKDTree

TOOLS = pathlib.Path(__file__).resolve().parent
TOOLCHAIN = pathlib.Path.home() / 'AppData/Local/gltf-tools'
NODE = TOOLCHAIN / 'node/node.exe'
# The decoder is versioned here in tools/, but it imports @gltf-transform from
# the toolchain's node_modules and ESM resolves imports relative to the file,
# so it has to run from there: copy it across when missing or stale.
DECODER_SRC = TOOLS / 'decode_glb.mjs'
DECODER = TOOLCHAIN / 'decode_glb.mjs'


def ensure_decoder():
    if not NODE.exists():
        sys.exit('Portable Node not found at %s - see tools/README.md' % NODE)
    if (not DECODER.exists() or
            DECODER_SRC.stat().st_mtime > DECODER.stat().st_mtime):
        DECODER.write_bytes(DECODER_SRC.read_bytes())


def load_mesh(path, scratch):
    path = pathlib.Path(path).resolve()   # the decoder runs from its own dir
    if path.suffix.lower() == '.glb':
        obj = scratch / (path.stem + '.decoded.obj')
        ensure_decoder()
        subprocess.run([str(NODE), str(DECODER), str(path), str(obj)],
                       check=True, cwd=str(DECODER.parent))
        m = trimesh.load(obj, force='mesh')
    else:
        m = trimesh.load(path, force='mesh')
    if isinstance(m, trimesh.Scene):
        m = trimesh.util.concatenate(list(m.geometry.values()))
    m.remove_unreferenced_vertices()
    return m


def bake(mesh, res, band, pad, log):
    t0 = time.time()
    lo, hi = mesh.bounds
    extent = hi - lo
    pitch = extent.max() / (res - 2 * pad)
    lo = lo - pad * pitch
    hi = hi + pad * pitch
    dims = np.maximum(np.ceil((hi - lo) / pitch).astype(int) + 1, 8)
    hi = lo + (dims - 1) * pitch
    log('grid %s  pitch %.3f mm  band %.2f mm' % (dims.tolist(), pitch, band))

    xs = [lo[i] + np.arange(dims[i]) * pitch for i in range(3)]
    # z, y, x order so the flattened array is x-fastest
    gz, gy, gx = np.meshgrid(xs[2], xs[1], xs[0], indexing='ij')
    pts = np.column_stack([gx.ravel(), gy.ravel(), gz.ravel()])
    log('%d voxels' % len(pts))

    # --- unsigned distance from a dense surface sample ---
    n_samples = int(max(1.5e6, 12 * len(mesh.faces)))
    samples, fids = trimesh.sample.sample_surface(mesh, n_samples)
    samples = np.vstack([samples, mesh.vertices])
    fids = np.concatenate([fids, np.full(len(mesh.vertices), -1)])
    tree = cKDTree(samples)
    # Anything farther than the band gets clamped to it anyway, so let the
    # tree stop early there: that is most of the volume for a thin shell.
    dist, idx = tree.query(pts, workers=-1, distance_upper_bound=band * 1.05)
    far = ~np.isfinite(dist)
    dist[far] = band * 1.05
    idx[far] = 0
    log('distance: %d samples, queried in %.1fs' % (len(samples), time.time() - t0))

    # --- sign ---
    inside = np.zeros(len(pts), bool)
    # (a) coarse but topologically right: flood fill at 2x resolution
    t1 = time.time()
    vox = mesh.voxelized(pitch=pitch / 2).fill()
    fine = vox.matrix
    origin = vox.transform[:3, 3]
    ijk = np.round((pts - origin) / (pitch / 2)).astype(int)
    ok = np.all((ijk >= 0) & (ijk < np.array(fine.shape)), axis=1)
    inside[ok] = fine[ijk[ok, 0], ijk[ok, 1], ijk[ok, 2]]
    log('flood fill at %s in %.1fs, %.1f%% inside' %
        (list(fine.shape), time.time() - t1, 100 * inside.mean()))
    # (b) near the surface, trust the sampled face normal instead
    near = dist < 1.5 * pitch
    nidx = idx[near]
    has_face = fids[nidx] >= 0
    normals = np.zeros((near.sum(), 3))
    normals[has_face] = mesh.face_normals[fids[nidx[has_face]]]
    normals[~has_face] = mesh.vertex_normals[
        np.clip(nidx[~has_face] - (len(samples) - len(mesh.vertices)), 0,
                len(mesh.vertices) - 1)]
    to_pt = pts[near] - samples[nidx]
    side = np.einsum('ij,ij->i', to_pt, normals)
    conf = np.abs(side) / np.maximum(np.linalg.norm(to_pt, axis=1), 1e-9)
    trusted = conf > 0.25
    near_idx = np.where(near)[0]
    inside[near_idx[trusted]] = side[trusted] < 0
    log('near-surface sign from normals for %d voxels (%.0f%% trusted)' %
        (near.sum(), 100 * trusted.mean()))

    sdf = np.where(inside, -dist, dist)
    q = np.clip(sdf / band, -1, 1)
    u8 = np.round((q * 0.5 + 0.5) * 255).astype(np.uint8)
    return dims, lo, hi, sdf, u8, pitch


def write_sdf(out, dims, lo, hi, band, u8, name, source):
    header = json.dumps({
        'dims': [int(d) for d in dims],
        'bounds': [[float(v) for v in lo], [float(v) for v in hi]],
        'band': float(band), 'encoding': 'u8', 'units': 'mm',
        'name': name, 'source': source,
    }).encode('utf-8')
    raw = b'SDF1' + struct.pack('<I', len(header)) + header + u8.tobytes()
    with gzip.open(out, 'wb', compresslevel=9) as f:
        f.write(raw)
    return len(raw), out.stat().st_size


def preview(sdf, dims, band, path):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    vol = sdf.reshape(dims[2], dims[1], dims[0])
    fig, axes = plt.subplots(1, 3, figsize=(15, 5), dpi=110)
    for ax, (sl, title) in zip(axes, [
            (vol[dims[2] // 2, :, :], 'z mid'),
            (vol[:, dims[1] // 2, :], 'y mid'),
            (vol[:, :, dims[0] // 2], 'x mid')]):
        im = ax.imshow(sl, cmap='RdBu', vmin=-band, vmax=band, origin='lower')
        ax.contour(sl, levels=[0], colors='k', linewidths=1.2)
        ax.set_title(title)
        ax.axis('off')
    fig.colorbar(im, ax=axes, shrink=0.8, label='signed distance (mm)')
    fig.savefig(path, bbox_inches='tight', facecolor='white')
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mesh')
    ap.add_argument('--res', type=int, default=160,
                    help='voxels along the longest axis (default 160)')
    ap.add_argument('--band', type=float, default=None,
                    help='clamp distance in mm (default 6%% of the bbox diagonal)')
    ap.add_argument('--pad', type=int, default=4, help='padding voxels')
    ap.add_argument('--name', default=None)
    ap.add_argument('--out', default=None)
    ap.add_argument('--preview', default=None, help='write a slice preview PNG here')
    args = ap.parse_args()

    scratch = pathlib.Path(args.out).parent if args.out else pathlib.Path(args.mesh).parent
    log = lambda s: print('  ' + s, flush=True)
    mesh = load_mesh(args.mesh, scratch)
    log('mesh: %d faces, extent %s mm' % (len(mesh.faces), np.round(mesh.extents, 1).tolist()))
    band = args.band or 0.06 * float(np.linalg.norm(mesh.extents))
    dims, lo, hi, sdf, u8, pitch = bake(mesh, args.res, band, args.pad, log)

    src = pathlib.Path(args.mesh)
    out = pathlib.Path(args.out) if args.out else src.with_suffix('.sdf')
    raw, comp = write_sdf(out, dims, lo, hi, band, u8,
                          args.name or src.stem, src.name)
    log('wrote %s  (%.1f MB raw -> %.2f MB gzip)' % (out.name, raw / 1e6, comp / 1e6))
    if args.preview:
        preview(sdf, dims, band, args.preview)
        log('preview -> %s' % args.preview)


if __name__ == '__main__':
    main()
