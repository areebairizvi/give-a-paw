// <sdf-viewer>: ray-marched signed distance fields in WebGL2.
//
// Loads the site's .sdf format (see tools/bake_sdf.py): a gzip-compressed
// uint8 volume of clamped signed distance. Because every sample is a true
// distance bound, the renderer sphere-traces - each step advances by the
// sampled distance - so a 160^3 field renders at interactive rates even on
// integrated GPUs. Three modes share one shader:
//
//   surface  the iso-surface at `iso` mm offset (wall thickness, live)
//   section  the surface clipped by a plane, cut face painted flat
//   field    section, plus the plane painted with the distance field itself
//            and its iso-contours - what nTop shows in its field view
//
// A closed-form TPMS lattice (gyroid / Schwarz P) can be intersected with
// the body in-shader, so cell size and strut thickness are live too.
//
// Attributes: src, mode, iso, plane-axis (x|y|z), plane-offset (0..1),
// plane-flip, lattice (none|gyroid|schwarz), cell, strut, contour,
// auto-rotate, resolution-scale.  Events: load (detail = header), error.
(() => {
    const VERT = `#version 300 es
    void main() {
        // one triangle covering clip space
        vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

    const FRAG = `#version 300 es
    precision highp float;
    precision highp sampler3D;
    out vec4 fragColor;

    uniform sampler3D uField;
    uniform vec2  uRes;
    uniform vec3  uCamPos, uCamRight, uCamUp, uCamFwd;
    uniform float uTanHalfFov;
    uniform vec3  uBMin, uBMax;      // volume bounds (mm)
    uniform vec3  uTexel;            // half-voxel inset in normalized coords
    uniform float uBand;             // clamp distance (mm)
    uniform float uIso;              // surface offset (mm)
    uniform int   uMode;             // 0 surface, 1 section, 2 field
    uniform vec4  uPlane;            // xyz normal, w offset: keep dot(p,n) <= w
    uniform int   uLattice;          // 0 none, 1 gyroid, 2 schwarz
    uniform float uCell, uStrut;
    uniform float uContour;          // contour spacing (mm) in field mode
    uniform float uInner;            // deepest interior distance (mm), for the colormap
    uniform vec3  uLight;
    uniform vec3  uBodyCol, uCapCol, uBg;

    // ---- the field ----
    float body(vec3 p) {
        vec3 uvw = (p - uBMin) / (uBMax - uBMin);
        uvw = clamp(uvw, uTexel, 1.0 - uTexel);
        float v = texture(uField, uvw).r;
        return (v * 2.0 - 1.0) * uBand - uIso;
    }
    float lattice(vec3 p) {
        float k = 6.2831853 / uCell;
        vec3 q = p * k;
        float g;
        if (uLattice == 1) {
            g = sin(q.x) * cos(q.y) + sin(q.y) * cos(q.z) + sin(q.z) * cos(q.x);
        } else {
            g = cos(q.x) + cos(q.y) + cos(q.z);
        }
        // |g| / |grad g| is a distance estimate to the sheet; the gradient
        // magnitude tops out near 1.5 (gyroid) so scale by 1/(k*1.5) keeps
        // it a conservative bound for sphere tracing.
        float d = abs(g) / (k * 1.5);
        return d - uStrut * 0.5;
    }
    float field(vec3 p) {
        float f = body(p);
        if (uLattice != 0) f = max(f, lattice(p));
        return f;
    }
    vec3 normalAt(vec3 p, float e) {
        vec2 h = vec2(e, 0.0);
        return normalize(vec3(
            field(p + h.xyy) - field(p - h.xyy),
            field(p + h.yxy) - field(p - h.yxy),
            field(p + h.yyx) - field(p - h.yyx)));
    }

    // ---- colouring ----
    vec3 colormap(float d) {
        // diverging: red inside, white at the surface, blue outside. The two
        // sides are scaled separately: inside by the part's own deepest
        // interior distance, so a 2 mm wall still reads fully red at its
        // core instead of near-white against a 17 mm band.
        float t = d < 0.0 ? 0.5 + 0.5 * max(d / uInner, -1.0)
                          : 0.5 + 0.5 * min(d / (uBand * 0.5), 1.0);
        vec3 inside = vec3(0.86, 0.28, 0.22);
        vec3 mid    = vec3(0.98, 0.98, 0.97);
        vec3 outsideC = vec3(0.13, 0.36, 0.66);
        return t < 0.5 ? mix(inside, mid, t * 2.0) : mix(mid, outsideC, (t - 0.5) * 2.0);
    }
    vec3 fieldShade(vec3 p) {
        float d = body(p);                     // raw field, not lattice-cut
        vec3 c = colormap(d);
        // iso-contours every uContour mm, drawn with screen-stable width
        float g = length(vec2(dFdx(d), dFdy(d))) + 1e-5;
        float lines = abs(fract(d / uContour + 0.5) - 0.5) * uContour / g;
        c *= 1.0 - 0.55 * (1.0 - smoothstep(0.6, 1.4, lines));
        // the surface itself, in gold
        float zero = abs(d) / g;
        c = mix(vec3(0.99, 0.71, 0.08), c, smoothstep(0.9, 2.2, zero));
        return c;
    }
    vec3 shade(vec3 p, vec3 n, vec3 rd, vec3 base) {
        float diff = clamp(dot(n, uLight), 0.0, 1.0);
        float back = clamp(dot(n, -uLight), 0.0, 1.0) * 0.25;
        float rim  = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0) * 0.18;
        vec3 h = normalize(uLight - rd);
        float spec = pow(clamp(dot(n, h), 0.0, 1.0), 40.0) * 0.12;
        return base * (0.30 + 0.70 * diff + back) + rim + spec;
    }

    // ---- ray / box ----
    vec2 boxHit(vec3 ro, vec3 rd) {
        vec3 inv = 1.0 / rd;
        vec3 t0 = (uBMin - ro) * inv, t1 = (uBMax - ro) * inv;
        vec3 tm = min(t0, t1), tM = max(t0, t1);
        return vec2(max(max(tm.x, tm.y), tm.z), min(min(tM.x, tM.y), tM.z));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
        uv.x *= uRes.x / uRes.y;
        vec3 rd = normalize(uCamFwd + uTanHalfFov * (uv.x * uCamRight + uv.y * uCamUp));
        vec3 ro = uCamPos;

        vec2 tb = boxHit(ro, rd);
        float tNear = max(tb.x, 0.0), tFar = tb.y;
        if (tFar <= tNear) { fragColor = vec4(0.0); return; }

        // section plane: keep the half-space dot(p, n) <= w
        bool cut = uMode != 0;
        bool onPlane = false;   // this ray enters the kept region through the plane
        float tPlane = -1.0;
        if (cut) {
            float dn = dot(rd, uPlane.xyz);
            float so = dot(ro, uPlane.xyz) - uPlane.w;   // >0 : origin on removed side
            if (abs(dn) > 1e-6) {
                tPlane = -so / dn;
                if (so > 0.0) {                 // start on the removed side
                    if (dn >= 0.0) { fragColor = vec4(0.0); return; }
                    if (tPlane > tNear) { tNear = tPlane; onPlane = true; }
                    else if (tPlane >= tb.x) { onPlane = true; }
                } else {                         // start on the kept side
                    if (dn > 0.0) tFar = min(tFar, tPlane);
                }
            } else if (so > 0.0) { fragColor = vec4(0.0); return; }
        }
        if (tFar <= tNear) { fragColor = vec4(0.0); return; }

        float pitch = (uBMax.x - uBMin.x) * uTexel.x * 2.0;
        float eps = pitch * 0.35;

        // entering through the plane: is this pixel on the cut face?
        if (onPlane) {
            vec3 p = ro + rd * tNear;
            float f = field(p);
            if (f < eps || uMode == 2) {
                if (f < eps) {
                    vec3 col = uMode == 2 ? fieldShade(p) : uCapCol;
                    // flat lit cap, lightly shaded by the plane normal
                    float l = 0.75 + 0.25 * clamp(dot(uPlane.xyz, uLight), 0.0, 1.0);
                    fragColor = vec4(col * l, 1.0);
                    return;
                }
                // field mode paints the whole plane, part or not
                fragColor = vec4(fieldShade(p) * 0.92, 1.0);
                return;
            }
        }

        // sphere trace the kept region
        float t = tNear;
        float stepK = uLattice != 0 ? 0.6 : 0.9;
        bool hit = false;
        for (int i = 0; i < 200; i++) {
            vec3 p = ro + rd * t;
            float f = field(p);
            if (f < eps) { hit = true; break; }
            t += max(f * stepK, pitch * 0.25);
            if (t > tFar) break;
        }
        if (hit) {
            vec3 p = ro + rd * t;
            vec3 n = normalAt(p, pitch * 0.5);
            fragColor = vec4(shade(p, n, rd, uBodyCol), 1.0);
            return;
        }
        // field mode: the ray may reach the plane from the kept side
        if (uMode == 2 && tPlane > tNear && tPlane <= tb.y) {
            vec3 p = ro + rd * tPlane;
            fragColor = vec4(fieldShade(p) * 0.92, 1.0);
            return;
        }
        fragColor = vec4(0.0);
    }`;

    class SdfViewer extends HTMLElement {
        static get observedAttributes() {
            return ['src', 'mode', 'iso', 'plane-axis', 'plane-offset',
                    'plane-flip', 'lattice', 'cell', 'strut', 'contour',
                    'field-range', 'auto-rotate', 'resolution-scale'];
        }

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; position: relative; width: 100%;
                            height: 100%; min-height: 240px; overflow: hidden;
                            touch-action: none; user-select: none; }
                    canvas { width: 100%; height: 100%; display: block; }
                    .msg { position: absolute; inset: 0; display: flex;
                           align-items: center; justify-content: center;
                           font: 14px/1.4 system-ui, sans-serif; color: #5a6b82;
                           text-align: center; padding: 1rem; pointer-events: none; }
                    .msg[hidden] { display: none; }
                </style>
                <canvas></canvas>
                <div class="msg" hidden></div>`;
            this.canvas = this.shadowRoot.querySelector('canvas');
            this.msg = this.shadowRoot.querySelector('.msg');
            this.header = null;
            this.cam = { theta: 0.6, phi: 1.15, radius: 1, center: [0, 0, 0] };
            this._needRender = true;
            this._spinning = false;
            this._lastPointer = null;
            this._pinch = null;
        }

        connectedCallback() {
            this._initGL();
            this._bindInput();
            this._ro = new ResizeObserver(() => this._resize());
            this._ro.observe(this);
            this._resize();
            if (this.getAttribute('src')) this.load(this.getAttribute('src'));
            this._loop();
        }
        disconnectedCallback() {
            this._ro && this._ro.disconnect();
            this._stopped = true;
        }
        attributeChangedCallback(name, _old, val) {
            if (name === 'src' && this.gl && val) this.load(val);
            if (name === 'auto-rotate') this._spinning = val !== null;
            this._needRender = true;
        }

        // ---------- loading ----------
        async load(src) {
            try {
                this._say('Loading field…');
                const res = await fetch(src);
                if (!res.ok) throw new Error(res.status + ' ' + src);
                await this._ingest(res.body);
                this._say('');
            } catch (e) {
                this._say('Could not load this field: ' + e.message);
                this.dispatchEvent(new CustomEvent('error', { detail: e }));
            }
        }
        async loadFile(file) {
            try {
                this._say('Reading ' + file.name + '…');
                await this._ingest(file.stream(), file.name);
                this._say('');
            } catch (e) {
                this._say('Not a readable .sdf file: ' + e.message);
                this.dispatchEvent(new CustomEvent('error', { detail: e }));
            }
        }
        async _ingest(stream, label) {
            if (typeof DecompressionStream === 'undefined') {
                throw new Error('this browser cannot decompress the field');
            }
            const buf = await new Response(
                stream.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
            const view = new DataView(buf);
            const magic = String.fromCharCode(...new Uint8Array(buf, 0, 4));
            if (magic !== 'SDF1') throw new Error('bad magic ' + magic);
            const hlen = view.getUint32(4, true);
            const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hlen)));
            const data = new Uint8Array(buf, 8 + hlen);
            const [nx, ny, nz] = header.dims;
            if (data.length !== nx * ny * nz) {
                throw new Error('voxel count mismatch');
            }
            header.bytes = buf.byteLength;
            header.file = label || this.getAttribute('src');
            // deepest interior sample -> colormap range for the field view
            let minV = 255;
            for (let i = 0; i < data.length; i++) if (data[i] < minV) minV = data[i];
            header.inner = Math.max(0.25, -((minV / 255) * 2 - 1) * header.band);
            this._upload(header, data);
            this.header = header;
            this._fitCamera();
            this._needRender = true;
            this.dispatchEvent(new CustomEvent('load', { detail: header }));
        }

        // ---------- GL ----------
        _initGL() {
            const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: false,
                premultipliedAlpha: true, powerPreference: 'high-performance' });
            if (!gl) { this._say('This browser has no WebGL2, which the field viewer needs.'); return; }
            this.gl = gl;
            const sh = (type, src) => {
                const s = gl.createShader(type);
                gl.shaderSource(s, src);
                gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                    throw new Error(gl.getShaderInfoLog(s));
                }
                return s;
            };
            const prog = gl.createProgram();
            gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
            gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(prog));
            }
            this.prog = prog;
            this.u = {};
            const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < n; i++) {
                const info = gl.getActiveUniform(prog, i);
                this.u[info.name] = gl.getUniformLocation(prog, info.name);
            }
            this.vao = gl.createVertexArray();
            this.tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_3D, this.tex);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        }
        _upload(header, data) {
            const gl = this.gl;
            const [nx, ny, nz] = header.dims;
            gl.bindTexture(gl.TEXTURE_3D, this.tex);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, nx, ny, nz, 0, gl.RED,
                          gl.UNSIGNED_BYTE, data);
        }
        _resize() {
            const scale = parseFloat(this.getAttribute('resolution-scale') || '0.8');
            const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
            const w = Math.max(1, Math.round(this.clientWidth * dpr));
            const h = Math.max(1, Math.round(this.clientHeight * dpr));
            if (this.canvas.width !== w || this.canvas.height !== h) {
                this.canvas.width = w;
                this.canvas.height = h;
                this._needRender = true;
            }
        }
        _fitCamera() {
            const [lo, hi] = this.header.bounds;
            const c = lo.map((v, i) => (v + hi[i]) / 2);
            const diag = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
            this.cam.center = c;
            this.cam.radius = diag * 1.15;
            this.cam.diag = diag;
        }

        // ---------- parameters ----------
        _params() {
            const h = this.header;
            const [lo, hi] = h.bounds;
            const axis = { x: 0, y: 1, z: 2 }[this.getAttribute('plane-axis') || 'y'];
            const off = parseFloat(this.getAttribute('plane-offset') || '0.5');
            const flip = this.hasAttribute('plane-flip');
            const n = [0, 0, 0];
            n[axis] = flip ? -1 : 1;
            const w = (lo[axis] + off * (hi[axis] - lo[axis])) * n[axis];
            const modeName = this.getAttribute('mode') || 'surface';
            const mode = { surface: 0, section: 1, field: 2 }[modeName] || 0;
            const latName = this.getAttribute('lattice') || 'none';
            return {
                mode, plane: [n[0], n[1], n[2], w],
                iso: parseFloat(this.getAttribute('iso') || '0'),
                lattice: { none: 0, gyroid: 1, schwarz: 2 }[latName] || 0,
                cell: parseFloat(this.getAttribute('cell') || '18'),
                strut: parseFloat(this.getAttribute('strut') || '2.5'),
                contour: parseFloat(this.getAttribute('contour') || '2'),
                range: parseFloat(this.getAttribute('field-range') || '0'),
            };
        }

        // ---------- render loop ----------
        _loop() {
            if (this._stopped) return;
            if (this._spinning) {
                this.cam.theta += 0.004;
                this._needRender = true;
            }
            if (this._needRender && this.header && this.gl) {
                this._draw();
                this._needRender = false;
            }
            requestAnimationFrame(() => this._loop());
        }
        _draw() {
            const gl = this.gl, u = this.u, cam = this.cam;
            const p = this._params();
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(this.prog);
            gl.bindVertexArray(this.vao);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_3D, this.tex);
            gl.uniform1i(u.uField, 0);

            // orbit camera
            const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
            const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
            const eye = [cam.center[0] + cam.radius * sp * st,
                         cam.center[1] + cam.radius * cp,
                         cam.center[2] + cam.radius * sp * ct];
            const fwd = norm3(sub3(cam.center, eye));
            const right = norm3(cross3(fwd, [0, 1, 0]));
            const up = cross3(right, fwd);
            gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
            gl.uniform3fv(u.uCamPos, eye);
            gl.uniform3fv(u.uCamRight, right);
            gl.uniform3fv(u.uCamUp, up);
            gl.uniform3fv(u.uCamFwd, fwd);
            gl.uniform1f(u.uTanHalfFov, Math.tan(35 * Math.PI / 360));

            const h = this.header;
            gl.uniform3fv(u.uBMin, h.bounds[0]);
            gl.uniform3fv(u.uBMax, h.bounds[1]);
            gl.uniform3f(u.uTexel, 0.5 / h.dims[0], 0.5 / h.dims[1], 0.5 / h.dims[2]);
            gl.uniform1f(u.uBand, h.band);
            gl.uniform1f(u.uIso, p.iso);
            gl.uniform1i(u.uMode, p.mode);
            gl.uniform4fv(u.uPlane, p.plane);
            gl.uniform1i(u.uLattice, p.lattice);
            gl.uniform1f(u.uCell, p.cell);
            gl.uniform1f(u.uStrut, p.strut);
            gl.uniform1f(u.uContour, p.contour);
            // colour range: explicit attribute, else the part's own depth
            gl.uniform1f(u.uInner, p.range > 0 ? p.range : (h.inner || h.band));
            gl.uniform3fv(u.uLight, norm3([0.5, 0.8, 0.45]));
            gl.uniform3f(u.uBodyCol, 0.80, 0.81, 0.83);
            gl.uniform3f(u.uCapCol, 0.99, 0.80, 0.30);
            gl.uniform3f(u.uBg, 0, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        // ---------- input ----------
        _bindInput() {
            const el = this;
            el.addEventListener('pointerdown', e => {
                el.setPointerCapture(e.pointerId);
                el._lastPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
                el._userSpun = true;
            });
            el.addEventListener('pointermove', e => {
                if (!el._lastPointer || e.pointerId !== el._lastPointer.id) return;
                const dx = e.clientX - el._lastPointer.x, dy = e.clientY - el._lastPointer.y;
                el._lastPointer.x = e.clientX; el._lastPointer.y = e.clientY;
                el.cam.theta -= dx * 0.008;
                el.cam.phi = Math.min(3.0, Math.max(0.15, el.cam.phi - dy * 0.008));
                el._needRender = true;
            });
            const end = e => { if (el._lastPointer && e.pointerId === el._lastPointer.id) el._lastPointer = null; };
            el.addEventListener('pointerup', end);
            el.addEventListener('pointercancel', end);
            el.addEventListener('wheel', e => {
                e.preventDefault();
                const k = Math.exp(e.deltaY * 0.0012);
                const lim = el.cam.diag || 100;
                el.cam.radius = Math.min(lim * 4, Math.max(lim * 0.25, el.cam.radius * k));
                el._needRender = true;
            }, { passive: false });
            // pinch zoom
            el.addEventListener('touchstart', e => {
                if (e.touches.length === 2) el._pinch = dist2(e.touches);
            }, { passive: true });
            el.addEventListener('touchmove', e => {
                if (e.touches.length === 2 && el._pinch) {
                    const d = dist2(e.touches);
                    el.cam.radius *= el._pinch / d;
                    el._pinch = d;
                    el._needRender = true;
                }
            }, { passive: true });
        }

        // public helpers
        getCamera() { return Object.assign({}, this.cam); }
        setCamera(c) { Object.assign(this.cam, c); this._needRender = true; }
        _say(t) { this.msg.textContent = t; this.msg.hidden = !t; }
    }

    const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const dist2 = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    customElements.define('sdf-viewer', SdfViewer);
})();
