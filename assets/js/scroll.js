// scroll.js

document.addEventListener('DOMContentLoaded', () => {
    const ctaButton = document.getElementById('cta-button');
    const firstSection = document.getElementById('section-financial');
    const heroSection = document.getElementById('hero');
    const sectionRecognition = document.getElementById('section-recognition');
    const navbarWrap = document.getElementById('navbar');
    const footerWrap = document.getElementById('footer');

    // Smooth scroll from hero
    ctaButton.addEventListener('click', () => {
        firstSection.scrollIntoView({behavior: 'smooth'});
    });

    // Observe sections
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Show navbar when first content appears
                if (entry.target.id === 'section-financial') {
                    navbarWrap.classList.add('visible');
                }
                if (entry.target.id === 'hero') {
                    // Hide navbar when hero is visible
                    navbarWrap.classList.remove('visible');
                    footerWrap.classList.remove('visible');
                }
                if (entry.target.id === 'section-recognition') {
                    // Hide footer when recognition section is visible
                    footerWrap.classList.remove('visible');
                }
                // Show footer at summary
                if (entry.target.id === 'section-synthesis') {
                    footerWrap.classList.add('visible');
                }
            }
        });
    }, {threshold: 0.5});

    document.querySelectorAll('.section').forEach(sec => observer.observe(sec));
});