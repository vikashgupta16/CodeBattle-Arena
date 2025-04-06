// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
const closeBtn = document.getElementById('close-btn');
const sidebar = document.getElementById('sidebar');

const outputBox = document.getElementById('output-box');
const langSelector = document.getElementById('language-selector');

const challengeTitle = document.getElementById('selected-challenge-title');
const challengeDesc = document.getElementById('selected-challenge-description');

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent this click from triggering the document click handler
    sidebar.classList.toggle('active');
    document.body.classList.toggle('no-scroll');
});

// closeBtn.addEventListener('click', () => {
//     sidebar.classList.remove('active');
//     document.body.classList.remove('no-scroll');
// });

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

ace.require("ace/ext/language_tools");

const editor = ace.edit("code-editor", {
    mode: "ace/mode/c_cpp",
    selectionStyle: "text",
    theme: "ace/theme/monokai",
    enableBasicAutocompletion: true
});

async function runCode(btn) {
    btn.textContent = 'Running...';
    const out = await fetch(window.location.origin + "/api/run/" + langSelector.value, {
        method: 'POST',
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            code: editor.getValue(),
            input: ""
        })
    });

    const data = await out.json();
    outputBox.textContent = data.out + "\n\nSignal: " + data.signal;
    btn.textContent = 'Run Code';
}

function changeLang(list) {
    if (list.value === 'c' || list.value === 'c++') {
        editor.session.setMode('ace/mode/c_cpp');
    }
    else
    {
        editor.session.setMode('ace/mode/' + list.value);
    }
}

challengeTitle.textContent = localStorage.getItem('problemTitle');
challengeDesc.textContent = localStorage.getItem('problemDescription');