/**
 * ArenaCodeManager.js - Code editor and execution management
 */

class ArenaCodeManager {
    constructor() {
        this.codeEditor = null;
        this.defaultTemplates = {
            javascript: `function solution() {
    // Your code here
    
}`,
            python: `def solution():
    # Your code here
    pass`,
            'c++': `#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
            java: `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`
        };
    }

    async setupCodeEditor() {
        return new Promise((resolve, reject) => {
            try {
                // Use ACE Editor just like coder.js
                
                // Configure ACE paths to prevent worker loading issues
                ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6/');
                ace.config.set('modePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6/');
                ace.config.set('themePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6/');
                ace.config.set('workerPath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.9.6/');
                
                ace.require("ace/ext/language_tools");

                this.codeEditor = ace.edit("codeEditor", {
                    mode: "ace/mode/javascript", // Start with JavaScript mode
                    selectionStyle: "text",
                    theme: "ace/theme/monokai",
                    enableBasicAutocompletion: true
                });

                // Set default code
                this.codeEditor.setValue(this.getDefaultCode('javascript'));
                this.codeEditor.clearSelection();

                resolve(this.codeEditor);
            } catch (error) {
                console.error('❌ Error creating ACE editor:', error);
                reject(error);
            }
        });
    }

    getDefaultCode(language) {
        return this.defaultTemplates[language] || this.defaultTemplates.javascript;
    }

    changeLanguage(codeEditor, language) {
        if (codeEditor) {
            const currentCode = codeEditor.getValue();
            // Only change if it's still the default template
            if (this.isDefaultTemplate(currentCode)) {
                codeEditor.setValue(this.getDefaultCode(language));
                codeEditor.clearSelection();
            }
            
            // Set ACE Editor mode based on language
            const aceMode = this.getAceMode(language);
            codeEditor.session.setMode(aceMode);
        }
    }

    getAceMode(language) {
        const modeMap = {
            'javascript': 'ace/mode/javascript',
            'python': 'ace/mode/python',
            'c++': 'ace/mode/c_cpp',
            'java': 'ace/mode/java'
        };
        return modeMap[language] || modeMap['javascript'];
    }

    isDefaultTemplate(code) {
        const trimmed = code.trim();
        return trimmed.includes('Your code here') || trimmed.length < 50;
    }

    async runTest(socket, currentMatch, codeEditor, currentLanguage) {
        if (!codeEditor) {
            console.error('Code editor not available');
            return;
        }
        
        const code = codeEditor.getValue();
        if (!code.trim()) {
            window.arena?.showNotification('Please write some code first!', 'warning');
            return;
        }
        
        this.updateButtonState('runTestBtn', true, '⏳ Testing...');
        
        try {
            // Emit test run to server (Arena uses socket, not HTTP endpoint)
            socket.emit('arena:submit', {
                matchId: currentMatch.matchId,
                code: code,
                language: currentLanguage,
                isTest: true  // This tells the server it's a test run, not a submission
            });
            
        } catch (error) {
            console.error('❌ Test execution failed:', error);
            this.displayResults({
                success: false,
                error: error.message,
                feedback: 'Test execution failed'
            }, true);
            this.updateButtonState('runTestBtn', false, '▶️ Run & Test');
        }
    }

    async submitSolution(socket, currentMatch, codeEditor, currentLanguage) {
        if (!codeEditor) return;
        
        const code = codeEditor.getValue();
        if (!code.trim()) {
            window.arena.showNotification('Please write some code first!', 'warning');
            return;
        }
        
        // Confirm submission
        if (!confirm('Are you sure you want to submit your solution?')) {
            return;
        }
        
        this.updateButtonState('submitBtn', true, '⏳ Submitting...');
        
        socket.emit('arena:submit', {
            matchId: currentMatch.matchId,
            code: code,
            language: currentLanguage,
            isTest: false
        });
    }

    updateButtonState(buttonId, disabled, text) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = disabled;
            button.textContent = text;
        }
    }

    handleTestResult(data) {
        console.log(`🧪 [Arena] Received test results for problem ${data.problemId} (${data.problemTitle})`);
        
        this.updateButtonState('runTestBtn', false, '▶️ Run & Test');
        
        if (data.success) {
            this.displayResults({
                success: true,
                results: data.results,
                totalTests: data.totalTests,
                passedTests: data.passedTests,
                feedback: data.feedback,
                status: 'completed'
            }, true);
        } else {
            this.displayResults({
                success: false,
                error: data.error,
                feedback: data.feedback || 'Test execution failed',
                status: 'error'
            }, true);
        }
    }

    handleSubmissionResult(data) {
        this.updateButtonState('submitBtn', false, '✅ Submit');
        
        // Display the submission results
        this.displayResults(data, false);
        
        // Show notification based on result
        if (data.result && data.result.success) {
            window.arena?.showNotification(`Question completed! +${data.result.points} points`, 'success');
        } else if (data.result && data.result.points > 0) {
            window.arena?.showNotification(`Partial credit: +${data.result.points} points. Moving to next question...`, 'warning');
        } else {
            window.arena?.showNotification('No points earned. Moving to next question...', 'info');
        }
    }

    displayResults(result, isTest) {
        const resultsPanel = document.getElementById('resultsPanel');
        const resultsStatus = document.getElementById('resultsStatus');
        const resultsContent = document.getElementById('resultsContent');
        
        if (!resultsPanel || !resultsStatus || !resultsContent) {
            console.warn('Results panel elements not found');
            return;
        }
        
        resultsPanel.style.display = 'block';
        
        // Update status
        resultsStatus.textContent = result.status || 'completed';
        resultsStatus.className = `status ${result.status}`;
        
        // Display results
        if (isTest) {
            this.displayTestResults(resultsContent, result);
        } else {
            this.displaySubmissionResults(resultsContent, result);
        }
    }

    displayTestResults(container, result) {
        if (result.results && Array.isArray(result.results)) {
            // Arena test results format
            container.innerHTML = `
                <div class="test-summary">
                    <h5>Test Results (Sample Cases)</h5>
                    <p>${result.passedTests || 0}/${result.totalTests || 0} test cases passed</p>
                    ${result.feedback ? `<p class="feedback">${result.feedback}</p>` : ''}
                </div>
                ${result.results.map((test, index) => `
                    <div class="test-case ${test.passed ? 'passed' : 'failed'}">
                        <h5>Test Case ${index + 1} ${test.passed ? '✅' : '❌'}</h5>
                        <pre><strong>Input:</strong> ${test.input || 'No input'}</pre>
                        <pre><strong>Expected:</strong> ${test.expectedOutput || 'No expected output'}</pre>
                        <pre><strong>Your Output:</strong> ${test.actualOutput || 'No output'}</pre>
                        ${test.errorMessage ? `<pre class="error"><strong>Error:</strong> ${test.errorMessage}</pre>` : ''}
                        ${test.executionTime ? `<pre><strong>Execution Time:</strong> ${test.executionTime}ms</pre>` : ''}
                    </div>
                `).join('')}
            `;
        } else {
            // Fallback for other formats
            container.innerHTML = `
                <div class="test-summary">
                    <h5>Test Results</h5>
                    <p>${result.feedback || 'Test completed'}</p>
                    ${result.error ? `<p class="error">Error: ${result.error}</p>` : ''}
                </div>
            `;
        }
    }

    displaySubmissionResults(container, result) {
        if (result.result) {
            // Arena submission format
            const submissionResult = result.result;
            container.innerHTML = `
                <div class="submission-summary">
                    <h5>Submission Results</h5>
                    <p><strong>Status:</strong> ${submissionResult.success ? 'Accepted ✅' : 'Partial/Wrong ⚠️'}</p>
                    <p><strong>Score:</strong> +${submissionResult.points || 0} points</p>
                    <p><strong>Test Cases:</strong> ${submissionResult.testCasesPassed || 0}/${submissionResult.totalTestCases || 0} passed</p>
                    ${submissionResult.executionTime ? `<p><strong>Execution Time:</strong> ${submissionResult.executionTime}ms</p>` : ''}
                    <p><strong>Feedback:</strong> ${submissionResult.feedback || 'No feedback available'}</p>
                    ${result.playerProgress ? `
                        <div class="progress-update">
                            <p><strong>Your Progress:</strong></p>
                            <p>Total Score: ${result.playerProgress.score}</p>
                            <p>Questions Completed: ${result.playerProgress.questionsCompleted}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="next-question-notice">
                    <p>⏭️ Moving to next question in 3 seconds...</p>
                </div>
            `;
        } else {
            // Fallback format
            container.innerHTML = `
                <div class="submission-summary">
                    <h5>Submission Results</h5>
                    <p>Score: ${result.score || 0}%</p>
                    <p>${result.testCasesPassed || 0}/${result.totalTestCases || 0} test cases passed</p>
                    <p><strong>${result.feedback || 'Submission processed'}</strong></p>
                </div>
            `;
        }
    }

    getCode() {
        return this.codeEditor ? this.codeEditor.getValue() : '';
    }

    setCode(code) {
        if (this.codeEditor) {
            this.codeEditor.setValue(code);
        }
    }

    resetEditor(language = 'javascript') {
        if (this.codeEditor) {
            this.codeEditor.setValue(this.getDefaultCode(language));
        }
    }

    dispose() {
        if (this.codeEditor) {
            this.codeEditor.dispose();
            this.codeEditor = null;
        }
    }
}

window.ArenaCodeManager = ArenaCodeManager;
