document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selection ---
    const steps = {
        q1_hungry: document.getElementById('step-q1-hungry'),
        q2_light: document.getElementById('step-q2-light'),
        q2_fattening: document.getElementById('step-q2-fattening'),
        q3_light_specific: document.getElementById('step-q3-light-specific'),
        q3_fattening_specific: document.getElementById('step-q3-fattening-specific'),
        suggestion: document.getElementById('step-suggestion'),
        choosing: document.getElementById('step-choosing'),
        ordering: document.getElementById('step-ordering'),
        end: document.getElementById('step-end'),
    };

    const buttons = {
        hungry_yes: document.getElementById('btn-hungry-yes'),
        hungry_no: document.getElementById('btn-hungry-no'),
        light_yes: document.getElementById('btn-light-yes'),
        light_no: document.getElementById('btn-light-no'),
        fattening_yes: document.getElementById('btn-fattening-yes'),
        fattening_no: document.getElementById('btn-fattening-no'),
        restart: document.getElementById('btn-restart'),
    };
    
    const choiceButtons = document.querySelectorAll('.choice-btn');
    const suggestionText = document.getElementById('suggestion-text');

    // --- Core Functions ---

    // Hides all steps
    function hideAllSteps() {
        for (const key in steps) {
            steps[key].classList.add('hidden');
        }
    }

    // Shows a specific step by its key
    function showStep(stepKey) {
        hideAllSteps();
        steps[stepKey].classList.remove('hidden');
    }

    // Handles the final automated sequence
    function startFinalSequence(suggestionType) {
        // 1. Show suggestion
        suggestionText.textContent = `Suggest ${suggestionType} restaurants`;
        showStep('suggestion');

        // 2. Wait, then show "Choose restaurant"
        setTimeout(() => {
            showStep('choosing');
        }, 2000);

        // 3. Wait, then show "Order"
        setTimeout(() => {
            showStep('ordering');
        }, 4000);

        // 4. Wait, then show "END"
        setTimeout(() => {
            showStep('end');
        }, 6000);
    }
    
    // Resets the app to the first question
    function resetApp() {
        showStep('q1_hungry');
    }

    // --- Event Listeners ---

    // User Interaction: Are you hungry?
    buttons.hungry_yes.addEventListener('click', () => {
        showStep('q2_fattening');
    });
    buttons.hungry_no.addEventListener('click', () => {
        showStep('q2_light');
    });

    // User Interaction: Preference for light or fattening
    // If NOT hungry...
    buttons.light_yes.addEventListener('click', () => {
        showStep('q3_light_specific');
    });
    buttons.light_no.addEventListener('click', () => {
        // If not hungry and doesn't want light, suggest fattening (e.g., small portion)
        showStep('q3_fattening_specific');
    });
    
    // If VERY hungry...
    buttons.fattening_yes.addEventListener('click', () => {
        showStep('q3_fattening_specific');
    });
    buttons.fattening_no.addEventListener('click', () => {
        // If hungry but doesn't want fattening, suggest light meal
        showStep('q3_light_specific');
    });

    // User Interaction: Specific food choice
    choiceButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const suggestion = e.target.dataset.suggestion;
            startFinalSequence(suggestion);
        });
    });

    // User Interaction: Restart
    buttons.restart.addEventListener('click', resetApp);

    // --- Initial State ---
    resetApp();
});