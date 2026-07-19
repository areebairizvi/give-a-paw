// Mobile sidebar toggle
const mobileToggle = document.getElementById('mobile-toggle');
const sidebar = document.querySelector('.sidebar');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });
}

// Close sidebar when clicking outside it
document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-toggle')) {
        sidebar.classList.remove('active');
        mobileToggle.classList.remove('active');
    }
});

// Close sidebar when clicking a navigation link
const sidebarLinks = document.querySelectorAll('.sidebar a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        sidebar.classList.remove('active');
        mobileToggle.classList.remove('active');
    });
});

// Highlight current page in sidebar
const currentPath = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.sidebar a').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) {
        link.parentElement.classList.add('active');
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Media carousel
document.querySelectorAll('.carousel').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const dotsWrap = carousel.querySelector('.carousel-dots');
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    if (!track || slides.length === 0) return;

    let current = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
    });
    const dots = [...dotsWrap.children];

    function goTo(i) {
        current = (i + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        dots.forEach((d, di) => d.classList.toggle('active', di === current));

        // Pause every video; play the one on the active slide only
        carousel.querySelectorAll('video').forEach(v => v.pause());
        const activeVideo = slides[current].querySelector('video');
        if (activeVideo) {
            activeVideo.play().catch(() => {});
        }
    }

    if (prev) prev.addEventListener('click', () => goTo(current - 1));
    if (next) next.addEventListener('click', () => goTo(current + 1));
    goTo(0);
});

// 3D model variant toggle
document.querySelectorAll('.model-toggle').forEach(toggle => {
    const figure = toggle.closest('.model-viewer-figure');
    const viewer = figure && figure.querySelector('model-viewer');
    if (!viewer) return;
    const buttons = [...toggle.querySelectorAll('.model-toggle-btn')];
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const src = btn.getAttribute('data-model');
            if (!src || src === viewer.getAttribute('src')) return;
            viewer.setAttribute('src', src);
            buttons.forEach(b => b.classList.toggle('active', b === btn));
        });
    });
});

