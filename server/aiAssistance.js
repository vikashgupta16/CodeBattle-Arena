import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class AIAssistanceService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Updated to Gemini 2.0 Flash
        this.isEnabled = process.env.AI_ASSISTANCE_ENABLED === 'true';
    }

    /**
     * Analyze code line by line and provide suggestions
     * @param {string} code - The code to analyze
     * @param {string} language - Programming language
     * @param {Object} problem - Problem context
     * @param {number} currentLine - Current line being analyzed (0-indexed)
     * @returns {Object} Analysis result with suggestions
     */
    async analyzeCodeLine(code, language, problem, currentLine = null) {
        if (!this.isEnabled) {
            return { suggestions: [], errors: [], warnings: [] };
        }

        try {
            const lines = code.split('\n');
            const currentLineCode = currentLine !== null ? lines[currentLine] : '';
            
            const prompt = `
You are an AI coding assistant for beginner programmers. Analyze this ${language} code and provide helpful suggestions.

PROBLEM CONTEXT:
Title: ${problem?.title || 'Unknown'}
Description: ${problem?.description || 'No description'}
Difficulty: ${problem?.difficulty || 'beginner'}

CURRENT CODE:
\`\`\`${language}
${code}
\`\`\`

${currentLine !== null ? `CURRENT LINE (${currentLine + 1}): ${currentLineCode}` : ''}

Please provide a JSON response with:
1. "suggestions" - Array of helpful coding suggestions for beginners
2. "errors" - Array of syntax or logic errors found
3. "warnings" - Array of potential issues or improvements
4. "lineSpecific" - Suggestions specific to the current line (if provided)

Format each item as: { "line": number, "type": "error|warning|suggestion", "message": "description", "fix": "suggested fix" }

Focus on:
- Syntax errors
- Common beginner mistakes
- Logic issues
- Best practices for beginners
- Variable naming conventions
- Missing imports or declarations
- Infinite loops or inefficient code

Keep suggestions beginner-friendly and encouraging!
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Try to parse JSON response
            try {
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    return this.formatResponse(parsed);
                }
            } catch (parseError) {
                console.warn('Could not parse AI response as JSON, providing fallback');
            }
            
            // Fallback: extract suggestions from text
            return this.extractSuggestionsFromText(text, currentLine);
            
        } catch (error) {
            console.error('AI Assistance Error:', error);
            return { 
                suggestions: [], 
                errors: [], 
                warnings: [],
                error: 'AI assistance temporarily unavailable'
            };
        }
    }

    /**
     * Get real-time code completion suggestions
     * @param {string} code - Current code
     * @param {string} language - Programming language
     * @param {number} cursorLine - Line where cursor is
     * @param {number} cursorColumn - Column where cursor is
     * @returns {Array} Array of completion suggestions
     */
    async getCodeCompletion(code, language, cursorLine, cursorColumn) {
        if (!this.isEnabled) return [];

        try {
            const lines = code.split('\n');
            const currentLine = lines[cursorLine] || '';
            const beforeCursor = currentLine.substring(0, cursorColumn);
            
            const prompt = `
You are providing code completion for a beginner ${language} programmer.

CURRENT CODE:
\`\`\`${language}
${code}
\`\`\`

CURSOR POSITION: Line ${cursorLine + 1}, Column ${cursorColumn + 1}
CURRENT LINE: ${currentLine}
BEFORE CURSOR: ${beforeCursor}

Provide 3-5 relevant code completion suggestions as a JSON array:
[
  {
    "text": "completion text",
    "description": "what this does",
    "type": "function|variable|keyword|method"
  }
]

Focus on:
- Common ${language} patterns
- Beginner-friendly suggestions
- Context-aware completions
- Built-in functions and methods
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
                const jsonMatch = text.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                console.warn('Could not parse completion suggestions');
            }
            
            return [];
            
        } catch (error) {
            console.error('Code Completion Error:', error);
            return [];
        }
    }

    /**
     * Analyze code for specific error and provide fix suggestion
     * @param {string} code - Code with error
     * @param {string} language - Programming language
     * @param {string} errorMessage - Error message from execution
     * @returns {Object} Fix suggestion
     */
    async suggestFix(code, language, errorMessage) {
        if (!this.isEnabled) return null;

        try {
            const prompt = `
You are helping a beginner fix their ${language} code.

CODE:
\`\`\`${language}
${code}
\`\`\`

ERROR MESSAGE: ${errorMessage}

Provide a JSON response with:
{
  "explanation": "Simple explanation of what went wrong",
  "fix": "Suggested code fix",
  "line": "Line number where fix should be applied",
  "example": "Example of corrected code snippet"
}

Make the explanation beginner-friendly and encouraging!
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            try {
                const jsonMatch = text.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                console.warn('Could not parse fix suggestion');
            }
            
            return null;
            
        } catch (error) {
            console.error('Fix Suggestion Error:', error);
            return null;
        }
    }

    /**
     * Real-time analysis for per-line assistance
     * @param {string} code - Complete code
     * @param {number} currentLine - Current line number
     * @param {string} currentLineText - Text of current line
     * @param {string} language - Programming language
     * @param {Object} problem - Problem context
     * @returns {Object} Real-time analysis with line-specific suggestions
     */
    async performRealTimeAnalysis(code, currentLine, currentLineText, language, problem) {
        if (!this.isEnabled) {
            return { lineAnalysis: [] };
        }

        try {
            const prompt = `
You are a real-time AI coding assistant providing VS Code-like IntelliSense. Analyze this code and provide immediate, actionable suggestions.

PROBLEM: ${problem?.title || 'Coding Challenge'}
LANGUAGE: ${language}
CURRENT LINE ${currentLine + 1}: "${currentLineText}"

FULL CODE:
\`\`\`${language}
${code}
\`\`\`

Provide a JSON response with:
{
  "lineAnalysis": [
    {
      "line": <line_number>,
      "type": "suggestion|error|warning",
      "message": "<brief helpful message>",
      "fix": "<exact code to fix the issue>",
      "severity": "high|medium|low"
    }
  ],
  "currentLineSuggestions": [
    {
      "message": "<suggestion for current line>",
      "code": "<suggested code completion>",
      "explanation": "<why this helps>"
    }
  ]
}

Focus on:
- Syntax errors and typos
- Missing semicolons, brackets, parentheses
- Variable naming improvements
- Logic errors
- Best practices for beginners
- Code completion suggestions
- Performance tips

Be concise and actionable. Only suggest fixes that directly improve the code.
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    analysis: analysis
                };
            }
            
            return {
                success: true,
                analysis: { lineAnalysis: [], currentLineSuggestions: [] }
            };
            
        } catch (error) {
            console.error('Real-time analysis error:', error);
            return {
                success: false,
                error: error.message,
                analysis: { lineAnalysis: [] }
            };
        }
    }

    /**
     * Provide contextual help based on cursor position
     * @param {string} line - Current line text
     * @param {Object} token - Current token at cursor
     * @param {Object} cursor - Cursor position
     * @param {string} language - Programming language
     * @param {Object} problem - Problem context
     * @returns {Object} Contextual suggestions
     */
    async getContextualHelp(line, token, cursor, language, problem) {
        if (!this.isEnabled) {
            return { suggestions: [] };
        }

        try {
            const prompt = `
You are providing contextual help for a ${language} programmer at cursor position.

CONTEXT:
- Current line: "${line}"
- Token at cursor: ${JSON.stringify(token)}
- Cursor position: row ${cursor.row}, column ${cursor.column}
- Problem: ${problem?.title || 'Coding Challenge'}

Provide helpful suggestions for what the user might want to do next.

Return JSON:
{
  "suggestions": [
    {
      "message": "<helpful suggestion>",
      "code": "<code completion if applicable>",
      "explanation": "<brief explanation>"
    }
  ]
}

Focus on:
- Code completion
- Method suggestions
- Variable suggestions
- Common patterns for this context
- Problem-specific hints (without giving away the solution)
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const suggestions = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    suggestions: suggestions.suggestions || []
                };
            }
            
            return { success: true, suggestions: [] };
            
        } catch (error) {
            console.error('Contextual help error:', error);
            return { success: false, error: error.message, suggestions: [] };
        }
    }

    /**
     * Analyze test case failures and provide specific fixes
     * @param {string} code - User's code
     * @param {string} language - Programming language
     * @param {Object} problem - Problem context
     * @param {Object} testResults - Test results with failures
     * @returns {Object} Analysis of test failures with suggested fixes
     */
    async analyzeTestCaseFailure(code, language, problem, testResults) {
        if (!this.isEnabled) {
            return { failedTests: [] };
        }

        try {
            const prompt = `
You are an AI debugging assistant helping a beginner fix failing test cases.

PROBLEM: ${problem?.title || 'Coding Challenge'}
DESCRIPTION: ${problem?.description || 'No description'}

USER'S CODE:
\`\`\`${language}
${code}
\`\`\`

FAILED TEST RESULTS:
${JSON.stringify(testResults, null, 2)}

Analyze why the tests are failing and provide specific, actionable fixes.

Return JSON:
{
  "analysis": "Brief explanation of what's going wrong",
  "failedTests": [
    {
      "name": "<test case name>",
      "expected": "<expected output>",
      "actual": "<actual output>",
      "issue": "<what's causing the failure>",
      "suggestion": "<how to fix it>",
      "codeChange": "<specific code change to make>",
      "line": <line number where fix should be applied>
    }
  ],
  "commonIssues": [
    "<list of common issues found>"
  ],
  "nextSteps": [
    "<step by step instructions to fix>"
  ]
}

Be specific about:
- Exact code changes needed
- Line numbers where changes should be made
- Logic errors vs syntax errors
- Edge cases not handled
- Off-by-one errors
- Input/output format issues
`;

            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    analysis: analysis
                };
            }
            
            return {
                success: true,
                analysis: { failedTests: [], commonIssues: [], nextSteps: [] }
            };
            
        } catch (error) {
            console.error('Test failure analysis error:', error);
            return {
                success: false,
                error: error.message,
                analysis: { failedTests: [] }
            };
        }
    }

    /**
     * Format AI response to ensure consistency
     */
    formatResponse(response) {
        return {
            suggestions: response.suggestions || [],
            errors: response.errors || [],
            warnings: response.warnings || [],
            lineSpecific: response.lineSpecific || []
        };
    }

    /**
     * Extract suggestions from plain text response (fallback)
     */
    extractSuggestionsFromText(text, currentLine) {
        const suggestions = [];
        const errors = [];
        const warnings = [];

        // Simple pattern matching for common suggestions
        if (text.toLowerCase().includes('syntax error')) {
            errors.push({
                line: currentLine || 0,
                type: 'error',
                message: 'Syntax error detected',
                fix: 'Check for missing semicolons, brackets, or quotes'
            });
        }

        if (text.toLowerCase().includes('variable') && text.toLowerCase().includes('not defined')) {
            errors.push({
                line: currentLine || 0,
                type: 'error',
                message: 'Variable not defined',
                fix: 'Make sure to declare the variable before using it'
            });
        }

        return { suggestions, errors, warnings, lineSpecific: [] };
    }

    /**
     * Get language-specific tips for beginners
     */
    getLanguageTips(language) {
        const tips = {
            javascript: [
                "Use 'let' or 'const' instead of 'var' for better scope control",
                "Remember to end statements with semicolons",
                "Use === instead of == for strict equality",
                "Don't forget to handle async operations with await or .then()"
            ],
            python: [
                "Use proper indentation (4 spaces) for code blocks",
                "Remember that Python is case-sensitive",
                "Use descriptive variable names",
                "Don't forget colons after if, for, while, and function definitions"
            ],
            'c++': [
                "Include necessary headers like #include <iostream>",
                "Don't forget to return 0 in main function",
                "Use proper variable types (int, string, etc.)",
                "Remember semicolons after statements"
            ],
            java: [
                "Every Java program needs a main method",
                "Class names should start with uppercase",
                "Don't forget semicolons after statements",
                "Use proper access modifiers (public, private)"
            ]
        };

        return tips[language] || [];
    }
}

export { AIAssistanceService };
