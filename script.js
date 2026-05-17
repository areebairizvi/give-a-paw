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
