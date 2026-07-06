// Human anatomy quiz (bones and joints). Self-contained: same element
// ids/classes/CSS as the canine quiz but its own app id (#human-quiz-app),
// so script.js's canine engine no-ops on this page.
(() => {
    const app = document.getElementById('human-quiz-app');
    if (!app) return;

    // Each quiz has its own base image; marker positions are percentages
    // (left, top) of that image. Coordinates were verified by overlay.
    const QUIZZES = {
        'bones': {
            image: 'human-skeleton.svg', noun: 'bone',
            items: [
                { name: 'Cranium (skull)', x: 43.0, y: 5.0 },
                { name: 'Mandible', x: 43.0, y: 9.5 },
                { name: 'Clavicle', x: 38.0, y: 16.0 },
                { name: 'Sternum', x: 45.0, y: 21.0 },
                { name: 'Ribs', x: 39.0, y: 26.0 },
                { name: 'Humerus', x: 16.0, y: 28.0 },
                { name: 'Ulna', x: 13.0, y: 44.0 },
                { name: 'Radius', x: 11.0, y: 44.0 },
                { name: 'Carpals', x: 15.0, y: 50.0 },
                { name: 'Metacarpals', x: 15.0, y: 54.0 },
                { name: 'Phalanges', x: 13.0, y: 58.0 },
                { name: 'Pelvis (hip bone)', x: 38.0, y: 45.0 },
                { name: 'Femur', x: 40.0, y: 57.0 },
                { name: 'Patella', x: 37.0, y: 68.0 },
                { name: 'Tibia', x: 38.0, y: 80.0 },
                { name: 'Fibula', x: 35.0, y: 80.0 },
                { name: 'Tarsals', x: 37.0, y: 89.0 },
            ],
        },
        'joints': {
            image: 'human-skeleton.svg', noun: 'joint',
            items: [
                { name: 'Temporomandibular joint', x: 38.0, y: 9.0 },
                { name: 'Shoulder joint', x: 19.0, y: 21.0 },
                { name: 'Elbow joint', x: 14.0, y: 36.0 },
                { name: 'Wrist joint', x: 16.0, y: 48.0 },
                { name: 'Hip joint', x: 35.0, y: 48.0 },
                { name: 'Knee joint', x: 37.0, y: 67.0 },
                { name: 'Ankle joint', x: 37.0, y: 89.0 },
                { name: 'Intervertebral joints', x: 45.0, y: 36.0 },
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
