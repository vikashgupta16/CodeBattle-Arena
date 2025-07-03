// @author Rouvik Maji
async function updateUserDetails()
{
    const username = document.getElementById("dashboard_username");
    const currRank = document.getElementById("dashboard_currRank");
    const contestCount = document.getElementById("dashboard_contestCount");
    const streakCount = document.getElementById("dashboard_streakCount");
    
    // New detailed stats elements
    const totalProblems = document.getElementById("dashboard_totalProblems");
    const easyCount = document.getElementById("dashboard_easyCount");
    const mediumCount = document.getElementById("dashboard_mediumCount");
    const hardCount = document.getElementById("dashboard_hardCount");

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

        // Otherwise fetch from server
        const res = await fetch(window.location.origin + '/api/userdata');
        const data = await res.json();
        
        updateStatsDisplay(data);
    } catch (error) {
        console.error('Failed to update user details:', error);
        // Set default values if fetch fails
        updateStatsDisplay({
            name: 'User',
            rank: 0,
            contests_count: 0,
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
    contestCount.textContent = data.contests_count || '0';
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
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1); // Get the section ID from the href
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

    // 5. Chat System
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatBox = document.getElementById('chat-box');

    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `<strong>${sender === 'user' ? 'You' : 'CODI'}:</strong> ${text}`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage('user', message);
        chatInput.value = '';
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        chatBox.appendChild(typing);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Simulate AI response
        setTimeout(() => {
            typing.remove();
            addMessage('assistant', getAIResponse(message));
        }, 1000 + Math.random() * 2000);
    }

    function getAIResponse(message) {
        const lowerMsg = message.toLowerCase();

        // Simple responses
        if (/(hello|hi|hey|hola|yo|what's up)/.test(lowerMsg)) {
            return "👋 Hey there, Code Warrior! Ready to crush some bugs or crack some problems?";
        }
    
        // Help-related handler
        if (/(help|assist|support|guide|how to|what can you do)/.test(lowerMsg)) {
            return "🧠 I'm your coding buddy! I can assist with:\n\n💻 Languages: C, C++, Java, Python\n🛠️ Debugging help\n📘 Concepts explanation\n⚔️ Coding challenges\n\nJust type your question or drop your code!";
        }
    
        // Default response
        return "🤖 I'm your AI coding assistant. Ask me anything related to programming, and let's level up together!";
    }

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    updateUserDetails(); // update the user details once all listeners have been added
});
