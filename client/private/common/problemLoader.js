// Dynamic Problem Loader
class ProblemLoader {
    constructor() {
        this.problems = [];
        this.currentDifficulty = 'easy';
    }

    // Fetch problems from server
    async fetchProblems(difficulty = null, category = null) {
        try {
            let url = '/api/problems';
            const params = new URLSearchParams();
            
            if (difficulty) params.append('difficulty', difficulty);
            if (category) params.append('category', category);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.problems = data.problems;
                return this.problems;
            } else {
                throw new Error(data.error || 'Failed to fetch problems');
            }
        } catch (error) {
            console.error('Error fetching problems:', error);
            throw error;
        }
    }

    // Fetch specific problem
    async fetchProblem(problemId) {
        try {
            const response = await fetch(`/api/problems/${problemId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.problem;
            } else {
                throw new Error(data.error || 'Problem not found');
            }
        } catch (error) {
            console.error('Error fetching problem:', error);
            throw error;
        }
    }

    // Render problems in the UI
    renderProblems(containerId, difficulty) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading">Loading problems...</div>';

        this.fetchProblems(difficulty)
            .then(problems => {
                if (problems.length === 0) {
                    container.innerHTML = '<div class="no-problems">No problems found for this difficulty.</div>';
                    return;
                }

                const problemsHTML = problems.map(problem => this.createProblemHTML(problem)).join('');
                container.innerHTML = problemsHTML;
                
                // Add click handlers
                this.addProblemClickHandlers();
            })
            .catch(error => {
                container.innerHTML = `<div class="error">Error loading problems: ${error.message}</div>`;
            });
    }

    // Create HTML for a single problem
    createProblemHTML(problem) {
        const difficultyColor = {
            'easy': '#28a745',
            'medium': '#ffc107', 
            'hard': '#dc3545'
        };

        return `
            <div class="assignment-box" data-problem-id="${problem.problemId}">
                <div class="problem-header">
                    <h3>${problem.title}</h3>
                    <span class="difficulty-badge" style="background-color: ${difficultyColor[problem.difficulty] || '#6c757d'}">
                        ${problem.difficulty.toUpperCase()}
                    </span>
                </div>
                <p class="problem-description">${problem.description}</p>
                <div class="problem-stats">
                    <span class="solved-count">✅ ${problem.solvedCount} solved</span>
                    <span class="category">#${problem.category}</span>
                </div>
                <button class="solve-btn" onclick="problemLoader.selectProblem('${problem.problemId}')">
                    Solve Now
                </button>
            </div>
        `;
    }

    // Add click handlers to problem elements
    addProblemClickHandlers() {
        const problemBoxes = document.querySelectorAll('.assignment-box');
        problemBoxes.forEach(box => {
            const problemId = box.dataset.problemId;
            const solveBtn = box.querySelector('.solve-btn');
            
            if (solveBtn) {
                solveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectProblem(problemId);
                });
            }
        });
    }

    // Handle problem selection
    async selectProblem(problemId) {
        try {
            console.log('Selecting problem:', problemId);
            
            // Fetch full problem details
            const problem = await this.fetchProblem(problemId);
            
            // Store in localStorage for backward compatibility
            localStorage.setItem('selectedProblem', JSON.stringify(problem));
            localStorage.setItem('problemTitle', problem.title);
            localStorage.setItem('problemDescription', problem.description);
            
            // Navigate to coder page with problem ID in URL
            window.location.href = `/private/CoderPage/coder.html?problemId=${problemId}`;
            
        } catch (error) {
            console.error('Error selecting problem:', error);
            alert('Failed to load problem. Please try again.');
        }
    }

    // Get problem statistics
    async getProblemStats() {
        try {
            const problems = await this.fetchProblems();
            return {
                total: problems.length,
                easy: problems.filter(p => p.difficulty === 'easy').length,
                medium: problems.filter(p => p.difficulty === 'medium').length,
                hard: problems.filter(p => p.difficulty === 'hard').length
            };
        } catch (error) {
            console.error('Error getting problem stats:', error);
            return { total: 0, easy: 0, medium: 0, hard: 0 };
        }
    }
}

// Global instance
const problemLoader = new ProblemLoader();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Auto-load problems based on current page
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('beginner') || currentPage.includes('Easy')) {
        problemLoader.renderProblems('challenge-container', 'easy');
    } else if (currentPage.includes('Intermediate')) {
        problemLoader.renderProblems('challenge-container', 'medium');
    } else if (currentPage.includes('Advanced')) {
        problemLoader.renderProblems('challenge-container', 'hard');
    }
    // Note: Real-World page uses its own loader
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProblemLoader };
}
