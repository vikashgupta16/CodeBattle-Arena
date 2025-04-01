function showChallenges(level) {
    const container = document.getElementById("challenge-container");
    container.innerHTML = ""; // Clear previous content

    challenges[level].forEach((challenge, index) => {
        const challengeBox = document.createElement("div");
        challengeBox.classList.add("assignment-box");
        challengeBox.innerHTML = `
            <h3>${challenge.title}</h3>
            <p>${challenge.description}</p>
            <button class="solve-btn" onclick="openCompiler('${challenge.title}', '${challenge.description}')">Solve Now</button>
        `;
        container.appendChild(challengeBox);
    });
}

function openCompiler(title, description) {
    // Hide the challenge selection section
    document.getElementById("assignments").classList.add("hidden");

    // Show the coding interface
    document.getElementById("coding-page").classList.remove("hidden");

    // Display selected challenge title and description
    document.getElementById("selected-challenge-title").innerText = title;
    document.getElementById("selected-challenge-description").innerText = description;

    // Reset code editor and output
    document.getElementById("code-editor").value = "";
    document.getElementById("output-container").classList.add("hidden");
    document.getElementById("input-container").classList.add("hidden");
}

function runCode() {
    const code = document.getElementById("code-editor").value;
    document.getElementById("output-container").classList.remove("hidden");
    document.getElementById("output-box").innerText = "Running code...";

    // Simulated output (replace with real API call if needed)
    setTimeout(() => {
        document.getElementById("output-box").innerText = "Output: (Simulated result)";
    }, 1000);
}
