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
        const response = await fetch(`/api/problems/${currentProblem._id}/submit`, {
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
            displaySubmissionResults(data.submission);
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

// Display detailed submission results
function displaySubmissionResults(submission) {
    const isAccepted = submission.status === 'accepted';
    const statusIcon = isAccepted ? '✅' : '❌';
    const statusText = submission.status.replace(/_/g, ' ').toUpperCase();
    
    let resultHTML = `
        <div class="submission-result ${isAccepted ? 'success' : 'error'}">
            <div class="submission-header">
                <h4>${statusIcon} ${statusText}</h4>
                <div class="submission-score">
                    <span class="score-badge ${isAccepted ? 'success' : 'partial'}">${submission.score}%</span>
                </div>
            </div>
            
            <div class="submission-stats">
                <div class="stat-item">
                    <span class="stat-label">Test Cases:</span>
                    <span class="stat-value">${submission.testCasesPassed}/${submission.totalTestCases}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Execution Time:</span>
                    <span class="stat-value">${(submission.executionTime || 0).toFixed(3)}ms</span>
                </div>
            </div>
            
            <div class="submission-feedback">
                <p><strong>Feedback:</strong> ${submission.feedback}</p>
            </div>
    `;
    
    // Add detailed test case results if available
    if (submission.testResults && submission.testResults.length > 0) {
        resultHTML += `
            <div class="test-results">
                <h5>📊 Test Case Details</h5>
                <div class="test-cases-container">
        `;
        
        submission.testResults.forEach((testResult, index) => {
            if (!testResult.isHidden) {  // Only show non-hidden test cases
                const testIcon = testResult.passed ? '✅' : '❌';
                const testStatus = testResult.passed ? 'passed' : 'failed';
                
                resultHTML += `
                    <div class="test-case ${testStatus}">
                        <div class="test-case-header">
                            <span>${testIcon} Test Case ${index + 1}</span>
                            <span class="execution-time">${(testResult.executionTime || 0).toFixed(3)}ms</span>
                        </div>
                `;
                
                if (!testResult.passed) {
                    resultHTML += `
                        <div class="test-case-details">
                            <div class="test-input">
                                <strong>Input:</strong>
                                <code>${testResult.input || 'No input'}</code>
                            </div>
                            <div class="test-expected">
                                <strong>Expected Output:</strong>
                                <code>${testResult.expectedOutput}</code>
                            </div>
                            <div class="test-actual">
                                <strong>Your Output:</strong>
                                <code>${testResult.actualOutput || 'No output'}</code>
                            </div>
                            ${testResult.errorMessage ? `
                                <div class="test-error">
                                    <strong>Error:</strong>
                                    <code>${testResult.errorMessage}</code>
                                </div>
                            ` : ''}
                        </div>
                    `;
                } else {
                    resultHTML += `
                        <div class="test-case-details">
                            <div class="test-input">
                                <strong>Input:</strong>
                                <code>${testResult.input || 'No input'}</code>
                            </div>
                            <div class="test-output">
                                <strong>Output:</strong>
                                <code>${testResult.actualOutput}</code>
                            </div>
                        </div>
                    `;
                }
                
                resultHTML += `</div>`;
            }
        });
        
        // Show summary for hidden test cases
        const hiddenTests = submission.testResults.filter(t => t.isHidden);
        if (hiddenTests.length > 0) {
            const hiddenPassed = hiddenTests.filter(t => t.passed).length;
            resultHTML += `
                <div class="hidden-tests-summary">
                    <span>🔒 Hidden Test Cases: ${hiddenPassed}/${hiddenTests.length} passed</span>
                </div>
            `;
        }
        
        resultHTML += `
                </div>
            </div>
        `;
    }
    
    resultHTML += `</div>`;
    
    outputBox.innerHTML = resultHTML;
    outputBox.className = isAccepted ? 'output-success' : 'output-error';
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