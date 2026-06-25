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
            sliderId: 'point-count',
            viewerId: 'lattice-viewer',
            readoutId: 'point-count-value',
            models: {
                50:  'ntop-lattice-01.glb',
                100: 'ntop-lattice-01.glb',
                150: 'ntop-lattice-01.glb',
                200: 'ntop-lattice-01.glb',
                250: 'ntop-lattice-01.glb',
                300: 'ntop-lattice-10.glb',
                350: 'ntop-lattice-10.glb',
                400: 'ntop-lattice-10.glb',
                450: 'ntop-lattice-10.glb',
                500: 'ntop-lattice-10.glb',
            },
        },
        {
            sliderId: 'boundary-thickness',
            viewerId: 'boundary-viewer',
            readoutId: 'boundary-thickness-value',
            models: {
                0:  'ntop-boundary-00.glb',
                2:  'ntop-boundary-02.glb',
                4:  'ntop-boundary-04.glb',
                6:  'ntop-boundary-06.glb',
                8:  'ntop-boundary-08.glb',
                10: 'ntop-boundary-10.glb',
                12: 'ntop-boundary-12.glb',
                14: 'ntop-boundary-14.glb',
                16: 'ntop-boundary-16.glb',
                18: 'ntop-boundary-18.glb',
            },
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
    sliderConfigs.forEach(({ sliderId, viewerId, readoutId, models }) => {
        const slider = document.getElementById(sliderId);
        const viewer = document.getElementById(viewerId);
        const readout = document.getElementById(readoutId);
        if (!slider || !viewer || !readout) return;
        const apply = () => {
            const v = parseInt(slider.value, 10);
            readout.textContent = v;
            const src = models[v];
            if (src && viewer.getAttribute('src') !== src) {
                viewer.setAttribute('src', src);
            }
        };
        slider.addEventListener('input', apply);
        apply();
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
