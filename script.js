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

// Interactive Socket Lattice block on the nTop socket creation page.
// Clicking an input row opens a demo below the block: a 3D viewer plus the
// slider(s) that vary that input. Model filenames are generated per value;
// steps whose GLB has not been uploaded yet show a note instead of a model.
(() => {
    const block = document.getElementById('socket-lattice-block');
    const demo = document.getElementById('ntop-block-demo');
    const referencedUrls = new Set();

    const pad2 = n => String(n).padStart(2, '0');
    const POINT_COUNTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
        100, 150, 200, 250, 300, 350, 400, 450, 500];
    const MESH_MODELS = [
        { label: 'Solid Animal', file: 'billie-solid-animal.glb' },
        { label: 'Socket Attachment Surface', file: 'billie-attachment-surface.glb' },
        { label: 'Prosthetic Socket', file: 'billie-full-prosthetic.glb' },
    ];

    const VARS = {
        'solid-animal': {
            title: 'Solid Animal',
            type: 'mesh',
            defaultFile: 'billie-solid-animal.glb',
            desc: 'The cleaned, watertight mesh of the animal\'s residual limb. The lattice socket is grown around this shape. Use the tabs to compare the block\'s mesh inputs with the socket it produces.',
        },
        'attachment-surface': {
            title: 'Socket Attachment Surface',
            type: 'mesh',
            defaultFile: 'billie-attachment-surface.glb',
            desc: 'The region of the limb the socket grips, exported as a separate surface. It defines where the lattice sits on the limb. Use the tabs to compare the block\'s mesh inputs with the socket it produces.',
        },
        'thickest-point': {
            title: 'Thickest Lattice Point',
            type: 'grid',
            desc: 'Sets the location where the socket wall is at its thickest. The X value stays 0; the Y and Z sliders move the point across the limb in 5 mm steps.',
            axes: [
                { key: 'Y', min: -30, max: 30, step: 5, def: 0, unit: 'mm' },
                { key: 'Z', min: -30, max: 30, step: 5, def: 0, unit: 'mm' },
            ],
            file: (y, z) => 'ntop-thickpoint-y' + y + '-z' + z + '.glb',
            rowValue: (y, z) => '0, ' + y + ', ' + z,
        },
        'max-thickness': {
            title: 'Max Socket Thickness',
            type: 'slider',
            min: 0, max: 20, step: 2, def: 10, unit: 'mm',
            file: v => 'ntop-maxthick-' + pad2(v) + '.glb',
            desc: 'Sets the upper limit on the socket wall thickness.',
        },
        'min-thickness': {
            title: 'Min Socket Thickness',
            type: 'slider',
            min: 0, max: 20, step: 2, def: 10, unit: 'mm',
            file: v => 'ntop-minthick-' + pad2(v) + '.glb',
            desc: 'Sets the lower limit on the socket wall thickness.',
        },
        'boundary-thickness': {
            title: 'Boundary Lattice Thickness',
            type: 'slider',
            min: 0, max: 20, step: 1, def: 10, unit: 'mm',
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

    if (block && demo) {
        // Models with complete sets are preloaded for smooth scrubbing.
        POINT_COUNTS.forEach(v => referencedUrls.add(VARS['point-count'].file(v)));
        for (let mm = 0; mm <= 20; mm++) referencedUrls.add(VARS['boundary-thickness'].file(mm));
        MESH_MODELS.forEach(m => referencedUrls.add(m.file));

        const rows = [...block.querySelectorAll('.ntop-block-row')];

        const makeViewer = src => {
            const mv = document.createElement('model-viewer');
            mv.setAttribute('src', src);
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

        const renderDemo = key => {
            const cfg = VARS[key];
            const row = rows.find(r => r.dataset.var === key);
            rows.forEach(r => r.classList.toggle('active', r === row));
            demo.hidden = false;
            demo.innerHTML = '';

            const title = document.createElement('p');
            title.className = 'ntop-demo-title';
            title.textContent = cfg.title;
            const desc = document.createElement('p');
            desc.className = 'ntop-demo-desc';
            desc.textContent = cfg.desc;
            demo.append(title, desc);

            const figure = document.createElement('figure');
            figure.className = 'model-viewer-figure';
            const missing = document.createElement('p');
            missing.className = 'ntop-demo-missing';
            missing.textContent = 'The model for this value has not been uploaded yet.';
            missing.hidden = true;

            let viewer;
            const setSrc = src => {
                missing.hidden = true;
                if (viewer.getAttribute('src') !== src) viewer.setAttribute('src', src);
            };

            if (cfg.type === 'mesh') {
                const toggle = document.createElement('div');
                toggle.className = 'model-toggle';
                viewer = makeViewer(cfg.defaultFile);
                MESH_MODELS.forEach(m => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'model-toggle-btn' +
                        (m.file === cfg.defaultFile ? ' active' : '');
                    btn.textContent = m.label;
                    btn.addEventListener('click', () => {
                        setSrc(m.file);
                        toggle.querySelectorAll('.model-toggle-btn').forEach(b =>
                            b.classList.toggle('active', b === btn));
                    });
                    toggle.appendChild(btn);
                });
                figure.append(toggle, viewer);
            } else if (cfg.type === 'grid') {
                const state = {};
                viewer = makeViewer(cfg.file(...cfg.axes.map(a => a.def)));
                const rowValueEl = row.querySelector('[data-value]');
                const sliders = cfg.axes.map(axis => {
                    state[axis.key] = axis.def;
                    const ticks = [];
                    for (let t = axis.min; t <= axis.max; t += axis.step) ticks.push(t);
                    const s = makeSlider(axis.key, axis.min, axis.max, axis.step,
                        axis.def, axis.unit, ticks);
                    s.input.addEventListener('input', () => {
                        state[axis.key] = parseInt(s.input.value, 10);
                        s.readout.textContent = state[axis.key];
                        rowValueEl.textContent = cfg.rowValue(state.Y, state.Z);
                        setSrc(cfg.file(state.Y, state.Z));
                    });
                    return s;
                });
                figure.append(...sliders.map(s => s.wrap), viewer);
            } else {
                const values = cfg.values ||
                    Array.from({ length: (cfg.max - cfg.min) / cfg.step + 1 },
                        (_, i) => cfg.min + i * cfg.step);
                const defIdx = Math.max(0, values.indexOf(cfg.def));
                viewer = makeViewer(cfg.file(values[defIdx]));
                const rowValueEl = row.querySelector('[data-value]');
                const s = makeSlider(cfg.title, 0, values.length - 1, 1,
                    defIdx, cfg.unit, values);
                s.readout.textContent = values[defIdx];
                s.input.addEventListener('input', () => {
                    const v = values[parseInt(s.input.value, 10)];
                    s.readout.textContent = v;
                    rowValueEl.textContent = v;
                    setSrc(cfg.file(v));
                });
                figure.append(s.wrap, viewer);
            }

            viewer.addEventListener('error', () => { missing.hidden = false; });
            const caption = document.createElement('figcaption');
            caption.textContent = 'Interactive 3D model - drag to rotate, scroll to zoom.';
            figure.append(missing, caption);
            demo.appendChild(figure);
        };

        rows.forEach(r => r.addEventListener('click', () => renderDemo(r.dataset.var)));
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
// diffuse (avoids one-side-blown-out highlights on white meshes).
document.querySelectorAll('model-viewer').forEach(mv => {
    const applyMatte = () => {
        if (!mv.model) return;
        mv.model.materials.forEach(material => {
            try {
                const pbr = material.pbrMetallicRoughness;
                pbr.setRoughnessFactor(1.0);
                pbr.setMetallicFactor(0.0);
                pbr.setBaseColorFactor([0.9, 0.9, 0.9, 1.0]);
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
                { name: 'Scapula', x: 46.0, y: 19.0 },
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

    const imageEl = document.getElementById('quiz-image');
    const marker = document.getElementById('quiz-marker');
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
            '<p class="quiz-dev-help">Marker editor: drag a marker to move it. ' +
            'Click one to select it, then drag the square corner handle to stretch ' +
            'it into an ellipse and the gold stem handle to rotate it. Double-click ' +
            'a marker to reset it to the default dot. When everything looks right, ' +
            'copy the code below and paste it over the matching <code>items:</code> ' +
            'block in <code>script.js</code>.</p>' +
            '<textarea class="quiz-dev-output" readonly spellcheck="false"></textarea>' +
            '<button type="button" class="quiz-dev-copy">Copy code</button>' +
            '<span class="quiz-dev-copied" hidden>Copied!</span>';
        app.after(devPanel);
        const output = devPanel.querySelector('.quiz-dev-output');
        const copyBtn = devPanel.querySelector('.quiz-dev-copy');
        const copiedNote = devPanel.querySelector('.quiz-dev-copied');

        let devKey = 'bones';

        const serialize = () => {
            const cfg = QUIZZES[devKey];
            const lines = cfg.items.map(it => {
                let s = "                { name: '" + it.name.replace(/'/g, "\\'") +
                    "', x: " + it.x.toFixed(1) + ", y: " + it.y.toFixed(1);
                if (it.w && it.h) {
                    s += ', w: ' + it.w.toFixed(1) + ', h: ' + it.h.toFixed(1);
                }
                if (it.rot) s += ', rot: ' + it.rot;
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
            serialize();
        };

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
                renderDev();
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

    function showQuestion() {
        answered = false;
        feedbackEl.textContent = '';
        feedbackEl.className = 'quiz-feedback';
        nextBtn.hidden = true;
        const q = order[idx];
        numEl.textContent = String(idx + 1);
        marker.style.left = q.x + '%';
        marker.style.top = q.y + '%';
        marker.style.width = q.w ? q.w + '%' : '';
        marker.style.height = q.h ? q.h + '%' : '';
        marker.style.setProperty('--marker-rot', (q.rot || 0) + 'deg');
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
