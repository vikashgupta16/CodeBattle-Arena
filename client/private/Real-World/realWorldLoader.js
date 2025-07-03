// Real-World Project Loader with Category Filtering
class RealWorldProjectLoader extends ProblemLoader {
    constructor() {
        super();
        this.currentCategory = 'all';
        this.categories = ['all', 'games', 'web', 'ai', 'algorithms'];
    }

    // Override to handle category filtering for real-world projects
    async fetchProblems(difficulty = null, category = null) {
        try {
            let url = '/api/problems';
            const params = new URLSearchParams();
            
            // For real-world page, we want all difficulties but specific categories
            if (category && category !== 'all') {
                params.append('category', category);
            }

            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                // Filter for real-world project categories
                this.problems = data.problems.filter(problem => 
                    ['games', 'web', 'ai', 'algorithms'].includes(problem.category)
                );
                return this.problems;
            } else {
                throw new Error(data.error || 'Failed to fetch problems');
            }
        } catch (error) {
            console.error('Error fetching problems:', error);
            throw error;
        }
    }

    // Render projects with category tabs
    renderProjectsWithTabs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading">Loading projects...</div>';

        this.fetchProblems()
            .then(problems => {
                if (problems.length === 0) {
                    container.innerHTML = '<div class="no-problems">No projects found.</div>';
                    return;
                }

                this.allProjects = problems;
                this.renderFilteredProjects(containerId, 'all');
                this.setupCategoryTabs();
            })
            .catch(error => {
                container.innerHTML = `<div class="error">Error loading projects: ${error.message}</div>`;
            });
    }

    // Render filtered projects based on category
    renderFilteredProjects(containerId, category) {
        const container = document.getElementById(containerId);
        let filteredProjects = this.allProjects;

        if (category !== 'all') {
            filteredProjects = this.allProjects.filter(project => project.category === category);
        }

        if (filteredProjects.length === 0) {
            container.innerHTML = '<div class="no-problems">No projects found in this category.</div>';
            return;
        }

        const projectsHTML = filteredProjects.map(project => this.createProjectHTML(project)).join('');
        container.innerHTML = projectsHTML;
        
        // Add click handlers
        this.addProblemClickHandlers();
    }

    // Create HTML for a real-world project
    createProjectHTML(project) {
        const difficultyColor = {
            'easy': '#28a745',
            'medium': '#ffc107', 
            'hard': '#dc3545'
        };

        const categoryIcons = {
            'games': '🎮',
            'web': '🌐',
            'ai': '🤖',
            'algorithms': '🧠'
        };

        return `
            <div class="assignment-box" data-problem-id="${project.problemId}" data-category="${project.category}">
                <div class="project-icon">${categoryIcons[project.category] || '💻'}</div>
                <div class="problem-header">
                    <h3>${project.title}</h3>
                    <span class="difficulty-badge" style="background-color: ${difficultyColor[project.difficulty] || '#6c757d'}">
                        ${project.difficulty.toUpperCase()}
                    </span>
                </div>
                <p class="problem-description">${project.description}</p>
                <div class="problem-stats">
                    <span class="solved-count">✅ ${project.solvedCount} solved</span>
                    <span class="category">#${project.category}</span>
                </div>
                <button class="solve-btn" onclick="realWorldLoader.selectProblem('${project.problemId}')">
                    Start Project
                </button>
            </div>
        `;
    }

    // Setup category tab functionality
    setupCategoryTabs() {
        const tabs = document.querySelectorAll('.category-tab');
        const sidebarFilters = document.querySelectorAll('.filter-btn');
        
        // Handle category tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.switchCategory(category);
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Handle sidebar filters
        sidebarFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.target.dataset.category;
                this.switchCategory(category);
                
                // Update active filter
                sidebarFilters.forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update tabs to match
                tabs.forEach(t => {
                    t.classList.remove('active');
                    if (t.dataset.category === category) {
                        t.classList.add('active');
                    }
                });
            });
        });
    }

    // Switch to a different category
    switchCategory(category) {
        this.currentCategory = category;
        this.renderFilteredProjects('challenge-container', category);
    }

    // Get project statistics by category
    async getProjectStats() {
        try {
            const projects = await this.fetchProblems();
            const stats = {
                total: projects.length,
                games: projects.filter(p => p.category === 'games').length,
                web: projects.filter(p => p.category === 'web').length,
                ai: projects.filter(p => p.category === 'ai').length,
                algorithms: projects.filter(p => p.category === 'algorithms').length
            };
            
            // Update category tabs with counts
            Object.keys(stats).forEach(category => {
                const tab = document.querySelector(`[data-category="${category}"]`);
                if (tab && category !== 'total') {
                    const currentText = tab.textContent;
                    if (!currentText.includes('(')) {
                        tab.textContent = `${currentText} (${stats[category]})`;
                    }
                }
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting project stats:', error);
            return { total: 0, games: 0, web: 0, ai: 0, algorithms: 0 };
        }
    }
}

// Global instance for real-world projects
const realWorldLoader = new RealWorldProjectLoader();

// Initialize when DOM is loaded (only on real-world page)
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('RealWorld') || currentPage.includes('Real-World')) {
        realWorldLoader.renderProjectsWithTabs('challenge-container');
        realWorldLoader.getProjectStats(); // Add counts to tabs
    }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealWorldProjectLoader };
}
