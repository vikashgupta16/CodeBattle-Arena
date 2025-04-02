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
document.addEventListener("DOMContentLoaded", function() {
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

        // Add user message
        addUserMessage(userMessage);
        chatInput.value = "";

        // Get and display assistant response
        const response = getAssistantResponse(userMessage.toLowerCase());
        addAssistantMessage(response);

        // Auto-scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addUserMessage(message) {
        const msgElement = document.createElement("div");
        msgElement.className = "message user-message";
        msgElement.innerHTML = `<strong>You:</strong> ${message}`;
        chatBox.appendChild(msgElement);
    }

    function addAssistantMessage(message) {
        const msgElement = document.createElement("div");
        msgElement.className = "message assistant-message";
        msgElement.innerHTML = `<strong>CODI:</strong> ${message}`;
        chatBox.appendChild(msgElement);
    }

    function getAssistantResponse(message) {
        // Greeting responses
        if (message.includes("hello") || message.includes("hi")) {
            return "Hey there! 👋 I'm CODI, your coding buddy. How can I assist you with " + 
                   (selectedLanguage === "general" ? "programming" : selectedLanguage) + " today?";
        }

        // Language-specific basic questions and answers
        const knowledgeBase = {
            c: {
                "what is a pointer": "A pointer in C is a variable that stores the memory address of another variable. Want a simple example?",
                "hello world": "Here's a basic C Hello World:\n```c\n#include <stdio.h>\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n```"
            },
            cpp: {
                "what is oop": "OOP in C++ stands for Object-Oriented Programming! It includes concepts like classes, objects, inheritance, and polymorphism. Need an example?",
                "hello world": "Here's a C++ Hello World:\n```cpp\n#include <iostream>\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}\n```"
            },
            java: {
                "what is a class": "In Java, a class is a blueprint for creating objects. It defines properties and behaviors. Want to see one?",
                "hello world": "Here's a Java Hello World:\n```java\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}\n```"
            },
            python: {
                "what is a list": "A Python list is a mutable, ordered collection of items. Like this: my_list = [1, 2, 3]. Want more details?",
                "hello world": "Here's Python's simplest Hello World:\n```python\nprint(\"Hello, World!\")\n```"
            }
        };

        // Check knowledge base for specific language
        if (selectedLanguage !== "general" && knowledgeBase[selectedLanguage]) {
            for (let [question, answer] of Object.entries(knowledgeBase[selectedLanguage])) {
                if (message.includes(question)) {
                    return answer + " 😊 Anything else you'd like to know?";
                }
            }
        }

        // General programming questions
        if (message.includes("what is programming")) {
            return "Programming is like giving instructions to a computer to solve problems or perform tasks! It's fun once you get the hang of it. Which language would you like to explore?";
        }

        // Friendly fallback responses
        const fallbacks = [
            "Hmm, I'm not sure about that one! Could you give me more details?",
            "That's an interesting question! Can you tell me more?",
            "I'm here to help! Could you rephrase that or pick a language to focus on?"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
});