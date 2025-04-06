// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
const closeBtn = document.getElementById('close-btn');
const sidebar = document.getElementById('sidebar');

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent this click from triggering the document click handler
    sidebar.classList.toggle('active');
    document.body.classList.toggle('no-scroll');
});

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
    document.body.classList.remove('no-scroll');
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

function transferProblem(elem) {
    const parent = elem.parentElement;
    const title = parent.querySelector('h3').textContent;
    const description = parent.querySelector('p').textContent;
    localStorage.setItem('problemTitle', title);
    localStorage.setItem('problemDescription', description);
    window.location.href = window.location.origin + "/private/CoderPage/coder.html";
}