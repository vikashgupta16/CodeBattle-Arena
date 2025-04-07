// const { text } = require("express");


const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const promtForm = document.querySelector(".prompt-form");
const promtInput = promtForm.querySelector(".prompt-input");
// const API_KEY = "AIzaSyBB4vSkg-a9qGbrSfLlVV-lTuvAPxxNX-s"
const API_KEY = "AIzaSyCtevtKDSxmGY88BFh8giaK4EQjwo4qhl8"
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
let userMessage = "";
const chatHistory = [];

const  createMsgElement = (content, ...classes) => {
    const div= document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if(wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            botMsgDiv.classList.remove("loading");
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            document.body.classList.remove("bot-responding");
        }
    },40)
}

const genrateResponse = async (botMsgDiv) => {

    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage}]
    })
     try{
        const response = await fetch(API_URL, {
           method: "POST",
           headers: {"Content-Type": "application/json"},
           body:JSON.stringify({ contents: chatHistory}),
           signal: controller.signal
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g,"$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);
     }catch (error) {
        console.log(error)
     }

}

const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promtInput.value.trim();
    if(!userMessage) return;

    const userMsgHtml = '<p class="message-text"></p>'
    const userMsgDiv = createMsgElement(userMsgHtml,"user-message");

    promtInput.value= "";
    // userData.message = userMessage;
    document.body.classList.add("bot-responding");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() =>{
        const botMsgHtml = '<img src="gemini-chatbot-logo.svg"  class="avtar"><p class="message-text">Just a sec..</p>'
    const botMsgDiv = createMsgElement(botMsgHtml,"bot-message", "loading");

    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    genrateResponse(botMsgDiv);
    },600);
} 

document.querySelector("#stop-response-btn").addEventListener("click", () => {
    // userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
            document.body.classList.remove("bot-responding");
        
});

promtForm.addEventListener("submit",handleFormSubmit)



