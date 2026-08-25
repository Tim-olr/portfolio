// ===== MOBILE MENU TOGGLE =====
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navbar = document.getElementById('navbar');

mobileMenuToggle.addEventListener('click', () => {
    navbar.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    });
});

// ===== NAVBAR BACKGROUND ON SCROLL =====
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    }
});

// ===== FANCYBOX =====
Fancybox.bind('[data-fancybox]', {
    Toolbar: {
        display: { left: [], middle: [], right: ['close'] },
    },
    Image: { zoom: true },
});

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('.feature-card, .tech-stack-card, .screenshot-item, .info-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    observer.observe(el);
});

// ===== LANGUAGE TOGGLE =====
const languageToggle = document.getElementById('languageToggle');
let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';

function updateLanguage(lang) {
    document.querySelectorAll('[data-en][data-nl]').forEach(el => {
        const t = el.getAttribute(`data-${lang}`);
        if (t) el.textContent = t;
    });
    languageToggle.querySelector('.lang-text').textContent = lang === 'en' ? 'EN' : 'NL';
    document.documentElement.setAttribute('data-lang', lang);
}

languageToggle.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'en' ? 'nl' : 'en';
    localStorage.setItem('preferredLanguage', currentLanguage);
    updateLanguage(currentLanguage);
});

window.addEventListener('DOMContentLoaded', () => {
    updateLanguage(currentLanguage);
    window.scrollTo(0, 0);
});
