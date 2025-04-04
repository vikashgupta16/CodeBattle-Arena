// Initialize ACE editor
var editor = ace.edit("code-editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/c_cpp");
editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true,
    fontSize: "14px",
    showGutter: true,
    highlightActiveLine: true,
    highlightGutterLine: false,
    wrap: false
});

// Get challenge details from URL parameters
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const challengeId = urlParams.get('challenge');
    
    // Find the challenge in our data
    const challenge = challenges.beginner.find(c => c.link.includes(challengeId));
    
    if (challenge) {
        document.getElementById('selected-challenge-title').textContent = challenge.title;
        document.getElementById('selected-challenge-description').textContent = challenge.description;
        
        // Set default code based on selected language
        updateCodeEditor();
    }
});

// Language selector functionality
document.getElementById("language-selector").addEventListener('change', updateCodeEditor);

function updateCodeEditor() {
    const language = document.getElementById("language-selector").value;
    let defaultCode = "";
    let mode = "";

    switch (language) {
        case "c":
            defaultCode = `#include <stdio.h>\n\nint main() {\n    // Your code here\n    printf("Hello, World!\\n");\n    return 0;\n}`;
            mode = "ace/mode/c_cpp";
            break;
        case "c++":
            defaultCode = `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    cout << "Hello, World!" << endl;\n    return 0;\n}`;
            mode = "ace/mode/c_cpp";
            break;
        case "java":
            defaultCode = `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n        System.out.println("Hello, World!");\n    }\n}`;
            mode = "ace/mode/java";
            break;
        case "python":
            defaultCode = `# Your code here\nprint("Hello, World!")`;
            mode = "ace/mode/python";
            break;
    }

    editor.setValue(defaultCode, 1);
    editor.session.setMode(mode);
}

async function runCode() {
    const code = editor.getValue();
    const language = document.getElementById("language-selector").value;
    document.getElementById("output-container").classList.remove("hidden");
    document.getElementById("output-box").innerText = "Running code... (Simulated output)";

    try {
        const req = await fetch(window.location.origin + '/api/run/' + language, {
            method: 'POST',
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                code,
                input: ""
            })
        });

        const data = await req.json();
        document.getElementById("output-box").textContent = data.out + '\nSignal: ' + data.signal;
    } catch (err) {
        console.error(err);
        alert("Error: " + err.toString() + " please refresh the page and try again");
    }
}

// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
    document.body.classList.toggle('no-scroll');
});

document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
});

sidebar.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Challenges data (same as in beginner.js)
const challenges = {
    beginner: [
        { title: "Basic Input/Output", description: "Write a program that takes a user's name and age as input and prints a greeting message.", link: "challenge.html?challenge=basic_io" },
        { title: "Simple Calculator", description: "Create a basic calculator that performs addition, subtraction, multiplication, and division.", link: "challenge.html?challenge=calculator" },
        { title: "Even or Odd", description: "Write a program that checks if a number is even or odd.", link: "challenge.html?challenge=even_odd" },
        { title: "Factorial Calculation", description: "Compute the factorial of a given number using a loop.", link: "challenge.html?challenge=factorial" },
        { title: "Prime Number Checker", description: "Determine if a number is prime.", link: "challenge.html?challenge=prime_check" },
        { title: "Fibonacci Sequence", description: "Print the first N numbers in the Fibonacci sequence.", link: "challenge.html?challenge=fibonacci" },
        { title: "Swap Two Numbers", description: "Swap two numbers without using a third variable.", link: "challenge.html?challenge=swap_numbers" },
        { title: "Sum of Digits", description: "Calculate the sum of digits of a given number.", link: "challenge.html?challenge=sum_digits" },
        { title: "Reverse a Number", description: "Reverse the digits of a given number.", link: "challenge.html?challenge=reverse_number" },
        { title: "Leap Year Checker", description: "Check whether a given year is a leap year.", link: "challenge.html?challenge=leap_year" }
    ]
};
// Modify the showChallenges function to use links instead of onclick
function showChallenges(level) {
    const container = document.getElementById("challenge-container");
    container.innerHTML = "";

    challenges[level].forEach(challenge => {
        const challengeBox = document.createElement("div");
        challengeBox.classList.add("assignment-box");
        challengeBox.innerHTML = `
            <h3>${challenge.title}</h3>
            <p>${challenge.description}</p>
            <a href="${challenge.link}" class="solve-btn">Solve Now</a>
        `;
        container.appendChild(challengeBox);
    });
}
document.addEventListener('DOMContentLoaded', function() {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const title = urlParams.get('title');
    const description = urlParams.get('description');
    const challengeId = urlParams.get('challenge');

    // Set the challenge info
    document.getElementById('selected-challenge-title').textContent = decodeURIComponent(title);
    document.getElementById('selected-challenge-description').textContent = decodeURIComponent(description);

    // You can use challengeId to load specific test cases or starter code if needed
    loadChallengeSpecifics(challengeId);
});

function loadChallengeSpecifics(challengeId) {
    // Here you can load specific starter code or test cases based on the challenge
    // For example:
    let defaultCode = '';
    switch(challengeId) {
        case 'basic_io':
            defaultCode = `# Basic Input/Output starter code\nname = input("Enter your name: ")\nage = input("Enter your age: ")\nprint(f"Hello {name}, you are {age} years old!")`;
            break;
        case 'calculator':
            defaultCode = `# Simple Calculator starter code\n# Implement +, -, *, / operations`;
            break;
        // Add cases for other challenges
        default:
            defaultCode = `# Your code here`;
    }
    editor.setValue(defaultCode);
}