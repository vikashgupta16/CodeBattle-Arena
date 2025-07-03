// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
const closeBtn = document.getElementById('close-btn');
const sidebar = document.getElementById('sidebar');

const outputBox = document.getElementById('output-box');
const langSelector = document.getElementById('language-selector');

const challengeTitle = document.getElementById('selected-challenge-title');
const challengeDesc = document.getElementById('selected-challenge-description');
const problemDifficulty = document.getElementById('problem-difficulty');

// Current problem data
let currentProblem = null;

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
    document.body.classList.toggle('no-scroll');
});

// Close sidebar when clicking anywhere except the sidebar itself
document.addEventListener('click', (e) => {
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

// Utility function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Load problem from API
async function loadProblem(problemId) {
    try {
        const response = await fetch(`/api/problems/${problemId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch problem: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to load problem');
        }
        
        currentProblem = data.problem;
        displayProblem(currentProblem);
        
    } catch (error) {
        console.error('Error loading problem:', error);
        challengeTitle.textContent = 'Error Loading Problem';
        challengeDesc.textContent = `Failed to load problem: ${error.message}`;
    }
}

// Display problem details in the UI
function displayProblem(problem) {
    // Basic info
    challengeTitle.textContent = problem.title;
    challengeDesc.textContent = problem.description;
    
    // Difficulty badge
    const difficultyColors = {
        'easy': '#28a745',
        'medium': '#ffc107',
        'hard': '#dc3545'
    };
    problemDifficulty.textContent = problem.difficulty.toUpperCase();
    problemDifficulty.style.backgroundColor = difficultyColors[problem.difficulty] || '#6c757d';
    
    // Constraints
    if (problem.constraints) {
        document.getElementById('problem-constraints').style.display = 'block';
        document.getElementById('constraints-text').textContent = problem.constraints;
    }
    
    // Examples
    if (problem.examples && problem.examples.length > 0) {
        document.getElementById('problem-examples').style.display = 'block';
        const examplesContainer = document.getElementById('examples-container');
        examplesContainer.innerHTML = problem.examples.map((example, index) => `
            <div class="example">
                <strong>Example ${index + 1}:</strong>
                <div class="example-io">
                    <div><strong>Input:</strong> <code>${example.input || 'No input'}</code></div>
                    <div><strong>Output:</strong> <code>${example.output}</code></div>
                    ${example.explanation ? `<div><strong>Explanation:</strong> ${example.explanation}</div>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // Hints
    if (problem.hints && problem.hints.length > 0) {
        document.getElementById('problem-hints').style.display = 'block';
        const hintsList = document.getElementById('hints-list');
        hintsList.innerHTML = problem.hints.map(hint => `<li>${hint}</li>`).join('');
    }
}

async function runCode(btn) {
    btn.textContent = 'Running...';
    btn.disabled = true;
    
    try {
        const response = await fetch(window.location.origin + "/api/run/" + langSelector.value, {
            method: 'POST',
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                code: editor.getValue(),
                input: document.getElementById('input-area')?.value || ""
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            let output = data.output || 'No output';
            if (data.error && data.error.trim()) {
                output += '\n\n--- Errors/Warnings ---\n' + data.error;
            }
            if (data.executionTime) {
                output += '\n\n--- Execution Time ---\n' + data.executionTime;
            }
            outputBox.textContent = output;
            outputBox.className = 'output-success';
        } else {
            outputBox.textContent = 'Error: ' + (data.error || 'Unknown error occurred');
            outputBox.className = 'output-error';
        }
        
    } catch (error) {
        console.error('Code execution failed:', error);
        outputBox.textContent = 'Failed to execute code: ' + error.message;
        outputBox.className = 'output-error';
    } finally {
        btn.textContent = 'Run Code';
        btn.disabled = false;
    }
}

// Submit solution function
async function submitSolution(btn) {
    if (!currentProblem) {
        alert('No problem loaded. Please try refreshing the page.');
        return;
    }
    
    const code = editor.getValue().trim();
    if (!code) {
        alert('Please write some code before submitting.');
        return;
    }
    
    btn.textContent = 'Submitting...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`/api/problems/${currentProblem.problemId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                language: langSelector.value
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            outputBox.innerHTML = `
                <div class="submission-result success">
                    <h4>✅ Solution Submitted Successfully!</h4>
                    <p><strong>Status:</strong> ${data.submission.status}</p>
                    <p><strong>Score:</strong> ${data.submission.score}/${data.submission.totalTestCases}</p>
                    <p><strong>Execution Time:</strong> ${data.submission.executionTime || 'N/A'}</p>
                    ${data.submission.feedback ? `<p><strong>Feedback:</strong> ${data.submission.feedback}</p>` : ''}
                </div>
            `;
            outputBox.className = 'output-success';
        } else {
            outputBox.innerHTML = `
                <div class="submission-result error">
                    <h4>❌ Submission Failed</h4>
                    <p>${data.error || 'Unknown error occurred'}</p>
                </div>
            `;
            outputBox.className = 'output-error';
        }
        
    } catch (error) {
        console.error('Submission failed:', error);
        outputBox.innerHTML = `
            <div class="submission-result error">
                <h4>❌ Submission Failed</h4>
                <p>Failed to submit solution: ${error.message}</p>
            </div>
        `;
        outputBox.className = 'output-error';
    } finally {
        btn.textContent = 'Submit Solution';
        btn.disabled = false;
    }
}

function changeLang(list) {
    if (list.value === 'c' || list.value === 'c++') {
        editor.session.setMode('ace/mode/c_cpp');
    }
    else {
        editor.session.setMode('ace/mode/' + list.value);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Try to get problem ID from URL first
    const problemId = getUrlParameter('problemId');
    
    if (problemId) {
        // Load problem from API using URL parameter
        loadProblem(problemId);
    } else {
        // Fallback to localStorage for backward compatibility
        const storedProblem = localStorage.getItem('selectedProblem');
        if (storedProblem) {
            try {
                currentProblem = JSON.parse(storedProblem);
                displayProblem(currentProblem);
            } catch (error) {
                console.error('Error parsing stored problem:', error);
            }
        } else {
            // Fallback to old localStorage method
            challengeTitle.textContent = localStorage.getItem('problemTitle') || 'No Problem Selected';
            challengeDesc.textContent = localStorage.getItem('problemDescription') || 'Please select a problem from the challenges page.';
        }
    }
});