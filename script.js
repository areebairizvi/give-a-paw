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

// Interactive Socket Lattice block on the nTop socket creation page, in a
// split layout: the block sits on the left and the demo (title, sliders,
// 3D viewer) stays pinned on the right. Clicking a variable row swaps the
// demo; the Import Mesh rows expand an animal chooser inside the block.
// Model filenames are generated per value; steps whose GLB has not been
// uploaded yet show a note instead of a model. Sweep models are the
// Example Dog socket: baseline Max 10 / Min 12 / Boundary 14 / Count 100.
(() => {
    const block = document.getElementById('socket-lattice-block');
    const viewer = document.getElementById('sl-viewer');
    const referencedUrls = new Set();

    const pad2 = n => String(n).padStart(2, '0');
    const POINT_COUNTS = [10, 20, 40, 60, 80, 100, 120, 140, 160, 180,
        200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400];
    const THICK_STEPS = Array.from({ length: 21 }, (_, i) => i * 2);

    const VARS = {
        'thickest-point': {
            title: 'Thickest Lattice Point',
            type: 'grid',
            desc: 'Sets the location where the socket wall is at its thickest; on this socket the point is (-137.5, -451, -29.83) mm. The sliders offset the point in Y and Z in 5 mm steps. Demo models for this input are still being exported.',
            axes: [
                { key: 'Y', label: 'Y offset', min: -30, max: 30, step: 5, def: 0, unit: 'mm' },
                { key: 'Z', label: 'Z offset', min: -30, max: 30, step: 5, def: 0, unit: 'mm' },
            ],
            file: (y, z) => 'ntop-thickpoint-y' + y + '-z' + z + '.glb',
            rowValue: (y, z) => '-137.5, ' + (-451 + y) + ', ' + (-29.83 + z).toFixed(2),
        },
        'max-thickness': {
            title: 'Max Socket Thickness',
            type: 'slider',
            min: 0, max: 40, step: 2, def: 10, unit: 'mm',
            file: v => 'ntop-maxthick-' + pad2(v) + '.glb',
            desc: 'Sets the upper limit on the socket wall thickness.',
        },
        'min-thickness': {
            title: 'Min Socket Thickness',
            type: 'slider',
            min: 0, max: 40, step: 2, def: 12, unit: 'mm',
            file: v => 'ntop-minthick-' + pad2(v) + '.glb',
            desc: 'Sets the lower limit on the socket wall thickness.',
        },
        'boundary-thickness': {
            title: 'Boundary Lattice Thickness',
            type: 'slider',
            min: 0, max: 40, step: 2, def: 14, unit: 'mm',
            file: v => 'ntop-boundary-' + pad2(v) + '.glb',
            desc: 'Controls how thick the strands are along the outer edge of the lattice. Thicker boundaries give a more rigid rim and a defined silhouette; thinner boundaries blend into the surface lattice and flex more.',
        },
        'point-count': {
            title: 'Lattice Point Count',
            type: 'slider',
            values: POINT_COUNTS, def: 100, unit: '',
            file: v => 'ntop-pointcount-' + String(v).padStart(3, '0') + '.glb',
            desc: 'Controls how densely the lattice is sampled across the surface: a low count yields a sparse, open structure that flexes more freely; a high count yields a finer, denser mesh that is stiffer and distributes load over more contact area.',
        },
    };
    const MESH_VARS = {
        'solid-animal': {
            title: 'Solid Animal',
            desc: 'The cleaned, watertight mesh of the animal\'s residual limb. The lattice socket is grown around this shape. Pick an animal in the block.',
            options: [
                { label: 'Billie', file: 'billie-solid-animal.glb' },
                { label: 'Max', file: null },
                { label: 'Yana', file: null },
            ],
        },
        'attachment-surface': {
            title: 'Socket Attachment Surface',
            desc: 'The region of the limb the socket grips, exported as a separate surface. It defines where the lattice sits on the limb. Pick an animal in the block.',
            options: [
                { label: 'Billie', file: 'billie-attachment-surface.glb' },
                { label: 'Max', file: null },
                { label: 'Yana', file: null },
            ],
        },
    };

    // Default camera view per variable key, captured with the ?dev=1 panel.
    // '*' is the fallback for keys without a captured view.
    const DEFAULT_VIEWS = {};
    // Default color of the Thickest Lattice Point sphere overlay (hex),
    // set with the ?dev=1 panel.
    const SPHERE_COLOR = '#ff3b30';

    if (block && viewer) {
        const titleEl = document.getElementById('sl-title');
        const descEl = document.getElementById('sl-desc');
        const controls = document.getElementById('sl-controls');
        const missing = document.getElementById('sl-missing');
        const rows = [...block.querySelectorAll('.ntop-block-row')];

        // Models with complete sets are preloaded for smooth scrubbing.
        POINT_COUNTS.forEach(v => referencedUrls.add(VARS['point-count'].file(v)));
        THICK_STEPS.forEach(mm => {
            referencedUrls.add(VARS['boundary-thickness'].file(mm));
            referencedUrls.add(VARS['min-thickness'].file(mm));
            referencedUrls.add(VARS['max-thickness'].file(mm));
        });
        Object.values(MESH_VARS).forEach(cfg => cfg.options.forEach(o => {
            if (o.file) referencedUrls.add(o.file);
        }));

        viewer.addEventListener('error', () => { missing.hidden = false; });
        // The `load` event is unreliable when src changes rapidly, so each
        // src change also polls `loaded` and reapplies overlay state and
        // toggle availability once the new model is in.
        let loadPollToken = 0;
        const afterLoad = () => {
            applyOverlays();
            updateToggles();
        };
        const setSrc = src => {
            missing.hidden = true;
            if (viewer.getAttribute('src') !== src) viewer.setAttribute('src', src);
            const token = ++loadPollToken;
            const poll = () => {
                if (token !== loadPollToken) return;
                if (viewer.loaded && viewer.model) afterLoad();
                else setTimeout(poll, 150);
            };
            setTimeout(poll, 200);
        };

        // ---- Overlay meshes baked into the sweep GLBs ----
        // Each sweep GLB contains hidden overlay meshes (alpha 0); toggling
        // sets the material alpha via the model-viewer material API.
        const OVERLAYS = [
            { name: 'overlay-dog', label: 'Full Dog' },
            { name: 'overlay-surface', label: 'Attachment Surface' },
            { name: 'overlay-sphere', label: 'Lattice Point Sphere',
              onlyFor: ['min-thickness', 'max-thickness'] },
        ];
        const overlayState = {};
        let sphereColor = SPHERE_COLOR;
        let activeKey = null;

        const hexToRgb = hex => {
            const h = hex.replace('#', '');
            return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
        };
        const applyOverlays = () => {
            if (!viewer.model) return;
            viewer.model.materials.forEach(m => {
                if (!m.name || m.name.indexOf('overlay-') !== 0) return;
                const on = !!overlayState[m.name];
                try {
                    const pbr = m.pbrMetallicRoughness;
                    const rgb = m.name === 'overlay-sphere'
                        ? hexToRgb(sphereColor)
                        : pbr.baseColorFactor.slice(0, 3);
                    m.setAlphaMode(on ? 'OPAQUE' : 'BLEND');
                    pbr.setBaseColorFactor([rgb[0], rgb[1], rgb[2], on ? 1 : 0]);
                } catch (e) {}
            });
        };

        const toggleBar = document.getElementById('sl-overlays');
        const toggleBtns = [];
        OVERLAYS.forEach(o => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'model-toggle-btn';
            btn.textContent = o.label;
            btn.addEventListener('click', () => {
                overlayState[o.name] = !overlayState[o.name];
                btn.classList.toggle('active', !!overlayState[o.name]);
                applyOverlays();
            });
            toggleBar.appendChild(btn);
            toggleBtns.push({ btn, cfg: o });
        });
        const updateToggles = () => {
            const mats = viewer.model
                ? viewer.model.materials.map(m => m.name) : [];
            toggleBtns.forEach(({ btn, cfg }) => {
                btn.hidden = cfg.onlyFor && cfg.onlyFor.indexOf(activeKey) === -1;
                btn.disabled = mats.indexOf(cfg.name) === -1;
            });
        };
        viewer.addEventListener('load', () => {
            applyOverlays();
            updateToggles();
        });

        // ---- Default camera views (captured with the ?dev=1 panel) ----
        const views = Object.assign({}, DEFAULT_VIEWS);
        const applyView = key => {
            const view = views[key] || views['*'];
            if (view) {
                // Remove first so re-applying the same view after the user
                // has orbited away still registers as an attribute change.
                viewer.removeAttribute('camera-orbit');
                viewer.removeAttribute('camera-target');
                viewer.removeAttribute('field-of-view');
                viewer.setAttribute('camera-orbit', view.orbit);
                viewer.setAttribute('camera-target', view.target);
                if (view.fov) viewer.setAttribute('field-of-view', view.fov);
            } else {
                viewer.removeAttribute('camera-orbit');
                viewer.removeAttribute('camera-target');
                viewer.removeAttribute('field-of-view');
            }
            if (viewer.jumpCameraToGoal) viewer.jumpCameraToGoal();
        };

        // ---- Orientation gizmo: SolidWorks-style view cube + triad ----
        // Rendered as an SVG overlay projected with the same spherical
        // convention model-viewer uses for camera-orbit (theta = 0 puts the
        // camera on +Z). Clicking a cube face snaps the camera to that axis.
        const gizmo = document.getElementById('sl-gizmo');
        if (gizmo) {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const cubeG = gizmo.querySelector('.gizmo-cube');
            const triadG = gizmo.querySelector('.gizmo-triad');
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
            const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

            const renderGizmo = () => {
                if (typeof viewer.getCameraOrbit !== 'function') return;
                const orbit = viewer.getCameraOrbit();
                const phi = Math.min(Math.max(orbit.phi, 0.002), Math.PI - 0.002);
                const theta = orbit.theta;
                // Camera basis: zc points from target to camera.
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
                const proj = (p, scale, cx, cy) =>
                    [cx + scale * dot(p, xc), cy - scale * dot(p, yc)];

                cubeG.innerHTML = '';
                CUBE_FACES
                    .map(f => ({ f, depth: dot(f.normal, zc) }))
                    .filter(e => e.depth > 0.02)
                    .sort((a, b) => a.depth - b.depth)
                    .forEach(({ f }) => {
                        const pts = f.corners.map(c => proj(c, 21, 48, 48));
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
                    const end = proj(axis.v, 18, 0, 0);
                    const line = document.createElementNS(SVG_NS, 'line');
                    line.setAttribute('x1', '0');
                    line.setAttribute('y1', '0');
                    line.setAttribute('x2', end[0].toFixed(1));
                    line.setAttribute('y2', end[1].toFixed(1));
                    line.setAttribute('stroke', axis.color);
                    triadG.appendChild(line);
                    const tip = proj(axis.v, 25, 0, 0);
                    const text = document.createElementNS(SVG_NS, 'text');
                    text.setAttribute('x', tip[0].toFixed(1));
                    text.setAttribute('y', (tip[1] + 3).toFixed(1));
                    text.setAttribute('fill', axis.color);
                    text.setAttribute('text-anchor', 'middle');
                    text.textContent = axis.label;
                    triadG.appendChild(text);
                });
            };

            gizmo.addEventListener('click', e => {
                const axis = e.target.getAttribute && e.target.getAttribute('data-axis');
                if (!axis) return;
                const orbit = viewer.getCameraOrbit();
                const thetaDeg = orbit.theta * 180 / Math.PI;
                const SNAPS = {
                    '+x': [90, 90], '-x': [-90, 90],
                    '+y': [thetaDeg, 0.1], '-y': [thetaDeg, 179.9],
                    '+z': [0, 90], '-z': [180, 90],
                };
                const s = SNAPS[axis];
                // Remove first: re-setting an identical attribute value is a
                // no-op, which would break re-snapping to the same face.
                viewer.removeAttribute('camera-orbit');
                viewer.setAttribute('camera-orbit',
                    s[0].toFixed(1) + 'deg ' + s[1].toFixed(1) + 'deg ' +
                    orbit.radius.toFixed(1) + 'm');
            });

            // Throttle with a timeout, not requestAnimationFrame: rAF can be
            // suspended in background tabs, which would wedge the queue flag
            // and freeze the gizmo permanently.
            let gizmoQueued = false;
            const queueGizmo = () => {
                if (gizmoQueued) return;
                gizmoQueued = true;
                setTimeout(() => {
                    gizmoQueued = false;
                    renderGizmo();
                }, 50);
            };
            viewer.addEventListener('camera-change', queueGizmo);
            viewer.addEventListener('load', queueGizmo);
            // The element may not be upgraded yet when this runs; wait for
            // the custom element definition before the first render.
            customElements.whenDefined('model-viewer').then(queueGizmo);
        }

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

        const activate = row => rows.forEach(r =>
            r.classList.toggle('active', r === row));
        const closeMeshPanels = () => block.querySelectorAll('.ntop-mesh-options')
            .forEach(p => { p.hidden = true; });

        const renderVar = key => {
            const cfg = VARS[key];
            const row = rows.find(r => r.dataset.var === key);
            closeMeshPanels();
            activate(row);
            activeKey = key;
            applyView(key);
            updateToggles();
            titleEl.textContent = cfg.title;
            descEl.textContent = cfg.desc;
            controls.innerHTML = '';
            const rowValueEl = row.querySelector('[data-value]');
            if (cfg.type === 'grid') {
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
                    controls.appendChild(s.wrap);
                });
                setSrc(cfg.file(...cfg.axes.map(a => a.def)));
            } else {
                const values = cfg.values ||
                    Array.from({ length: (cfg.max - cfg.min) / cfg.step + 1 },
                        (_, i) => cfg.min + i * cfg.step);
                const defIdx = Math.max(0, values.indexOf(cfg.def));
                const s = makeSlider(cfg.title, 0, values.length - 1, 1,
                    defIdx, cfg.unit, values);
                s.readout.textContent = values[defIdx];
                s.input.addEventListener('input', () => {
                    const v = values[parseInt(s.input.value, 10)];
                    s.readout.textContent = v;
                    rowValueEl.textContent = v;
                    setSrc(cfg.file(v));
                });
                controls.appendChild(s.wrap);
                setSrc(cfg.file(values[defIdx]));
            }
        };

        Object.keys(MESH_VARS).forEach(key => {
            const cfg = MESH_VARS[key];
            const row = rows.find(r => r.dataset.mesh === key);
            const panel = block.querySelector('[data-options="' + key + '"]');
            if (!row || !panel) return;
            const rowValueEl = row.querySelector('[data-value]');
            cfg.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ntop-mesh-option' + (i === 0 ? ' selected' : '');
                btn.textContent = opt.label + (opt.file ? '' : ' (coming soon)');
                btn.disabled = !opt.file;
                btn.addEventListener('click', () => {
                    panel.querySelectorAll('.ntop-mesh-option').forEach(b =>
                        b.classList.toggle('selected', b === btn));
                    rowValueEl.textContent = opt.label;
                    setSrc(opt.file);
                });
                panel.appendChild(btn);
            });
            row.addEventListener('click', () => {
                const wasHidden = panel.hidden;
                closeMeshPanels();
                panel.hidden = !wasHidden;
                activate(row);
                activeKey = key;
                applyView(key);
                updateToggles();
                titleEl.textContent = cfg.title;
                descEl.textContent = cfg.desc;
                controls.innerHTML = '';
                const selected = cfg.options.find(o =>
                    o.label === rowValueEl.textContent) || cfg.options[0];
                if (selected.file) setSrc(selected.file);
            });
        });

        rows.filter(r => r.dataset.var).forEach(r =>
            r.addEventListener('click', () => renderVar(r.dataset.var)));

        // ---- View editor: open ntop-socket-creation.html?dev=1, orbit the
        // model, capture the view per input, pick the sphere color, then
        // paste the generated block over DEFAULT_VIEWS / SPHERE_COLOR above.
        if (new URLSearchParams(window.location.search).has('dev')) {
            const panel = document.createElement('div');
            panel.className = 'quiz-dev-panel';
            panel.innerHTML =
                '<p class="quiz-dev-help">View editor: click an input on the block, ' +
                'orbit and zoom the model to the view you want, then press ' +
                '<strong>Capture view</strong>. "Capture as fallback" sets the view ' +
                'used by inputs without their own. Pick the sphere color with the ' +
                'swatch. Copy the code below and paste it over the ' +
                '<code>DEFAULT_VIEWS</code> / <code>SPHERE_COLOR</code> block in ' +
                '<code>script.js</code>.</p>' +
                '<p class="quiz-dev-actions">' +
                '<button type="button" class="quiz-dev-copy" data-capture>Capture view for current input</button> ' +
                '<button type="button" class="quiz-dev-copy" data-capture-all>Capture as fallback (*)</button> ' +
                '<label class="dev-sphere-label">Sphere color: ' +
                '<input type="color" data-sphere-color></label></p>' +
                '<textarea class="quiz-dev-output" readonly spellcheck="false"></textarea>' +
                '<button type="button" class="quiz-dev-copy" data-copy>Copy code</button>' +
                '<span class="quiz-dev-copied" hidden>Copied!</span>';
            document.querySelector('.split-layout').after(panel);
            const output = panel.querySelector('.quiz-dev-output');
            const colorInput = panel.querySelector('[data-sphere-color]');
            colorInput.value = sphereColor;

            const serialize = () => {
                const keys = Object.keys(views);
                const lines = keys.map(k =>
                    "        '" + k + "': { orbit: '" + views[k].orbit +
                    "', target: '" + views[k].target +
                    "', fov: '" + views[k].fov + "' },");
                output.value =
                    '    const DEFAULT_VIEWS = {\n' + lines.join('\n') +
                    (lines.length ? '\n' : '') + '    };\n' +
                    "    const SPHERE_COLOR = '" + sphereColor + "';";
            };

            const capture = key => {
                const orbit = viewer.getCameraOrbit();
                const target = viewer.getCameraTarget();
                views[key] = {
                    orbit: (orbit.theta * 180 / Math.PI).toFixed(1) + 'deg ' +
                        (orbit.phi * 180 / Math.PI).toFixed(1) + 'deg ' +
                        orbit.radius.toFixed(1) + 'm',
                    target: target.x.toFixed(1) + 'm ' + target.y.toFixed(1) +
                        'm ' + target.z.toFixed(1) + 'm',
                    fov: viewer.getFieldOfView().toFixed(1) + 'deg',
                };
                serialize();
            };

            panel.querySelector('[data-capture]').addEventListener('click',
                () => { if (activeKey) capture(activeKey); });
            panel.querySelector('[data-capture-all]').addEventListener('click',
                () => capture('*'));
            colorInput.addEventListener('input', () => {
                sphereColor = colorInput.value;
                applyOverlays();
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

        renderVar('point-count');
    }

    // Preload every model referenced on this page so slider scrubbing and
    // tab swaps are smooth from the first interaction. All viewers are made
    // eager (no waiting to scroll into view), then a hidden viewer walks
    // through each GLB once, warming model-viewer's parsed-model cache.
    // Files that don't exist yet are skipped via a HEAD check.
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
        MV.modelCacheSize = Math.max(MV.modelCacheSize || 0, urls.length + 5);
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
