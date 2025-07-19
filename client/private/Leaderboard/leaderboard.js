// Advanced Leaderboard functionality with enhanced UI

let leaderboardPollInterval = null;
let currentFilter = 'all';
let currentView = 'table';
let leaderboardData = [];
let filteredData = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeLeaderboard();
    setupEventListeners();
    loadLeaderboard(true); // Show loading for initial load
    
    // Start polling every 30 seconds for real-time updates (without loading state)
    leaderboardPollInterval = setInterval(() => loadLeaderboard(false), 30000);
});

// Clear interval when navigating away
window.addEventListener('beforeunload', function() {
    if (leaderboardPollInterval) clearInterval(leaderboardPollInterval);
});

function initializeLeaderboard() {
    // Initialize with smooth loading animation
    const heroStats = document.querySelectorAll('.stat-number');
    heroStats.forEach(stat => {
        stat.textContent = '-';
    });
    
    // Show demo data initially until real data loads
    showDemoData();
}

function setupEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            applyFilters();
        });
    });

    // View toggle buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            viewButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            switchView();
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        handleSearch();
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            loadLeaderboard();
        }
    });
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearch');
    
    clearBtn.style.display = searchTerm ? 'block' : 'none';
    
    if (searchTerm) {
        filteredData = leaderboardData.filter(user => 
            (user.name || '').toLowerCase().includes(searchTerm) ||
            (user.email || '').toLowerCase().includes(searchTerm)
        );
    } else {
        filteredData = [...leaderboardData];
    }
    
    renderCurrentView();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadLeaderboard(showLoading = true) {
    // Only show loading state for initial load or manual refresh
    if (showLoading) {
        showLoadingState();
    }
    
    try {
        const response = await fetch('/api/leaderboard?limit=100');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            leaderboardData = data.leaderboard || [];
            filteredData = [...leaderboardData];
            
            updateHeroStats();
            applyFilters();
            
            if (showLoading) {
                hideLoadingState();
                // Show success feedback only for manual refresh
                showNotification('Leaderboard updated successfully!', 'success');
            }
        } else {
            throw new Error(data.error || 'Failed to load leaderboard');
        }
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        if (showLoading) {
            hideLoadingState();
            showErrorState();
            showNotification('Failed to load leaderboard data', 'error');
        }
    }
}

function updateHeroStats() {
    const totalUsers = leaderboardData.length;
    const totalProblems = leaderboardData.reduce((sum, user) => sum + (user.problemsSolved || 0), 0);
    const activeToday = leaderboardData.filter(user => {
        if (!user.lastSolvedDate) return false;
        const lastSolve = new Date(user.lastSolvedDate);
        const today = new Date();
        return lastSolve.toDateString() === today.toDateString();
    }).length;

    animateCounter(document.getElementById('totalUsers'), totalUsers);
    animateCounter(document.getElementById('totalProblems'), totalProblems);
    animateCounter(document.getElementById('activeToday'), activeToday);
}

function animateCounter(element, target) {
    const start = 0;
    const duration = 1500;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

function applyFilters() {
    // Apply time-based filtering
    const now = new Date();
    
    switch (currentFilter) {
        case 'week':
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            filteredData = leaderboardData.filter(user => {
                if (!user.lastSolvedDate) return false;
                return new Date(user.lastSolvedDate) >= weekAgo;
            });
            break;
        case 'month':
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            filteredData = leaderboardData.filter(user => {
                if (!user.lastSolvedDate) return false;
                return new Date(user.lastSolvedDate) >= monthAgo;
            });
            break;
        default:
            filteredData = [...leaderboardData];
    }
    
    // Re-apply search if active
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm) {
        handleSearch();
    } else {
        renderCurrentView();
    }
}

function switchView() {
    const tableContainer = document.getElementById('tableContainer');
    const cardsContainer = document.getElementById('cardsContainer');
    
    if (currentView === 'table') {
        tableContainer.style.display = 'block';
        cardsContainer.style.display = 'none';
    } else {
        tableContainer.style.display = 'none';
        cardsContainer.style.display = 'block';
    }
    
    // Only render if we have data
    if (filteredData.length > 0) {
        renderCurrentView();
    }
}

