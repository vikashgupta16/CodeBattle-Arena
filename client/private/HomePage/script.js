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
    document.querySelector('main').addEventListener('click', function(e) {
        if (e.target === this) hideNav();
    });
    
    function showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            history.replaceState(null, null, `#${sectionId}`);
        }
                document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('current', 
                link.getAttribute('data-section') === sectionId);
        });
    }
    
    // Set up navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });
    
    // Handle direct URL access
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('home');
    }
    // 3. Theme Switcher
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', function() {
        document.body.className = this.value;
        localStorage.setItem('theme', this.value);
    });
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = savedTheme;
    themeToggle.value = savedTheme;
    
    // 4. Email Form
    document.querySelector('.send-btn').addEventListener('click', function(e) {
        e.preventDefault();
        const name = document.querySelector('.name').value;
        const email = document.querySelector('.email').value;
        const message = document.querySelector('.message').value;
        
        if (!name || !email || !message) {
            swal("Error", "Please fill all fields", "error");
            return;
        }
        
        emailjs.send("service_vikash__gupta", "template_u8mh7fk", {
            from_name: email,
            to_name: name,
            message: message
        }).then(function() {
            swal("Success", "Message sent!", "success");
        }, function(error) {
            swal("Error", "Failed to send message", "error");
            console.error('Email error:', error);
        });
    });
    
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
        
        // Show typing indicator
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
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            return "Hello! How can I help you with coding today?";
        }
        if (lowerMsg.includes('help')) {
            return "I can help with coding problems in C, C++, Java, and Python!";
        }
        
        // Default response
        return "I'm your coding assistant. Ask me anything about programming!";
    }
    
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
});