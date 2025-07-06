// Initialize Clerk
window.addEventListener('load', async () => {
    if (typeof Clerk !== 'undefined') {
        try {
            await Clerk.load();
            console.log('Clerk initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Clerk:', error);
        }
    }
});

// Mobile menu toggle functionality
const menuToggle = document.getElementById('menu-toggle');
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

// Initialize AI Assistance for beginner-level problems
let aiAssistanceInstance = null;

function initializeAIAssistance() {
    console.log('🚀 Initializing AI Assistance...');
    console.log('Current problem:', currentProblem);
    console.log('Problem difficulty:', currentProblem?.difficulty);
    
    // Only enable AI assistance for Easy difficulty problems (beginner level)
    if (currentProblem && currentProblem.difficulty === 'easy') {
        const currentLanguage = getCurrentLanguage();
        console.log('🤖 Creating AI Assistance Manager for language:', currentLanguage);
        
        aiAssistanceInstance = new AIAssistanceManager(editor, currentLanguage);
        aiAssistanceInstance.setProblem(currentProblem);
        
        // Set global reference for onclick handlers
        window.currentAIAssistance = aiAssistanceInstance;
        
        console.log('✅ AI Assistance enabled for beginner level problem');
    } else if (aiAssistanceInstance) {
        // Disable AI assistance for non-beginner problems
        console.log('🚫 Disabling AI assistance for non-beginner problem');
        aiAssistanceInstance.destroy();
        aiAssistanceInstance = null;
        window.currentAIAssistance = null;
        console.log('🤖 AI Assistance disabled for non-beginner level problem');
    } else {
        console.log('ℹ️ No AI assistance needed - not an easy problem or already disabled');
    }
}

function getCurrentLanguage() {
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        return langSelector.value;
    }
    // Default language mapping based on ace mode
    const mode = editor.session.getMode().$id;
    if (mode.includes('c_cpp')) return 'c++';
    if (mode.includes('python')) return 'python';
    if (mode.includes('java')) return 'java';
    if (mode.includes('javascript')) return 'javascript';
    return 'javascript'; // fallback
}

// Auto-detect language based on code content
function detectLanguageFromCode(code) {
    const trimmedCode = code.trim();
    
    // C++ indicators (check before C and Python due to #include)
    if (trimmedCode.includes('#include') || 
        trimmedCode.includes('std::') ||
        trimmedCode.includes('cout <<') ||
        trimmedCode.includes('using namespace')) {
        return 'c++';
    }
    
    // C indicators (check before Python due to #include)
    if (trimmedCode.includes('printf(') || 
        trimmedCode.includes('scanf(') ||
        (trimmedCode.includes('#include') && trimmedCode.includes('stdio.h'))) {
        return 'c';
    }
    
    // Python indicators
    if (trimmedCode.includes('print(') || 
        trimmedCode.includes('def ') || 
        trimmedCode.includes('import ') ||
        trimmedCode.includes('from ') ||
        (trimmedCode.startsWith('#') && !trimmedCode.includes('#include'))) {
        return 'python';
    }
    
    // Java indicators
    if (trimmedCode.includes('public class') || 
        trimmedCode.includes('System.out.print') ||
        trimmedCode.includes('public static void main')) {
        return 'java';
    }
    
    // JavaScript indicators
    if (trimmedCode.includes('console.log') || 
        trimmedCode.includes('function ') ||
        trimmedCode.includes('const ') ||
        trimmedCode.includes('let ')) {
        return 'javascript';
    }
    
    // Default to current selector value
    return getCurrentLanguage();
}

// Make it globally available
window.detectLanguageFromCode = detectLanguageFromCode;

// Enhanced language change handler
function updateLanguage(list) {
    const selectedLang = list.value;
    
    if (selectedLang === 'cpp') {
        editor.session.setMode('ace/mode/c_cpp');
    } else if (selectedLang === 'python') {
        editor.session.setMode('ace/mode/python');
    } else if (selectedLang === 'java') {
        editor.session.setMode('ace/mode/java');
    } else {
        editor.session.setMode('ace/mode/' + selectedLang);
    }
    
    // Update AI assistance when language changes
    if (aiAssistanceInstance && currentProblem && currentProblem.difficulty === 'easy') {
        aiAssistanceInstance.setLanguage(selectedLang);
    }
}

