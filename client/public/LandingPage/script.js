function updateLoginButtonText() {
    const loginButton = document.querySelector(".logIN-btn");
    const button = document.querySelector(".signUP-btn");
    const mediaQuery = window.matchMedia("(max-width: 900px)");

    if(mediaQuery.matches) {
        button.textContent = "Get started";
        loginButton.style.display = "none";
    }else{
        button.textContent = "Sign up";
        loginButton.style.display = "inline-block";
    }
}

updateLoginButtonText();
window.addEventListener("resize", updateLoginButtonText);

function toggleFAQ(element) {
    const faq = element.parentElement;
    faq.classList.toggle("open");
}