// @author Rouvik Maji & Archisman Pal
async function updateUserDetails()
{
    // DOM elements are accessed in updateStatsDisplay function
    try {
        // Check if stats were updated from localStorage first
        if (localStorage.getItem('statsUpdated') === 'true') {
            const updatedStats = JSON.parse(localStorage.getItem('updatedStats'));
            if (updatedStats) {
                updateStatsDisplay(updatedStats);
                
                // Clear the localStorage flags
                localStorage.removeItem('statsUpdated');
                localStorage.removeItem('updatedStats');
                
                // Show brief success message
                showStatsUpdateNotification(updatedStats);
                return;
            }
        }

        // Fetch user basic data
        const userResponse = await fetch('/api/userdata');
        
        // Fetch detailed user stats 
        const statsResponse = await fetch('/api/user/stats');

        if (userResponse.ok && statsResponse.ok) {
            const userData = await userResponse.json();
            const statsData = await statsResponse.json();
            
            // Combine the data - use rankPosition for display instead of rank points
            const combinedData = {
                name: userData.name || 'User',
                rank: statsData.stats.rankPosition || 0, // Use actual leaderboard position
                arenaWins: statsData.stats.arena?.wins || 0, // Arena matches won
                streak_count: statsData.stats.streak_count || 0,
                problemsSolved: statsData.stats.problemsSolved || 0,
                easyCount: statsData.stats.easyCount || 0,
                mediumCount: statsData.stats.mediumCount || 0,
                hardCount: statsData.stats.hardCount || 0,
                realWorldCount: statsData.stats.realWorldCount || 0
            };
            
            updateStatsDisplay(combinedData);
        } else {
            throw new Error('Failed to fetch user data or stats');
        }
    } catch (error) {
        console.error('Failed to update user details:', error);
        // Set default values if fetch fails
        updateStatsDisplay({
            name: 'User',
            rank: 0,
            arenaWins: 0, // Default arena wins to 0
            streak_count: 0,
            problemsSolved: 0,
            easyCount: 0,
            mediumCount: 0,
            hardCount: 0
        });
    }
}

// Helper function to update stats display
function updateStatsDisplay(data) {
    const username = document.getElementById("dashboard_username");
    const currRank = document.getElementById("dashboard_currRank");
    const contestCount = document.getElementById("dashboard_contestCount");
    const streakCount = document.getElementById("dashboard_streakCount");
    const totalProblems = document.getElementById("dashboard_totalProblems");
    const easyCount = document.getElementById("dashboard_easyCount");
    const mediumCount = document.getElementById("dashboard_mediumCount");
    const hardCount = document.getElementById("dashboard_hardCount");

    username.textContent = data.name || 'User';
    currRank.textContent = data.rank || '0';
    contestCount.textContent = data.arenaWins || '0'; // Display arena wins instead of contests
    streakCount.textContent = data.streak_count || '0';
    
    // Update detailed problem stats
    if (totalProblems) totalProblems.textContent = data.problemsSolved || '0';
    if (easyCount) easyCount.textContent = data.easyCount || '0';
    if (mediumCount) mediumCount.textContent = data.mediumCount || '0';
    if (hardCount) hardCount.textContent = data.hardCount || '0';
}

