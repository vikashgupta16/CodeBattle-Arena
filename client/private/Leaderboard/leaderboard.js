// Leaderboard functionality
document.addEventListener('DOMContentLoaded', function() {
    loadLeaderboard();
    setupFilterButtons();
    setupThemeToggle();
    setupNavigation();
});

// Navigation functions
function setupNavigation() {
    const nav = document.querySelector('.codingPageNav');
    
    window.showNav = function() {
        nav.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.hideNav = function() {
        nav.classList.remove('show');
        document.body.style.overflow = '';
    };

    window.showSection = function(sectionId) {
        // For leaderboard page, redirect to home page with section
        window.location.href = `../HomePage/codigo.html#${sectionId}`;
    };
}

// Theme toggle functionality
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            document.body.className = this.value;
            localStorage.setItem('theme', this.value);
        });
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark-theme';
        document.body.className = savedTheme;
        themeToggle.value = savedTheme;
    }
}

let currentFilter = 'all';

function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.dataset.filter;
            
            // Reload leaderboard with new filter
            loadLeaderboard();
        });
    });
}

async function loadLeaderboard() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const leaderboardTable = document.getElementById('leaderboardTable');
    const errorMessage = document.getElementById('errorMessage');
    
    // Show loading state
    loadingSpinner.style.display = 'flex';
    leaderboardTable.style.display = 'none';
    errorMessage.style.display = 'none';
    
    try {
        const response = await fetch('/api/leaderboard?limit=50');
        
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderLeaderboard(data.leaderboard);
            
            // Hide loading and show table
            loadingSpinner.style.display = 'none';
            leaderboardTable.style.display = 'block';
        } else {
            throw new Error(data.error || 'Failed to load leaderboard');
        }
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        
        // Hide loading and show error
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}

function renderLeaderboard(leaderboard) {
    const tableBody = document.getElementById('leaderboardBody');
    tableBody.innerHTML = '';
    
    if (leaderboard.length === 0) {
        tableBody.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                No users found in the leaderboard yet.
            </div>
        `;
        return;
    }
    
    // The backend now properly sorts and assigns rankPosition, so we can trust the order
    leaderboard.forEach((user, index) => {
        // Use the rankPosition from backend (which handles ties properly)
        const position = user.rankPosition || (index + 1);
        const row = createLeaderboardRow(user, position);
        tableBody.appendChild(row);
    });
}

function createLeaderboardRow(user, position) {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    
    // Get user initials for avatar
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    
    // Format last solve date
    const lastSolve = user.lastSolvedDate ? formatDate(user.lastSolvedDate) : 'Never';
    
    // Use the rankPosition from the backend if available, otherwise use the frontend position
    const displayPosition = user.rankPosition || position;
    
    // Add special styling for top 3
    const rankClass = displayPosition <= 3 ? `rank-${displayPosition} top-3` : '';
    
    row.innerHTML = `
        <div class="rank-position ${rankClass}">${displayPosition}</div>
        <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div class="user-name">${user.name || 'Anonymous'}</div>
        </div>
        <div class="problems-solved">${user.problemsSolved || 0}</div>
        <div class="difficulty-count easy-count">${user.easyCount || 0}</div>
        <div class="difficulty-count medium-count">${user.mediumCount || 0}</div>
        <div class="difficulty-count hard-count">${user.hardCount || 0}</div>
        <div class="last-solve">${lastSolve}</div>
    `;
    
    return row;
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Today';
    } else if (diffDays === 2) {
        return 'Yesterday';
    } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
    } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}