function renderCurrentView() {
    if (filteredData.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    hideErrorState();
    
    // Always ensure the current view containers are visible
    const tableContainer = document.getElementById('tableContainer');
    const cardsContainer = document.getElementById('cardsContainer');
    
    if (currentView === 'table') {
        tableContainer.style.display = 'block';
        cardsContainer.style.display = 'none';
    } else {
        tableContainer.style.display = 'none';
        cardsContainer.style.display = 'block';
    }
    
    // Show podium for top 3 only if we have enough users
    renderPodium();
    
    // Render the appropriate view
    if (currentView === 'table') {
        renderTableView();
    } else {
        renderCardsView();
    }
}

function renderPodium() {
    const podiumSection = document.getElementById('podiumSection');
    
    if (filteredData.length >= 3) {
        podiumSection.style.display = 'block';
        
        const positions = [
            { place: 'second', index: 1 },
            { place: 'first', index: 0 },
            { place: 'third', index: 2 }
        ];
        
        positions.forEach(({ place, index }) => {
            const user = filteredData[index];
            if (user) {
                const placeElement = podiumSection.querySelector(`.${place}-place`);
                const card = placeElement.querySelector('.podium-card');
                
                const initials = getUserInitials(user.name);
                card.querySelector('.podium-avatar').textContent = initials;
                card.querySelector('.podium-name').textContent = user.name || 'Anonymous';
                card.querySelector('.podium-score').textContent = `${user.problemsSolved || 0} problems`;
                
                // Populate tooltip data
                populatePodiumTooltip(place, user, index + 1);
            }
        });
    } else if (leaderboardData.length === 0) {
        // Show demo data when no real data is available
        showDemoData();
    } else {
        podiumSection.style.display = 'none';
    }
}

function populatePodiumTooltip(place, user, rank) {
    // Calculate additional stats
    const problemsSolved = user.problemsSolved || 0;
    const totalPoints = user.total_points || user.problemsSolved * 10 || 0;
    const streak = user.streak_count || 0;
    
    // Calculate accuracy (assume 85-95% for demo, or use real data if available)
    const accuracy = user.accuracy || Math.max(85, Math.min(95, 85 + Math.random() * 10));
    
    // Calculate average time (demo data)
    const avgTimeMinutes = user.avg_time || Math.max(5, Math.min(45, 15 + Math.random() * 20));
    const avgTimeFormatted = `${Math.floor(avgTimeMinutes)}:${Math.floor((avgTimeMinutes % 1) * 60).toString().padStart(2, '0')}`;
    
    // Update tooltip name
    const tooltipName = document.querySelector(`.${place}-place .tooltip-name`);
    if (tooltipName) {
        tooltipName.textContent = user.name || 'Anonymous';
    }
    
    // Update problems solved
    const problemsElement = document.getElementById(`${place}-problems`);
    if (problemsElement) {
        problemsElement.textContent = problemsSolved;
    }
    
    // Update points
    const pointsElement = document.getElementById(`${place}-points`);
    if (pointsElement) {
        pointsElement.textContent = totalPoints.toLocaleString();
    }
    
    // Update accuracy
    const accuracyElement = document.getElementById(`${place}-accuracy`);
    if (accuracyElement) {
        accuracyElement.textContent = `${Math.round(accuracy)}%`;
    }
    
    // Update average time
    const avgTimeElement = document.getElementById(`${place}-avg-time`);
    if (avgTimeElement) {
        avgTimeElement.textContent = avgTimeFormatted;
    }
    
    // Update streak
    const streakTextElement = document.getElementById(`${place}-streak-text`);
    const streakDisplayElement = document.getElementById(`${place}-streak-display`);
    
    if (streakTextElement && streakDisplayElement) {
        if (streak > 0) {
            const streakText = streak === 1 ? '1 day streak' : `${streak} day streak`;
            streakTextElement.textContent = streakText;
            
            // Add legendary class for streaks >= 7 days
            if (streak >= 7) {
                streakDisplayElement.classList.add('legendary');
            } else {
                streakDisplayElement.classList.remove('legendary');
            }
        } else {
            streakTextElement.textContent = 'No active streak';
            streakDisplayElement.classList.remove('legendary');
        }
    }
}

function renderTableView() {
    const tableBody = document.getElementById('leaderboardBody');
    tableBody.innerHTML = '';
    
    // Show all users starting from rank 4 if podium is displayed, otherwise show all
    const startIndex = (filteredData.length >= 3 && document.getElementById('podiumSection').style.display !== 'none') ? 3 : 0;
    
    filteredData.slice(startIndex).forEach((user, index) => {
        const position = startIndex + index + 1;
        const row = createTableRow(user, position);
        tableBody.appendChild(row);
    });
}

function renderCardsView() {
    const cardsGrid = document.getElementById('cardsGrid');
    cardsGrid.innerHTML = '';
    
    // Show all users starting from rank 4 if podium is displayed, otherwise show all
    const startIndex = (filteredData.length >= 3 && document.getElementById('podiumSection').style.display !== 'none') ? 3 : 0;
    
    filteredData.slice(startIndex).forEach((user, index) => {
        const position = startIndex + index + 1;
        const card = createCoderCard(user, position);
        cardsGrid.appendChild(card);
    });
}

function createTableRow(user, position) {
    const row = document.createElement('div');
    row.className = `leaderboard-row ${position <= 3 ? 'top-3' : ''}`;
    
    const initials = getUserInitials(user.name);
    const lastSolve = formatDate(user.lastSolvedDate);
    const streak = calculateStreak(user); // Use calculated streak instead of random
    
    const rankClass = position <= 3 ? `rank-${position} top-3` : '';
    
    // Add smooth entrance animation
    row.style.opacity = '0';
    row.style.transform = 'translateY(20px)';
    
    row.innerHTML = `
        <div class="rank-position ${rankClass}">${position}</div>
        <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div class="user-details">
                <div class="user-name">${user.name || 'Anonymous'}</div>
                <div class="user-title">Problem Solver</div>
            </div>
        </div>
        <div class="problems-solved">${user.problemsSolved || 0}</div>
        <div class="difficulty-count easy-count">${user.easyCount || 0}</div>
        <div class="difficulty-count medium-count">${user.mediumCount || 0}</div>
        <div class="difficulty-count hard-count">${user.hardCount || 0}</div>
        <div class="streak-count" data-streak="${streak}" title="${getStreakTooltip(streak, user.lastSolvedDate)}">${streak}</div>
        <div class="last-solve">${lastSolve}</div>
    `;
    
    // Animate entrance
    requestAnimationFrame(() => {
        row.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
    });
    
    return row;
}

function createCoderCard(user, position) {
    const card = document.createElement('div');
    card.className = 'coder-card';
    
    const initials = getUserInitials(user.name);
    const lastSolve = formatDate(user.lastSolvedDate);
    const streak = calculateStreak(user); // Use calculated streak instead of random
    
    // Add smooth entrance animation
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-rank">${position}</div>
            <div class="card-avatar">${initials}</div>
            <div class="card-user-info">
                <h3>${user.name || 'Anonymous'}</h3>
                <p>Problem Solver</p>
            </div>
        </div>
        
        <div class="card-stats">
            <div class="card-stat">
                <div class="card-stat-number problems-solved">${user.problemsSolved || 0}</div>
                <div class="card-stat-label">Total Problems</div>
            </div>
            <div class="card-stat">
                <div class="card-stat-number streak-count" data-streak="${streak}" title="${getStreakTooltip(streak, user.lastSolvedDate)}">${streak}</div>
                <div class="card-stat-label">Current Streak</div>
            </div>
        </div>
        
        <div class="card-difficulties">
            <div class="card-difficulty easy">
                <div class="card-stat-number">${user.easyCount || 0}</div>
                <div class="card-stat-label">Easy</div>
            </div>
            <div class="card-difficulty medium">
                <div class="card-stat-number">${user.mediumCount || 0}</div>
                <div class="card-stat-label">Medium</div>
            </div>
            <div class="card-difficulty hard">
                <div class="card-stat-number">${user.hardCount || 0}</div>
                <div class="card-stat-label">Hard</div>
            </div>
        </div>
        
        <div style="margin-top: 1rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
            Last active: ${lastSolve}
        </div>
    `;
    
    // Animate entrance with delay
    const delay = (position - 3) * 100; // Stagger animation
    setTimeout(() => {
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, delay);
    
    return card;
}

function calculateStreak(user) {
    // Use the backend-provided streak_count (this is the most accurate)
    if (user.streak_count !== undefined && user.streak_count !== null) {
        // Validate the streak based on last solved date
        return validateStreak(user.streak_count, user.lastSolvedDate);
    }
    
    // Fallback to streak field if available
    if (user.streak !== undefined && user.streak !== null) {
        return validateStreak(user.streak, user.lastSolvedDate);
    }
    
    // If we have streak history from backend, calculate based on that
    if (user.streakHistory && Array.isArray(user.streakHistory)) {
        return calculateStreakFromHistory(user.streakHistory);
    }
    
    // If we have solving dates array, calculate streak
    if (user.solvingDates && Array.isArray(user.solvingDates)) {
        return calculateStreakFromDates(user.solvingDates);
    }
    
    // Fallback: Calculate based on available data
    return calculateStreakFallback(user);
}

function validateStreak(streakCount, lastSolvedDate) {
    if (!lastSolvedDate || streakCount <= 0) return 0;
    
    const lastSolve = new Date(lastSolvedDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Normalize dates to compare only date parts
    lastSolve.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    
    // If last solve was today or yesterday, streak is valid
    if (lastSolve.getTime() === today.getTime() || lastSolve.getTime() === yesterday.getTime()) {
        return streakCount;
    }
    
    // If last solve was more than 1 day ago, streak should be broken
    return 0;
}

function calculateStreakFromHistory(streakHistory) {
    if (!streakHistory.length) return 0;
    
    // Get the most recent streak entry
    const latestStreak = streakHistory[streakHistory.length - 1];
    
    // Check if the streak is still active (last solve was recent)
    if (latestStreak.endDate) {
        // Streak has ended
        return 0;
    }
    
    return latestStreak.count || 0;
}

function calculateStreakFromDates(solvingDates) {
    if (!solvingDates.length) return 0;
    
    // Sort dates in descending order (most recent first)
    const sortedDates = solvingDates
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => b - a);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check each day going backwards
    for (let i = 0; i < sortedDates.length; i++) {
        const solveDate = new Date(sortedDates[i]);
        solveDate.setHours(0, 0, 0, 0);
        
        // If this solve date matches the current date we're checking
        if (solveDate.getTime() === currentDate.getTime()) {
            streak++;
            // Move to the previous day
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (solveDate.getTime() < currentDate.getTime()) {
            // There's a gap in the streak
            break;
        }
        // If solve date is in the future, skip it
    }
    
    return streak;
}

function calculateStreakFallback(user) {
    // If no streak data available, calculate based on activity pattern
    if (!user.lastSolvedDate) return 0;
    
    const lastSolve = new Date(user.lastSolvedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastSolve.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastSolve) / (1000 * 60 * 60 * 24));
    
    // If solved today, assume at least 1 day streak
    if (daysDiff === 0) {
        return 1;
    }
    
    // If solved yesterday, could still have a streak
    if (daysDiff === 1) {
        return 1;
    }
    
    // Streak is broken if more than 1 day has passed
    return 0;
}

function getStreakTooltip(streak, lastSolvedDate) {
    if (streak === 0) {
        return "No active streak - solve a problem to start your streak!";
    }
    
    if (streak === 1) {
        return "1 day streak - keep going to build momentum!";
    }
    
    const dayWord = streak === 1 ? 'day' : 'days';
    let message = `${streak} ${dayWord} streak!`;
    
    if (lastSolvedDate) {
        const lastSolve = new Date(lastSolvedDate);
        const today = new Date();
        const daysSinceLastSolve = Math.floor((today - lastSolve) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastSolve === 0) {
            message += " ✨ Solved today!";
        } else if (daysSinceLastSolve === 1) {
            message += " ⚡ Last solved yesterday - solve today to continue!";
        }
    }
    
    // Add motivational messages based on streak length
    if (streak >= 30) {
        message += " 🏆 Legendary dedication!";
    } else if (streak >= 21) {
        message += " 🔥 On fire! You're building a habit!";
    } else if (streak >= 14) {
        message += " 💪 Two weeks strong!";
    } else if (streak >= 7) {
        message += " 🚀 One week streak!";
    } else if (streak >= 3) {
        message += " 📈 Building momentum!";
    }
    
    return message;
}

function getUserInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
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
    } else if (diffDays <= 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// State management functions
function showLoadingState() {
    document.getElementById('loadingSpinner').style.display = 'flex';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('cardsContainer').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('podiumSection').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingSpinner').style.display = 'none';
    
    // Restore the appropriate view after loading
    if (filteredData.length > 0) {
        const tableContainer = document.getElementById('tableContainer');
        const cardsContainer = document.getElementById('cardsContainer');
        
        if (currentView === 'table') {
            tableContainer.style.display = 'block';
            cardsContainer.style.display = 'none';
        } else {
            tableContainer.style.display = 'none';
            cardsContainer.style.display = 'block';
        }
    }
}

function showErrorState() {
    hideLoadingState();
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('cardsContainer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('podiumSection').style.display = 'none';
}

function hideErrorState() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showEmptyState() {
    hideLoadingState();
    hideErrorState();
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('cardsContainer').style.display = 'none';
    document.getElementById('podiumSection').style.display = 'none';
}

function hideEmptyState() {
    document.getElementById('emptyState').style.display = 'none';
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 1rem;
                box-shadow: var(--shadow-medium);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                max-width: 400px;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }
            .notification.show {
                transform: translateX(0);
            }
            .notification-success { border-left: 4px solid var(--success-green); }
            .notification-error { border-left: 4px solid var(--danger-red); }
            .notification-info { border-left: 4px solid var(--leaderboard-primary); }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                transition: var(--transition-smooth);
            }
            .notification-close:hover {
                background: var(--secondary-bg);
                color: var(--text-primary);
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show notification
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function showDemoData() {
    // Show demo data when leaderboard is empty
    const demoData = [
        {
            name: "CodeMaster",
            problemsSolved: 150,
            total_points: 1500,
            accuracy: 92,
            avg_time: 18.5,
            streak_count: 12,
            lastSolvedDate: new Date().toISOString()
        },
        {
            name: "AlgoWizard",
            problemsSolved: 142,
            total_points: 1420,
            accuracy: 88,
            avg_time: 22.3,
            streak_count: 8,
            lastSolvedDate: new Date(Date.now() - 86400000).toISOString()
        },
        {
            name: "DevNinja",
            problemsSolved: 138,
            total_points: 1380,
            accuracy: 85,
            avg_time: 25.7,
            streak_count: 5,
            lastSolvedDate: new Date(Date.now() - 172800000).toISOString()
        }
    ];
    
    const positions = [
        { place: 'second', index: 1 },
        { place: 'first', index: 0 },
        { place: 'third', index: 2 }
    ];
    
    const podiumSection = document.getElementById('podiumSection');
    if (podiumSection) {
        podiumSection.style.display = 'block';
        
        positions.forEach(({ place, index }) => {
            const user = demoData[index];
            if (user) {
                const placeElement = podiumSection.querySelector(`.${place}-place`);
                if (placeElement) {
                    const card = placeElement.querySelector('.podium-card');
                    if (card) {
                        const initials = getUserInitials(user.name);
                        const avatar = card.querySelector('.podium-avatar');
                        const name = card.querySelector('.podium-name');
                        const score = card.querySelector('.podium-score');
                        
                        if (avatar) avatar.textContent = initials;
                        if (name) name.textContent = user.name;
                        if (score) score.textContent = `${user.problemsSolved} problems`;
                        
                        // Populate tooltip data
                        populatePodiumTooltip(place, user, index + 1);
                    }
                }
            }
        });
    }
}

// Global function for refresh button
window.refreshLeaderboard = () => loadLeaderboard(true);
