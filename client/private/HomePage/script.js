document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const DOM = {
        nav: document.querySelector('.codingPageNav'),
        navToggle: document.querySelector('.outside-logo-sidebar'),
        closeNav: document.querySelector('.inside-logo-sidebar'),
        main: document.querySelector('main'),
        sections: document.querySelectorAll('.section'),
        navLinks: document.querySelectorAll('.nav-link'),
        themeToggle: document.getElementById('theme-toggle')
    }
    showSection('home');

    // Event Listeners
    DOM.navToggle.addEventListener('click', showNav);
    DOM.closeNav.addEventListener('click', hideNav);
    DOM.main.addEventListener('click', function(e) {
        if (e.target === DOM.main) hideNav();
    });

    // Navigation links
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Theme switcher
    DOM.themeToggle.addEventListener('change', function() {
        document.body.className = this.value;
        localStorage.setItem('theme', this.value);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = savedTheme;
    DOM.themeToggle.value = savedTheme;

    // Functions
    function showNav() {
        DOM.nav.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideNav() {
        DOM.nav.classList.remove('show');
        document.body.style.overflow = '';
    }

    function showSection(sectionId) {
        // Hide all sections
        DOM.sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Update active nav link
        DOM.navLinks.forEach(link => {
            link.classList.toggle('current', link.getAttribute('data-section') === sectionId);
        });

        hideNav();
    }
});
