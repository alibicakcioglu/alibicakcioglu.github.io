document.addEventListener('DOMContentLoaded', () => {
    // Set initial background
    document.body.className = 'start-bg';
    
    // --- Element Selectors ---
    const screens = document.querySelectorAll('.screen');
    const startBtn = document.getElementById('start-btn');
    const hungryQuestion = document.getElementById('hungry-question');
    const lightQuestion = document.getElementById('light-question');
    const fatteningQuestion = document.getElementById('fattening-question');
    const submitLightChoiceBtn = document.getElementById('submit-light-choice');
    const submitFatteningChoiceBtn = document.getElementById('submit-fattening-choice');
    const orderBtn = document.getElementById('order-btn');
    const restartBtn = document.getElementById('restart-btn');
    const suggestionText = document.getElementById('suggestion-text');

    // --- State Management ---
    const showScreen = (screenId) => {
        screens.forEach(screen => screen.classList.remove('active'));
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) {
            activeScreen.classList.add('active');
        }
        // Set background theme based on screen
        setBackgroundTheme(screenId);
    };

    const setBackgroundTheme = (screenId) => {
        // Remove all background classes
        document.body.className = '';
        
        // Set background based on screen
        switch(screenId) {
            case 'start-screen':
                document.body.className = 'start-bg';
                break;
            case 'hungry-question':
                document.body.className = 'hungry-bg';
                break;
            case 'light-question':
                document.body.className = 'light-bg';
                break;
            case 'fattening-question':
                document.body.className = 'fattening-bg';
                break;
            case 'light-choice':
                document.body.className = 'light-choice-bg';
                break;
            case 'fattening-choice':
                document.body.className = 'fattening-choice-bg';
                break;
            // result-screen background will be set by food type
        }
    };

    // --- Flowchart Logic & Event Listeners ---

    // 1. START Button
    startBtn.addEventListener('click', () => {
        showScreen('hungry-question');
    });

    // 2. Decision: "Are you hungry a lot?"
    hungryQuestion.addEventListener('click', (e) => {
        if (e.target.matches('.decision-btn')) {
            const isHungry = e.target.getAttribute('data-answer') === 'yes';
            // Path "Yes" -> Go to Fattening Question
            // Path "No" -> Go to Light Question
            showScreen(isHungry ? 'fattening-question' : 'light-question');
        }
    });
    
    // 3. Decision: "Do you want to eat light meals?" (Accessed if NOT hungry a lot)
    lightQuestion.addEventListener('click', (e) => {
        if (e.target.matches('.decision-btn')) {
            const wantsLight = e.target.getAttribute('data-answer') === 'yes';
            // Path "Yes" -> Go to Light Meal Choice
            // Path "No" -> Go to Fattening Meal Choice
            showScreen(wantsLight ? 'light-choice' : 'fattening-choice');
        }
    });

    // 4. Decision: "Do you want to eat fattening dishes?" (Accessed if hungry a lot)
    fatteningQuestion.addEventListener('click', (e) => {
        if (e.target.matches('.decision-btn')) {
            const wantsFattening = e.target.getAttribute('data-answer') === 'yes';
            // Path "Yes" -> Go to Fattening Meal Choice
            // Path "No" -> Go to Light Meal Choice
            showScreen(wantsFattening ? 'fattening-choice' : 'light-choice');
        }
    });

    // 5. Process: Suggest light meal restaurants
    submitLightChoiceBtn.addEventListener('click', () => {
        const choice = document.querySelector('input[name="light-food"]:checked');
        if (!choice) {
            alert('Please select a meal type.'); // Simple validation
            return;
        }
        displayResult(choice.value);
    });

    // 6. Process: Suggest fattening meal restaurants
    submitFatteningChoiceBtn.addEventListener('click', () => {
        const choice = document.querySelector('input[name="fattening-food"]:checked');
        if (!choice) {
            alert('Please select a meal type.'); // Simple validation
            return;
        }
        displayResult(choice.value);
    });
    
    // 7. Process: Consolidate results and show suggestion
    const displayResult = (foodType) => {
        const restaurants = getRestaurantSuggestions(foodType);
        suggestionText.innerHTML = restaurants;
        
        // Set special celebration background for result screen
        document.body.className = 'result-celebration-bg';
        
        showScreen('result-screen');
    };

    // Restaurant suggestions based on food type
    const getRestaurantSuggestions = (foodType) => {
        const restaurantData = {
            'salad': [
                'Green Garden Cafe - Fresh organic salads',
                'Healthy Bites - Mediterranean salad bowls',
                'Fresh & Clean - Customizable salad bar'
            ],
            'vegetables': [
                'Veggie Paradise - Farm-to-table vegetables',
                'Garden Fresh - Roasted vegetable platters',
                'Nature\'s Kitchen - Steamed & grilled veggies'
            ],
            'soup': [
                'Soup Central - Homemade daily soups',
                'Warm Bowl - Traditional & exotic soups',
                'Comfort Kitchen - Hearty soup combinations'
            ],
            'pizza': [
                'Tony\'s Pizzeria - Authentic Italian pizza',
                'Slice Paradise - New York style pizza',
                'Cheesy Dreams - Gourmet pizza creations'
            ],
            'pasta': [
                'Pasta Bella - Fresh handmade pasta',
                'Italian Corner - Traditional pasta dishes',
                'Noodle House - Creative pasta combinations'
            ],
            'burger': [
                'Burger Palace - Juicy gourmet burgers',
                'Stack House - Double-stacked specialties',
                'Grill Master - BBQ burger classics'
            ]
        };

        const suggestions = restaurantData[foodType] || ['No restaurants found'];
        
        // Create restaurant selection HTML
        const restaurantSelection = document.getElementById('restaurant-selection');
        restaurantSelection.innerHTML = suggestions.map((restaurant, index) => 
            `<label>
                <input type="radio" name="restaurant-choice" value="${restaurant}">
                <span>${index + 1}. ${restaurant}</span>
            </label>`
        ).join('');
        
        // Add event listeners for restaurant selection
        restaurantSelection.addEventListener('change', () => {
            const orderBtn = document.getElementById('order-btn');
            orderBtn.disabled = false;
        });
        
        return `<strong>Top 3 ${foodType} restaurants:</strong>`;
    };

    // 8. Process: Order
    orderBtn.addEventListener('click', () => {
        const selectedRestaurant = document.querySelector('input[name="restaurant-choice"]:checked');
        if (selectedRestaurant) {
            alert(`Your order has been placed with ${selectedRestaurant.value.split(' - ')[0]}! Enjoy your meal! 🍽️`);
        }
    });
    
    // 9. END and Restart
    restartBtn.addEventListener('click', () => {
        // Reset radio buttons
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
        // Reset background
        document.body.className = '';
        // Reset order button
        document.getElementById('order-btn').disabled = true;
        // Go back to the start
        showScreen('start-screen');
    });

});
