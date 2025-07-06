class AIAssistanceManager {
    constructor(codeEditor, language = 'javascript') {
        this.codeEditor = codeEditor;
        this.language = language;
        this.currentProblem = null;
        this.isEnabled = true;
        this.debounceTimer = null;
        this.lastAnalyzedCode = '';
        this.currentSuggestions = [];
        this.lineDecorations = [];
        this.quickFixAnnotations = [];
        this.testCaseResults = null;
        
        this.init();
    }

    init() {
        this.createAssistanceUI();
        this.setupEventListeners();
        this.setupLineDecorations();
        this.loadLanguageTips();
        console.log('AI Assistance initialized');
    }

    createAssistanceUI() {
        // Create a minimal AI status indicator (VS Code-like)
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'ai-status-indicator';
        statusIndicator.className = 'ai-status-indicator';
        statusIndicator.innerHTML = `
            <div class="ai-status-content">
                <span class="ai-status-icon">🤖</span>
                <span class="ai-status-text">AI Assistant Active</span>
                <button class="ai-status-toggle" id="ai-toggle" title="Toggle AI Assistance">
                    <span class="toggle-icon">👁️</span>
                </button>
            </div>
        `;

        // Add to the page header or top of editor area
        const editorContainer = document.querySelector('.code-editor-container') || 
                               document.querySelector('.editor-section') ||
                               document.querySelector('#code-editor-section') ||
                               document.body;
        
        editorContainer.insertBefore(statusIndicator, editorContainer.firstChild);
        this.addAssistanceStyles();
    }

    addAssistanceStyles() {
        const styles = `
            <style id="ai-assistance-styles">
                /* VS Code-like Status Indicator */
                .ai-status-indicator {
                    background: var(--card-bg, #1e1e1e);
                    border-bottom: 1px solid var(--border-color, #333);
                    padding: 8px 16px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 12px;
                    color: var(--text-secondary, #aaa);
                    position: relative;
                    z-index: 5;
                }

                .ai-status-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .ai-status-icon {
                    font-size: 14px;
                    animation: pulse 3s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }

                .ai-status-text {
                    flex: 1;
                    font-weight: 500;
                }

                .ai-status-toggle {
                    background: transparent;
                    border: 1px solid var(--border-color, #444);
                    color: var(--text-secondary, #aaa);
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 10px;
                    transition: all 0.3s ease;
                }

                .ai-status-toggle:hover {
                    background: var(--accent-blue, #75f74d);
                    color: #000;
                    border-color: var(--accent-blue, #75f74d);
                }

                /* VS Code-like Lightbulb in Gutter */
                .ace_gutter-cell.has-ai-suggestion {
                    position: relative;
                }
                
                .ace_gutter-cell .ai-lightbulb {
                    position: absolute;
                    right: 2px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    z-index: 20;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 3px;
                    transition: all 0.2s ease;
                    font-size: 12px;
                }
                
                .ace_gutter-cell .ai-lightbulb:hover {
                    background: rgba(117, 247, 77, 0.2);
                    transform: translateY(-50%) scale(1.1);
                }
                
                .ace_gutter-cell .ai-lightbulb.suggestion {
                    color: #75f74d;
                }
                
                .ace_gutter-cell .ai-lightbulb.error {
                    color: #f56565;
                }
                
                .ace_gutter-cell .ai-lightbulb.warning {
                    color: #ffd43b;
                }
                
                /* VS Code-like Popup Overlay */
                .ai-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    z-index: 1000;
                    pointer-events: auto;
                }
                
                .ai-suggestion-popup {
                    position: absolute;
                    background: var(--card-bg, #2d2d2d);
                    border: 1px solid var(--border-color, #444);
                    border-radius: 6px;
                    padding: 0;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                    z-index: 1001;
                    min-width: 300px;
                    max-width: 450px;
                    font-family: 'Segoe UI', sans-serif;
                    overflow: hidden;
                    animation: popupFadeIn 0.2s ease-out;
                }

                @keyframes popupFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .ai-suggestion-popup .popup-header {
                    background: linear-gradient(135deg, var(--accent-blue, #75f74d) 0%, #2b8a3e 100%);
                    color: #000;
                    padding: 12px 16px;
                    font-weight: 600;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .ai-suggestion-popup .popup-header .header-icon {
                    font-size: 16px;
                }
                
                .ai-suggestion-popup .popup-content {
                    padding: 16px;
                    color: var(--text-primary, #e0e0e0);
                    line-height: 1.4;
                }

                .ai-suggestion-popup .suggestion-type {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-secondary, #aaa);
                    margin-bottom: 8px;
                    font-weight: 500;
                }

                .ai-suggestion-popup .suggestion-message {
                    font-size: 13px;
                    margin-bottom: 12px;
                    color: var(--text-primary, #e0e0e0);
                }

                .ai-suggestion-popup .suggestion-fix {
                    background: var(--bg-dark, #1a1a1a);
                    border: 1px solid var(--border-color, #333);
                    border-radius: 4px;
                    padding: 10px;
                    font-family: 'Fira Code', 'Courier New', monospace;
                    font-size: 12px;
                    color: var(--accent-blue, #75f74d);
                    margin-bottom: 12px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                
                .ai-suggestion-popup .popup-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                
                .ai-popup-btn {
                    background: var(--accent-blue, #75f74d);
                    color: #000;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background 0.2s ease;
                }
                
                .ai-popup-btn:hover {
                    background: #5fd83a;
                }
                
                .ai-popup-btn.secondary {
                    background: transparent;
                    color: var(--text-secondary, #aaa);
                    border: 1px solid var(--border-color, #444);
                }

                .ai-popup-btn.secondary:hover {
                    background: var(--bg-dark, #444);
                    color: var(--text-primary, #e0e0e0);
                }

                /* Line highlighting */
                .ace_line.ace_ai_highlight_error {
                    background-color: rgba(245, 101, 101, 0.1) !important;
                    border-left: 3px solid #f56565;
                }
                
                .ace_line.ace_ai_highlight_warning {
                    background-color: rgba(255, 212, 59, 0.1) !important;
                    border-left: 3px solid #ffd43b;
                }
                
                .ace_line.ace_ai_highlight_suggestion {
                    background-color: rgba(117, 247, 77, 0.1) !important;
                    border-left: 3px solid #75f74d;
                }

                /* Hide status when disabled */
                .ai-status-indicator.disabled {
                    opacity: 0.5;
                }

                .ai-status-indicator.disabled .ai-status-text::after {
                    content: " (Disabled)";
                    color: var(--text-secondary, #666);
                }
            </style>
        `;
        
        if (!document.getElementById('ai-assistance-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    // Remove old panel-based methods since we're using VS Code-like popup approach
    displaySuggestions() {
        // This method is no longer needed - suggestions are shown via lightbulb popup
    }

    displayErrors() {
        // This method is no longer needed - errors are shown via lightbulb popup  
    }

    displayWarnings() {
        // This method is no longer needed - warnings are shown via lightbulb popup
    }

    async loadLanguageTips() {
        // Language tips can be shown in popup when relevant
        try {
            const response = await fetch(`/api/ai/language-tips/${this.language}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentLanguageTips = data.tips;
            }
        } catch (error) {
            console.error('Failed to load language tips:', error);
        }
    }

    showThinking() {
        // Update status indicator to show AI is thinking
        const statusText = document.querySelector('.ai-status-text');
        if (statusText) {
            statusText.textContent = 'AI Assistant Analyzing...';
            setTimeout(() => {
                statusText.textContent = 'AI Assistant Active';
            }, 3000);
        }
    }

    showError(message) {
        console.error('AI Assistant Error:', message);
        const statusText = document.querySelector('.ai-status-text');
        if (statusText) {
            statusText.textContent = 'AI Assistant Error';
            setTimeout(() => {
                statusText.textContent = 'AI Assistant Active';
            }, 5000);
        }
    }
    
    showAuthenticationRequired() {
        const statusText = document.querySelector('.ai-status-text');
        if (statusText) {
            statusText.textContent = 'AI Assistant - Authentication Required';
            statusText.style.color = '#ffd43b';
        }
    }
    
    showNetworkError() {
        const statusText = document.querySelector('.ai-status-text');
        if (statusText) {
            statusText.textContent = 'AI Assistant - Network Error';
            statusText.style.color = '#f56565';
        }
    }

    toggleSection() {
        // No longer needed with popup approach
    }

    toggleAssistance() {
        this.isEnabled = !this.isEnabled;
        const indicator = document.getElementById('ai-status-indicator');
        const toggleBtn = document.getElementById('ai-toggle');
        
        if (indicator) {
            indicator.classList.toggle('disabled', !this.isEnabled);
        }
        
        if (toggleBtn) {
            toggleBtn.querySelector('.toggle-icon').textContent = this.isEnabled ? '👁️' : '🙈';
            toggleBtn.title = this.isEnabled ? 'Disable AI Assistance' : 'Enable AI Assistance';
        }

        // Clear existing decorations when disabled
        if (!this.isEnabled) {
            this.clearLineDecorations();
        }
    }

    setupEventListeners() {
        // Toggle AI assistance panel
        const toggleBtn = document.getElementById('ai-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleAssistance();
            });
        }

        // Set up enhanced code editor event listeners
        if (this.codeEditor) {
            // Real-time analysis (fast response for per-line help)
            this.codeEditor.on('change', () => {
                // Re-enable AI assistance if it was disabled due to successful solve
                // but user is now modifying the code (maybe to improve it)
                if (!this.isEnabled) {
                    this.reEnableAfterModification();
                }
                
                clearTimeout(this.realTimeTimer);
                this.realTimeTimer = setTimeout(() => {
                    this.performRealTimeAnalysis();
                }, 500); // Fast response for real-time feedback
            });

            // Traditional debounced analysis (comprehensive)
            this.codeEditor.on('change', () => {
                this.debouncedAnalyzeCode();
            });

            // Immediate contextual help on cursor position change
            this.codeEditor.on('changeCursor', (e) => {
                this.showContextualHelp();
            });

            // Code completion on selection change
            this.codeEditor.on('changeSelection', () => {
                this.handleSelectionChange();
            });
        }

        console.log('AI event listeners setup complete');
    }

    debouncedAnalyzeCode() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.analyzeCode();
        }, 1500); // Wait 1.5 seconds after user stops typing
    }

    async analyzeCode() {
        if (!this.isEnabled) return;

        const code = this.codeEditor.getValue();
        
        // Don't analyze if code hasn't changed significantly
        if (code === this.lastAnalyzedCode || code.trim().length < 5) {
            return;
        }

        this.lastAnalyzedCode = code;
        this.showThinking();

        try {
            const response = await fetch('/api/ai/analyze-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: this.language,
                    problem: this.currentProblem,
                    currentLine: this.codeEditor.getCursorPosition()?.row
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.displayAnalysis(data.analysis);
            } else {
                this.showError('Analysis failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('AI Analysis Error:', error);
            this.showError('Could not connect to AI service');
        }
    }

    displayAnalysis(analysis) {
        this.displaySuggestions(analysis.suggestions || []);
        this.displayErrors(analysis.errors || []);
        this.displayWarnings(analysis.warnings || []);
        
        // Show/hide sections based on content
        this.toggleSection('suggestions-section', analysis.suggestions?.length > 0);
        this.toggleSection('errors-section', analysis.errors?.length > 0);
        this.toggleSection('warnings-section', analysis.warnings?.length > 0);
    }

    displaySuggestions(suggestions) {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            container.innerHTML = '<div class="loading-message">Great job! No suggestions at the moment.</div>';
            return;
        }

        container.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" onclick="window.currentAIAssistance?.applySuggestion(${JSON.stringify(suggestion).replace(/"/g, '&quot;')})">
                ${suggestion.line !== undefined ? `<span class="item-line">Line ${suggestion.line + 1}</span>` : ''}
                <div class="item-message">${suggestion.message}</div>
                ${suggestion.fix ? `<div class="item-fix">💡 ${suggestion.fix}</div>` : ''}
            </div>
        `).join('');
    }

    displayErrors(errors) {
        const container = document.getElementById('ai-errors');
        if (!container) return;

        container.innerHTML = errors.map(error => `
            <div class="error-item" onclick="window.currentAIAssistance?.goToLine(${error.line})">
                <span class="item-line">Line ${error.line + 1}</span>
                <div class="item-message">${error.message}</div>
                ${error.fix ? `<div class="item-fix">🔧 ${error.fix}</div>` : ''}
            </div>
        `).join('');
    }

    displayWarnings(warnings) {
        const container = document.getElementById('ai-warnings');
        if (!container) return;

        container.innerHTML = warnings.map(warning => `
            <div class="warning-item" onclick="window.currentAIAssistance?.goToLine(${warning.line})">
                <span class="item-line">Line ${warning.line + 1}</span>
                <div class="item-message">${warning.message}</div>
                ${warning.fix ? `<div class="item-fix">✨ ${warning.fix}</div>` : ''}
            </div>
        `).join('');
    }

    async loadLanguageTips() {
        try {
            const response = await fetch(`/api/ai/language-tips/${this.language}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayLanguageTips(data.tips);
            }
        } catch (error) {
            console.error('Failed to load language tips:', error);
        }
    }

    displayLanguageTips(tips) {
        const container = document.getElementById('language-tips');
        if (!container) return;

        container.innerHTML = tips.map(tip => `
            <div class="tip-item">
                <div class="item-message">${tip}</div>
            </div>
        `).join('');
    }

    showThinking() {
        const container = document.getElementById('ai-suggestions');
        if (container) {
            container.innerHTML = '<div class="ai-thinking">Analyzing your code...</div>';
        }
    }

    showError(message) {
        const container = document.getElementById('ai-suggestions');
        if (container) {
            container.innerHTML = `<div class="loading-message">⚠️ ${message}</div>`;
        }
    }

    toggleSection(sectionId, show) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = show ? 'block' : 'none';
        }
    }

    toggleAssistance() {
        this.isEnabled = !this.isEnabled;
        const content = document.getElementById('ai-content');
        const toggleBtn = document.getElementById('ai-toggle');
        
        if (content) {
            content.classList.toggle('collapsed', !this.isEnabled);
        }
        
        if (toggleBtn) {
            toggleBtn.querySelector('.toggle-icon').textContent = this.isEnabled ? '👁️' : '🙈';
            toggleBtn.title = this.isEnabled ? 'Hide AI Assistance' : 'Show AI Assistance';
        }
    }

    setupLineDecorations() {
        // VS Code-like lightbulb system is handled in the main styles
        // This method now focuses on event handling for gutter interactions
        console.log('Setting up line decoration system');
        
        // Ensure gutter click handling is set up
        if (this.codeEditor && this.codeEditor.renderer) {
            this.setupGutterClickHandling();
        }
    }

    setupGutterClickHandling() {
        // Enhanced gutter click handling for lightbulb interactions
        // Since we're now adding click handlers directly to lightbulbs, 
        // this method serves as a fallback for general gutter clicks
        console.log('🎯 Setting up VS Code-like gutter click handling');
        
        if (!this.codeEditor || !this.codeEditor.renderer) {
            console.warn('⚠️ Code editor not ready for gutter click handling');
            return;
        }
        
        const renderer = this.codeEditor.renderer;
        const gutterElement = renderer.$gutterLayer.element;
        
        if (this.gutterClickListener) {
            gutterElement.removeEventListener('click', this.gutterClickListener);
        }
        
        this.gutterClickListener = (e) => {
            // Check if click was directly on a lightbulb (handled by lightbulb's own listener)
            if (e.target.classList.contains('ai-lightbulb')) {
                return; // Let the lightbulb handle its own click
            }
            
            // Handle clicks on gutter cells that contain lightbulbs
            const target = e.target.closest('.ace_gutter-cell.has-ai-suggestion');
            if (target) {
                const lightbulb = target.querySelector('.ai-lightbulb');
                if (lightbulb) {
                    // Trigger the lightbulb click
                    lightbulb.click();
                }
            }
        };
        
        gutterElement.addEventListener('click', this.gutterClickListener);
        console.log('Gutter click handling setup complete');
    }

    findSuggestionForLine(lineNumber) {
        return this.lineDecorations.find(decoration => 
            decoration.lineNumber === lineNumber
        );
    }

    async performRealTimeAnalysis() {
        if (!this.isEnabled) {
            console.log('🚫 AI assistance is disabled (problem solved or manually disabled)');
            return;
        }
        
        const code = this.codeEditor.getValue();
        const currentLine = this.codeEditor.getCursorPosition().row;
        const currentLineText = this.codeEditor.session.getLine(currentLine);
        
        // Skip analysis for empty lines or very short content
        if (!currentLineText.trim() || currentLineText.trim().length < 3) {
            return;
        }
        
        // Smart validation: Don't analyze simple, complete solutions
        if (this.isSimpleCompleteSolution(code)) {
            console.log('🎯 Code appears to be a complete, simple solution - skipping unnecessary analysis');
            return;
        }
        
        // Smart language detection based on code content
        const detectedLanguage = window.detectLanguageFromCode ? window.detectLanguageFromCode(code) : this.language;
        if (detectedLanguage !== this.language) {
            this.language = detectedLanguage;
            
            // Update the language selector in the UI
            const langSelector = document.getElementById('language-selector');
            if (langSelector && langSelector.value !== detectedLanguage) {
                langSelector.value = detectedLanguage;
                
                // Trigger the language change event to update editor mode
                if (window.changeLang) {
                    window.changeLang(langSelector);
                }
            }
        }
        
        try {
            const requestData = {
                code: code,
                currentLine: currentLine,
                currentLineText: currentLineText,
                language: this.language,
                problem: this.currentProblem
            };
            
            console.log('🔍 Making real-time analysis request:', {
                url: '/api/ai/real-time-analysis',
                method: 'POST',
                currentLine: currentLine,
                language: this.language,
                codeLength: code.length,
                windowLocation: window.location.href
            });
            
            const response = await fetch('/api/ai/real-time-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                console.error('❌ AI analysis request failed:', {
                    status: response.status, 
                    statusText: response.statusText,
                    url: response.url,
                    headers: Object.fromEntries(response.headers.entries())
                });
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                
                // Handle authentication errors specifically
                if (response.status === 401 || response.status === 403) {
                    console.warn('🔐 Authentication required for AI assistance');
                    this.showAuthenticationRequired();
                }
                return;
            }

            const data = await response.json();
            console.log('✅ AI analysis response:', data);
            
            if (data.success) {
                this.updateLineDecorations(data.analysis);
            } else {
                console.warn('⚠️ AI analysis unsuccessful:', data.error);
            }
        } catch (error) {
            console.error('❌ Real-time analysis error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });
            
            // Check if it's a network error
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.error('🌐 Network error - check if server is running and accessible');
                this.showNetworkError();
            }
        }
    }

    updateLineDecorations(analysis) {
        // Clear existing decorations
        this.clearLineDecorations();
        
        // Add new decorations based on AI analysis
        if (analysis.lineAnalysis && analysis.lineAnalysis.length > 0) {
            analysis.lineAnalysis.forEach(lineData => {
                this.addLineDecoration(lineData.line, lineData.type, lineData.message, lineData.fix);
            });
        }
    }

    addLineDecoration(lineNumber, type, message, fix) {
        const Range = ace.require('ace/range').Range;
        
        // Add line highlighting
        const range = new Range(lineNumber, 0, lineNumber, 1);
        const markerId = this.codeEditor.session.addMarker(range, `ace_ai_highlight_${type}`, "fullLine");
        
        // Create lightbulb element in gutter
        this.addLightbulbToGutter(lineNumber, type, message, fix);
        
        // Store decoration info for cleanup
        this.lineDecorations.push({
            markerId: markerId,
            lineNumber: lineNumber,
            type: type,
            message: message,
            fix: fix
        });
    }

    addLightbulbToGutter(lineNumber, type, message, fix) {
        // Wait for the editor to be ready and use a more robust approach
        const addLightbulbWhenReady = () => {
            try {
                const gutterLayer = this.codeEditor.renderer.$gutterLayer;
                if (!gutterLayer || !gutterLayer.element) {
                    setTimeout(addLightbulbWhenReady, 50);
                    return;
                }

                // Force editor to update gutter
                this.codeEditor.renderer.updateFull();
                
                // Get all gutter cells after update
                const gutterCells = gutterLayer.element.querySelectorAll('.ace_gutter-cell');
                
                if (gutterCells.length === 0) {
                    setTimeout(addLightbulbWhenReady, 100);
                    return;
                }
                
                // ACE Editor might render lines dynamically, so we need to find the right cell
                let targetGutterCell = null;
                
                // Method 1: Try to find by line number text content
                // Handle both 0-based and 1-based line number conventions
                let targetLineText;
                
                // First, try assuming the lineNumber is 0-based (ACE convention)
                targetLineText = String(lineNumber + 1);
                gutterCells.forEach((cell, index) => {
                    const cellText = cell.textContent.trim();
                    if (cellText === targetLineText) {
                        targetGutterCell = cell;
                    }
                });
                
                // If not found, try assuming the lineNumber is already 1-based
                if (!targetGutterCell) {
                    targetLineText = String(lineNumber);
                    gutterCells.forEach((cell, index) => {
                        const cellText = cell.textContent.trim();
                        if (cellText === targetLineText) {
                            targetGutterCell = cell;
                        }
                    });
                }
                
                // Method 3: Handle special cases and edge cases
                if (!targetGutterCell) {
                    // For line 0 specifically, it's often the first visible cell
                    if (lineNumber === 0 && gutterCells.length > 0) {
                        targetGutterCell = gutterCells[0];
                    }
                    // For line 1, and we only have one cell with text "1", use it
                    else if (lineNumber === 1 && gutterCells.length === 1 && gutterCells[0].textContent.trim() === "1") {
                        targetGutterCell = gutterCells[0];
                    }
                    // For any line, if we have a corresponding index, try that
                    else if (lineNumber < gutterCells.length) {
                        targetGutterCell = gutterCells[lineNumber];
                    }
                    // Final attempt: if line number - 1 is a valid index, try that
                    else if (lineNumber > 0 && (lineNumber - 1) < gutterCells.length) {
                        targetGutterCell = gutterCells[lineNumber - 1];
                    }
                }
                
                // Method 4: Final fallback - try alternative approaches
                if (!targetGutterCell) {
                    // Look for cells with specific ACE classes or try pattern matching
                    gutterCells.forEach((cell, index) => {
                        if (cell.classList.contains('ace_gutter-cell') && !targetGutterCell) {
                            // Try matching based on cell content and position
                            const cellText = cell.textContent.trim();
                            const cellLineNumber = parseInt(cellText, 10);
                            
                            // Check if this cell represents our target line
                            if (cellLineNumber === lineNumber || cellLineNumber === lineNumber + 1) {
                                targetGutterCell = cell;
                            }
                        }
                    });
                }
                
                if (targetGutterCell) {
                    // Remove any existing lightbulb
                    const existingLightbulb = targetGutterCell.querySelector('.ai-lightbulb');
                    if (existingLightbulb) {
                        existingLightbulb.remove();
                    }
                    
                    // Create lightbulb element
                    const lightbulb = document.createElement('div');
                    lightbulb.className = `ai-lightbulb ${type}`;
                    lightbulb.dataset.line = lineNumber;
                    lightbulb.dataset.message = message;
                    lightbulb.dataset.fix = fix || '';
                    
                    // Set appropriate icon based on type
                    switch (type) {
                        case 'error':
                            lightbulb.textContent = '🔴';
                            break;
                        case 'warning':
                            lightbulb.textContent = '⚠️';
                            break;
                        case 'suggestion':
                        default:
                            lightbulb.textContent = '💡';
                            break;
                    }
                    
                    // Add click handler directly to the lightbulb
                    lightbulb.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showVSCodePopup(e, { type, message, fix }, lineNumber);
                    });
                    
                    // Add to gutter cell
                    targetGutterCell.appendChild(lightbulb);
                    targetGutterCell.classList.add('has-ai-suggestion');
                } else {
                    // Try alternative approach: Use ACE Editor's built-in decoration system
                    this.addAlternativeLightbulb(lineNumber, type, message, fix);
                }
            } catch (error) {
                console.error(`Error adding lightbulb to line ${lineNumber}:`, error);
            }
        };
        
        // Reset retry counter for this line
        this.retryCount = 0;
        addLightbulbWhenReady();
    }

    addAlternativeLightbulb(lineNumber, type, message, fix) {
        try {
            // Alternative approach: Use ACE Editor's annotation system
            const session = this.codeEditor.session;
            
            // Remove existing annotations for this line
            const existingAnnotations = session.getAnnotations() || [];
            const filteredAnnotations = existingAnnotations.filter(ann => ann.row !== lineNumber || !ann.className?.includes('ai-lightbulb'));
            
            // Create annotation with custom styling that looks like a lightbulb
            const annotation = {
                row: lineNumber,
                column: 0,
                text: message,
                type: type,
                className: `ai-lightbulb-annotation ${type}`,
                raw: fix
            };
            
            // Add the annotation
            session.setAnnotations([...filteredAnnotations, annotation]);
            
            // Create custom CSS for the annotation if not exists
            this.addAlternativeLightbulbStyles();
            
            // Set up click handler for the annotation
            this.setupAnnotationClickHandler(lineNumber, type, message, fix);
            
        } catch (error) {
            console.error(`Failed to add alternative lightbulb for line ${lineNumber}:`, error);
            
            // Final fallback: Show popup on double-click on the line
            this.setupLineClickFallback(lineNumber, type, message, fix);
        }
    }

    addAlternativeLightbulbStyles() {
        if (document.getElementById('ai-lightbulb-annotations')) return;
        
        const styles = `
            <style id="ai-lightbulb-annotations">
                .ace_gutter .ace_annotation.ai-lightbulb-annotation {
                    background: none !important;
                    position: relative;
                }
                
                .ace_gutter .ace_annotation.ai-lightbulb-annotation::before {
                    content: "💡";
                    position: absolute;
                    right: 2px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 12px;
                    cursor: pointer;
                    z-index: 10;
                    opacity: 0.8;
                    transition: opacity 0.3s ease;
                }
                
                .ace_gutter .ace_annotation.ai-lightbulb-annotation.error::before {
                    content: "🔴";
                }
                
                .ace_gutter .ace_annotation.ai-lightbulb-annotation.warning::before {
                    content: "⚠️";
                }
                
                .ace_gutter .ace_annotation.ai-lightbulb-annotation:hover::before {
                    opacity: 1;
                    transform: translateY(-50%) scale(1.1);
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupAnnotationClickHandler(lineNumber, type, message, fix) {
        // Set up a global click handler for gutter that checks for our annotations
        const gutterElement = this.codeEditor.renderer.$gutterLayer.element;
        
        const annotationClickHandler = (e) => {
            const rect = gutterElement.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const lineHeight = this.codeEditor.renderer.lineHeight;
            const clickedLine = Math.floor(y / lineHeight);
            
            // Check both direct line match and annotation pseudo-elements
            if (clickedLine === lineNumber || Math.abs(clickedLine - lineNumber) <= 1) {
                this.showVSCodePopup(e, { type, message, fix }, lineNumber);
            }
        };
        
        // Store handler for cleanup
        this.annotationClickHandlers = this.annotationClickHandlers || [];
        this.annotationClickHandlers.push({ handler: annotationClickHandler, element: gutterElement });
        
        gutterElement.addEventListener('click', annotationClickHandler);
    }

    setupLineClickFallback(lineNumber, type, message, fix) {
        // As a last resort, set up a click handler on the actual line content
        const originalHandler = this.codeEditor.on('click', (e) => {
            const position = e.getDocumentPosition();
            if (position.row === lineNumber) {
                this.showVSCodePopup(e.domEvent, { type, message, fix }, lineNumber);
            }
        });
        
        // Store for cleanup
        this.fallbackClickHandlers = this.fallbackClickHandlers || [];
        this.fallbackClickHandlers.push(originalHandler);
    }

    // Enhanced test case failure analysis
    async analyzeTestCaseFailure(testResults) {
        this.testCaseResults = testResults;
        
        try {
            const response = await fetch('/api/ai/analyze-test-failure', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: this.codeEditor.getValue(),
                    language: this.language,
                    problem: this.currentProblem,
                    testResults: testResults
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.displayTestFailureAnalysis(data.analysis);
            }
        } catch (error) {
            console.error('Test failure analysis error:', error);
        }
    }

    displayTestFailureAnalysis(analysis) {
        // Create a special section for test failure analysis
        const assistancePanel = document.getElementById('ai-assistance-panel');
        
        // Remove existing test failure section
        const existingSection = document.getElementById('test-failure-section');
        if (existingSection) {
            existingSection.remove();
        }
        
        const testFailureSection = document.createElement('div');
        testFailureSection.id = 'test-failure-section';
        testFailureSection.className = 'ai-section test-failure-analysis';
        testFailureSection.innerHTML = `
            <h4>🧪 Test Case Analysis</h4>
            <div class="test-failure-content">
                ${analysis.failedTests?.map(test => `
                    <div class="test-failure-item">
                        <div class="test-name">❌ ${test.name}</div>
                        <div class="test-expected">Expected: <code>${test.expected}</code></div>
                        <div class="test-actual">Got: <code>${test.actual}</code></div>
                        <div class="test-suggestion">💡 ${test.suggestion}</div>
                        ${test.codeChange ? `
                            <button class="ai-quick-fix-btn" onclick="window.currentAIAssistance.applyTestFix('${test.codeChange.replace(/'/g, "\\'")}')">
                                Apply Suggested Fix
                            </button>
                        ` : ''}
                    </div>
                `).join('') || '<div class="loading-message">No specific test failures detected</div>'}
            </div>
        `;
        
        // Insert at the top of the AI content
        const aiContent = document.getElementById('ai-content');
        if (aiContent) {
            aiContent.insertBefore(testFailureSection, aiContent.firstChild);
        }
    }

    applyTestFix(codeChange) {
        // Apply the suggested code change
        const lines = this.codeEditor.getValue().split('\n');
        
        // This is a simplified implementation - in practice, you'd want more sophisticated code replacement
        const modifiedCode = this.codeEditor.getValue().replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]+\}/, codeChange);
        
        this.codeEditor.setValue(modifiedCode);
        this.codeEditor.clearSelection();
        
        // Trigger re-analysis
        setTimeout(() => {
            this.performRealTimeAnalysis();
        }, 500);
    }

    // Helper methods for user interaction
    applySuggestion(suggestion) {
        // This would apply the suggestion to the code
        console.log('Applying suggestion:', suggestion);
        // Implementation depends on the specific suggestion
    }

    goToLine(lineNumber) {
        if (this.codeEditor && lineNumber !== undefined) {
            this.codeEditor.gotoLine(lineNumber + 1, 0, true);
            this.codeEditor.focus();
        }
    }

    handleCursorChange(e) {
        // Could implement cursor-specific suggestions here
    }

    handleSelectionChange() {
        // Could implement selection-based suggestions here
    }

    // Public methods
    setProblem(problem) {
        this.currentProblem = problem;
        this.analyzeCode(); // Re-analyze with new context
    }

    setLanguage(language) {
        this.language = language;
        this.loadLanguageTips();
        this.analyzeCode(); // Re-analyze with new language
    }

    async suggestFix(errorMessage) {
        const code = this.codeEditor.getValue();
        
        try {
            const response = await fetch('/api/ai/suggest-fix', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: this.language,
                    errorMessage: errorMessage
                })
            });

            const data = await response.json();
            
            if (data.success && data.fixSuggestion) {
                this.displayFixSuggestion(data.fixSuggestion);
            }
        } catch (error) {
            console.error('Fix suggestion error:', error);
        }
    }

    displayFixSuggestion(fixSuggestion) {
        const container = document.getElementById('ai-errors');
        if (container && fixSuggestion) {
            const fixElement = document.createElement('div');
            fixElement.className = 'error-item fix-suggestion';
            fixElement.innerHTML = `
                <div class="item-message">🔧 Fix Suggestion</div>
                <div class="item-fix">${fixSuggestion.explanation}</div>
                ${fixSuggestion.example ? `<div class="item-fix"><strong>Example:</strong> ${fixSuggestion.example}</div>` : ''}
            `;
            container.insertBefore(fixElement, container.firstChild);
        }
    }

    /**
     * Smart validation to avoid unnecessary suggestions for simple, complete solutions
     * @param {string} code - The complete code
     * @returns {boolean} True if this appears to be a simple, complete solution
     */
    isSimpleCompleteSolution(code) {
        const lines = code.trim().split('\n').filter(line => line.trim());
        
        // Very short solutions (1-3 lines) that follow common patterns
        if (lines.length <= 3) {
            const codeText = code.toLowerCase();
            
            // Common simple input/output patterns that are likely correct
            const simplePatterns = [
                // Python: a, b = map(int, input().split()); print(a + b)
                /^\s*[a-z],\s*[a-z]\s*=\s*map\s*\(\s*int\s*,\s*input\s*\(\s*\)\s*\.\s*split\s*\(\s*\)\s*\)\s*$/,
                // Python: print(a + b) or similar
                /^\s*print\s*\(\s*[a-z]\s*[+\-*/]\s*[a-z]\s*\)\s*$/,
                // Python: result = a + b; print(result)
                /^\s*[a-z_]+\s*=\s*[a-z]\s*[+\-*/]\s*[a-z]\s*$/,
                // JavaScript: console.log(a + b)
                /^\s*console\s*\.\s*log\s*\(\s*[a-z]\s*[+\-*/]\s*[a-z]\s*\)\s*$/,
                // Simple variable declarations and operations
                /^\s*(let|const|var)\s+[a-z_]+\s*=\s*.+$/
            ];
            
            // Check if the code matches simple, working patterns
            for (const line of lines) {
                for (const pattern of simplePatterns) {
                    if (pattern.test(line)) {
                        return true;
                    }
                }
            }
            
            // Additional checks for common complete solutions
            if (codeText.includes('input') && codeText.includes('print') && lines.length <= 2) {
                return true; // Likely a simple input/output solution
            }
            
            if ((codeText.includes('console.log') || codeText.includes('print')) && 
                (codeText.includes('+') || codeText.includes('-') || codeText.includes('*') || codeText.includes('/')) &&
                lines.length <= 3) {
                return true; // Likely a simple calculation solution
            }
        }
        
        return false;
    }

    // Clean up method for proper disposal
    destroy() {
        // Clear timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (this.realTimeTimer) {
            clearTimeout(this.realTimeTimer);
        }

        // Remove event listeners
        if (this.codeEditor) {
            this.codeEditor.off('change');
            this.codeEditor.off('changeCursor');
            this.codeEditor.off('changeSelection');
        }

        // Remove gutter click listener
        if (this.gutterClickListener && this.codeEditor.renderer) {
            const gutterElement = this.codeEditor.renderer.$gutterLayer.element;
            gutterElement.removeEventListener('click', this.gutterClickListener);
        }

        // Clear decorations and popups
        this.clearLineDecorations();
        this.removeExistingPopups();

        // Remove UI elements
        const indicator = document.getElementById('ai-status-indicator');
        if (indicator) {
            indicator.remove();
        }

        // Remove styles if no other instances
        const styles = document.getElementById('ai-assistance-styles');
        if (styles) {
            styles.remove();
        }

        // Clear references
        this.codeEditor = null;
        this.currentProblem = null;
        this.currentSuggestions = [];
        this.isEnabled = false;
    }

    removeExistingPopups() {
        // Remove any existing VS Code-style popups
        const existingPopups = document.querySelectorAll('.ai-popup-overlay');
        existingPopups.forEach(popup => {
            popup.remove();
        });
    }

    clearLineDecorations() {
        // Clear all line markers
        this.lineDecorations.forEach(decoration => {
            if (decoration.markerId) {
                this.codeEditor.session.removeMarker(decoration.markerId);
            }
        });
        
        // Clear all lightbulbs from gutter cells
        try {
            const gutterLayer = this.codeEditor.renderer.$gutterLayer;
            if (gutterLayer && gutterLayer.element) {
                const gutterCells = gutterLayer.element.querySelectorAll('.ace_gutter-cell');
                gutterCells.forEach(cell => {
                    const lightbulbs = cell.querySelectorAll('.ai-lightbulb');
                    lightbulbs.forEach(lightbulb => lightbulb.remove());
                    cell.classList.remove('has-ai-suggestion');
                });
            }
        } catch (error) {
            console.warn('Error clearing lightbulbs from gutter:', error);
        }
        
        // Clear alternative annotations
        try {
            const session = this.codeEditor.session;
            const existingAnnotations = session.getAnnotations() || [];
            const filteredAnnotations = existingAnnotations.filter(ann => 
                !ann.className?.includes('ai-lightbulb-annotation')
            );
            session.setAnnotations(filteredAnnotations);
        } catch (error) {
            console.warn('Error clearing annotations:', error);
        }
        
        // Clean up event handlers
        if (this.annotationClickHandlers) {
            this.annotationClickHandlers.forEach(({ handler, element }) => {
                element.removeEventListener('click', handler);
            });
            this.annotationClickHandlers = [];
        }
        
        if (this.fallbackClickHandlers) {
            this.fallbackClickHandlers.forEach(handler => {
                if (typeof handler === 'function') {
                    try {
                        this.codeEditor.off('click', handler);
                    } catch (e) {
                        console.warn('Could not remove fallback handler:', e);
                    }
                }
            });
            this.fallbackClickHandlers = [];
        }
        
        // Remove any existing popups
        this.removeExistingPopups();
        
        // Reset state
        this.lineDecorations = [];
        this.retryCount = 0;
    }

    showVSCodePopup(event, suggestion, lineNumber) {
        // Remove any existing popups first
        this.removeExistingPopups();
        
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'ai-popup-overlay';
        
        // Create popup content
        const popup = document.createElement('div');
        popup.className = 'ai-suggestion-popup';
        
        // Determine popup header based on suggestion type
        let headerIcon = '💡';
        let headerText = 'AI Suggestion';
        
        switch (suggestion.type) {
            case 'error':
                headerIcon = '🔴';
                headerText = 'Error Detected';
                break;
            case 'warning':
                headerIcon = '⚠️';
                headerText = 'Warning';
                break;
            case 'suggestion':
            default:
                headerIcon = '💡';
                headerText = 'AI Suggestion';
                break;
        }
        
        popup.innerHTML = `
            <div class="popup-header">
                <span class="header-icon">${headerIcon}</span>
                <span>${headerText} - Line ${lineNumber + 1}</span>
            </div>
            <div class="popup-content">
                <div class="suggestion-type">${suggestion.type.toUpperCase()}</div>
                <div class="suggestion-message">${suggestion.message}</div>
                ${suggestion.fix ? `<div class="suggestion-fix">${suggestion.fix}</div>` : ''}
                <div class="popup-actions">
                    ${suggestion.fix ? '<button class="ai-popup-btn" onclick="this.closest(\'.ai-popup-overlay\').remove();">Apply Fix</button>' : ''}
                    <button class="ai-popup-btn secondary" onclick="this.closest(\'.ai-popup-overlay\').remove();">Close</button>
                </div>
            </div>
        `;
        
        // Position popup near the clicked element
        const rect = event.target.getBoundingClientRect();
        popup.style.left = `${rect.right + 10}px`;
        popup.style.top = `${rect.top - 50}px`;
        
        // Ensure popup stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popupRect = popup.getBoundingClientRect();
        
        if (parseInt(popup.style.left) + 450 > viewportWidth) {
            popup.style.left = `${rect.left - 460}px`;
        }
        
        if (parseInt(popup.style.top) < 0) {
            popup.style.top = `${rect.bottom + 10}px`;
        }
        
        // Add to overlay and document
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // Close popup when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 10000);
    }

    /**
     * Disable AI assistance when the user successfully passes all tests
     * This prevents unnecessary suggestions when the problem is already solved correctly
     */
    disableForSuccess() {
        console.log('🎉 Disabling AI assistance - all tests passed!');
        
        // Clear all existing decorations and suggestions
        this.clearLineDecorations();
        this.removeExistingPopups();
        
        // Update status to show success
        const statusText = document.querySelector('.ai-status-text');
        const statusIndicator = document.getElementById('ai-status-indicator');
        
        if (statusText) {
            statusText.textContent = 'AI Assistant - Problem Solved! 🎉';
            statusText.style.color = '#75f74d';
        }
        
        if (statusIndicator) {
            statusIndicator.classList.add('success-state');
        }
        
        // Disable further analysis
        this.isEnabled = false;
        
        // Add success state styling
        this.addSuccessStateStyles();
        
        console.log('✅ AI assistance successfully disabled for solved problem');
    }
    
    /**
     * Add CSS styles for success state
     */
    addSuccessStateStyles() {
        const existingStyles = document.getElementById('ai-assistance-styles');
        if (existingStyles) {
            const successStyles = `
                /* Success state styling */
                .ai-status-indicator.success-state {
                    background: linear-gradient(135deg, #75f74d 0%, #2b8a3e 100%);
                    border-color: #75f74d;
                }
                
                .ai-status-indicator.success-state .ai-status-icon {
                    animation: celebrateSuccess 2s ease-in-out;
                }
                
                @keyframes celebrateSuccess {
                    0%, 100% { transform: scale(1); }
                    25% { transform: scale(1.2) rotate(10deg); }
                    50% { transform: scale(1.1) rotate(-10deg); }
                    75% { transform: scale(1.2) rotate(5deg); }
                }
                
                .ai-status-indicator.success-state .ai-status-text {
                    color: #000 !important;
                    font-weight: 600;
                }
            `;
            
            existingStyles.insertAdjacentHTML('beforeend', successStyles);
        }
    }
    
    /**
     * Re-enable AI assistance (e.g., when user modifies code after solving)
     */
    reEnableAfterModification() {
        if (!this.isEnabled) {
            console.log('🔄 Re-enabling AI assistance - code modified after solve');
            this.isEnabled = true;
            
            // Update status back to normal
            const statusText = document.querySelector('.ai-status-text');
            const statusIndicator = document.getElementById('ai-status-indicator');
            
            if (statusText) {
                statusText.textContent = 'AI Assistant Active';
                statusText.style.color = '';
            }
            
            if (statusIndicator) {
                statusIndicator.classList.remove('success-state');
            }
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIAssistanceManager };
}