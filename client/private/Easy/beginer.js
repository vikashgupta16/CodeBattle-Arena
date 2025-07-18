// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent this click from triggering the document click handler
    sidebar.classList.toggle('active');
    document.body.classList.toggle('no-scroll');
});

// Close sidebar when clicking anywhere except the sidebar itself
document.addEventListener('click', (e) => {
    // Check if the click is outside the sidebar and the menu toggle button
    if (!sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
});

// Prevent clicks inside the sidebar from closing it
sidebar.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Mobile menu toggle functionality