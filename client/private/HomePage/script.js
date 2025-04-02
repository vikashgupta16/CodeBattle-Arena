document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const DOM = {
        nav: document.querySelector('.codingPageNav'),
        navToggle: document.querySelector('.outside-logo-sidebar'),
        closeNav: document.querySelector('.inside-logo-sidebar'),
        main: document.querySelector('main'),
        sections: document.querySelectorAll('.section'),
        navLinks: document.querySelectorAll('.nav-link'),
        themeToggle: document.getElementById('theme-toggle')
    }
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
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Theme switcher
    DOM.themeToggle.addEventListener('change', function() {
        document.body.className = this.value;
        localStorage.setItem('theme', this.value);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    document.body.className = savedTheme;
    DOM.themeToggle.value = savedTheme;

    // Functions
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
            link.classList.toggle('current', link.getAttribute('data-section') === sectionId);
        });

        hideNav();
    }
});

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
// JavaScript code for chat assistant functionality
document.addEventListener("DOMContentLoaded", function() {
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const chatBox = document.getElementById("chat-box");

    sendButton.addEventListener("click", function() {
        const userMessage = chatInput.value.trim();

        if (userMessage) {
            // Append user message to chat box
            const userMessageElement = document.createElement("div");
            userMessageElement.textContent = "User: " + userMessage;
            userMessageElement.style.marginBottom = "10px";
            chatBox.appendChild(userMessageElement);

            // Clear chat input field
            chatInput.value = "";

            // Simulate assistant response (you can replace this logic with your own assistant backend)
            const assistantMessage = simulateAssistantResponse(userMessage);
            const assistantMessageElement = document.createElement("div");
            assistantMessageElement.textContent = "Assistant: " + assistantMessage;
            assistantMessageElement.style.marginBottom = "10px";
            assistantMessageElement.style.color = "blue";
            chatBox.appendChild(assistantMessageElement);

            // Scroll to the bottom of chat box
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });

    function simulateAssistantResponse(userMessage) {
        // Temporary simulated response logic
        return "You said: " + userMessage + ". How can I assist further?";
    }
});
