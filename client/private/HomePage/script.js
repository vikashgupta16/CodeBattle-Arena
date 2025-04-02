document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();

    // Email form validation
    setupEmailValidation();

    // Chat system initialization
    setupChatSystem();
});

function initApp() {
    // DOM Elements
    const DOM = {
        nav: document.querySelector('.codingPageNav'),
        navToggle: document.querySelector('.outside-logo-sidebar'),
        closeNav: document.querySelector('.inside-logo-sidebar'),
        main: document.querySelector('main'),
        sections: document.querySelectorAll('.section'),
        navLinks: document.querySelectorAll('.nav-link'),
        themeToggle: document.getElementById('theme-toggle')
    };

    // Show default section
    showSection('home');

    // Event Listeners
    DOM.navToggle.addEventListener('click', showNav);
    DOM.closeNav.addEventListener('click', hideNav);
    DOM.main.addEventListener('click', function(e) {
        if (e.target === DOM.main) hideNav();
    });

    // Navigation links
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });

    // Theme switcher
    DOM.themeToggle.addEventListener('change', function() {
        document.body.className = this.value.toLowerCase();
        localStorage.setItem('theme', this.value);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = savedTheme.toLowerCase();
    DOM.themeToggle.value = savedTheme;

    // Navigation functions
    function showNav() {
        DOM.nav.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideNav() {
        DOM.nav.classList.remove('show');
        document.body.style.overflow = '';
    }

    function showSection(sectionId) {
        // Hide all sections
        DOM.sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Update active nav link
        DOM.navLinks.forEach(link => {
            const linkSection = link.getAttribute('href').substring(1);
            link.classList.toggle('current', linkSection === sectionId);
        });

        hideNav();
    }
}

function setupEmailValidation() {
    const name = document.querySelector(".name");
    const email = document.querySelector(".email");
    const msg = document.querySelector(".message");
    const sendBtn = document.querySelector(".send-btn");
    
    sendBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (name.value === "" || email.value === "" || msg.value === "") {
            showAlert("Complete All The Sections", "Fields can't be empty", "error");
        } else {
            sendMail(name.value, email.value, msg.value);
        }
    });

    function sendMail(name, email, msg) {
        emailjs.send("service_vikash__gupta", "template_u8mh7fk", {
            from_name: email,
            to_name: name,
            message: msg,
        })
        .then(function() {
            showAlert("Email Sent Successfully", "We will try to respond within 24 hours", "success");
        })
        .catch(function(error) {
            console.error("Email sending failed:", error);
            showAlert("Error", "Failed to send email. Please try again later.", "error");
        });
    }

    function showAlert(title, text, icon) {
        swal({
            title: title,
            text: text,
            icon: icon,
        });
    }
}

function setupChatSystem() {
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const chatBox = document.getElementById("chat-box");
    const languageButtons = document.querySelectorAll(".lang-btn");

    let selectedLanguage = "general"; // Default mode

    // Language selection
    languageButtons.forEach(button => {
        button.addEventListener("click", function() {
            selectedLanguage = this.dataset.lang;
            languageButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            addAssistantMessage(`Switched to ${selectedLanguage} mode! How can I help you today?`);
        });
    });

    // Send message on button click or Enter key
    sendButton.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") sendMessage();
    });

    function sendMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        addUserMessage(userMessage);
        chatInput.value = "";

        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        // Simulate processing delay
        setTimeout(() => {
            typingIndicator.remove();
            const response = getAssistantResponse(userMessage.toLowerCase());
            addAssistantMessage(response);
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 1000 + Math.random() * 2000);
    }

    function addUserMessage(message) {
        const msgElement = document.createElement("div");
        msgElement.className = "message user-message";
        msgElement.innerHTML = `<strong>You:</strong> ${message}`;
        chatBox.appendChild(msgElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addAssistantMessage(message) {
        const msgElement = document.createElement("div");
        msgElement.className = "message assistant-message";
        msgElement.innerHTML = `<strong>CODI:</strong> ${message}`;
        chatBox.appendChild(msgElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTypingIndicator() {
        const indicator = document.createElement("div");
        indicator.className = "typing-indicator";
        indicator.innerHTML = `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        `;
        chatBox.appendChild(indicator);
        chatBox.scrollTop = chatBox.scrollHeight;
        return indicator;
    }

    function getAssistantResponse(message) {
    }
}