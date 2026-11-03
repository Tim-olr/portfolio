const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navbar = document.getElementById('navbar');

mobileMenuToggle.addEventListener('click', () => {
    navbar.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
});

const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    });
});

const experienceCards = document.querySelectorAll('.experience-card');

experienceCards.forEach(card => {
    card.addEventListener('click', () => {
        experienceCards.forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.classList.remove('active');
            }
        });
        
        card.classList.toggle('active');
    });
});

const interestCards = document.querySelectorAll('.interest-card');

interestCards.forEach(card => {
    card.addEventListener('click', () => {
        interestCards.forEach(other => {
            if (other !== card) {
                other.classList.remove('active');
            }
        });

        card.classList.toggle('active');
    });
});


Fancybox.bind("[data-fancybox]", {
    Toolbar: {
        display: {
            left: [],
            middle: [],
            right: ["close"],
        },
    },
    Image: {
        zoom: true,
    },
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

const animateElements = document.querySelectorAll('.project-card, .timeline-item, .experience-card, .interest-card');
animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    }
});

window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    updateAge();
});

function calculateAge() {
    const birthDate = new Date('2008-05-30');
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function updateAge() {
    const heroDescription = document.querySelector('.hero-description');
    const age = calculateAge();
    
    if (heroDescription) {
        const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
        if (currentLang === 'en') {
            heroDescription.textContent = `${age} year old software development student passionate about creating innovative solutions and building engaging digital experiences.`;
        } else {
            heroDescription.textContent = `${age} jarige softwareontwikkelingsstudent gepassioneerd over het creëren van innovatieve oplossingen en het bouwen van boeiende digitale ervaringen.`;
        }
    }
}

const languageToggle = document.getElementById('languageToggle');
let currentLanguage = 'en';

languageToggle.addEventListener('click', () => {
    currentLanguage = currentLanguage === 'en' ? 'nl' : 'en';
    
    const langText = languageToggle.querySelector('.lang-text');
    langText.textContent = currentLanguage === 'en' ? 'EN' : 'NL';
    
    localStorage.setItem('preferredLanguage', currentLanguage);
    document.documentElement.setAttribute('data-lang', currentLanguage);
    
    updateLanguage(currentLanguage);
    
    updateAge();
});

function updateLanguage(lang) {
    const translatableElements = document.querySelectorAll('[data-en][data-nl]');
    
    translatableElements.forEach(element => {
        const translation = element.getAttribute(`data-${lang}`);
        if (translation) {
            element.textContent = translation;
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        const langText = languageToggle.querySelector('.lang-text');
        langText.textContent = currentLanguage === 'en' ? 'EN' : 'NL';
        document.documentElement.setAttribute('data-lang', currentLanguage);
        updateLanguage(currentLanguage);
    }
});

const form = document.getElementById('form');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    formData.append("access_key","a27aef06-f905-4a6d-8c29-1f1b37889961");

    const originalText = submitBtn.textContent;

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            alert("Success! Your message has been sent.");
            form.reset();
        } else {
            alert("Error: " + data.message);
        }

    } catch (error) {
        alert("Something went wrong. Please try again.");
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});