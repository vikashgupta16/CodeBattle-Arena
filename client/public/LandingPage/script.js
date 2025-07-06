function updateLoginButtonText() {
    const loginButton = document.querySelector(".logIN-btn");
    const button = document.querySelector(".signUP-btn");
    const mediaQuery = window.matchMedia("(max-width: 900px)");

    if (mediaQuery.matches) {
        button.textContent = "Get started";
        loginButton.style.display = "none";
    } else {
        button.textContent = "Sign up";
        loginButton.style.display = "inline-block";
    }
}

updateLoginButtonText();
window.addEventListener("resize", updateLoginButtonText);

// eslint-disable-next-line no-unused-vars
function toggleFAQ(element) {
    const faq = element.parentElement;
    faq.classList.toggle("open");
}

document.querySelector('#FAQ-btn').addEventListener('click', function(e) {
    e.preventDefault();
    const targetFAQ = document.getElementById('FAQ');
    if(targetFAQ) {
        targetFAQ.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
});


let backToTopBtn = document.querySelector(".back-to-top");
let lastScrollY = window.scrollY;
window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    const nearBottom = window.innerHeight + currentScrollY >= document.body.offsetHeight - 20;

    if ((currentScrollY < lastScrollY && currentScrollY > 100) || nearBottom) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
    lastScrollY = currentScrollY;
});
backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
