// ===== MOBILE MENU TOGGLE =====
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navbar = document.getElementById('navbar');

mobileMenuToggle.addEventListener('click', () => {
    navbar.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
});

// ===== SMOOTH SCROLLING & ACTIVE NAVIGATION =====
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

// Update active navigation link on scroll
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

// Close mobile menu when clicking a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navbar.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    });
});

// ===== EXPERIENCE CARDS TOGGLE =====
const experienceCards = document.querySelectorAll('.experience-card');

experienceCards.forEach(card => {
    card.addEventListener('click', () => {
        // Close all other cards
        experienceCards.forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.classList.remove('active');
            }
        });
        
        // Toggle current card
        card.classList.toggle('active');
    });
});

// ===== FANCYBOX INITIALIZATION =====
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

// ===== CONTACT FORM HANDLING =====
const contactForm = document.querySelector('.contact-form');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    
    // Here you would typically send the form data to a server
    // For now, we'll just show an alert
    alert(`Thank you for your message, ${name}! I'll get back to you soon.`);
    
    // Reset form
    contactForm.reset();
});

// ===== SCROLL ANIMATIONS =====
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

// Observe elements for animation
const animateElements = document.querySelectorAll('.project-card, .timeline-item, .experience-card, .interest-card');
animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
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

// ===== SCROLL TO TOP ON PAGE LOAD =====
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    updateAge();
});
;

// ===== DYNAMIC AGE CALCULATION =====
function calculateAge() {
    const birthDate = new Date('2008-05-30');
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Update age in hero description
function updateAge() {
    const heroDescription = document.querySelector('.hero-description');
    const age = calculateAge();
    
    if (heroDescription) {
        heroDescription.textContent = `${age}-year-old software development student passionate about creating innovative solutions and building engaging digital experiences.`;
    }
}

const form = document.getElementById('form');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    formData.append("access_key", "a27aef06-f905-4a6d-8c29-1f1b37889961");

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
