function transferProblem(elem) {
    const parent = elem.parentElement;
    const title = parent.querySelector('h3').textContent;
    const description = parent.querySelector('p').textContent;
    localStorage.setItem('problemTitle', title);
    localStorage.setItem('problemDescription', description);
    window.location.href = window.location.origin + "/private/CoderPage/coder.html";
}