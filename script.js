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

// Lattice-parameter sliders on the nTop socket creation page. Each slider
// maps its value to a per-step GLB; viewer.src is updated on input. Missing
// files are tolerated (the model-viewer just shows an error for that step
// until the GLB is added). Mappings can be filled in as more GLBs arrive.
(() => {
    const sliderConfigs = [
        {
            // Slider value is an index into `values` (the point counts are not
            // uniformly spaced: 5-50 by 5, then 100-500 by 50).
            sliderId: 'point-count',
            viewerId: 'lattice-viewer',
            readoutId: 'point-count-value',
            values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
            models: {
                5:   'ntop-pointcount-005.glb',
                10:  'ntop-pointcount-010.glb',
                15:  'ntop-pointcount-015.glb',
                20:  'ntop-pointcount-020.glb',
                25:  'ntop-pointcount-025.glb',
                30:  'ntop-pointcount-030.glb',
                35:  'ntop-pointcount-035.glb',
                40:  'ntop-pointcount-040.glb',
                45:  'ntop-pointcount-045.glb',
                50:  'ntop-pointcount-050.glb',
                100: 'ntop-pointcount-100.glb',
                150: 'ntop-pointcount-150.glb',
                200: 'ntop-pointcount-200.glb',
                250: 'ntop-pointcount-250.glb',
                300: 'ntop-pointcount-300.glb',
                350: 'ntop-pointcount-350.glb',
                400: 'ntop-pointcount-400.glb',
                450: 'ntop-pointcount-450.glb',
                500: 'ntop-pointcount-500.glb',
            },
        },
        {
            sliderId: 'boundary-thickness',
            viewerId: 'boundary-viewer',
            readoutId: 'boundary-thickness-value',
            models: Object.fromEntries(
                Array.from({ length: 21 }, (_, mm) =>
                    [mm, 'ntop-boundary-' + String(mm).padStart(2, '0') + '.glb'])
            ),
        },
        {
            sliderId: 'surface-thickness',
            viewerId: 'surface-viewer',
            readoutId: 'surface-thickness-value',
            models: {
                2:  'ntop-surface-02.glb',
                4:  'ntop-surface-04.glb',
                6:  'ntop-surface-06.glb',
                8:  'ntop-surface-08.glb',
                10: 'ntop-surface-10.glb',
                12: 'ntop-surface-12.glb',
                14: 'ntop-surface-14.glb',
                16: 'ntop-surface-16.glb',
                18: 'ntop-surface-18.glb',
                20: 'ntop-surface-20.glb',
            },
        },
    ];
    const referencedUrls = new Set();
    sliderConfigs.forEach(({ sliderId, viewerId, readoutId, models, values }) => {
        const slider = document.getElementById(sliderId);
        const viewer = document.getElementById(viewerId);
        const readout = document.getElementById(readoutId);
        if (!slider || !viewer || !readout) return;
        Object.values(models).forEach(url => referencedUrls.add(url));
        const apply = () => {
            const raw = parseInt(slider.value, 10);
            // With a `values` array the slider value is an index; otherwise
            // the slider value is used directly.
            const v = values ? values[raw] : raw;
            readout.textContent = v;
            const src = models[v];
            if (src && viewer.getAttribute('src') !== src) {
                viewer.setAttribute('src', src);
            }
        };
        slider.addEventListener('input', apply);
        apply();
    });

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