// Add language selector event listener
document.addEventListener('DOMContentLoaded', function() {
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.addEventListener('change', function() {
            updateLanguage(this);
        });
    }
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
        const response = await fetch(`/api/problems/${problemId}`, {
            credentials: 'include'
        });
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
    
    // Initialize AI Assistance for beginner-level problems
    setTimeout(() => {
        initializeAIAssistance();
    }, 500); // Small delay to ensure DOM is ready
}

// eslint-disable-next-line no-unused-vars
async function runCode(btn) {
    btn.textContent = 'Running...';
    btn.disabled = true;
    
    try {
        const response = await fetch(window.location.origin + "/api/run/" + langSelector.value, {
            method: 'POST',
            headers: {
                "content-type": "application/json"
            },
            credentials: 'include',
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
                
                // If AI assistance is enabled and this is a beginner problem, suggest fixes
                if (aiAssistanceInstance && currentProblem && currentProblem.difficulty === 'easy') {
                    aiAssistanceInstance.suggestFix(data.error);
                }
            }
            if (data.executionTime) {
                output += '\n\n--- Execution Time ---\n' + data.executionTime;
            }
            outputBox.textContent = output;
            outputBox.className = 'output-success';
        } else {
            const errorMessage = data.error || 'Unknown error occurred';
            outputBox.textContent = 'Error: ' + errorMessage;
            outputBox.className = 'output-error';
            
            // If AI assistance is enabled and this is a beginner problem, suggest fixes
            if (aiAssistanceInstance && currentProblem && currentProblem.difficulty === 'easy') {
                aiAssistanceInstance.suggestFix(errorMessage);
            }
        }
        
    } catch (error) {
        console.error('Code execution failed:', error);
        const errorMessage = 'Failed to execute code: ' + error.message;
        outputBox.textContent = errorMessage;
        outputBox.className = 'output-error';
        
        // If AI assistance is enabled and this is a beginner problem, suggest fixes
        if (aiAssistanceInstance && currentProblem && currentProblem.difficulty === 'easy') {
            aiAssistanceInstance.suggestFix(error.message);
        }
    } finally {
        btn.textContent = 'Run Code';
        btn.disabled = false;
    }
}

// Submit solution function
// eslint-disable-next-line no-unused-vars
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
            credentials: 'include',
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
            
            // Handle successful test completion - disable AI assistance if all tests pass
            if (data.submission.status === 'accepted') {
                console.log('🎉 All tests passed! Disabling AI assistance...');
                
                // Disable AI assistance since the problem is solved correctly
                if (aiAssistanceInstance) {
                    aiAssistanceInstance.disableForSuccess();
                    console.log('✅ AI assistance disabled - problem solved successfully!');
                }
            } else {
                // AI assistance for failed test cases (Easy problems only)
                if (aiAssistanceInstance && currentProblem && currentProblem.difficulty === 'easy' && 
                    data.submission.testResults) {
                    
                    // Analyze failed test cases with AI
                    aiAssistanceInstance.analyzeTestCaseFailure({
                        status: data.submission.status,
                        testCasesPassed: data.submission.testCasesPassed,
                        totalTestCases: data.submission.totalTestCases,
                        testResults: data.submission.testResults.filter(test => !test.passed),
                        feedback: data.submission.feedback
                    });
                }
            }
            
            // Handle different solve scenarios
            if (data.submission.status === 'accepted') {
                if (data.isFirstSolve && data.updatedStats) {
                    // First time solving this problem - full celebration
                    showSuccessNotification(data.updatedStats, true);
                    localStorage.setItem('statsUpdated', 'true');
                    localStorage.setItem('updatedStats', JSON.stringify(data.updatedStats));
                } else if (data.alreadySolved) {
                    // Already solved before - show different message
                    showAlreadySolvedNotification();
                } else {
                    // Solved but stats didn't update (edge case)
                    showSuccessNotification(null, false);
                }
            }
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

