// Shared Navigation Script for CodeBattle-Arena
// Used by Homepage and Arena pages for consistent navigation behavior

// Global functions for HTML onclick handlers
function showNav() {
    const nav = document.querySelector('.codingPageNav');
    const navBackdrop = document.querySelector('.nav-backdrop');
    nav.classList.add('show');
    if (navBackdrop) navBackdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideNav() {
    const nav = document.querySelector('.codingPageNav');
    const navBackdrop = document.querySelector('.nav-backdrop');
    nav.classList.remove('show');
    if (navBackdrop) navBackdrop.classList.remove('show');
    document.body.style.overflow = '';
}

function toggleNav() {
    const nav = document.querySelector('.codingPageNav');
    const navBackdrop = document.querySelector('.nav-backdrop');
    const isOpen = nav.classList.contains('show');
    
    if (isOpen) {
        hideNav();
    } else {
        showNav();
    }
}

function showSection(sectionId) {
    // Special handling for leaderboard page - redirect to homepage
    if (window.location.pathname.includes('leaderboard.html')) {
        window.location.href = `../HomePage/codigo.html#${sectionId}`;
        return;
    }
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show the selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        history.replaceState(null, null, `#${sectionId}`);
    }

    // Update active link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('current', link.getAttribute('href') === `#${sectionId}`);
    });

    // Hide the navigation menu for better UX
    hideNav();
}

// Navigation initialization
document.addEventListener('DOMContentLoaded', function() {
    // Navigation Toggle
    const nav = document.querySelector('.codingPageNav');
    const navToggle = document.querySelector('.nav-toggle');
    const navClose = document.querySelector('.inside-logo-sidebar');

    // Set up event listeners
    if (navToggle) {
        navToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            showNav();
        });
    }
    
    if (navClose) {
        navClose.addEventListener('click', function(e) {
            e.stopPropagation();
            hideNav();
        });
    }

    // Close nav when clicking outside
    document.addEventListener('click', function(e) {
        if (nav && nav.classList.contains('show') && 
            !nav.contains(e.target) && 
            navToggle && !navToggle.contains(e.target)) {
            hideNav();
        }
    });

    // Close nav when clicking on backdrop
    const navBackdrop = document.querySelector('.nav-backdrop');
    if (navBackdrop) {
        navBackdrop.addEventListener('click', function(e) {
            hideNav();
        });
    }

    // Close nav when clicking on main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.addEventListener('click', function (e) {
            if (e.target === this) hideNav();
        });
    }

    // Theme Switcher
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function () {
            document.body.className = this.value;
            localStorage.setItem('theme', this.value);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark-theme';
        document.body.className = savedTheme;
        themeToggle.value = savedTheme;
    }

    // Set up navigation links (for pages that use sections)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            // Skip preventDefault for external links (like Arena)
            const href = this.getAttribute('href');
            if (href && (href.startsWith('../') || href.startsWith('http'))) {
                return; // Allow default navigation behavior
            }
            
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const sectionId = href.substring(1); // Get the section ID from the href
                showSection(sectionId);
            }
        });
    });

    // Handle direct URL access (for pages that use sections)
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else if (document.getElementById('home')) {
        showSection('home'); // Default section for homepage
    }
});

// Export navigation functions for global access
window.Navigation = {
    toggleNav,
    showNav,
    hideNav,
    showSection
};