// Interactive nTop block accordions (socket creation and paw pages): the
// block sits centered and clicking an input row expands a dropdown inside
// the block with that input's description, controls, overlay toggles, and
// a 3D viewer with an orientation gizmo. One row is open at a time. Model
// filenames are generated per value; steps whose GLB has not been uploaded
// yet show a note instead of a model. Each page provides a config; the
// engine (initBlock) is shared.
(() => {
    const referencedUrls = new Set();

    const pad2 = n => String(n).padStart(2, '0');
    const pad3 = n => String(n).padStart(3, '0');

    // ---- Animal selector ----
    // The socket-creation demos are per-animal: the same parameter value
    // produces very different geometry on a Chihuahua vs a German Shepherd,
    // so each animal has its own GLB namespace. Every file fn below calls
    // AP() at build time, so switching animals redirects the whole page to
    // that animal's library. Animals without exported sweeps degrade to the
    // per-step "not uploaded yet" note automatically. When the Golden
    // Hound / German Shepherd sweeps land, their anatomy-anchored sliders
    // (TLP, interface position, blend points, attach drop) will also need
    // per-animal ranges - the current ranges are the Chihuahua's.
    const ANIMALS = {
        chi: { label: 'Small Dog', sub: 'Chihuahua', prefix: 'ntop-chi-', ready: true },
        gh: { label: 'Medium Dog', sub: 'Golden Hound', prefix: 'ntop-gh-', ready: false },
        gs: { label: 'Large Dog', sub: 'German Shepherd', prefix: 'ntop-gs-', ready: false },
    };
    let activeAnimal = 'chi';
    const AP = () => ANIMALS[activeAnimal].prefix;
    // Signed mm values (adjust sliders): n50..n05, 000, p05..p50 keeps
    // filenames fixed-width where a bare minus sign could not.
    const signed2 = v => v < 0 ? 'n' + pad2(-v) : v > 0 ? 'p' + pad2(v) : '000';
    const POINT_COUNTS = [10, 20, 40, 60, 80, 100, 120, 140, 160, 180,
        200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400];

    // Thickest Lattice Point sweep (Chihuahua): X and Z are fixed at
    // -58.106 / 155.02 mm; the slider moves Y. -113.08 is the design
    // baseline and sits off the 10 mm grid, so it is spliced into the
    // values array.
    const TLP_YS = [-200, -190, -180, -170, -160, -150, -140, -130, -120,
        -113.08, -110, -100, -90, -80, -70, -60, -50, -40, -30, -20, -10, 0];

    const SOCKET_VARS = {
        'thickest-point': {
            title: 'Thickest Lattice Point',
            type: 'slider',
            values: TLP_YS, def: -113.08, unit: 'mm',
            file: v => AP() + 'tlp-y-' + (Number.isInteger(v)
                ? pad3(Math.abs(v)) : String(Math.abs(v))) + '.glb',
            desc: 'Sets the location where the socket wall is at its thickest. X and Z are fixed at -58.106 and 155.02 mm; the slider moves the Y coordinate. Toggle the Lattice Point Sphere to see the point itself.',
        },
        'max-thickness': {
            title: 'Max Socket Thickness',
            type: 'slider',
            min: 0, max: 20, step: 2, def: 8, unit: 'mm',
            file: v => AP() + 'maxthick-' + pad2(v) + '.glb',
            desc: 'Sets the upper limit on the socket wall thickness.',
        },
        'min-thickness': {
            title: 'Min Socket Thickness',
            type: 'slider',
            // This sweep was intentionally run at Max 12 / Bdry 12 (not the
            // 8/6/8 baseline the other sliders share) to make the min-wall
            // effect easier to see.
            min: 0, max: 20, step: 1, def: 8, unit: 'mm',
            file: v => AP() + 'minthick-' + pad2(v) + '.glb',
            desc: 'Sets the lower limit on the socket wall thickness.',
        },
        'pelvic-thickness': {
            title: 'Pelvic Thickness',
            type: 'slider',
            min: 0, max: 30, step: 2, def: 0, unit: 'mm',
            file: v => AP() + 'pelvic-' + pad2(v) + '.glb',
            desc: 'Sets the lattice thickness in the pelvic region of the socket.',
        },
        'pelvic-distance': {
            title: 'Pelvic Thicken Distance',
            type: 'slider',
            values: [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
                110, 120, 130, 140, 150, 160, 170, 180, 190, 200],
            def: 50, unit: 'mm',
            file: v => AP() + 'pelvicdist-' + String(v).padStart(3, '0') + '.glb',
            desc: 'Sets how far the pelvic thickening extends from the pelvic plane into the socket.',
        },
        'boundary-thickness': {
            title: 'Boundary Lattice Thickness',
            type: 'slider',
            min: 0, max: 20, step: 2, def: 8, unit: 'mm',
            file: v => AP() + 'boundary-' + pad2(v) + '.glb',
            desc: 'Controls how thick the strands are along the outer edge of the lattice. Thicker boundaries give a more rigid rim and a defined silhouette; thinner boundaries blend into the surface lattice and flex more.',
        },
        'point-count': {
            title: 'Lattice Point Count',
            type: 'slider',
            values: POINT_COUNTS, def: 100, unit: '',
            file: v => AP() + 'pointcount-' + String(v).padStart(3, '0') + '.glb',
            desc: 'Controls how densely the lattice is sampled across the surface: a low count yields a sparse, open structure that flexes more freely; a high count yields a finer, denser mesh that is stiffer and distributes load over more contact area.',
        },
    };
    const SOCKET_MESH_VARS = {
        'solid-animal': {
            title: 'Solid Animal',
            desc: 'The cleaned, watertight mesh of the animal\'s residual limb. The lattice socket is grown around this shape. Pick an animal below.',
            options: [
                { label: 'Billie', file: 'billie-solid-animal.glb' },
                { label: 'Max', file: null },
                { label: 'Yana', file: null },
            ],
        },
        'attachment-surface': {
            title: 'Socket Attachment Surface',
            desc: 'The region of the limb the socket grips, exported as a separate surface. It defines where the lattice sits on the limb. Pick an animal below.',
            options: [
                { label: 'Billie', file: 'billie-attachment-surface.glb' },
                { label: 'Max', file: null },
                { label: 'Yana', file: null },
            ],
        },
    };

    // Default camera view per variable key, captured with the ?dev=1 panel.
    // '*' is the fallback for keys without a captured view. Keys without an
    // entry auto-frame: model-viewer centers the camera target on the
    // model's bounding box, so rotation pivots around the model's center.
    // The old Example Dog captures were removed with that model set - their
    // targets pointed at coordinates the Chihuahua models don't occupy,
    // which made rotation orbit a point far off the socket. Capture fresh
    // Chihuahua views with ?dev=1 and paste the generated block here.
    const DEFAULT_VIEWS = {};
    // Default color of the Thickest Lattice Point sphere overlay (hex),
    // set with the ?dev=1 panel.
    const SPHERE_COLOR = '#ff3b30';

    const SOCKET_OVERLAYS = [
        { name: 'overlay-dog', label: 'Full Dog' },
        { name: 'overlay-surface', label: 'Attachment Surface' },
        { name: 'overlay-sphere', label: 'Lattice Point Sphere',
          onlyFor: ['thickest-point', 'min-thickness', 'max-thickness'] },
    ];

    // ---- Quaternion helpers ----
    // The 90-degree rotate arrows compose quaternion rotations about the
    // current screen axes and drive model-viewer's `orientation` attribute
    // (the orbit camera itself cannot roll). Quaternions make the steps
    // compose correctly at any orientation with no gimbal trouble; Euler
    // angles only appear at the output boundary because that is the format
    // the attribute takes. Quaternions are [w, x, y, z]. model-viewer
    // applies orientation as Euler YXZ (yaw about Y, then pitch about X,
    // then roll about Z) and the attribute string is "<roll> <pitch> <yaw>".
    const QID = [1, 0, 0, 0];
    const qMul = (a, b) => [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ];
    const qAxisAngle = (axis, deg) => {
        const h = deg * Math.PI / 360;
        const s = Math.sin(h);
        return [Math.cos(h), axis[0] * s, axis[1] * s, axis[2] * s];
    };
    const qRotate = (q, v) => {
        const w = q[0], x = q[1], y = q[2], z = q[3];
        const tx = 2 * (y * v[2] - z * v[1]);
        const ty = 2 * (z * v[0] - x * v[2]);
        const tz = 2 * (x * v[1] - y * v[0]);
        return [
            v[0] + w * tx + (y * tz - z * ty),
            v[1] + w * ty + (z * tx - x * tz),
            v[2] + w * tz + (x * ty - y * tx),
        ];
    };
    const qSlerp = (a, b, t) => {
        let cosom = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        const bb = cosom < 0 ? b.map(v => -v) : b;
        cosom = Math.abs(cosom);
        let s0, s1;
        if (cosom > 0.9995) {
            s0 = 1 - t;
            s1 = t;
        } else {
            const om = Math.acos(cosom);
            const so = Math.sin(om);
            s0 = Math.sin((1 - t) * om) / so;
            s1 = Math.sin(t * om) / so;
        }
        const out = [
            s0 * a[0] + s1 * bb[0], s0 * a[1] + s1 * bb[1],
            s0 * a[2] + s1 * bb[2], s0 * a[3] + s1 * bb[3],
        ];
        const len = Math.hypot(out[0], out[1], out[2], out[3]) || 1;
        return out.map(v => v / len);
    };
    const qToOrientation = q => {
        const w = q[0], x = q[1], y = q[2], z = q[3];
        const m00 = 1 - 2 * (y * y + z * z);
        const m02 = 2 * (x * z + w * y);
        const m10 = 2 * (x * y + w * z);
        const m11 = 1 - 2 * (x * x + z * z);
        const m12 = 2 * (y * z - w * x);
        const m20 = 2 * (x * z - w * y);
        const m22 = 1 - 2 * (x * x + y * y);
        const pitch = Math.asin(Math.min(1, Math.max(-1, -m12)));
        let yaw, roll;
        if (Math.abs(m12) < 0.9999999) {
            yaw = Math.atan2(m02, m22);
            roll = Math.atan2(m10, m11);
        } else {
            yaw = Math.atan2(-m20, m00);
            roll = 0;
        }
        const d = 180 / Math.PI;
        return (roll * d).toFixed(2) + 'deg ' + (pitch * d).toFixed(2) +
            'deg ' + (yaw * d).toFixed(2) + 'deg';
    };
    const qFromOrientation = str => {
        const p = (str || '').trim().split(/\s+/).map(s => parseFloat(s) || 0);
        const qy = qAxisAngle([0, 1, 0], p[2]);
        const qx = qAxisAngle([1, 0, 0], p[1]);
        const qz = qAxisAngle([0, 0, 1], p[0]);
        return qMul(qy, qMul(qx, qz));
    };

    // ---- Orientation gizmo: SolidWorks-style view cube, triad, and
    // rotate arrows, attached per expansion viewer ----
    const GIZMO_SVG =
        '<svg viewBox="0 0 120 190" xmlns="http://www.w3.org/2000/svg">' +
        '<g class="gizmo-arrows">' +
        '<polygon class="gizmo-arrow" data-rot="up" points="60,2 52,12 68,12">' +
        '<title>Rotate up 90°</title></polygon>' +
        '<polygon class="gizmo-arrow" data-rot="down" points="60,118 52,108 68,108">' +
        '<title>Rotate down 90°</title></polygon>' +
        '<polygon class="gizmo-arrow" data-rot="left" points="2,60 12,52 12,68">' +
        '<title>Rotate left 90°</title></polygon>' +
        '<polygon class="gizmo-arrow" data-rot="right" points="118,60 108,52 108,68">' +
        '<title>Rotate right 90°</title></polygon>' +
        '<g class="gizmo-roll" data-rot="ccw"><title>Roll counterclockwise 90°</title>' +
        '<path d="M 8 28 A 19 19 0 0 1 25 9" /><polygon points="25,3 25,15 33,9" /></g>' +
        '<g class="gizmo-roll" data-rot="cw"><title>Roll clockwise 90°</title>' +
        '<path d="M 112 28 A 19 19 0 0 0 95 9" /><polygon points="95,3 95,15 87,9" /></g>' +
        '</g>' +
        '<g class="gizmo-cube"></g>' +
        '<g class="gizmo-triad" transform="translate(60, 162)"></g>' +
        '</svg>';
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const CUBE_FACES = [
        { axis: '+x', normal: [1, 0, 0],
          corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
        { axis: '-x', normal: [-1, 0, 0],
          corners: [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]] },
        { axis: '+y', normal: [0, 1, 0],
          corners: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]] },
        { axis: '-y', normal: [0, -1, 0],
          corners: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
        { axis: '+z', normal: [0, 0, 1],
          corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
        { axis: '-z', normal: [0, 0, -1],
          corners: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]] },
    ];
    const TRIAD_AXES = [
        { label: 'X', v: [1, 0, 0], color: '#d64541' },
        { label: 'Y', v: [0, 1, 0], color: '#2e7d46' },
        { label: 'Z', v: [0, 0, 1], color: '#2465c2' },
    ];
    const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    const attachGizmo = (viewer, wrapEl, initialOrient) => {
        let qModel = initialOrient ? qFromOrientation(initialOrient) : QID.slice();
        let orientTimer = null;
        const holder = document.createElement('div');
        holder.className = 'view-gizmo';
        holder.setAttribute('aria-hidden', 'true');
        holder.innerHTML = GIZMO_SVG;
        wrapEl.appendChild(holder);
        const cubeG = holder.querySelector('.gizmo-cube');
        const triadG = holder.querySelector('.gizmo-triad');

        const cameraBasis = () => {
            const orbit = viewer.getCameraOrbit();
            const phi = Math.min(Math.max(orbit.phi, 0.002), Math.PI - 0.002);
            const theta = orbit.theta;
            const zc = [Math.sin(phi) * Math.sin(theta), Math.cos(phi),
                Math.sin(phi) * Math.cos(theta)];
            let xc = [zc[2], 0, -zc[0]];
            const xl = Math.hypot(xc[0], xc[1], xc[2]) || 1;
            xc = xc.map(v => v / xl);
            const yc = [
                zc[1] * xc[2] - zc[2] * xc[1],
                zc[2] * xc[0] - zc[0] * xc[2],
                zc[0] * xc[1] - zc[1] * xc[0],
            ];
            return { xc, yc, zc, orbit };
        };

        const renderGizmo = () => {
            if (typeof viewer.getCameraOrbit !== 'function') return;
            const { xc, yc, zc } = cameraBasis();
            const proj = (p, scale, cx, cy) => {
                const r = qRotate(qModel, p);
                return [cx + scale * dot3(r, xc), cy - scale * dot3(r, yc)];
            };
            cubeG.innerHTML = '';
            CUBE_FACES
                .map(f => ({ f, depth: dot3(qRotate(qModel, f.normal), zc) }))
                .filter(e => e.depth > 0.02)
                .sort((a, b) => a.depth - b.depth)
                .forEach(({ f }) => {
                    const pts = f.corners.map(c => proj(c, 21, 60, 60));
                    const poly = document.createElementNS(SVG_NS, 'polygon');
                    poly.setAttribute('points',
                        pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
                    poly.setAttribute('class', 'gizmo-face');
                    poly.setAttribute('data-axis', f.axis);
                    cubeG.appendChild(poly);
                    const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
                    const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
                    const text = document.createElementNS(SVG_NS, 'text');
                    text.setAttribute('x', cx.toFixed(1));
                    text.setAttribute('y', (cy + 3).toFixed(1));
                    text.setAttribute('class', 'gizmo-face-label');
                    text.setAttribute('text-anchor', 'middle');
                    text.textContent = f.axis.replace('x', 'X')
                        .replace('y', 'Y').replace('z', 'Z');
                    cubeG.appendChild(text);
                });
            triadG.innerHTML = '';
            TRIAD_AXES.forEach(axis => {
                const rot = qRotate(qModel, axis.v);
                const end = [18 * dot3(rot, xc), -18 * dot3(rot, yc)];
                const line = document.createElementNS(SVG_NS, 'line');
                line.setAttribute('x1', '0');
                line.setAttribute('y1', '0');
                line.setAttribute('x2', end[0].toFixed(1));
                line.setAttribute('y2', end[1].toFixed(1));
                line.setAttribute('stroke', axis.color);
                triadG.appendChild(line);
                const text = document.createElementNS(SVG_NS, 'text');
                text.setAttribute('x', (end[0] * 25 / 18).toFixed(1));
                text.setAttribute('y', (end[1] * 25 / 18 + 3).toFixed(1));
                text.setAttribute('fill', axis.color);
                text.setAttribute('text-anchor', 'middle');
                text.textContent = axis.label;
                triadG.appendChild(text);
            });
        };

        // Throttle with a timeout, not requestAnimationFrame: rAF can be
        // suspended in background tabs, which would wedge the queue flag.
        let gizmoQueued = false;
        const queueGizmo = () => {
            if (gizmoQueued) return;
            gizmoQueued = true;
            setTimeout(() => {
                gizmoQueued = false;
                renderGizmo();
            }, 50);
        };

        const setOrbit = (thetaDeg, phiDeg, radius) => {
            const value =
                thetaDeg.toFixed(1) + 'deg ' + phiDeg.toFixed(1) + 'deg ' +
                radius.toFixed(1) + 'm';
            // Re-setting an identical attribute value is a no-op, which
            // would break repeating the same snap after the user orbits
            // away - remove first ONLY in that case. Removing
            // unconditionally would kill model-viewer's smooth
            // interpolation and make every snap a hard jump.
            if (viewer.getAttribute('camera-orbit') === value) {
                viewer.removeAttribute('camera-orbit');
            }
            viewer.setAttribute('camera-orbit', value);
        };

        const setOrientation = (q, animate) => {
            if (orientTimer) {
                clearInterval(orientTimer);
                orientTimer = null;
            }
            const from = qModel.slice();
            qModel = q.slice();
            const write = qq => {
                viewer.setAttribute('orientation', qToOrientation(qq));
                queueGizmo();
            };
            if (!animate) {
                write(qModel);
                return;
            }
            const t0 = Date.now();
            const DURATION = 350;
            orientTimer = setInterval(() => {
                const t = Math.min(1, (Date.now() - t0) / DURATION);
                write(qSlerp(from, qModel, t * (2 - t)));
                if (t >= 1) {
                    clearInterval(orientTimer);
                    orientTimer = null;
                }
            }, 16);
        };

        const FACE_NORMALS = {};
        CUBE_FACES.forEach(f => { FACE_NORMALS[f.axis] = f.normal; });

        holder.addEventListener('click', e => {
            const target = e.target.closest
                ? e.target.closest('[data-axis], [data-rot]') : null;
            if (!target) return;
            const { xc, yc, zc, orbit } = cameraBasis();
            const axis = target.getAttribute('data-axis');
            if (axis) {
                // Point the camera at the face, wherever the model's
                // orientation has taken that axis in world space.
                const d = qRotate(qModel, FACE_NORMALS[axis]);
                const phiDeg = Math.acos(Math.min(1, Math.max(-1, d[1]))) *
                    180 / Math.PI;
                const thetaDeg = Math.abs(d[1]) > 0.999
                    ? orbit.theta * 180 / Math.PI
                    : Math.atan2(d[0], d[2]) * 180 / Math.PI;
                setOrbit(thetaDeg,
                    Math.min(179.9, Math.max(0.1, phiDeg)), orbit.radius);
                return;
            }
            // 90-degree rotate arrows: compose a quaternion step about the
            // current screen axis onto the model orientation.
            const rot = target.getAttribute('data-rot');
            const STEPS = {
                left: [yc, 90], right: [yc, -90],
                up: [xc, 90], down: [xc, -90],
                ccw: [zc, 90], cw: [zc, -90],
            };
            const st = STEPS[rot];
            if (!st) return;
            setOrientation(qMul(qAxisAngle(st[0], st[1]), qModel), true);
        });

        viewer.addEventListener('camera-change', queueGizmo);
        viewer.addEventListener('load', queueGizmo);
        customElements.whenDefined('model-viewer').then(queueGizmo);

        return { orient: () => qToOrientation(qModel) };
    };

    // ---- Shared accordion engine ----
    // opts: { blockId, vars, meshVars, overlays, defaultViews, sphereColor,
    //         autoOpen, preloadUrls }
    const initBlock = opts => {
        const block = document.getElementById(opts.blockId);
        if (!block) return false;
        const VARS = opts.vars;
        const MESH_VARS = opts.meshVars || {};
        const OVERLAYS = opts.overlays || [];
        const rows = [...block.querySelectorAll('.ntop-block-row')];
        const views = Object.assign({}, opts.defaultViews || {});
        const overlayState = {};
        let sphereColor = opts.sphereColor || '#ff3b30';
        let openKey = null;
        let current = null; // { key, viewer, bar, missing, gizmo }
        let loadPollToken = 0;

        (opts.preloadUrls || []).forEach(u => referencedUrls.add(u));

        const hexToRgb = hex => {
            const h = hex.replace('#', '');
            return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
        };
        // Matte plus overlay visibility for the current viewer. The global
        // matte pass only sees viewers that exist at page load, so the
        // dynamically created expansion viewers are handled here.
        const applyMatteAndOverlays = () => {
            if (!current || !current.viewer.model) return;
            current.viewer.model.materials.forEach(m => {
                try {
                    const pbr = m.pbrMetallicRoughness;
                    pbr.setRoughnessFactor(1.0);
                    pbr.setMetallicFactor(0.0);
                    const isOverlay = m.name && m.name.indexOf('overlay-') === 0;
                    if (!isOverlay) {
                        pbr.setBaseColorFactor([0.9, 0.9, 0.9, 1.0]);
                        return;
                    }
                    const cfg = OVERLAYS.find(o => o.name === m.name);
                    const allowed = !cfg || !cfg.onlyFor ||
                        cfg.onlyFor.indexOf(openKey) !== -1;
                    const on = allowed && !!overlayState[m.name];
                    const rgb = m.name === 'overlay-sphere'
                        ? hexToRgb(sphereColor)
                        : pbr.baseColorFactor.slice(0, 3);
                    m.setAlphaMode(on ? 'OPAQUE' : 'BLEND');
                    pbr.setBaseColorFactor([rgb[0], rgb[1], rgb[2], on ? 1 : 0]);
                } catch (e) {}
            });
        };
        const updateToggleBar = () => {
            if (!current || !current.bar) return;
            const mats = current.viewer.model
                ? current.viewer.model.materials.map(m => m.name) : [];
            [...current.bar.querySelectorAll('button')].forEach(btn => {
                btn.disabled = mats.indexOf(btn.dataset.overlay) === -1;
            });
        };
        const setSrc = src => {
            if (!current) return;
            const viewer = current.viewer;
            if (current.missing) current.missing.hidden = true;
            if (viewer.getAttribute('src') !== src) viewer.setAttribute('src', src);
            // Two-phase wait: `loaded` can still be true for the OLD model
            // right after a src change, so wait to observe it drop before
            // trusting it again (with a time fallback for instant cache
            // swaps the poll interval might miss).
            const token = ++loadPollToken;
            const t0 = Date.now();
            let sawUnloaded = false;
            const poll = () => {
                if (token !== loadPollToken) return;
                if (!viewer.loaded) sawUnloaded = true;
                if (viewer.loaded && viewer.model &&
                    (sawUnloaded || Date.now() - t0 > 450)) {
                    applyMatteAndOverlays();
                    updateToggleBar();
                    return;
                }
                setTimeout(poll, 100);
            };
            setTimeout(poll, 100);
        };

        const makeViewer = key => {
            const mv = document.createElement('model-viewer');
            mv.setAttribute('alt', 'Interactive 3D model for the selected block input');
            mv.setAttribute('loading', 'eager');
            mv.setAttribute('camera-controls', '');
            mv.setAttribute('touch-action', 'pan-y');
            mv.setAttribute('shadow-intensity', '1');
            mv.setAttribute('shadow-softness', '0.7');
            mv.setAttribute('exposure', '0.85');
            mv.setAttribute('tone-mapping', 'neutral');
            mv.setAttribute('environment-image', 'model-env.png');
            mv.setAttribute('ar', '');
            // Allow zooming out well past the auto-framed distance
            // (model-viewer's default max radius clamps close to it).
            mv.setAttribute('max-camera-orbit', 'auto auto 500%');
            // Without this, every quick click re-targets the camera to the
            // clicked surface point (and a click on the background resets
            // the target and zooms fully out) - which makes the rotation
            // pivot wander and fights shift-drag panning.
            mv.setAttribute('disable-tap', '');
            const view = views[key] || (VARS[key] ? views['*'] : null);
            if (view) {
                mv.setAttribute('camera-orbit', view.orbit);
                mv.setAttribute('camera-target', view.target);
                if (view.fov) mv.setAttribute('field-of-view', view.fov);
                if (view.orient) mv.setAttribute('orientation', view.orient);
            }
            return mv;
        };

        const makeSlider = (labelText, min, max, step, value, unit, ticks) => {
            const wrap = document.createElement('div');
            wrap.className = 'point-slider';
            const label = document.createElement('label');
            label.className = 'point-slider-label';
            label.textContent = labelText + ': ';
            const readout = document.createElement('span');
            readout.textContent = value;
            label.appendChild(readout);
            if (unit) label.appendChild(document.createTextNode(' ' + unit));
            const input = document.createElement('input');
            input.type = 'range';
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;
            const tickRow = document.createElement('div');
            tickRow.className = 'point-slider-ticks';
            tickRow.setAttribute('aria-hidden', 'true');
            ticks.forEach(t => {
                const s = document.createElement('span');
                s.textContent = t;
                tickRow.appendChild(s);
            });
            wrap.append(label, input, tickRow);
            return { wrap, input, readout };
        };

        const makeToggleBar = key => {
            const bar = document.createElement('div');
            bar.className = 'overlay-toggles';
            OVERLAYS.forEach(o => {
                if (o.onlyFor && o.onlyFor.indexOf(key) === -1) return;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'model-toggle-btn' +
                    (overlayState[o.name] ? ' active' : '');
                btn.textContent = o.label;
                btn.dataset.overlay = o.name;
                btn.disabled = true;
                btn.addEventListener('click', () => {
                    overlayState[o.name] = !overlayState[o.name];
                    btn.classList.toggle('active', !!overlayState[o.name]);
                    applyMatteAndOverlays();
                });
                bar.appendChild(btn);
            });
            return bar;
        };

        const closeAll = () => {
            loadPollToken++;
            block.querySelectorAll('.ntop-expand.open').forEach(p =>
                p.classList.remove('open'));
            rows.forEach(r => r.classList.remove('open', 'active'));
            block.querySelectorAll('.ntop-expand-body').forEach(b => {
                b.innerHTML = '';
            });
            current = null;
            openKey = null;
        };

        const buildExpansion = key => {
            const body = block.querySelector(
                '[data-expand="' + key + '"] .ntop-expand-body');
            const row = rows.find(r => r.dataset.key === key);
            if (!body || !row) return;
            const rowValueEl = row.querySelector('[data-value]');
            const cfg = VARS[key] || MESH_VARS[key];
            openKey = key;

            const desc = document.createElement('p');
            desc.className = 'ntop-expand-desc';
            desc.textContent = cfg.desc;
            body.appendChild(desc);

            const viewer = makeViewer(key);
            current = { key, viewer, bar: null, missing: null, gizmo: null };

            if (MESH_VARS[key]) {
                const choices = document.createElement('div');
                choices.className = 'ntop-mesh-choices';
                cfg.options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'model-toggle-btn' +
                        (opt.label === rowValueEl.textContent ? ' active' : '');
                    btn.textContent = opt.label + (opt.file ? '' : ' (coming soon)');
                    btn.disabled = !opt.file;
                    btn.addEventListener('click', () => {
                        choices.querySelectorAll('button').forEach(b =>
                            b.classList.toggle('active', b === btn));
                        rowValueEl.textContent = opt.label;
                        setSrc(opt.file);
                    });
                    choices.appendChild(btn);
                });
                body.appendChild(choices);
            } else if (cfg.type === 'grid') {
                const state = {};
                cfg.axes.forEach(axis => {
                    state[axis.key] = axis.def;
                    const ticks = [];
                    for (let t = axis.min; t <= axis.max; t += axis.step) ticks.push(t);
                    const s = makeSlider(axis.label || axis.key, axis.min, axis.max,
                        axis.step, axis.def, axis.unit, ticks);
                    s.input.addEventListener('input', () => {
                        state[axis.key] = parseInt(s.input.value, 10);
                        s.readout.textContent = state[axis.key];
                        rowValueEl.textContent = cfg.rowValue(state.Y, state.Z);
                        setSrc(cfg.file(state.Y, state.Z));
                    });
                    body.appendChild(s.wrap);
                });
            } else {
                const values = cfg.values ||
                    Array.from({ length: (cfg.max - cfg.min) / cfg.step + 1 },
                        (_, i) => cfg.min + i * cfg.step);
                const defIdx = Math.max(0, values.indexOf(cfg.def));
                const s = makeSlider(cfg.title, 0, values.length - 1, 1,
                    defIdx, cfg.unit, values);
                const cur = parseInt(rowValueEl.textContent, 10);
                const curIdx = values.indexOf(cur);
                if (curIdx !== -1) {
                    s.input.value = curIdx;
                    s.readout.textContent = values[curIdx];
                } else {
                    s.readout.textContent = values[defIdx];
                }
                s.input.addEventListener('input', () => {
                    const v = values[parseInt(s.input.value, 10)];
                    s.readout.textContent = v;
                    rowValueEl.textContent = v;
                    setSrc(cfg.file(v));
                });
                body.appendChild(s.wrap);
            }

            const bar = makeToggleBar(key);
            body.appendChild(bar);
            current.bar = bar;

            const wrap = document.createElement('div');
            wrap.className = 'viewer-wrap';
            wrap.appendChild(viewer);
            body.appendChild(wrap);
            const view = views[key] || (VARS[key] ? views['*'] : null);
            current.gizmo = attachGizmo(viewer, wrap, view && view.orient);

            const missing = document.createElement('p');
            missing.className = 'ntop-demo-missing';
            missing.textContent = 'The model for this value has not been uploaded yet.';
            missing.hidden = true;
            body.appendChild(missing);
            current.missing = missing;
            viewer.addEventListener('error', () => { missing.hidden = false; });
            // Backup for the poll in setSrc: when the load event does fire,
            // reapply overlay state to the new model immediately.
            viewer.addEventListener('load', () => {
                applyMatteAndOverlays();
                updateToggleBar();
            });

            // Initial model
            if (MESH_VARS[key]) {
                const sel = cfg.options.find(o =>
                    o.label === rowValueEl.textContent) || cfg.options[0];
                if (sel.file) setSrc(sel.file);
            } else if (cfg.type === 'grid') {
                setSrc(cfg.file(...cfg.axes.map(a => a.def)));
            } else {
                const values = cfg.values ||
                    Array.from({ length: (cfg.max - cfg.min) / cfg.step + 1 },
                        (_, i) => cfg.min + i * cfg.step);
                const cur = parseInt(rowValueEl.textContent, 10);
                const v = values.indexOf(cur) !== -1 ? cur : cfg.def;
                setSrc(cfg.file(v));
            }

            block.querySelector('[data-expand="' + key + '"]').classList.add('open');
            row.classList.add('open', 'active');
        };

        rows.forEach(row => {
            row.addEventListener('click', () => {
                const key = row.dataset.key;
                const wasOpen = openKey === key;
                closeAll();
                if (!wasOpen) buildExpansion(key);
            });
        });

        // ---- View editor: open ntop-socket-creation.html?dev=1, open an
        // input, orbit the model, capture the view, pick the sphere color,
        // then paste the generated block over DEFAULT_VIEWS / SPHERE_COLOR.
        if (new URLSearchParams(window.location.search).has('dev')) {
            const panel = document.createElement('div');
            panel.className = 'quiz-dev-panel';
            panel.innerHTML =
                '<p class="quiz-dev-help">View editor: open an input on the block, ' +
                'orbit and zoom the model to the view you want, then press ' +
                '<strong>Capture view</strong>. "Capture as fallback" sets the view ' +
                'used by inputs without their own. Pick the sphere color with the ' +
                'swatch. Copy the code below and paste it over the ' +
                '<code>DEFAULT_VIEWS</code> / <code>SPHERE_COLOR</code> block in ' +
                '<code>script.js</code>.</p>' +
                '<p class="quiz-dev-actions">' +
                '<button type="button" class="quiz-dev-copy" data-capture>Capture view for open input</button> ' +
                '<button type="button" class="quiz-dev-copy" data-capture-all>Capture as fallback (*)</button> ' +
                '<label class="dev-sphere-label">Sphere color: ' +
                '<input type="color" data-sphere-color></label></p>' +
                '<textarea class="quiz-dev-output" readonly spellcheck="false"></textarea>' +
                '<button type="button" class="quiz-dev-copy" data-copy>Copy code</button>' +
                '<span class="quiz-dev-copied" hidden>Copied!</span>';
            block.closest('.accordion-wrap').after(panel);
            const output = panel.querySelector('.quiz-dev-output');
            const colorInput = panel.querySelector('[data-sphere-color]');
            colorInput.value = sphereColor;

            const serialize = () => {
                const keys = Object.keys(views);
                const lines = keys.map(k =>
                    "        '" + k + "': { orbit: '" + views[k].orbit +
                    "', target: '" + views[k].target +
                    "', fov: '" + views[k].fov + "'" +
                    (views[k].orient ? ", orient: '" + views[k].orient + "'" : '') +
                    ' },');
                output.value =
                    '    const DEFAULT_VIEWS = {\n' + lines.join('\n') +
                    (lines.length ? '\n' : '') + '    };\n' +
                    "    const SPHERE_COLOR = '" + sphereColor + "';";
            };

            const capture = key => {
                if (!current) return;
                const viewer = current.viewer;
                const orbit = viewer.getCameraOrbit();
                const target = viewer.getCameraTarget();
                views[key] = {
                    orbit: (orbit.theta * 180 / Math.PI).toFixed(1) + 'deg ' +
                        (orbit.phi * 180 / Math.PI).toFixed(1) + 'deg ' +
                        orbit.radius.toFixed(1) + 'm',
                    target: target.x.toFixed(1) + 'm ' + target.y.toFixed(1) +
                        'm ' + target.z.toFixed(1) + 'm',
                    fov: viewer.getFieldOfView().toFixed(1) + 'deg',
                    orient: current.gizmo ? current.gizmo.orient() : undefined,
                };
                serialize();
            };

            panel.querySelector('[data-capture]').addEventListener('click',
                () => { if (openKey) capture(openKey); });
            panel.querySelector('[data-capture-all]').addEventListener('click',
                () => capture('*'));
            colorInput.addEventListener('input', () => {
                sphereColor = colorInput.value;
                applyMatteAndOverlays();
                serialize();
            });
            panel.querySelector('[data-copy]').addEventListener('click', () => {
                const note = panel.querySelector('.quiz-dev-copied');
                const show = () => {
                    note.hidden = false;
                    setTimeout(() => { note.hidden = true; }, 1500);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(output.value).then(show);
                } else {
                    output.select();
                    document.execCommand('copy');
                    show();
                }
            });
            serialize();
        }

        if (opts.autoOpen) buildExpansion(opts.autoOpen);
        // Handle for page-level controls (the animal selector closes all
        // dropdowns so the next open rebuilds against the new namespace).
        return { closeAll };
    };

    // ---- Page configs ----
    // Preload only each row's default model; every other step loads on
    // demand the first time its slider reaches it. With ~500 GLBs on this
    // page, preloading the full library (~200 MB) is no longer viable.
    const socketPreload =
        Object.values(SOCKET_VARS).map(cfg => cfg.file(cfg.def));
    // The Solid Animal and Socket Attachment Surface rows are removed from
    // the block, so SOCKET_MESH_VARS is not passed and the Billie meshes
    // are not preloaded. Restore by passing meshVars: SOCKET_MESH_VARS and
    // re-adding the rows in ntop-socket-creation.html.
    const socketBlockHandle = initBlock({
        blockId: 'socket-lattice-block',
        vars: SOCKET_VARS,
        overlays: SOCKET_OVERLAYS,
        defaultViews: DEFAULT_VIEWS,
        sphereColor: SPHERE_COLOR,
        preloadUrls: socketPreload,
    });

    // ---- Socket & Interface Cap block ----
    // The Interface Cap joins the lattice socket to the mechanical socket.
    // Chihuahua sweep exports (July 19). Non-swept inputs sit at the
    // notebook baseline: IntPos (-49.9, -110, 165), Lateral -152, Medial 2,
    // Rotation -15, Adjust (0, 0, 20), blend radii 12/6. The blend point
    // sweeps were run at Max Blend Radius 20 / Min Blend Radius 5 so the
    // moving blend is easier to see. Angle sweeps cover the full circle,
    // so their 0deg default differs from the baseline angles.
    const INTERFACE_VARS = {
        'lateral-angle': {
            title: 'Lateral Angle',
            type: 'slider',
            min: 0, max: 360, step: 10, def: 0, unit: 'deg',
            file: v => AP() + 'lateralangle-' + pad3(v) + '.glb',
            desc: 'Rotates the interface cap about the lateral rotation axis. The full sweep runs 0-360 degrees; the design baseline is -152 (equivalently 208) degrees.',
        },
        'medial-angle': {
            title: 'Medial Angle',
            type: 'slider',
            min: 0, max: 360, step: 10, def: 0, unit: 'deg',
            file: v => AP() + 'medialangle-' + pad3(v) + '.glb',
            desc: 'Rotates the interface cap about the medial direction. The design baseline is 2 degrees.',
        },
        'interface-rotation': {
            title: 'Interface Rotation',
            type: 'slider',
            min: 0, max: 360, step: 10, def: 0, unit: 'deg',
            file: v => AP() + 'ifacerot-' + pad3(v) + '.glb',
            desc: 'Spins the interface cap about its own axis. The design baseline is -15 (equivalently 345) degrees.',
        },
        'interface-position-y': {
            title: 'Interface Position Y',
            type: 'slider',
            min: -200, max: 0, step: 10, def: -110, unit: 'mm',
            file: v => AP() + 'ifacepos-y-' + pad3(Math.abs(v)) + '.glb',
            desc: 'Moves the whole interface along the Y axis. X and Z are fixed at -49.9 and 165 mm.',
        },
        'interface-position-z': {
            title: 'Interface Position Z',
            type: 'slider',
            min: 165, max: 355, step: 10, def: 165, unit: 'mm',
            file: v => AP() + 'ifacepos-z-' + pad3(v) + '.glb',
            desc: 'Moves the whole interface along the Z axis. X and Y are fixed at -49.9 and -110 mm.',
        },
        'interface-x': {
            title: 'Interface X Adjust',
            type: 'slider',
            min: -50, max: 50, step: 5, def: 0, unit: 'mm',
            file: v => AP() + 'ifacexadj-' + signed2(v) + '.glb',
            desc: 'Shifts the interface cap along the X axis.',
        },
        'interface-y': {
            title: 'Interface Y Adjust',
            type: 'slider',
            min: -50, max: 50, step: 5, def: 0, unit: 'mm',
            file: v => AP() + 'ifaceyadj-' + signed2(v) + '.glb',
            desc: 'Shifts the interface cap along the Y axis.',
        },
        'interface-z': {
            title: 'Interface Z Adjust',
            type: 'slider',
            min: -50, max: 50, step: 5, def: 20, unit: 'mm',
            file: v => AP() + 'ifacezadj-' + signed2(v) + '.glb',
            desc: 'Shifts the interface cap along the Z axis. The design baseline is 20 mm.',
        },
        'max-blend-radius': {
            title: 'Max Blend Radius',
            type: 'slider',
            min: 0, max: 30, step: 2, def: 12, unit: 'mm',
            file: v => AP() + 'maxblendrad-' + pad2(v) + '.glb',
            desc: 'Sets the largest fillet radius where the cap meets the socket.',
        },
        'min-blend-radius': {
            title: 'Min Blend Radius',
            type: 'slider',
            min: 0, max: 30, step: 2, def: 6, unit: 'mm',
            file: v => AP() + 'minblendrad-' + pad2(v) + '.glb',
            desc: 'Sets the smallest fillet radius where the cap meets the socket.',
        },
        'max-blend-point-y': {
            title: 'Max Blend Point Y',
            type: 'slider',
            min: -100, max: -50, step: 10, def: -100, unit: 'mm',
            file: v => AP() + 'maxblendpt-y-' + pad3(Math.abs(v)) + '.glb',
            desc: 'Moves the point of maximum blend along the Y axis (X and Z fixed at -60.1 and 183 mm). Shown with blend radii fixed at 20 / 5 mm.',
        },
        'max-blend-point-z': {
            title: 'Max Blend Point Z',
            type: 'slider',
            min: 130, max: 230, step: 10, def: 180, unit: 'mm',
            file: v => AP() + 'maxblendpt-z-' + pad3(v) + '.glb',
            desc: 'Moves the point of maximum blend along the Z axis (X and Y fixed at -60.1 and -122 mm). Shown with blend radii fixed at 20 / 5 mm.',
        },
        'min-blend-point-y': {
            title: 'Min Blend Point Y',
            type: 'slider',
            min: -100, max: -50, step: 10, def: -100, unit: 'mm',
            file: v => AP() + 'minblendpt-y-' + pad3(Math.abs(v)) + '.glb',
            desc: 'Moves the point of minimum blend along the Y axis (X and Z fixed at -50.9 and 145 mm). Shown with blend radii fixed at 20 / 5 mm.',
        },
        'min-blend-point-z': {
            title: 'Min Blend Point Z',
            type: 'slider',
            min: 90, max: 190, step: 10, def: 140, unit: 'mm',
            file: v => AP() + 'minblendpt-z-' + pad3(v) + '.glb',
            desc: 'Moves the point of minimum blend along the Z axis (X and Y fixed at -50.9 and -113 mm). Shown with blend radii fixed at 20 / 5 mm.',
        },
    };
    const interfacePreload =
        Object.values(INTERFACE_VARS).map(cfg => cfg.file(cfg.def));
    const interfaceBlockHandle = initBlock({
        blockId: 'interface-cap-block',
        vars: INTERFACE_VARS,
        overlays: [],
        defaultViews: {},
        preloadUrls: interfacePreload,
    });

    // ---- Attachment block ----
    // Screws the finished socket to the animal. Chihuahua sweep exports
    // (July 19); non-swept inputs sit at the notebook baseline (Attach Dia
    // 5, Wall 3, Head Dia 7, Head Height 4, Shaft 4, Hole Blend 3). Every
    // GLB bundles an overlay-sphere mesh marking the six attachment points.
    // Nozzle Diameter and Hole Cut Depth have no sweep yet and keep the
    // not-uploaded note. ntop-screw-00..06.glb (ISO 4762 M1.6-M6 ladder)
    // are exported and committed but wait on the button-group control.
    const ATTACH_VARS = {
        'attach-points-drop': {
            title: 'Attachment Points Drop',
            type: 'slider',
            min: 0, max: 100, step: 5, def: 0, unit: 'mm',
            file: v => AP() + 'attachptsdrop-' + pad3(v) + '.glb',
            desc: 'Lowers all six attachment points together along Z, keeping their X and Y positions. Toggle the Attachment Point Spheres to see the points themselves.',
        },
        'attach-diameter': {
            title: 'Attach Diameter',
            type: 'slider',
            min: 1, max: 29, step: 2, def: 5, unit: 'mm',
            file: v => AP() + 'attachdia-' + pad2(v) + '.glb',
            desc: 'Sets the diameter of each attachment pad.',
        },
        'normal-wall': {
            title: 'Normal Wall Distance',
            type: 'slider',
            min: 1, max: 15, step: 1, def: 3, unit: 'mm',
            file: v => AP() + 'wallthick-' + pad2(v) + '.glb',
            desc: 'Sets how far the attachment wall extends along the surface normal.',
        },
        'screw-head-diameter': {
            title: 'Screw Head Diameter',
            type: 'slider',
            min: 1, max: 15, step: 1, def: 7, unit: 'mm',
            file: v => AP() + 'headdia-' + pad2(v) + '.glb',
            desc: 'Sets the countersink diameter for the screw head.',
        },
        'screw-head-height': {
            title: 'Screw Head Height',
            type: 'slider',
            min: 1, max: 15, step: 1, def: 4, unit: 'mm',
            file: v => AP() + 'headheight-' + pad2(v) + '.glb',
            desc: 'Sets the countersink depth for the screw head.',
        },
        'screw-shaft-diameter': {
            title: 'Screw Shaft Diameter',
            type: 'slider',
            min: 1, max: 15, step: 1, def: 4, unit: 'mm',
            file: v => AP() + 'shaftdia-' + pad2(v) + '.glb',
            desc: 'Sets the clearance hole diameter for the screw shaft.',
        },
        'hole-blend-radius': {
            title: 'Hole Blend Radius',
            type: 'slider',
            // baseline is 3 mm but the sweep grid is even, so default to 4
            min: 0, max: 30, step: 2, def: 4, unit: 'mm',
            file: v => AP() + 'holeblend-' + pad2(v) + '.glb',
            desc: 'Sets the fillet radius around each screw hole.',
        },
        'nozzle-diameter': {
            title: 'Nozzle Diameter',
            type: 'slider',
            min: 0, max: 20, step: 2, def: 10, unit: 'mm',
            file: v => AP() + 'attach-nozzle-' + pad2(v) + '.glb',
            desc: 'Sets the nozzle diameter used for the attachment geometry.',
        },
        'hole-cut-depth': {
            title: 'Hole Cut Depth',
            type: 'slider',
            min: 0, max: 20, step: 2, def: 10, unit: 'mm',
            file: v => AP() + 'attach-holecut-' + pad2(v) + '.glb',
            desc: 'Sets how deep each screw hole is cut into the socket.',
        },
    };
    const attachPreload =
        Object.values(ATTACH_VARS).map(cfg => cfg.file(cfg.def));
    const attachBlockHandle = initBlock({
        blockId: 'attachment-block',
        vars: ATTACH_VARS,
        overlays: [
            { name: 'overlay-sphere', label: 'Attachment Point Spheres' },
        ],
        defaultViews: {},
        preloadUrls: attachPreload,
    });

    // Paw lattice page. Sweeps from the July 9 exports; the baseline is
    // Curve Depth -35 / Bottom Length 120 / Cell Size 8 / Hexagonal.
    const PAW_VARS = {
        'cell-size': {
            title: 'Cell Size',
            type: 'slider',
            min: 5, max: 15, step: 1, def: 8, unit: 'mm',
            file: v => 'ntop-paw-cellsize-' + pad2(v) + '.glb',
            desc: 'Sets the size of each honeycomb cell across the paw. Smaller cells give a denser, stiffer tread; larger cells are more open and compliant.',
        },
        'curve-depth': {
            title: 'Curve Depth',
            type: 'slider',
            min: -35, max: -14, step: 1, def: -35, unit: 'mm',
            file: v => 'ntop-paw-curvedepth-' + pad2(Math.abs(v)) + '.glb',
            desc: 'Sets how deeply the bottom surface of the paw curves.',
        },
        'bottom-length': {
            title: 'Bottom Length',
            type: 'slider',
            min: 30, max: 120, step: 5, def: 120, unit: 'mm',
            file: v => 'ntop-paw-bottomlength-' + String(v).padStart(3, '0') + '.glb',
            desc: 'Sets the length of the flat bottom section of the paw.',
        },
    };
    const PAW_MESH_VARS = {
        'unit-cell': {
            title: 'Unit Cell',
            desc: 'Chooses the lattice pattern the paw is built from. Pick a unit cell to compare the two structures (the square honeycomb is shown at its 12 mm cell size).',
            options: [
                { label: 'Square Honey Comb', file: 'ntop-paw-unitcell-square.glb' },
                { label: 'Hexagonal Honey Comb', file: 'ntop-paw-unitcell-hex.glb' },
            ],
        },
    };
    // Default camera view for the paw demos, captured with the ?dev=1
    // panel. The unit-cell models share the paw coordinate space, so the
    // view applies to the chooser too.
    const PAW_VIEW = {
        orbit: '97.4deg 89.1deg 275.3m',
        target: '0.4m 16.3m -4.2m',
        fov: '30.0deg',
        orient: '89.91deg -81.68deg -83.34deg',
    };
    const pawPreload =
        Object.values(PAW_VARS).map(cfg => cfg.file(cfg.def));
    PAW_MESH_VARS['unit-cell'].options.forEach(o => pawPreload.push(o.file));
    initBlock({
        blockId: 'paw-lattice-block',
        vars: PAW_VARS,
        meshVars: PAW_MESH_VARS,
        overlays: [],
        defaultViews: {
            'unit-cell': PAW_VIEW,
            'cell-size': PAW_VIEW,
            'curve-depth': PAW_VIEW,
            'bottom-length': PAW_VIEW,
        },
        preloadUrls: pawPreload,
    });

    // ---- Animal selector wiring ----
    // Buttons live in #animal-select on the socket-creation page. Switching
    // animals closes every open dropdown (so the next open rebuilds its
    // viewer against the new namespace) and flips the active button. Blocks
    // whose libraries are not exported yet degrade to the not-uploaded note.
    const animalSelect = document.getElementById('animal-select');
    if (animalSelect) {
        const note = document.getElementById('animal-select-note');
        Object.keys(ANIMALS).forEach(key => {
            const a = ANIMALS[key];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'model-toggle-btn animal-btn' +
                (key === activeAnimal ? ' active' : '');
            btn.innerHTML = a.label + '<span class="animal-btn-sub">' +
                a.sub + '</span>';
            btn.addEventListener('click', () => {
                if (activeAnimal === key) return;
                activeAnimal = key;
                [socketBlockHandle, interfaceBlockHandle, attachBlockHandle]
                    .forEach(h => { if (h && h.closeAll) h.closeAll(); });
                [...animalSelect.querySelectorAll('.animal-btn')].forEach(
                    b => b.classList.toggle('active', b === btn));
                if (note) {
                    note.hidden = a.ready;
                    note.textContent = a.ready ? '' : 'The ' + a.sub +
                        ' model library has not been generated yet - every ' +
                        'demo will show a "not uploaded yet" note until its ' +
                        'sweeps are exported and converted.';
                }
            });
            animalSelect.appendChild(btn);
        });
    }

    // Warm the cache with each block's default models only (plus any
    // statically referenced viewers); the rest of the library loads on
    // demand as sliders move. A hidden viewer walks each GLB once, warming
    // model-viewer's parsed-model cache. Files that don't exist yet are
    // skipped via a HEAD check.
    document.querySelectorAll('.model-toggle-btn[data-model]').forEach(btn => {
        referencedUrls.add(btn.getAttribute('data-model'));
    });
    document.querySelectorAll('model-viewer[src]').forEach(mv => {
        mv.setAttribute('loading', 'eager');
        referencedUrls.add(mv.getAttribute('src'));
    });
    if (referencedUrls.size < 2) return;
    customElements.whenDefined('model-viewer').then(async () => {
        const checks = await Promise.allSettled([...referencedUrls].map(url =>
            fetch(url, { method: 'HEAD' }).then(r => ({ url, ok: r.ok }))
        ));
        const urls = checks
            .filter(c => c.status === 'fulfilled' && c.value.ok)
            .map(c => c.value.url);
        if (urls.length === 0) return;
        const MV = customElements.get('model-viewer');
        // Roomy cache so models fetched on demand during slider scrubbing
        // stay parsed instead of evicting each other.
        MV.modelCacheSize = Math.max(MV.modelCacheSize || 0, 600);
        const preloader = document.createElement('model-viewer');
        preloader.setAttribute('loading', 'eager');
        preloader.setAttribute('aria-hidden', 'true');
        preloader.style.cssText =
            'position:fixed;left:-9999px;top:0;width:2px;height:2px;pointer-events:none;';
        document.body.appendChild(preloader);
        // The `load` event never fires for offscreen viewers (it waits for
        // reveal), so poll the `loaded` property instead.
        for (const url of urls) {
            preloader.setAttribute('src', url);
            const t0 = Date.now();
            // let the element register the src change before polling
            await new Promise(r => setTimeout(r, 150));
            while (!preloader.loaded && Date.now() - t0 < 20000) {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        preloader.remove();
    });
})();