// Show success notification when problem is solved
function showSuccessNotification(updatedStats, isFirstSolve = true) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    
    let content = '';
    if (isFirstSolve && updatedStats) {
        content = `
            <div class="notification-content">
                <div class="success-icon">🎉</div>
                <div class="success-message">
                    <h3>Problem Solved Successfully!</h3>
                    <p class="first-solve-badge">🌟 First Time Solve - Stats Updated! 🌟</p>
                    <div class="stats-update">
                        <div class="stat-item">
                            <span class="stat-label">Rank:</span>
                            <span class="stat-value">#${updatedStats.rank}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Streak:</span>
                            <span class="stat-value">${updatedStats.streak_count} days</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Problems Solved:</span>
                            <span class="stat-value">${updatedStats.problemsSolved}</span>
                        </div>
                    </div>
                    <button class="continue-btn" onclick="this.closest('.success-notification').remove()">
                        Continue Coding! 🚀
                    </button>
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="notification-content">
                <div class="success-icon">✅</div>
                <div class="success-message">
                    <h3>Solution Accepted!</h3>
                    <p>Great job! Your solution passed all test cases.</p>
                    <button class="continue-btn" onclick="this.closest('.success-notification').remove()">
                        Continue! 👍
                    </button>
                </div>
            </div>
        `;
    }
    
    notification.innerHTML = content;

    // Add styles for the notification
    const style = document.createElement('style');
    style.textContent = `
        .success-notification {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in;
        }
        
        .notification-content {
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
            border: 2px solid #48bb78;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
        }
        
        .success-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .success-message h3 {
            color: #48bb78;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        
        .first-solve-badge {
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            color: #2d3748;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        .stats-update {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: #a0aec0;
            margin-bottom: 5px;
        }
        
        .stat-value {
            font-weight: bold;
            color: #48bb78;
            font-size: 1.1rem;
        }
        
        .continue-btn {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 15px;
            transition: transform 0.2s ease;
        }
        
        .continue-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(72, 187, 120, 0.4);
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds for first solve, 4 for repeat
    const timeout = isFirstSolve ? 8000 : 4000;
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
            style.remove();
        }
    }, timeout);
}

// Show notification for already solved problems
function showAlreadySolvedNotification() {
    const notification = document.createElement('div');
    notification.className = 'already-solved-notification';
    notification.innerHTML = `
        <div class="notification-content already-solved">
            <div class="info-icon">💡</div>
            <div class="info-message">
                <h3>Solution Accepted!</h3>
                <p class="already-solved-text">You've already solved this problem before.</p>
                <p class="no-stats-text">Stats won't be updated for repeat solutions.</p>
                <div class="suggestion-box">
                    <strong>💪 Challenge yourself:</strong>
                    <ul>
                        <li>Try a different approach</li>
                        <li>Optimize for better performance</li>
                        <li>Solve in a different language</li>
                    </ul>
                </div>
                <button class="continue-btn secondary" onclick="this.closest('.already-solved-notification').remove()">
                    Got it! 👌
                </button>
            </div>
        </div>
    `;

    // Add specific styles for already solved notification
    const style = document.createElement('style');
    style.textContent = `
        .already-solved-notification {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in;
        }
        
        .notification-content.already-solved {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            border: 2px solid #ffc107;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            max-width: 450px;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
        }
        
        .info-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .info-message h3 {
            color: #ffc107;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        
        .already-solved-text {
            color: #ffc107;
            font-weight: 500;
            margin-bottom: 10px;
        }
        
        .no-stats-text {
            color: #a0aec0;
            font-size: 0.9rem;
            margin-bottom: 20px;
        }
        
        .suggestion-box {
            background: rgba(255, 193, 7, 0.1);
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 5px;
        }
        
        .suggestion-box strong {
            color: #ffc107;
            display: block;
            margin-bottom: 10px;
        }
        
        .suggestion-box ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .suggestion-box li {
            margin-bottom: 5px;
            color: #e2e8f0;
        }
        
        .continue-btn.secondary {
            background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%);
            color: #2d3748;
        }
        
        .continue-btn.secondary:hover {
            box-shadow: 0 5px 15px rgba(255, 193, 7, 0.4);
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
            style.remove();
        }
    }, 6000);
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

// Language change function
// eslint-disable-next-line no-unused-vars
function changeLang(list) {
    const selectedLang = list.value;
    
    // Update editor mode
    if (selectedLang === 'c' || selectedLang === 'c++') {
        editor.session.setMode('ace/mode/c_cpp');
    }
    else {
        editor.session.setMode('ace/mode/' + selectedLang);
    }
    
    // Update AI assistance language if it's active and for easy problems
    if (aiAssistanceInstance && currentProblem && currentProblem.difficulty === 'easy') {
        console.log(`🔄 Updating AI assistance language to: ${selectedLang}`);
        aiAssistanceInstance.setLanguage(selectedLang);
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