// Show brief notification when stats are updated
function showStatsUpdateNotification(stats) {
    const notification = document.createElement('div');
    notification.className = 'stats-update-notification';
    notification.innerHTML = `
        <div class="notification-banner">
            <span class="notification-icon">📈</span>
            <span class="notification-text">Stats updated! You're doing great!</span>
            <button class="close-notification" onclick="this.closest('.stats-update-notification').remove()">×</button>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .stats-update-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        }
        
        .notification-banner {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
            min-width: 300px;
        }
        
        .notification-icon {
            font-size: 1.2rem;
        }
        
        .notification-text {
            flex: 1;
            font-weight: 500;
        }
        
        .close-notification {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
            style.remove();
        }
    }, 3000);
}

// Arena Data Loading Functions
async function loadArenaData() {
    try {
        // Load Arena system stats (online users, active matches, total matches)
        const statsResponse = await fetch('/api/arena/system-stats');
        if (statsResponse.ok) {
            const { stats } = await statsResponse.json();
            updateArenaStats(stats);
        }

        // Load Arena leaderboard preview
        const leaderboardResponse = await fetch('/api/arena/leaderboard');
        if (leaderboardResponse.ok) {
            const { leaderboard } = await leaderboardResponse.json();
            updateArenaLeaderboard(leaderboard.slice(0, 3)); // Show top 3
        }
    } catch (error) {
        console.error('Failed to load Arena data:', error);
    }
}

function updateArenaStats(stats) {
    document.getElementById('arenaOnlineUsers').textContent = stats.onlinePlayersCount || 0;
    document.getElementById('arenaActiveMatches').textContent = stats.activeMatchesCount || 0;
    document.getElementById('arenaTotalMatches').textContent = stats.totalMatchesCount || 0;
}

function updateArenaLeaderboard(leaderboard) {
    const container = document.getElementById('arenaTopPlayers');
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<div class="loading">No matches played yet. Be the first to enter the Arena!</div>';
        return;
    }
    
    container.innerHTML = leaderboard.map((player, index) => `
        <div class="leaderboard-item-preview">
            <div class="leaderboard-rank-preview">#${index + 1}</div>
            <div class="leaderboard-player-preview">
                <h4>${player.username}</h4>
                <p>${player.totalMatches} matches • ${player.currentStreak} streak</p>
            </div>
            <div class="leaderboard-stats-preview">
                <div class="win-rate-preview">${player.winRate}%</div>
                <div>${player.wins}W ${player.losses}L</div>
            </div>
        </div>
    `).join('');
}
document.addEventListener('DOMContentLoaded', function() {
    // 1. Navigation Toggle
    const nav = document.querySelector('.codingPageNav');
    const navToggle = document.querySelector('.outside-logo-sidebar');
    const navClose = document.querySelector('.inside-logo-sidebar');

    function showNav() {
        nav.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideNav() {
        nav.classList.remove('show');
        document.body.style.overflow = '';
    }

    navToggle.addEventListener('click', showNav);
    navClose.addEventListener('click', hideNav);

    // Close nav when clicking outside
    document.querySelector('main').addEventListener('click', function (e) {
        if (e.target === this) hideNav();
    });

    // 2. Show Section Functionality
    function showSection(sectionId) {
        // Hide all sections, previously not done correctly
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show the selected section, previously not done correctly
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            history.replaceState(null, null, `#${sectionId}`);
        }

        // Update active link, previously not done correctly
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('current', link.getAttribute('href') === `#${sectionId}`);
        });

        // Hide the navigation menu for better UX
        hideNav();
    }

    // Set up navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            // Skip preventDefault for external links (like Arena)
            const href = this.getAttribute('href');
            if (href.startsWith('../') || href.startsWith('http')) {
                return; // Allow default navigation behavior
            }
            
            e.preventDefault();
            const sectionId = href.substring(1); // Get the section ID from the href
            showSection(sectionId);
        });
    });

    // Handle direct URL access
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('home'); // Default section
    }

    // 3. Theme Switcher
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', function () {
        document.body.className = this.value;
        localStorage.setItem('theme', this.value);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = savedTheme;
    themeToggle.value = savedTheme;

    // 4. Email Form
    // Email Validation and Sending
//   email 
function validate(){
    let name= document.querySelector(".name");
    let email= document.querySelector(".email");
    let msg= document.querySelector(".message");
    let sendBtn= document.querySelector(".send-btn");
    sendBtn.addEventListener('click',(e)=>{
        e.preventDefault();
        if(name.value == "" || email.value == "" || msg.value== ""){
            emptyerror();
        }else{
            sendmail (name.value, email.value, msg.value);
            success();
        }
    });

}
validate();
function sendmail(name,email,msg)
{
    emailjs.send("service_vikash__gupta","template_u8mh7fk",{
        from_name: email,
        to_name: name,
        message: msg,
        });
}
function emptyerror()
{
    swal({
        title: "Complete All The Sections",
        text: "Fields cant be empty",
        icon: "error",
      });
}
function success()
{
    swal({
        title: "Email Sent Succesfully",
        text: "We will Try To Rspond In 24 Hours",
        icon: "success",
      });
}

    updateUserDetails(); // update the user details once all listeners have been added
});