// Force matte material on all model-viewer instances so lighting is purely
// diffuse (avoids one-side-blown-out highlights on white meshes). Materials
// named overlay-* keep their baked color and alpha; the socket-lattice
// block manages those (toggles and sphere color).
document.querySelectorAll('model-viewer').forEach(mv => {
    const applyMatte = () => {
        if (!mv.model) return;
        mv.model.materials.forEach(material => {
            try {
                const pbr = material.pbrMetallicRoughness;
                pbr.setRoughnessFactor(1.0);
                pbr.setMetallicFactor(0.0);
                if (!material.name || material.name.indexOf('overlay-') !== 0) {
                    pbr.setBaseColorFactor([0.9, 0.9, 0.9, 1.0]);
                }
            } catch (e) {}
        });
    };
    mv.addEventListener('load', applyMatte);
});

// Canine anatomy quiz (full skeleton + thoracic limb; bones and joints)
(() => {
    const app = document.getElementById('anatomy-quiz-app');
    if (!app) return;

    // Each quiz has its own base image; marker positions are percentages
    // (left, top) of that image. Coordinates were verified by overlay.
    const QUIZZES = {
        'bones': {
            image: 'anatomy-dog-skeleton.svg', noun: 'bone',
            items: [
                { name: 'Cranium (skull)', x: 20.5, y: 27.5 },
                { name: 'Mandible', x: 18.5, y: 35.0 },
                { name: 'Atlas', x: 28.5, y: 33.0 },
                { name: 'Scapula', x: 39.0, y: 38.0 },
                { name: 'Humerus', x: 41.0, y: 46.5 },
                { name: 'Radius', x: 40.5, y: 66.0 },
                { name: 'Carpal bones', x: 36.0, y: 81.0 },
                { name: 'Ribs', x: 52.0, y: 44.0 },
                { name: 'Sternum', x: 44.5, y: 59.0 },
                { name: 'Pelvis', x: 72.0, y: 42.0 },
                { name: 'Femur', x: 71.0, y: 52.0 },
                { name: 'Patella', x: 69.0, y: 57.5 },
                { name: 'Tibia', x: 76.0, y: 62.0 },
                { name: 'Calcaneus', x: 80.0, y: 73.0 },
                { name: 'Caudal vertebrae (tail)', x: 88.0, y: 18.0 },
            ],
        },
        'joints': {
            image: 'anatomy-dog-skeleton.svg', noun: 'joint',
            items: [
                { name: 'Temporomandibular joint', x: 25.5, y: 32.0 },
                { name: 'Shoulder joint', x: 40.0, y: 44.0 },
                { name: 'Elbow joint', x: 40.5, y: 58.0 },
                { name: 'Carpus (wrist)', x: 36.5, y: 78.0 },
                { name: 'Hip joint', x: 73.0, y: 45.5 },
                { name: 'Stifle (knee)', x: 70.0, y: 58.5 },
                { name: 'Hock (tarsus)', x: 80.0, y: 71.0 },
            ],
        },
        'thoracic-bones': {
            image: 'anatomy-thoracic-limb.png', noun: 'bone',
            items: [
                { name: 'Scapula', x: 46.0, y: 19.0, points: [[52, 6], [60, 14], [59, 24], [52, 32], [44, 34], [38, 29], [41, 17], [46, 9]], smooth: 0.6 },
                { name: 'Humerus', x: 47.0, y: 40.0 },
                { name: 'Radius', x: 40.0, y: 56.0 },
                { name: 'Ulna', x: 46.0, y: 54.0 },
                { name: 'Carpal bones', x: 43.0, y: 71.0 },
                { name: 'Metacarpal bones', x: 38.0, y: 79.0 },
                { name: 'Phalanges', x: 32.0, y: 86.0 },
            ],
        },
        'thoracic-joints': {
            image: 'anatomy-thoracic-limb.png', noun: 'joint',
            items: [
                { name: 'Shoulder joint', x: 41.0, y: 24.0 },
                { name: 'Elbow joint', x: 49.0, y: 46.0 },
                { name: 'Carpus (wrist)', x: 43.0, y: 70.0 },
                { name: 'Metacarpophalangeal joint', x: 35.5, y: 81.5 },
                { name: 'Proximal interphalangeal joint', x: 31.5, y: 85.0 },
                { name: 'Distal interphalangeal joint', x: 29.0, y: 87.5 },
            ],
        },
    };

    // Closed Catmull-Rom spline rendered as cubic beziers. `smooth` 0..1:
    // 0 gives straight polygon edges, 1 a fully rounded curve through the
    // same control points.
    function smoothPath(pts, smooth) {
        if (!pts || pts.length < 3) return '';
        const s = Math.max(0, Math.min(1, smooth == null ? 0.6 : smooth)) / 6 * 4;
        const n = pts.length;
        const at = i => pts[(i + n) % n];
        let d = 'M ' + at(0)[0] + ' ' + at(0)[1];
        for (let i = 0; i < n; i++) {
            const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
            const c1x = p1[0] + (p2[0] - p0[0]) * s / 4;
            const c1y = p1[1] + (p2[1] - p0[1]) * s / 4;
            const c2x = p2[0] - (p3[0] - p1[0]) * s / 4;
            const c2y = p2[1] - (p3[1] - p1[1]) * s / 4;
            d += ' C ' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) +
                 ', ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) +
                 ', ' + p2[0] + ' ' + p2[1];
        }
        return d + ' Z';
    }

    const imageEl = document.getElementById('quiz-image');
    const marker = document.getElementById('quiz-marker');
    const highlight = document.getElementById('quiz-highlight');
    const promptEl = document.getElementById('quiz-prompt');
    const optionsEl = document.getElementById('quiz-options');
    const feedbackEl = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('quiz-next');
    const numEl = document.getElementById('quiz-num');
    const totalEl = document.getElementById('quiz-total');
    const scoreEl = document.getElementById('quiz-score');
    const resultEl = document.getElementById('quiz-result');
    const resultScoreEl = document.getElementById('quiz-result-score');
    const restartBtn = document.getElementById('quiz-restart');
    const tabs = [...document.querySelectorAll('.quiz-tab')];

    // Marker position editor: open anatomy-quiz.html?dev=1 to drag markers
    // around and copy the updated coordinate block back into QUIZZES above.
    if (new URLSearchParams(window.location.search).has('dev')) {
        const frame = imageEl.parentElement;
        const panel = app.querySelector('.quiz-panel');
        app.classList.add('dev');
        panel.hidden = true;
        marker.hidden = true;

        const devPanel = document.createElement('div');
        devPanel.className = 'quiz-dev-panel';
        devPanel.innerHTML =
            '<p class="quiz-dev-help"><strong>Shape editor.</strong> Drag a marker to ' +
            'move it; drag the square handle to stretch it into an ellipse and the ' +
            'gold stem to rotate. <strong>Trace a shape:</strong> select a marker, ' +
            'press <em>Trace shape</em>, then click on the bone. The first point ' +
            'stays a circle; a second click turns it into an outline. Drag any ' +
            'control point to adjust, click a square segment handle to insert a ' +
            'point, double-click a point to delete it. Copy the code below over ' +
            'the matching <code>items:</code> block in <code>script.js</code>.</p>' +
            '<div class="quiz-dev-actions">' +
              '<button type="button" class="quiz-dev-trace">Trace shape on selected</button>' +
              '<button type="button" class="quiz-dev-undo">Delete last point</button>' +
              '<button type="button" class="quiz-dev-clearpoly">Clear shape</button>' +
              '<button type="button" class="quiz-dev-resetview">Reset view (zoom: scroll, pan: drag)</button>' +
            '</div>' +
            '<label class="quiz-dev-smooth">Smoothing ' +
              '<input type="range" min="0" max="100" step="5" value="60" disabled>' +
              '<output>60</output>' +
            '</label>' +
            '<p class="quiz-dev-hint quiz-dev-tracestatus"></p>' +
            '<textarea class="quiz-dev-output" readonly spellcheck="false"></textarea>' +
            '<button type="button" class="quiz-dev-copy">Copy code</button>' +
            '<span class="quiz-dev-copied" hidden>Copied!</span>';
        app.after(devPanel);
        const output = devPanel.querySelector('.quiz-dev-output');
        const copyBtn = devPanel.querySelector('.quiz-dev-copy');
        const copiedNote = devPanel.querySelector('.quiz-dev-copied');
        const traceBtn = devPanel.querySelector('.quiz-dev-trace');
        const undoBtn = devPanel.querySelector('.quiz-dev-undo');
        const clearPolyBtn = devPanel.querySelector('.quiz-dev-clearpoly');
        const traceStatus = devPanel.querySelector('.quiz-dev-tracestatus');
        const smoothSlider = devPanel.querySelector('.quiz-dev-smooth input');
        const smoothOut = devPanel.querySelector('.quiz-dev-smooth output');
        const devPolys = document.getElementById('quiz-dev-polys');
        const devMids = document.getElementById('quiz-dev-mids');
        const devVerts = document.getElementById('quiz-dev-verts');
        const SVGNS = 'http://www.w3.org/2000/svg';
        const roundP = n => Math.round(n * 10) / 10;
        const clampP = n => Math.min(99.5, Math.max(0.5, n));

        // --- Zoom & pan (scroll to zoom at the cursor, drag to pan) ---
        // The whole frame (image + overlay + markers) is scaled with a CSS
        // transform, so every existing percent-coordinate computation keeps
        // working: getBoundingClientRect() reflects the transform.
        const viewport = frame.parentElement;
        const resetViewBtn = devPanel.querySelector('.quiz-dev-resetview');
        viewport.classList.add('quiz-zoomable');
        let zoom = 1, panX = 0, panY = 0;
        let panMoved = false; // suppresses the trace click right after a pan

        function applyView() {
            const vw = viewport.clientWidth, vh = viewport.clientHeight;
            // keep the image covering the viewport
            panX = Math.min(0, Math.max(vw - vw * zoom, panX));
            panY = Math.min(0, Math.max(vh - vh * zoom, panY));
            frame.style.transform =
                'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
        }

        viewport.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = viewport.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const prev = zoom;
            zoom = Math.min(8, Math.max(1, zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
            if (zoom === prev) return;
            // keep the point under the cursor fixed while zooming
            panX = mx - (mx - panX) * (zoom / prev);
            panY = my - (my - panY) * (zoom / prev);
            if (zoom === 1) { panX = 0; panY = 0; }
            applyView();
        }, { passive: false });

        viewport.addEventListener('pointerdown', e => {
            // markers/vertices/midpoints stopPropagation in their own
            // handlers, so reaching here means the press is on open canvas.
            panMoved = false;
            const startX = e.clientX, startY = e.clientY;
            const startPanX = panX, startPanY = panY;
            const onMove = ev => {
                const dx = ev.clientX - startX, dy = ev.clientY - startY;
                if (!panMoved && Math.hypot(dx, dy) < 4) return;
                panMoved = true;
                viewport.classList.add('panning');
                panX = startPanX + dx;
                panY = startPanY + dy;
                applyView();
            };
            const onUp = () => {
                viewport.removeEventListener('pointermove', onMove);
                viewport.removeEventListener('pointerup', onUp);
                viewport.classList.remove('panning');
            };
            try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
            viewport.addEventListener('pointermove', onMove);
            viewport.addEventListener('pointerup', onUp);
        });

        resetViewBtn.addEventListener('click', () => {
            zoom = 1; panX = 0; panY = 0;
            applyView();
        });

        let devKey = 'bones';
        let selectedItem = null;
        let tracing = false;

        const hasShape = item => item.points && item.points.length >= 3;

        function syncSmoothUI() {
            const on = !!(selectedItem && hasShape(selectedItem));
            smoothSlider.disabled = !on;
            const v = on ? Math.round((selectedItem.smooth == null ? 0.6 : selectedItem.smooth) * 100) : 60;
            smoothSlider.value = v;
            smoothOut.textContent = v;
        }

        // Draw every item's traced shape; the selected one also gets vertex
        // control points and midpoint insert handles.
        function renderPolys() {
            const cfg = QUIZZES[devKey];
            devPolys.innerHTML = '';
            devMids.innerHTML = '';
            devVerts.innerHTML = '';
            cfg.items.forEach(item => {
                if (!item.points || item.points.length < 2) return;
                const path = document.createElementNS(SVGNS, 'path');
                const pts = item.points;
                const d = pts.length >= 3
                    ? smoothPath(pts, item.smooth)
                    : 'M ' + pts.map(p => p.join(' ')).join(' L ');
                path.setAttribute('d', d);
                if (item === selectedItem) path.classList.add('selected');
                devPolys.appendChild(path);
            });
            if (selectedItem && selectedItem.points && selectedItem.points.length) {
                const pts = selectedItem.points;
                // Midpoint insert handles (only for closed shapes)
                if (pts.length >= 3) {
                    pts.forEach((p, i) => {
                        const q = pts[(i + 1) % pts.length];
                        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
                        const r = document.createElementNS(SVGNS, 'rect');
                        const S = 1.6;
                        r.setAttribute('x', mx - S / 2);
                        r.setAttribute('y', my - S / 2);
                        r.setAttribute('width', S);
                        r.setAttribute('height', S);
                        r.addEventListener('pointerdown', ev => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            pts.splice(i + 1, 0, [roundP(mx), roundP(my)]);
                            renderPolys();
                            serialize();
                        });
                        devMids.appendChild(r);
                    });
                }
                // Vertex control points
                pts.forEach((p, i) => {
                    const c = document.createElementNS(SVGNS, 'circle');
                    c.setAttribute('cx', p[0]);
                    c.setAttribute('cy', p[1]);
                    c.setAttribute('r', '1.4');
                    c.addEventListener('dblclick', ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        pts.splice(i, 1);
                        if (pts.length === 0) delete selectedItem.points;
                        renderPolys();
                        serialize();
                        syncSmoothUI();
                    });
                    c.addEventListener('pointerdown', ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        c.classList.add('active');
                        c.setPointerCapture(ev.pointerId);
                        const rect = frame.getBoundingClientRect();
                        const onMove = e => {
                            const np = [
                                roundP(clampP((e.clientX - rect.left) / rect.width * 100)),
                                roundP(clampP((e.clientY - rect.top) / rect.height * 100)),
                            ];
                            pts[i] = np;
                            c.setAttribute('cx', np[0]);
                            c.setAttribute('cy', np[1]);
                            // redraw paths + midpoints live, keep this circle
                            const cfg2 = QUIZZES[devKey];
                            devPolys.innerHTML = '';
                            cfg2.items.forEach(item => {
                                if (!item.points || item.points.length < 2) return;
                                const path = document.createElementNS(SVGNS, 'path');
                                const d2 = item.points.length >= 3
                                    ? smoothPath(item.points, item.smooth)
                                    : 'M ' + item.points.map(pp => pp.join(' ')).join(' L ');
                                path.setAttribute('d', d2);
                                if (item === selectedItem) path.classList.add('selected');
                                devPolys.appendChild(path);
                            });
                            serialize();
                        };
                        const onUp = () => {
                            c.classList.remove('active');
                            c.removeEventListener('pointermove', onMove);
                            c.removeEventListener('pointerup', onUp);
                            renderPolys();
                        };
                        c.addEventListener('pointermove', onMove);
                        c.addEventListener('pointerup', onUp);
                    });
                    devVerts.appendChild(c);
                });
            }
        }

        const serialize = () => {
            const cfg = QUIZZES[devKey];
            const lines = cfg.items.map(it => {
                let s = "                { name: '" + it.name.replace(/'/g, "\\'") +
                    "', x: " + it.x.toFixed(1) + ", y: " + it.y.toFixed(1);
                if (it.points && it.points.length >= 3) {
                    s += ', points: [' +
                        it.points.map(p => '[' + p[0] + ', ' + p[1] + ']').join(', ') + ']';
                    s += ', smooth: ' + (it.smooth == null ? 0.6 : it.smooth);
                } else {
                    if (it.w && it.h) {
                        s += ', w: ' + it.w.toFixed(1) + ', h: ' + it.h.toFixed(1);
                    }
                    if (it.rot) s += ', rot: ' + it.rot;
                }
                return s + ' },';
            });
            output.value =
                "            // '" + devKey + "' items\n" +
                '            items: [\n' + lines.join('\n') + '\n            ],';
        };

        const renderDev = () => {
            const cfg = QUIZZES[devKey];
            if (imageEl.getAttribute('src') !== cfg.image) {
                imageEl.setAttribute('src', cfg.image);
            }
            frame.querySelectorAll('.dev-marker').forEach(el => el.remove());
            cfg.items.forEach(item => {
                const dot = document.createElement('span');
                dot.className = 'quiz-marker dev-marker';
                if (item === selectedItem) dot.classList.add('selected');
                dot.title = item.name;
                const label = document.createElement('span');
                label.className = 'dev-marker-label';
                label.textContent = item.name;
                const resizeHandle = document.createElement('span');
                resizeHandle.className = 'dev-handle dev-resize';
                resizeHandle.title = 'Drag to resize';
                const rotateHandle = document.createElement('span');
                rotateHandle.className = 'dev-handle dev-rotate';
                rotateHandle.title = 'Drag to rotate';
                dot.append(label, resizeHandle, rotateHandle);

                const round1 = n => Math.round(n * 10) / 10;
                const clampPct = n => Math.min(99.5, Math.max(0.5, n));
                const applyShape = () => {
                    dot.style.left = item.x + '%';
                    dot.style.top = item.y + '%';
                    dot.style.width = item.w ? item.w + '%' : '';
                    dot.style.height = item.h ? item.h + '%' : '';
                    dot.style.setProperty('--marker-rot', (item.rot || 0) + 'deg');
                };
                const select = () => {
                    frame.querySelectorAll('.dev-marker.selected')
                        .forEach(el => el.classList.remove('selected'));
                    dot.classList.add('selected');
                    selectedItem = item;
                    renderPolys();
                    syncSmoothUI();
                };
                const center = rect => [
                    rect.left + item.x / 100 * rect.width,
                    rect.top + item.y / 100 * rect.height,
                ];
                // One drag-loop wiring for all three behaviors: `move` gets
                // the pointer event plus the frame rect, `done` restores the
                // label after the drag.
                const drag = (el, move) => {
                    el.addEventListener('pointerdown', e => {
                        if (el === dot && e.target !== dot && e.target !== label) return;
                        e.preventDefault();
                        e.stopPropagation();
                        select();
                        el.setPointerCapture(e.pointerId);
                        const onMove = ev => {
                            move(ev, frame.getBoundingClientRect());
                            applyShape();
                            serialize();
                        };
                        const onUp = () => {
                            el.removeEventListener('pointermove', onMove);
                            el.removeEventListener('pointerup', onUp);
                            label.textContent = item.name;
                        };
                        el.addEventListener('pointermove', onMove);
                        el.addEventListener('pointerup', onUp);
                    });
                };

                drag(dot, (ev, rect) => {
                    item.x = round1(clampPct((ev.clientX - rect.left) / rect.width * 100));
                    item.y = round1(clampPct((ev.clientY - rect.top) / rect.height * 100));
                    // a one-point shape is the circle itself: keep them in sync
                    if (item.points && item.points.length === 1) {
                        item.points[0] = [item.x, item.y];
                    }
                    label.textContent = item.name + ' (' +
                        item.x.toFixed(1) + ', ' + item.y.toFixed(1) + ')';
                });

                // Pointer offset from the center is rotated back into the
                // marker's own frame so resizing tracks the cursor even on
                // rotated highlights.
                drag(resizeHandle, (ev, rect) => {
                    const [cx, cy] = center(rect);
                    const rad = -(item.rot || 0) * Math.PI / 180;
                    const dx = ev.clientX - cx, dy = ev.clientY - cy;
                    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
                    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
                    item.w = round1(Math.min(90, Math.max(1, Math.abs(lx) * 2 / rect.width * 100)));
                    item.h = round1(Math.min(90, Math.max(1, Math.abs(ly) * 2 / rect.height * 100)));
                    label.textContent = item.name + ' (' +
                        item.w.toFixed(1) + ' x ' + item.h.toFixed(1) + ')';
                });

                drag(rotateHandle, (ev, rect) => {
                    const [cx, cy] = center(rect);
                    const ang = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
                    item.rot = Math.round(((ang % 360) + 540) % 360 - 180);
                    if (item.rot === -180) item.rot = 180;
                    label.textContent = item.name + ' (' + item.rot + ' deg)';
                });

                dot.addEventListener('dblclick', () => {
                    delete item.w;
                    delete item.h;
                    delete item.rot;
                    applyShape();
                    serialize();
                });

                applyShape();
                frame.appendChild(dot);
            });
            renderPolys();
            serialize();
        };

        // Click on the image while tracing adds a control point. The first
        // point simply repositions the circle marker (a one-point shape IS
        // the circle); the second click turns it into an outline.
        frame.addEventListener('click', e => {
            if (panMoved) { panMoved = false; return; }
            if (!tracing || !selectedItem) return;
            if (e.target.closest('#quiz-dev-verts')) return;
            if (e.target.closest('#quiz-dev-mids')) return;
            if (e.target.closest('.dev-marker')) return;
            const rect = frame.getBoundingClientRect();
            const x = roundP(clampP((e.clientX - rect.left) / rect.width * 100));
            const y = roundP(clampP((e.clientY - rect.top) / rect.height * 100));
            if (!selectedItem.points) selectedItem.points = [];
            selectedItem.points.push([x, y]);
            if (selectedItem.points.length === 1) {
                // one point = the circle marker, moved to the click
                selectedItem.x = x;
                selectedItem.y = y;
                traceStatus.textContent = 'One point set - still a circle. Click again to grow an outline.';
                renderDev();
            } else if (selectedItem.points.length === 2) {
                traceStatus.textContent = 'Two points - one more click closes an area.';
                renderPolys();
                serialize();
            } else {
                traceStatus.textContent = selectedItem.points.length +
                    ' points. Drag points to adjust, use segment handles to insert, double-click a point to delete.';
                renderPolys();
                serialize();
            }
            syncSmoothUI();
        });

        traceBtn.addEventListener('click', () => {
            if (!selectedItem) {
                traceStatus.textContent = 'Click a marker to select it first.';
                return;
            }
            tracing = !tracing;
            frame.classList.toggle('quiz-tracing', tracing);
            traceBtn.textContent = tracing ? 'Finish tracing' : 'Trace shape on selected';
            traceStatus.textContent = tracing
                ? 'Tracing "' + selectedItem.name + '" - first click places the circle, further clicks grow the outline.'
                : '';
            if (tracing && !selectedItem.points) selectedItem.points = [];
            renderPolys();
        });

        undoBtn.addEventListener('click', () => {
            if (selectedItem && selectedItem.points && selectedItem.points.length) {
                selectedItem.points.pop();
                if (selectedItem.points.length === 0) delete selectedItem.points;
                renderDev();
                syncSmoothUI();
            }
        });

        clearPolyBtn.addEventListener('click', () => {
            if (!selectedItem) return;
            delete selectedItem.points;
            delete selectedItem.smooth;
            tracing = false;
            frame.classList.remove('quiz-tracing');
            traceBtn.textContent = 'Trace shape on selected';
            traceStatus.textContent = '';
            renderDev();
            syncSmoothUI();
        });

        smoothSlider.addEventListener('input', () => {
            if (!selectedItem || !hasShape(selectedItem)) return;
            selectedItem.smooth = Math.round(smoothSlider.value) / 100;
            smoothOut.textContent = smoothSlider.value;
            renderPolys();
            serialize();
        });

        copyBtn.addEventListener('click', () => {
            const show = () => {
                copiedNote.hidden = false;
                setTimeout(() => { copiedNote.hidden = true; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(output.value).then(show);
            } else {
                output.select();
                document.execCommand('copy');
                show();
            }
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.toggle('active', t === tab));
                devKey = QUIZZES[tab.dataset.quiz] ? tab.dataset.quiz : 'bones';
                selectedItem = null;
                tracing = false;
                frame.classList.remove('quiz-tracing');
                traceBtn.textContent = 'Trace shape on selected';
                traceStatus.textContent = '';
                renderDev();
                syncSmoothUI();
            });
        });

        renderDev();
        return;
    }

    let currentKey = 'bones', pool = [], noun = 'bone';
    let order = [], idx = 0, score = 0, answered = false;

    const shuffle = (arr) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    function start(quiz) {
        const cfg = QUIZZES[quiz] || QUIZZES['bones'];
        currentKey = QUIZZES[quiz] ? quiz : 'bones';
        pool = cfg.items;
        noun = cfg.noun;
        if (imageEl.getAttribute('src') !== cfg.image) {
            imageEl.setAttribute('src', cfg.image);
        }
        order = shuffle(pool);
        idx = 0;
        score = 0;
        scoreEl.textContent = '0';
        totalEl.textContent = String(order.length);
        resultEl.hidden = true;
        marker.hidden = false;
        showQuestion();
    }

    // A question is highlighted either by a traced shape (3+ points, drawn
    // as a smoothed closed curve) or the ellipse/dot marker (x, y, w, h, rot).
    function renderShape(q) {
        if (q.points && q.points.length >= 3) {
            highlight.setAttribute('d', smoothPath(q.points, q.smooth));
            marker.hidden = true;
        } else {
            highlight.setAttribute('d', '');
            marker.hidden = false;
            marker.style.left = q.x + '%';
            marker.style.top = q.y + '%';
            marker.style.width = q.w ? q.w + '%' : '';
            marker.style.height = q.h ? q.h + '%' : '';
            marker.style.setProperty('--marker-rot', (q.rot || 0) + 'deg');
        }
    }

    function showQuestion() {
        answered = false;
        feedbackEl.textContent = '';
        feedbackEl.className = 'quiz-feedback';
        nextBtn.hidden = true;
        const q = order[idx];
        numEl.textContent = String(idx + 1);
        renderShape(q);
        promptEl.textContent = 'Which ' + noun + ' is marked?';

        // Build 4 options: the answer plus 3 random distractors from the pool.
        const distractors = shuffle(pool.filter(o => o.name !== q.name)).slice(0, 3);
        const choices = shuffle([q, ...distractors]).map(o => o.name);

        optionsEl.innerHTML = '';
        choices.forEach(name => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option';
            btn.textContent = name;
            btn.addEventListener('click', () => choose(btn, name, q.name));
            optionsEl.appendChild(btn);
        });
    }

    function choose(btn, picked, correct) {
        if (answered) return;
        answered = true;
        const buttons = [...optionsEl.querySelectorAll('.quiz-option')];
        buttons.forEach(b => {
            b.disabled = true;
            if (b.textContent === correct) b.classList.add('correct');
        });
        if (picked === correct) {
            score++;
            scoreEl.textContent = String(score);
            feedbackEl.textContent = 'Correct!';
            feedbackEl.className = 'quiz-feedback correct';
        } else {
            btn.classList.add('wrong');
            feedbackEl.textContent = 'Not quite — it is the ' + correct + '.';
            feedbackEl.className = 'quiz-feedback wrong';
        }
        nextBtn.hidden = false;
    }

    function next() {
        idx++;
        if (idx >= order.length) {
            marker.hidden = true;
            highlight.setAttribute('d', '');
            promptEl.textContent = '';
            optionsEl.innerHTML = '';
            feedbackEl.textContent = '';
            nextBtn.hidden = true;
            resultScoreEl.textContent = 'You scored ' + score + ' / ' + order.length + '.';
            resultEl.hidden = false;
        } else {
            showQuestion();
        }
    }

    nextBtn.addEventListener('click', next);
    restartBtn.addEventListener('click', () => start(currentKey));
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            start(tab.dataset.quiz);
        });
    });

    start('bones');
})();
