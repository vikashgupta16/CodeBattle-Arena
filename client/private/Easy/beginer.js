// ace-editor
ace.require("ace/ext/language_tools");
ace.config.set("basePath", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6/");
var editor = ace.edit('code-editor', { enableBasicAutocompletion: true, enableSnippets: true, enableLiveAutocompletion: true });
editor.session.setMode("ace/mode/c_cpp"); // Default mode
editor.setOptions({
    fontSize: "14px",
    showGutter: true,
    highlightActiveLine: true,
    highlightGutterLine: false,
    wrap: false,
    theme: "ace/theme/monokai"
});
// Your JavaScript remains exactly the same
const challenges = {
    beginner: [
        { title: "Basic Input/Output", description: "Write a program that takes a user's name and age as input and prints a greeting message.", link: "cComp.html?assignment=basic_io" },
        { title: "Simple Calculator", description: "Create a basic calculator that performs addition, subtraction, multiplication, and division.", link: "cComp.html?assignment=calculator" },
        { title: "Even or Odd", description: "Write a program that checks if a number is even or odd.", link: "cComp.html?assignment=even_odd" },
        { title: "Factorial Calculation", description: "Compute the factorial of a given number using a loop.", link: "cComp.html?assignment=factorial" },
        { title: "Prime Number Checker", description: "Determine if a number is prime.", link: "cComp.html?assignment=prime_check" },
        { title: "Fibonacci Sequence", description: "Print the first N numbers in the Fibonacci sequence.", link: "cComp.html?assignment=fibonacci" },
        { title: "Swap Two Numbers", description: "Swap two numbers without using a third variable.", link: "cComp.html?assignment=swap_numbers" },
        { title: "Sum of Digits", description: "Calculate the sum of digits of a given number.", link: "cComp.html?assignment=sum_digits" },
        { title: "Reverse a Number", description: "Reverse the digits of a given number.", link: "cComp.html?assignment=reverse_number" },
        { title: "Leap Year Checker", description: "Check whether a given year is a leap year.", link: "cComp.html?assignment=leap_year" }
    ]
};

// Show beginner challenges by default when page loads
document.addEventListener('DOMContentLoaded', function () {
    showChallenges('beginner');
});

function showChallenges(level) {
    const container = document.getElementById("challenge-container");
    container.innerHTML = "";

    challenges[level].forEach(challenge => {
        const challengeBox = document.createElement("div");
        challengeBox.classList.add("assignment-box");
        challengeBox.innerHTML = `
            <h3>${challenge.title}</h3>
            <p>${challenge.description}</p>
            <button class="solve-btn" onclick="selectChallenge('${challenge.title}', '${challenge.description}')">Solve Now</button>
        `;
        container.appendChild(challengeBox);
    });
}

function selectChallenge(title, description) {
    // Hide the challenge list
    document.getElementById("assignments").classList.add("hidden");

    // Show the coding page
    document.getElementById("coding-page").classList.remove("hidden");

    // Set the selected challenge info
    document.getElementById("selected-challenge-title").textContent = title;
    document.getElementById("selected-challenge-description").textContent = description;

    // Clear previous code and output
    document.getElementById("code-editor").value = "";
    document.getElementById("output-container").classList.add("hidden");

    // Set default code based on selected language
    updateCodeEditor();
}

function backToChallenges() {
    // Show the challenge list
    document.getElementById("assignments").classList.remove("hidden");

    // Hide the coding page
    document.getElementById("coding-page").classList.add("hidden");
}

function updateCodeEditor() {
    const language = document.getElementById("language-selector").value;
    let defaultCode = "";
    let mode = ""; // Add a variable to store the mode

    switch (language) {
        case "c":
            defaultCode = `#include <stdio.h>\n\nint main() {\n    // Your code here\n    printf("Hello, World!\\n");\n    return 0;\n}`;
            mode = "ace/mode/c_cpp"; // Set mode for C
            break;
        case "c++":
            defaultCode = `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    cout << "Hello, World!" << endl;\n    return 0;\n}`;
            mode = "ace/mode/c_cpp"; // Set mode for C++
            break;
        case "java":
            defaultCode = `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n        System.out.println("Hello, World!");\n    }\n}`;
            mode = "ace/mode/java"; // Set mode for Java
            break;
        case "python":
            defaultCode = `# Your code here\nprint("Hello, World!")`;
            mode = "ace/mode/python"; // Set mode for Python
            break;
    }

    // Set the default code in the editor
    editor.setValue(defaultCode, 1); // The second argument moves the cursor to the end of the code

    // Set the mode for syntax highlighting
    editor.session.setMode(mode);
}
document.getElementById("language-selector").addEventListener('change', updateCodeEditor);

async function runCode() {
    const code = document.getElementById("code-editor").value;
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