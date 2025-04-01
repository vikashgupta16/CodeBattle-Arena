function showNav() {
    const nav = document.querySelector('.codingPageNav');
    nav.style.display = 'flex';
    nav.classList.add('show');
    nav.classList.remove('hide');
    const slideBarOutsideIcon = document.querySelector('.outside-logo-sidebar');
    slideBarOutsideIcon.style.display = 'none';
}

function hideNav() {
    const nav = document.querySelector('.codingPageNav');
    nav.classList.add('hide');
    nav.classList.remove('show');
    // nav.style.display = 'none';
    const slideBarOutsideIcon = document.querySelector('.outside-logo-sidebar');
    slideBarOutsideIcon.style.display = 'flex';
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'flex';
    hideNav();
}