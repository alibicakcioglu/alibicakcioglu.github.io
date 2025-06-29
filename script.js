// script.js

// DOM Elements
const startScreen = document.getElementById('start-screen');
const questionScreen = document.getElementById('question-screen');
const resultScreen = document.getElementById('result-screen');
const startButton = document.getElementById('start-button');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const suggestedPhone = document.getElementById('suggested-phone');
const startOverButton = document.getElementById('start-over-button');
const errorMessage = document.getElementById('error-message');

// User choices state
let userChoices = {
    budget: null,
    camera: null,
    battery: null
};

// Flowchart questions and options
const questions = {
    start: {
        text: "What is your budget?",
        options: [
            { text: "Between 25,000 and 40,000 liras", value: "Y", next: "camera_or_battery_Y" },
            { text: "Between 40,000 and 60,000 liras", value: "L", next: "camera_or_battery_L" },
            { text: "Between 60,000 and 140,000 liras", value: "F", next: "camera_or_battery_F" }
        ],
        type: 'budget'
    },
    camera_or_battery_Y: {
        text: "Is camera quality important to you?",
        options: [
            { text: "Yes", value: "S", next: "battery_Y_S" },
            { text: "No", value: "notS", next: "battery_Y_notS" }
        ],
        type: 'camera'
    },
    camera_or_battery_L: {
        text: "Is camera quality important to you?",
        options: [
            { text: "Yes", value: "S", next: "battery_L_S" },
            { text: "No", value: "notS", next: "battery_L_notS" }
        ],
        type: 'camera'
    },
    camera_or_battery_F: {
        text: "Is camera quality important to you?",
        options: [
            { text: "Yes", value: "S", next: "battery_F_S" },
            { text: "No", value: "notS", next: "battery_F_notS" }
        ],
        type: 'camera'
    },
    battery_Y_S: {
        text: "Is battery capacity important to you?",
        options: [
            { text: "Yes", value: "V", next: "result" },
            { text: "No", value: "notV", next: "result" }
        ],
        type: 'battery'
    },
    battery_Y_notS: {
        text: "Is battery capacity important to you?",
        options: [
            { text: "Yes", value: "V", next: "result" },
            { text: "No", value: "notV", next: "result" }
        ],
        type: 'battery'
    },
    battery_L_S: {
        text: "Is battery capacity important to you?",
        options: [
            { text: "Yes", value: "V", next: "result" },
            { text: "No", value: "notV", next: "result" }
        ],
        type: 'battery'
    },
    battery_L_notS: {
        text: "Is battery capacity important to you?",
        options: [
            { text: "Yes", value: "V", next: "result" },
            { text: "No", value: "notV", next: "result" }
        ],
        type: 'battery'
    },
    battery_F_S: {
        text: "Is battery capacity important to you?",
        options: [
            { text: "Yes", value: "V", next: "result" },
            { text: "No", value: "notV", next: "result" }
        ],
        type: 'battery'
    },
    battery_F_notS: {
        text: "Is battery capacity important to you?",
        options: [
            { text: "Yes", value: "V", next: "result" },
            { text: "No", value: "notV", next: "result" }
        ],
        type: 'battery'
    }
};

// Current step in the flowchart
let currentStep = 'start';

/**
 * Displays a message to the user for a short period.
 * @param {string} message - The message to display.
 */
function showMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 3000); // Hide after 3 seconds
}

/**
 * Renders the current question and its options.
 */
function renderQuestion() {
    const questionData = questions[currentStep];
    if (!questionData) {
        console.error("Invalid step:", currentStep);
        return;
    }

    questionText.textContent = questionData.text;
    optionsContainer.innerHTML = ''; // Clear previous options

    questionData.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.classList.add('option-button');
        // Add click event listener to each option button
        button.addEventListener('click', () => handleOptionClick(option, questionData.type));
        optionsContainer.appendChild(button);
    });

    startScreen.classList.add('hidden');
    questionScreen.classList.remove('hidden');
    resultScreen.classList.add('hidden');
}

/**
 * Handles the click event on an option button.
 * @param {object} option - The selected option object.
 * @param {string} type - The type of question (e.g., 'budget', 'camera', 'battery').
 */
function handleOptionClick(option, type) {
    // Visual feedback: Highlight selected button
    const allButtons = optionsContainer.querySelectorAll('.option-button');
    allButtons.forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');

    // Store the user's choice
    userChoices[type] = option.value;

    // Proceed to the next step or determine the result
    currentStep = option.next;

    // Small delay for visual feedback before proceeding
    setTimeout(() => {
        if (currentStep === 'result') {
            displayResult();
        } else {
            renderQuestion();
        }
    }, 300);
}

/**
 * Determines and displays the final phone recommendation based on user choices.
 */
function displayResult() {
    const { budget, camera, battery } = userChoices;
    let recommendedPhone = "No phone found for your criteria."; // Default message

    // Map logical statements to recommendations
    // Y: 25-40k TL, L: 40-60k TL, F: 60-140k TL
    // S: Camera important, notS: Camera not important
    // V: Battery important, notV: Battery not important

    // Y Budget
    if (budget === "Y") {
        if (camera === "S" && battery === "notV") { // Y ∧ S ∧ ¬V → AD
            recommendedPhone = "iPhone 13";
        } else if (camera === "notS" && battery === "V") { // Y ∧ ¬S ∧ V → SP
            recommendedPhone = "Honor 400 Pro";
        } else if (camera === "notS" && battery === "notV") { // Y ∧ ¬S ∧ ¬V → PL
            recommendedPhone = "Xiaomi 14T Pro";
        } else if (camera === "S" && battery === "V") { // Y ∧ S ∧ V → YS
            recommendedPhone = "Samsung S24 Plus";
        }
    }
    // L Budget
    else if (budget === "L") {
        if (camera === "S" && battery === "V") { // L ∧ S ∧ V → LK
            recommendedPhone = "iPhone 15 Plus";
        } else if (camera === "S" && battery === "notV") { // L ∧ S ∧ ¬V → CR
            recommendedPhone = "iPhone 16";
        } else if (camera === "notS" && battery === "V") { // L ∧ ¬S ∧ V → ST
            recommendedPhone = "Samsung Galaxy S25 Plus";
        } else if (camera === "notS" && battery === "notV") { // L ∧ ¬S ∧ ¬V → SB
            recommendedPhone = "Samsung Galaxy S25";
        }
    }
    // F Budget
    else if (budget === "F") {
        if (camera === "S" && battery === "V") { // F ∧ S ∧ V → UV
            recommendedPhone = "iPhone 16 Pro Max";
        } else if (camera === "S" && battery === "notV") { // F ∧ S ∧ ¬V → OP
            recommendedPhone = "iPhone 15 Pro Max";
        } else if (camera === "notS" && battery === "V") { // F ∧ ¬S ∧ V → NP
            recommendedPhone = "Samsung Galaxy S25 Ultra";
        } else if (camera === "notS" && battery === "notV") { // F ∧ ¬S ∧ ¬V → BR
            recommendedPhone = "Samsung Galaxy S24 Ultra";
        }
    }

    suggestedPhone.textContent = recommendedPhone;

    questionScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
}

/**
 * Resets the application to its initial state.
 */
function resetApp() {
    userChoices = {
        budget: null,
        camera: null,
        battery: null
    };
    currentStep = 'start';
    startScreen.classList.remove('hidden');
    questionScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    errorMessage.classList.add('hidden'); // Hide any previous error messages
}

// Event Listeners
startButton.addEventListener('click', renderQuestion);
startOverButton.addEventListener('click', resetApp);

// Initialize the app on page load
resetApp();
