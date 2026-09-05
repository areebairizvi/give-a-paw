// Decode a (Draco-compressed) GLB and write its triangles as a plain OBJ,
// so Python tooling that cannot read Draco can consume it.
// Usage: node decode_glb.mjs in.glb out.obj [meshNameFilter]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { writeFileSync } from 'fs';

const [inPath, outPath, filter] = process.argv.slice(2);
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
    });

const doc = await io.read(inPath);
const root = doc.getRoot();
let lines = ['# decoded from ' + inPath];
let vOffset = 0, tris = 0, kept = [];

// Walk scene nodes so world transforms are applied.
const { mat4, vec3 } = await import('gl-matrix').catch(() => ({}));
function walk(node, parent) {
    const local = node.getMatrix();
    const world = parent ? multiply(parent, local) : local;
    const mesh = node.getMesh();
    if (mesh) {
        for (const prim of mesh.listPrimitives()) {
            const name = mesh.getName() || prim.getMaterial()?.getName() || '';
            if (filter && !name.includes(filter)) continue;
            const pos = prim.getAttribute('POSITION');
            const idx = prim.getIndices();
            if (!pos) continue;
            kept.push(name || '(unnamed)');
            const n = pos.getCount();
            const p = [0, 0, 0];
            for (let i = 0; i < n; i++) {
                pos.getElement(i, p);
                const w = xform(world, p);
                lines.push('v ' + w[0] + ' ' + w[1] + ' ' + w[2]);
            }
            if (idx) {
                const m = idx.getCount();
                for (let i = 0; i + 2 < m; i += 3) {
                    lines.push('f ' + (idx.getScalar(i) + 1 + vOffset) + ' ' +
                        (idx.getScalar(i + 1) + 1 + vOffset) + ' ' +
                        (idx.getScalar(i + 2) + 1 + vOffset));
                    tris++;
                }
            } else {
                for (let i = 0; i + 2 < n; i += 3) {
                    lines.push('f ' + (i + 1 + vOffset) + ' ' + (i + 2 + vOffset) + ' ' + (i + 3 + vOffset));
                    tris++;
                }
            }
            vOffset += n;
        }
    }
    for (const c of node.listChildren()) walk(c, world);
}
function multiply(a, b) {   // column-major 4x4
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
}
function xform(m, p) {
    return [
        m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
        m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
        m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    ];
}
for (const scene of root.listScenes()) for (const n of scene.listChildren()) walk(n, null);
writeFileSync(outPath, lines.join('\n') + '\n');
console.log('meshes:', kept.join(', '), '| vertices:', vOffset, '| triangles:', tris);
