document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTLERİ ---
    const appContainer = document.getElementById('app-container');
    const startBlock = document.getElementById('start-block');
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');

    const questionBlocks = {
        hungry: document.getElementById('q-hungry'),
        lightMeals: document.getElementById('q-light-meals'),
        fatteningDishes: document.getElementById('q-fattening-dishes'),
        lightChoice: document.getElementById('q-light-choice'),
        fatteningChoice: document.getElementById('q-fattening-choice'),
    };

    const buttons = {
        start: document.getElementById('start-btn'),
        restart: document.getElementById('restart-btn'),
        order: document.getElementById('order-btn')
    };

    // --- DURUM (STATE) ---
    let userAnswers = {};

    // --- ÖRNEK RESTORAN VERİSİ ---
    // Gerçek bir uygulamada bu veriler bir API'den gelirdi
    const restaurants = {
        salad: [
            { name: 'The Crisp Leaf', rating: 4.8 },
            { name: 'Garden Fresh Salads', rating: 4.6 },
            { name: 'Green Bowl Express', rating: 4.7 }
        ],
        vegetables: [
            { name: 'Veggie Heaven', rating: 4.9 },
            { name: 'The Root Cellar', rating: 4.5 },
            { name: 'Green Delight', rating: 4.8 }
        ],
        soup: [
            { name: 'Souperb!', rating: 4.9 },
            { name: 'The Broth & Bowl', rating: 4.7 },
            { name: 'Daily Soup Co.', rating: 4.6 }
        ],
        pizza: [
            { name: 'Fire & Stone Pizzeria', rating: 4.9 },
            { name: 'The Perfect Slice', rating: 4.8 },
            { name: 'Dough Bros', rating: 4.7 }
        ],
        pasta: [
            { name: 'Nonna\'s Kitchen', rating: 4.9 },
            { name: 'Pasta Perfect', rating: 4.7 },
            { name: 'The Saucy Noodle', rating: 4.8 }
        ],
        burger: [
            { name: 'The Burger Joint', rating: 4.9 },
            { name: 'Patty & Bun', rating: 4.8 },
            { name: 'Grill Masters', rating: 4.6 }
        ]
    };

    // --- FONKSİYONLAR ---

    /**
     * Tüm soru/sonuç bloklarını gizler
     */
    function hideAllBlocks() {
        startBlock.style.display = 'none';
        resultContainer.style.display = 'none';
        Object.values(questionBlocks).forEach(block => {
            block.style.display = 'none';
            block.classList.remove('fade-in-up');
        });
    }

    /**
     * Belirli bir bloğu animasyonla gösterir
     * @param {HTMLElement} blockElement Gösterilecek blok
     */
    function showBlock(blockElement) {
        hideAllBlocks();
        blockElement.style.display = 'block';
        // Animasyon sınıfını eklemeden önce display özelliğinin uygulanmasına izin ver
        setTimeout(() => {
            blockElement.classList.add('fade-in-up');
        }, 10);
    }

    /**
     * Verilen yemek türü için en yüksek puanlı restoranı bulur
     * @param {string} foodType - Yemek kategorisi (örn. 'pizza', 'salad')
     */
    function suggestRestaurant(foodType) {
        if (!restaurants[foodType]) {
            console.error('Geçersiz yemek türü:', foodType);
            resultContent.innerHTML = `<p class="text-red-400">Üzgünüz, bir hata oluştu. Lütfen tekrar deneyin.</p>`;
            showBlock(resultContainer);
            return;
        }

        // Restoranları puana göre azalan sırada sırala
        const sortedRestaurants = [...restaurants[foodType]].sort((a, b) => b.rating - a.rating);
        const bestRestaurant = sortedRestaurants[0];

        // CR: En iyi restoranı seç (mantık burada uygulanır)
        resultContent.innerHTML = `
            <p class="text-xl md:text-2xl font-bold mb-2">${bestRestaurant.name}</p>
            <p class="text-gray-300">Burası <span class="font-bold text-yellow-400">${bestRestaurant.rating} ★</span> puanı ile en yüksek puanlı ${foodType} mekanıdır.</p>
        `;
        showBlock(resultContainer);
    }

    /**
     * Uygulamayı başlangıç durumuna sıfırlar
     */
    function resetApp() {
        userAnswers = {};
        hideAllBlocks();
        startBlock.style.display = 'block';
    }

    /**
     * Kullanıcı seçimleri için ana mantık işleyicisi, akış şemasını takip eder
     * @param {string} question - Cevaplanan sorunun anahtarı
     * @param {string} choice - Kullanıcının cevabı ('yes' veya 'no')
     */
    function handleDecision(question, choice) {
        userAnswers[question] = choice;

        // Akış şeması mantığının uygulanması
        const Y = userAnswers.hungry === 'yes';
        const L = userAnswers.lightMeals === 'yes';
        const F = userAnswers.fatteningDishes === 'yes';

        switch (question) {
            case 'hungry':
                if (Y) { // Evet
                    showBlock(questionBlocks.fatteningDishes);
                } else { // Hayır
                    showBlock(questionBlocks.lightMeals);
                }
                break;

            case 'light-meals':
                if (L) { // Evet, hafif istiyor
                    showBlock(questionBlocks.lightChoice);
                } else { // Hayır, ağır istiyor
                    showBlock(questionBlocks.fatteningChoice);
                }
                break;

            case 'fattening-dishes':
                if (F) { // Evet, ağır istiyor
                    showBlock(questionBlocks.fatteningChoice);
                } else { // Hayır, hafif istiyor
                    showBlock(questionBlocks.lightChoice);
                }
                break;
        }
    }


    // --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---

    buttons.start.addEventListener('click', () => {
        showBlock(questionBlocks.hungry);
    });

    buttons.restart.addEventListener('click', resetApp);

    buttons.order.addEventListener('click', () => {
        alert('Sipariş başarıyla verildi! (Bu bir simülasyondur)');
        resetApp();
    });

    // Tüm seçim butonları için olay delegasyonu kullan
    appContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button'); // Tıklanan buton veya içindeki element
        if (!target) return; // Butona tıklanmadıysa çık

        // Soru seçimlerini işle
        const question = target.dataset.question;
        const choice = target.dataset.choice;
        if (question && choice) {
            handleDecision(question, choice);
        }

        // Son yemek seçimini işle
        const foodType = target.dataset.food;
        if (foodType) {
            suggestRestaurant(foodType);
        }
    });
});
