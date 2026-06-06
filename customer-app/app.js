// app.js - LuxeGrocer Consumer-Centric Client-Side Controller

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let currentView = 'landing';
    let activeStore = null;
    let activeCategoryFilter = 'all';
    let cart = []; // Array of cart items { id, name, price, quantity, emoji, image, unit, storeId }
    let trackingOrder = null;
    let trackingTimer = null;
    let driverProgress = 0;
    let scratchCardClaimed = false;

    // Grace cancellation timer state
    let cancelGraceTimer = null;
    let cancelSecondsLeft = 60;
    let selectedTipAmount = 0;

    // --- DOM Elements Cache ---
    const elements = {
        // Nav elements
        btnLogo: document.getElementById('btn-logo'),
        activeLocationText: document.getElementById('active-location-text'),
        btnChangeLocation: document.getElementById('btn-change-location'),
        btnCart: document.getElementById('btn-cart'),
        cartBadge: document.getElementById('cart-badge'),

        // View panels
        viewLanding: document.getElementById('view-landing'),
        viewSearchResults: document.getElementById('view-search-results'),
        viewStoreProfile: document.getElementById('view-store-profile'),
        viewCheckout: document.getElementById('view-checkout'),
        viewOrderTracker: document.getElementById('view-order-tracker'),

        // Weather banner
        weatherBanner: document.getElementById('weather-banner'),
        weatherIcon: document.getElementById('weather-icon'),
        weatherText: document.getElementById('weather-text'),
        deliverySpeedText: document.getElementById('delivery-speed-text'),

        // Landing elements
        globalSearchInput: document.getElementById('global-search-input'),
        btnGlobalSearch: document.getElementById('btn-global-search'),
        categoryListContainer: document.getElementById('category-list-container'),
        storeListContainer: document.getElementById('store-list-container'),
        searchAutocompleteBox: document.getElementById('search-autocomplete-box'),

        // Search Results elements
        btnBackToLandingFromSearch: document.getElementById('btn-back-to-landing-from-search'),
        searchTitleText: document.getElementById('search-title-text'),
        searchSubtitleText: document.getElementById('search-subtitle-text'),
        searchComparisonContainer: document.getElementById('search-comparison-container'),
        filterDistanceSlider: document.getElementById('filter-distance-slider'),
        distanceSliderValue: document.getElementById('distance-slider-value'),

        // Store Profile elements
        btnBackToLandingFromStore: document.getElementById('btn-back-to-landing-from-store'),
        storeLocalSearch: document.getElementById('store-local-search'),
        storeProfileHeaderContainer: document.getElementById('store-profile-header-container'),
        storeCategoryTabs: document.getElementById('store-category-tabs'),
        storeProductsContainer: document.getElementById('store-products-container'),

        // Cart Drawer elements
        cartOverlayElement: document.getElementById('cart-overlay-element'),
        cartDrawerElement: document.getElementById('cart-drawer-element'),
        btnCloseCart: document.getElementById('btn-close-cart'),
        cartItemsWrapper: document.getElementById('cart-items-wrapper'),
        cartSummarySubtotal: document.getElementById('cart-summary-subtotal'),
        cartSummaryDelivery: document.getElementById('cart-summary-delivery'),
        cartSummaryTotal: document.getElementById('cart-summary-total'),
        btnCartCheckout: document.getElementById('btn-cart-checkout'),

        // Cart Savings progress elements
        cartSavingsBox: document.getElementById('cart-savings-box'),
        savingsTitle: document.getElementById('savings-title'),
        savingsValue: document.getElementById('savings-value'),
        savingsProgressBar: document.getElementById('savings-progress-bar'),
        savingsMsg: document.getElementById('savings-msg'),

        // Checkout elements
        btnBackToStoreFromCheckout: document.getElementById('btn-back-to-store-from-checkout'),
        checkoutPaymentForm: document.getElementById('checkout-payment-form'),
        checkoutItemsList: document.getElementById('checkout-items-list'),
        checkoutSubtotal: document.getElementById('checkout-subtotal'),
        checkoutDeliveryFee: document.getElementById('checkout-delivery-fee'),
        checkoutGrandTotal: document.getElementById('checkout-grand-total'),
        checkoutName: document.getElementById('checkout-name'),
        checkoutPhone: document.getElementById('checkout-phone'),
        checkoutAddress: document.getElementById('checkout-address'),
        btnSubmitOrder: document.getElementById('btn-submit-order'),
        checkoutRiderTipRow: document.getElementById('checkout-rider-tip-row'),
        checkoutRiderTipAmount: document.getElementById('checkout-rider-tip-amount'),
        tipAmountInput: document.getElementById('tip-amount-input'),
        tipAlertMsg: document.getElementById('tip-alert-msg'),

        // Order Tracker elements
        trackerShopName: document.getElementById('tracker-shop-name'),
        trackerOrderId: document.getElementById('tracker-order-id'),
        trackerMapFrame: document.getElementById('tracker-map-frame'),
        trackerTimelineSteps: document.getElementById('tracker-timeline-steps'),
        btnSimAdvance: document.getElementById('btn-sim-advance'),
        trackerStorePhone: document.getElementById('tracker-store-phone'),
        btnTrackerDone: document.getElementById('btn-tracker-done'),

        // Cancel countdown elements
        cancelGraceBox: document.getElementById('cancel-grace-box'),
        cancelTimerCircle: document.getElementById('cancel-timer-circle'),
        cancelTimerText: document.getElementById('cancel-timer-text'),
        btnCancelOrder: document.getElementById('btn-cancel-order'),
        trackerOtpCode: document.getElementById('tracker-otp-code'),
        trackerOtpBox: document.getElementById('tracker-otp-box'),

        // Modals
        modalLocationElement: document.getElementById('modal-location-element'),
        btnCloseLocationModal: document.getElementById('btn-close-location-modal'),
        locationSimulationForm: document.getElementById('location-simulation-form'),
        locAddress: document.getElementById('loc-address'),
        locLat: document.getElementById('loc-lat'),
        locLng: document.getElementById('loc-lng'),
        btnLocPresetH: document.getElementById('btn-loc-preset-h'),
        btnLocPresetK: document.getElementById('btn-loc-preset-k'),
        btnLocPresetI: document.getElementById('btn-loc-preset-i'),

        modalUpiPayment: document.getElementById('modal-upi-payment'),
        btnCloseUpiModal: document.getElementById('btn-close-upi-modal'),
        upiGrandTotal: document.getElementById('upi-grand-total'),
        upiLoaderContent: document.getElementById('upi-loader-content'),
        
        modalScratchCard: document.getElementById('modal-scratch-card'),
        scratchCodeText: document.getElementById('scratch-code-text'),
        scratchCanvas: document.getElementById('scratch-canvas'),
        btnScratchDone: document.getElementById('btn-scratch-done'),

        // Toast
        toastNotification: document.getElementById('toast-notification'),
        toastIcon: document.getElementById('toast-icon'),
        toastMessage: document.getElementById('toast-message'),

        cartUpsellBox: document.getElementById('cart-upsell-box'),
        cartUpsellListWrapper: document.getElementById('cart-upsell-list-wrapper'),

        // Auth elements
        btnAuthTrigger: document.getElementById('btn-auth-trigger'),
        authTriggerText: document.getElementById('auth-trigger-text'),
        modalAuth: document.getElementById('modal-auth'),
        btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),
        formCustomerLogin: document.getElementById('form-customer-login'),
        formCustomerRegister: document.getElementById('form-customer-register'),
        loginEmail: document.getElementById('login-email'),
        loginPassword: document.getElementById('login-password'),
        regName: document.getElementById('reg-name'),
        regEmail: document.getElementById('reg-email'),
        regPassword: document.getElementById('reg-password'),
        regPhone: document.getElementById('reg-phone'),
        regAddress: document.getElementById('reg-address'),
        linkToRegister: document.getElementById('link-to-register'),
        linkToLogin: document.getElementById('link-to-login')
    };

    // --- Customer Authentication Helpers ---
    async function initAuth() {
        const user = await db.loadCurrentUser();
        if (user) {
            elements.authTriggerText.innerText = user.name.split(' ')[0];
            elements.btnAuthTrigger.title = `Logged in as ${user.name} (${user.role})`;
            elements.checkoutName.value = user.name;
            elements.checkoutPhone.value = user.phone || '';
            elements.checkoutAddress.value = user.address || '';

            // Check for active orders to restore tracking screen
            try {
                const orders = await db.getOrders();
                const activeOrder = orders.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
                if (activeOrder) {
                    await startOrderTracking(activeOrder);
                    await switchView('order-tracker');
                }
            } catch (err) {
                console.error("Error checking active orders on login/startup:", err);
            }
        } else {
            elements.authTriggerText.innerText = 'Sign In';
            elements.btnAuthTrigger.title = 'Login or Register';
        }
    }

    function toggleAuthModal(show) {
        if (show) {
            elements.formCustomerLogin.reset();
            elements.formCustomerRegister.reset();
            elements.formCustomerLogin.style.display = 'flex';
            elements.formCustomerRegister.style.display = 'none';
            document.getElementById('auth-modal-title').innerText = "Welcome to LuxeGrocer";
            document.getElementById('auth-modal-subtitle').innerText = "Sign in to access premium local catalog shelves";
            elements.modalAuth.style.display = 'flex';
            elements.modalAuth.classList.add('active');
        } else {
            elements.modalAuth.style.display = 'none';
            elements.modalAuth.classList.remove('active');
        }
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;

        const res = await db.login(email, password);
        if (res.success) {
            showToast(`Welcome back, ${res.user.name}!`, "success");
            toggleAuthModal(false);
            await initAuth();
        } else {
            showToast(res.error, "error");
        }
    }

    async function handleRegisterSubmit(e) {
        e.preventDefault();
        const registerData = {
            email: elements.regEmail.value.trim(),
            password: elements.regPassword.value,
            role: 'customer',
            name: elements.regName.value.trim(),
            phone: elements.regPhone.value.trim(),
            address: elements.regAddress.value.trim()
        };

        const res = await db.register(registerData);
        if (res.success) {
            showToast(`Account created successfully! Welcome, ${res.user.name}.`, "success");
            toggleAuthModal(false);
            await initAuth();
        } else {
            showToast(res.error, "error");
        }
    }

    // --- Geolocation UI Sync ---
    async function updateLocationUI() {
        const userLoc = db.getUserLocation();
        elements.activeLocationText.innerHTML = `Deliver to: <strong>${userLoc.address}</strong>`;
        
        if (currentView === 'landing') {
            await renderStores();
        }
    }

    // --- SPA View Switcher ---
    async function switchView(viewName) {
        // Hide all views
        elements.viewLanding.style.display = 'none';
        elements.viewSearchResults.style.display = 'none';
        elements.viewStoreProfile.style.display = 'none';
        elements.viewCheckout.style.display = 'none';
        elements.viewOrderTracker.style.display = 'none';

        // Show targets
        switch (viewName) {
            case 'landing':
                elements.viewLanding.style.display = 'block';
                renderCategories();
                await renderStores();
                simulateWeatherAndSpeed();
                break;
            case 'search-results':
                elements.viewSearchResults.style.display = 'block';
                break;
            case 'store-profile':
                elements.viewStoreProfile.style.display = 'block';
                break;
            case 'checkout':
                elements.viewCheckout.style.display = 'block';
                resetTippingButtons();
                await renderCheckoutSummary();
                break;
            case 'order-tracker':
                elements.viewOrderTracker.style.display = 'block';
                break;
        }
        currentView = viewName;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Toast Alerts ---
    function showToast(message, type = 'success') {
        elements.toastMessage.innerText = message;
        if (type === 'success') {
            elements.toastIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
            elements.toastNotification.style.borderLeft = '4px solid #10b981';
        } else if (type === 'error') {
            elements.toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i>';
            elements.toastNotification.style.borderLeft = '4px solid #ef4444';
        } else {
            elements.toastIcon.innerHTML = '<i class="fa-solid fa-info" style="color: #3b82f6;"></i>';
            elements.toastNotification.style.borderLeft = '4px solid #3b82f6';
        }

        elements.toastNotification.style.transform = 'translateY(0)';
        elements.toastNotification.style.opacity = '1';

        setTimeout(() => {
            elements.toastNotification.style.transform = 'translateY(100px)';
            elements.toastNotification.style.opacity = '0';
        }, 3000);
    }

    // --- Voice Synthesis Soundbox ---
    function playSoundbox(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.05;
            const voices = window.speechSynthesis.getVoices();
            const chosenVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US'));
            if (chosenVoice) {
                utterance.voice = chosenVoice;
            }
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- Weather & Delivery Speed Simulator ---
    function simulateWeatherAndSpeed() {
        const conditions = [
            { icon: '☀️', text: 'Weather: <strong>Sunny & Clear</strong> • Sourcing riders instantly', speed: 'Lightning Fast (10-15 mins)', color: 'var(--primary)' },
            { icon: '⛅', text: 'Weather: <strong>Partly Cloudy</strong> • High rider availability', speed: 'Standard (12-18 mins)', color: 'var(--primary)' },
            { icon: '🌧️', text: 'Weather: <strong>Light Rain Shower</strong> • Drivers moving safely', speed: 'Rain Delay (+5 mins)', color: 'var(--warning)' }
        ];
        // Select random mock condition
        const cond = conditions[Math.floor(Math.random() * conditions.length)];
        elements.weatherIcon.innerText = cond.icon;
        elements.weatherText.innerHTML = cond.text;
        elements.deliverySpeedText.innerHTML = `Delivery Speed: <strong>${cond.speed}</strong>`;
        elements.weatherBanner.style.borderLeftColor = cond.color;
    }

    // --- Product Emoji Fallbacks ---
    function getProductEmoji(name, category) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('milk')) return '🥛';
        if (lowerName.includes('yogurt') || lowerName.includes('curd')) return '🥣';
        if (lowerName.includes('butter')) return '🧈';
        if (lowerName.includes('paneer') || lowerName.includes('cheese')) return '🧀';
        if (lowerName.includes('ghee')) return '🛢️';
        if (lowerName.includes('apple')) return '🍎';
        if (lowerName.includes('mango')) return '🥭';
        if (lowerName.includes('banana')) return '🍌';
        if (lowerName.includes('avocado')) return '🥑';
        if (lowerName.includes('cucumber')) return '🥒';
        if (lowerName.includes('tomato')) return '🍅';
        if (lowerName.includes('spinach')) return '🥬';
        if (lowerName.includes('sourdough') || lowerName.includes('bread') || lowerName.includes('loaf')) return '🍞';
        if (lowerName.includes('croissant')) return '🥐';
        if (lowerName.includes('juice')) return '🥤';
        if (lowerName.includes('babka') || lowerName.includes('cake')) return '🍰';
        
        switch (category) {
            case 'dairy': return '🥛';
            case 'fruits': return '🍏';
            case 'veggies': return '🥦';
            case 'bakery': return '🍞';
            case 'beverages': return '🍹';
            case 'pantry': return '🥫';
            default: return '📦';
        }
    }

    // --- Consumer Render Operations ---

    function renderCategories() {
        elements.categoryListContainer.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'glass-card category-card';
            card.innerHTML = `
                <span class="category-icon">${cat.icon}</span>
                <h3>${cat.name}</h3>
            `;
            card.addEventListener('click', () => {
                elements.globalSearchInput.value = cat.name;
                triggerGlobalSearch(cat.id);
            });
            elements.categoryListContainer.appendChild(card);
        });
    }

    async function renderStores() {
        elements.storeListContainer.innerHTML = '';
        const stores = await db.getStores();

        stores.forEach(store => {
            const card = document.createElement('div');
            card.className = 'glass-card store-card';
            card.innerHTML = `
                <div class="store-banner-wrapper">
                    <img class="store-banner-img" src="${store.image}" alt="${store.name}">
                    <div class="store-overlay"></div>
                    <span class="store-badge">${store.category}</span>
                </div>
                <div class="store-details">
                    <div class="store-title-row">
                        <h3 class="store-name">${store.name}</h3>
                        <span class="store-rating"><i class="fa-solid fa-star"></i> ${store.rating.toFixed(1)}</span>
                    </div>
                    <div class="store-info-tags">
                        <span class="store-info-tag"><i class="fa-solid fa-person-biking"></i> ${store.distance} km away</span>
                        <span class="store-info-tag" style="color: var(--secondary); display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-circle" style="font-size: 0.5rem; color: #10b981; animation: pulse 1.5s infinite;"></i> <strong>${Math.round(store.distance * 3 + 5)} Mins</strong></span>
                    </div>
                    <div class="store-address"><i class="fa-solid fa-map-pin"></i> ${store.address}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                loadStoreProfile(store.id);
            });
            elements.storeListContainer.appendChild(card);
        });
    }

    async function triggerGlobalSearch(query) {
        if (!query) {
            query = elements.globalSearchInput.value.trim();
        }
        if (!query) {
            showToast("Please enter a product name or category to search", "info");
            return;
        }

        const matches = await db.searchProductsGlobally(query);
        elements.searchTitleText.innerText = `Search Results for "${query}"`;
        elements.searchSubtitleText.innerText = `Found ${matches.length} matches in surrounding stores`;

        renderSearchResults(matches);
        await switchView('search-results');
    }

    function renderSearchResults(matches) {
        elements.searchComparisonContainer.innerHTML = '';
        if (matches.length === 0) {
            elements.searchComparisonContainer.innerHTML = `
                <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 16px; color: var(--primary);"></i>
                    <h3>No products found match your search criteria.</h3>
                </div>
            `;
            return;
        }

        const maxDist = parseFloat(elements.filterDistanceSlider.value);
        elements.distanceSliderValue.innerText = `${maxDist} km`;

        const sortBy = document.querySelector('input[name="search-sort"]:checked').value;
        let filtered = matches.filter(match => match.store.distance <= maxDist);

        if (sortBy === 'price-asc') {
            filtered.sort((a, b) => a.product.price - b.product.price);
        } else if (sortBy === 'rating') {
            filtered.sort((a, b) => b.product.rating - a.product.rating);
        } else {
            filtered.sort((a, b) => a.store.distance - b.store.distance);
        }

        if (filtered.length === 0) {
            elements.searchComparisonContainer.innerHTML = `
                <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-sliders" style="font-size: 3rem; margin-bottom: 16px; color: var(--primary);"></i>
                    <h3>No matching items within the ${maxDist} km range.</h3>
                </div>
            `;
            return;
        }

        filtered.forEach(match => {
            const card = document.createElement('div');
            card.className = 'glass-card comparison-card';
            card.style.position = 'relative';
            
            const hasImage = match.product.image && match.product.image.trim() !== '';
            const visualContent = hasImage 
                ? `<img src="${match.product.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px;" alt="${match.product.name}">`
                : getProductEmoji(match.product.name, match.product.category);

            const badgeHtml = match.product.badgeText 
                ? `<span class="product-badge-promo">${match.product.badgeText}</span>` 
                : '';

            const priceHtml = match.product.originalPrice 
                ? `<span class="product-price-slashed">₹${match.product.originalPrice.toFixed(2)}</span>₹${match.product.price.toFixed(2)}` 
                : `₹${match.product.price.toFixed(2)}`;
            
            card.innerHTML = `
                ${badgeHtml}
                <div class="compare-emoji">${visualContent}</div>
                <div class="compare-info">
                    <h3>${match.product.name}</h3>
                    <div class="compare-desc">${match.product.desc || 'No description available.'}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
                        Unit: <strong>${match.product.unit}</strong> | Stock: 
                        <span class="${match.product.stock > 0 ? 'product-stock-tag in-stock' : 'product-stock-tag out-stock'}">${match.product.stock > 0 ? `${match.product.stock} available` : 'Out of Stock'}</span>
                    </div>
                    <a href="#" class="compare-shop-link" data-store-id="${match.store.id}">
                        <i class="fa-solid fa-shop"></i> Available at <strong>${match.store.name}</strong> (${match.store.distance} km)
                    </a>
                    <div style="font-size: 0.8rem; color: var(--secondary); margin-top: 6px; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-circle" style="font-size: 0.4rem; color: #10b981; animation: pulse 1.5s infinite;"></i> Delivery in ${Math.round(match.store.distance * 3 + 5)} Mins
                    </div>
                </div>
                <div class="compare-action-block">
                    <div class="price">${priceHtml}</div>
                    <button class="btn-premium btn-add-cart" data-store-id="${match.store.id}" data-product-id="${match.product.id}" ${match.product.stock === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-plus"></i> Add to Cart
                    </button>
                </div>
            `;

            card.querySelector('.compare-shop-link').addEventListener('click', async (e) => {
                e.preventDefault();
                await loadStoreProfile(match.store.id);
            });

            card.querySelector('.btn-add-cart').addEventListener('click', async (e) => {
                await addToCart(match.store.id, match.product, e);
            });

            elements.searchComparisonContainer.appendChild(card);
        });
    }

    async function loadStoreProfile(storeId) {
        const store = await db.getStoreById(storeId);
        if (!store) return;
        activeStore = store;
        activeCategoryFilter = 'all';

        elements.storeProfileHeaderContainer.innerHTML = `
            <div class="store-profile-header">
                <img class="store-header-banner" src="${store.image}" alt="${store.name}">
                <div class="store-header-overlay"></div>
                <div class="store-header-content">
                    <div class="store-header-left">
                        <h1>${store.name}</h1>
                        <p><i class="fa-solid fa-map-pin"></i> ${store.address} | <i class="fa-solid fa-phone"></i> ${store.phone}</p>
                    </div>
                    <div class="store-header-stats">
                        <div class="store-stat-box">
                            <h4>★ ${store.rating.toFixed(1)}</h4>
                            <span>Rating</span>
                        </div>
                        <div class="store-stat-box">
                            <h4 style="color: var(--secondary); display: inline-flex; align-items: center; justify-content: center; gap: 4px;"><i class="fa-solid fa-circle" style="font-size: 0.5rem; color: #10b981; animation: pulse 1.5s infinite;"></i> ${Math.round(store.distance * 3 + 5)} Mins</h4>
                            <span>ETA (${store.distance} km)</span>
                        </div>
                        <div class="store-stat-box">
                            <h4>₹${store.distance <= 2 ? '15.00' : '35.00'}</h4>
                            <span>Direct Delivery</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        elements.storeCategoryTabs.innerHTML = '';
        const storeCategories = ['all', ...new Set(store.products.map(p => p.category))];
        
        storeCategories.forEach(catId => {
            const catObj = CATEGORIES.find(c => c.id === catId);
            const label = catId === 'all' ? 'All Shelf Items' : (catObj ? catObj.name : catId);
            const tab = document.createElement('button');
            tab.className = `nav-tab ${catId === activeCategoryFilter ? 'active' : ''}`;
            tab.innerText = label;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeCategoryFilter = catId;
                renderStoreProducts();
            });
            elements.storeCategoryTabs.appendChild(tab);
        });

        renderStoreProducts();
        await switchView('store-profile');
    }

    function renderStoreProducts() {
        elements.storeProductsContainer.innerHTML = '';
        if (!activeStore) return;

        const searchVal = elements.storeLocalSearch.value.trim().toLowerCase();
        let products = activeStore.products;

        if (activeCategoryFilter !== 'all') {
            products = products.filter(p => p.category === activeCategoryFilter);
        }
        if (searchVal) {
            products = products.filter(p => p.name.toLowerCase().includes(searchVal) || p.desc.toLowerCase().includes(searchVal));
        }

        if (products.length === 0) {
            elements.storeProductsContainer.innerHTML = `
                <div class="glass-panel" style="padding: 40px; grid-column: span 3; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-bag-shopping" style="font-size: 3rem; margin-bottom: 16px; color: var(--primary);"></i>
                    <h3>No products match selection in this store.</h3>
                </div>
            `;
            return;
        }

        products.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'glass-card product-card';
            card.style.position = 'relative';
            
            const emoji = getProductEmoji(prod.name, prod.category);
            const hasImage = prod.image && prod.image.trim() !== '';
            const visualContent = hasImage 
                ? `<img src="${prod.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" alt="${prod.name}">`
                : emoji;

            const badgeHtml = prod.badgeText 
                ? `<span class="product-badge-promo">${prod.badgeText}</span>` 
                : '';

            const priceHtml = prod.originalPrice 
                ? `<span class="product-price-slashed">₹${prod.originalPrice.toFixed(2)}</span>₹${prod.price.toFixed(2)}` 
                : `₹${prod.price.toFixed(2)}`;
            
            card.innerHTML = `
                ${badgeHtml}
                <div class="product-card-top">
                    <div class="product-emoji-container">${visualContent}</div>
                    <span class="product-stock-tag ${prod.stock > 0 ? 'in-stock' : 'out-stock'}">${prod.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div class="product-info">
                    <h3>${prod.name}</h3>
                    <div class="product-unit">${prod.unit}</div>
                    <p class="product-desc">${prod.desc || 'Fresh item sourced locally.'}</p>
                </div>
                <div class="product-footer">
                    <div class="product-price">${priceHtml}</div>
                    <button class="btn-premium btn-add-cart" ${prod.stock === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-plus"></i> Add
                    </button>
                </div>
            `;

            card.querySelector('.btn-add-cart').addEventListener('click', async (e) => {
                await addToCart(activeStore.id, prod, e);
            });

            elements.storeProductsContainer.appendChild(card);
        });
    }

    // --- Fly-To-Cart Particle Animation ---
    function triggerFlyToCart(event, content) {
        if (!event || !event.clientX || !event.clientY) return;
        
        const cartBtn = elements.btnCart;
        if (!cartBtn) return;
        
        const cartRect = cartBtn.getBoundingClientRect();
        
        const flyingEl = document.createElement('div');
        flyingEl.className = 'flying-item';
        flyingEl.innerHTML = content;
        flyingEl.style.left = `${event.clientX - 20}px`;
        flyingEl.style.top = `${event.clientY - 20}px`;
        
        document.body.appendChild(flyingEl);
        
        // Force reflow
        flyingEl.offsetWidth;
        
        // Move towards header cart icon center coordinates
        flyingEl.style.left = `${cartRect.left + cartRect.width / 2 - 20}px`;
        flyingEl.style.top = `${cartRect.top + cartRect.height / 2 - 20}px`;
        flyingEl.style.transform = 'scale(0.3)';
        flyingEl.style.opacity = '0.3';
        
        setTimeout(() => {
            flyingEl.remove();
            cartBtn.style.transform = 'scale(1.25)';
            setTimeout(() => {
                cartBtn.style.transform = '';
            }, 200);
        }, 800);
    }

    // --- Shopping Cart Drawer ---
    async function addToCart(storeId, product, event = null) {
        if (cart.length > 0 && cart[0].storeId !== storeId) {
            const oldStore = cart[0].storeName;
            const confirmChange = confirm(`Your cart contains items from "${oldStore}". Would you like to clear your cart to add items from the new store?`);
            if (confirmChange) {
                cart = [];
            } else {
                return;
            }
        }

        const existingItem = cart.find(item => item.id === product.id);
        const store = await db.getStoreById(storeId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                showToast("Store stock limit reached", "error");
                return;
            }
            existingItem.quantity++;
        } else {
            const itemImage = product.image && product.image.trim() !== '' ? product.image : '';
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                emoji: getProductEmoji(product.name, product.category),
                image: itemImage,
                unit: product.unit,
                storeId: storeId,
                storeName: store ? store.name : 'Local Shop',
                storeDistance: store ? store.distance : 1
            });
        }

        if (event) {
            const visualContent = product.image && product.image.trim() !== ''
                ? `<img src="${product.image}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : getProductEmoji(product.name, product.category);
            triggerFlyToCart(event, visualContent);
        }
        
        saveCartToStorage();
        updateCartBadge();
        await renderCart();
        showToast(`Added ${product.name} to cart.`);
    }

    function saveCartToStorage() {
        localStorage.setItem('luxegrocer_cart', JSON.stringify(cart));
    }

    function loadCartFromStorage() {
        const stored = localStorage.getItem('luxegrocer_cart');
        if (stored) {
            cart = JSON.parse(stored);
            updateCartBadge();
        }
    }

    function updateCartBadge() {
        const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQty > 0) {
            elements.cartBadge.innerText = totalQty;
            elements.cartBadge.style.display = 'flex';
        } else {
            elements.cartBadge.style.display = 'none';
        }
    }

    async function updateQuantity(productId, action) {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex === -1) return;

        const store = await db.getStoreById(cart[itemIndex].storeId);
        const product = store ? store.products.find(p => p.id === productId) : null;

        if (action === 'increase') {
            if (product && cart[itemIndex].quantity >= product.stock) {
                showToast("Cannot add more, stock limit reached", "error");
                return;
            }
            cart[itemIndex].quantity++;
        } else if (action === 'decrease') {
            cart[itemIndex].quantity--;
            if (cart[itemIndex].quantity <= 0) {
                cart.splice(itemIndex, 1);
            }
        }
        
        saveCartToStorage();
        updateCartBadge();
        await renderCart();
    }

    async function renderCart() {
        elements.cartItemsWrapper.innerHTML = '';
        if (cart.length === 0) {
            elements.cartItemsWrapper.innerHTML = `
                <div style="text-align: center; margin-top: 100px; color: var(--text-muted);">
                    <span style="font-size: 4rem; display: block; margin-bottom: 16px;">🛍️</span>
                    <h3>Your cart is empty</h3>
                    <p style="margin-top: 8px;">Explore grocery stores to add fresh items.</p>
                </div>
            `;
            elements.cartSummarySubtotal.innerText = '₹0.00';
            elements.cartSummaryDelivery.innerText = '₹0.00';
            elements.cartSummaryTotal.innerText = '₹0.00';
            elements.btnCartCheckout.disabled = true;
            elements.cartUpsellBox.style.display = 'none';
            elements.cartSavingsBox.style.display = 'none';
            return;
        }

        elements.btnCartCheckout.disabled = false;
        elements.cartSavingsBox.style.display = 'block';
        let subtotal = 0;
        
        cart.forEach(item => {
            const cost = item.price * item.quantity;
            subtotal += cost;

            const div = document.createElement('div');
            div.className = 'cart-item';
            
            const hasImage = item.image && item.image.trim() !== '';
            const visualContent = hasImage
                ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="${item.name}">`
                : item.emoji;

            div.innerHTML = `
                <div class="cart-item-emoji">${visualContent}</div>
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <span class="shop-name">${item.storeName} | ${item.unit}</span>
                    <div class="price">₹${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="cart-qty-btn decrease-qty" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="cart-qty-btn increase-qty" data-id="${item.id}">+</button>
                </div>
            `;

            div.querySelector('.decrease-qty').addEventListener('click', () => updateQuantity(item.id, 'decrease'));
            div.querySelector('.increase-qty').addEventListener('click', () => updateQuantity(item.id, 'increase'));

            elements.cartItemsWrapper.appendChild(div);
        });

        // Compute dynamic free delivery indicator progress
        const FREE_DELIVERY_THRESHOLD = 300;
        let deliveryFee = cart[0].storeDistance <= 2 ? 15.00 : 35.00;
        
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
            deliveryFee = 0.00;
            elements.savingsValue.innerText = "UNLOCKED! 🎉";
            elements.savingsValue.style.color = "var(--primary)";
            elements.savingsProgressBar.style.width = "100%";
            elements.savingsMsg.innerHTML = "You saved delivery fees! Enjoy <strong>FREE store-to-door delivery</strong>.";
        } else {
            const missing = FREE_DELIVERY_THRESHOLD - subtotal;
            const pct = (subtotal / FREE_DELIVERY_THRESHOLD) * 100;
            elements.savingsValue.innerText = `Add ₹${missing.toFixed(0)} more`;
            elements.savingsValue.style.color = "var(--accent)";
            elements.savingsProgressBar.style.width = `${pct}%`;
            elements.savingsMsg.innerHTML = `Add ₹${missing.toFixed(0)} more to unlock <strong>FREE direct delivery</strong>!`;
        }

        const grandTotal = subtotal + deliveryFee;

        elements.cartSummarySubtotal.innerText = `₹${subtotal.toFixed(2)}`;
        elements.cartSummaryDelivery.innerText = `₹${deliveryFee.toFixed(2)}`;
        elements.cartSummaryTotal.innerText = `₹${grandTotal.toFixed(2)}`;

        // Smart Upsell paired calculations
        const store = await db.getStoreById(cart[0].storeId);
        if (store) {
            const availableUpsells = store.products.filter(p => !cart.some(item => item.id === p.id) && p.stock > 0);
            
            if (availableUpsells.length > 0) {
                const scored = availableUpsells.map(p => {
                    let score = 0;
                    const hasMilk = cart.some(item => item.name.toLowerCase().includes('milk'));
                    if (hasMilk) {
                        if (p.name.toLowerCase().includes('butter') || p.name.toLowerCase().includes('sourdough') || p.name.toLowerCase().includes('bread') || p.name.toLowerCase().includes('croissant')) {
                            score += 10;
                        }
                    }
                    const hasFruit = cart.some(item => item.category === 'fruits' || item.name.toLowerCase().includes('apple') || item.name.toLowerCase().includes('mango'));
                    if (hasFruit) {
                        if (p.name.toLowerCase().includes('yogurt') || p.name.toLowerCase().includes('curd')) {
                            score += 10;
                        }
                    }
                    if (p.badgeText && (p.badgeText.toLowerCase().includes('best') || p.badgeText.toLowerCase().includes('pop') || p.badgeText.toLowerCase().includes('fresh'))) {
                        score += 5;
                    }
                    if (p.rating > 4.7) {
                        score += 3;
                    }
                    return { product: p, score };
                });

                scored.sort((a, b) => b.score - a.score);
                const topUpsells = scored.slice(0, 3).map(s => s.product);

                elements.cartUpsellListWrapper.innerHTML = '';
                topUpsells.forEach(prod => {
                    const card = document.createElement('div');
                    card.className = 'upsell-card';

                    const hasImg = prod.image && prod.image.trim() !== '';
                    const imgHtml = hasImg
                        ? `<img src="${prod.image}" class="upsell-img" alt="${prod.name}">`
                        : `<div class="upsell-img-emoji" style="font-size: 1.8rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: 8px;">${getProductEmoji(prod.name, prod.category)}</div>`;

                    card.innerHTML = `
                        ${imgHtml}
                        <div class="upsell-title">${prod.name}</div>
                        <div class="upsell-footer">
                            <div class="upsell-price">₹${prod.price.toFixed(2)}</div>
                            <button class="btn-premium btn-upsell-add" data-id="${prod.id}"><i class="fa-solid fa-plus"></i> Add</button>
                        </div>
                    `;

                    card.querySelector('.btn-upsell-add').addEventListener('click', (e) => {
                        addToCart(store.id, prod, e);
                    });

                    elements.cartUpsellListWrapper.appendChild(card);
                });

                elements.cartUpsellBox.style.display = 'block';
            } else {
                elements.cartUpsellBox.style.display = 'none';
            }
        } else {
            elements.cartUpsellBox.style.display = 'none';
        }
    }

    // --- Checkout Views ---
    async function renderCheckoutSummary() {
        elements.checkoutItemsList.innerHTML = '';
        if (cart.length === 0) return;

        let subtotal = 0;
        cart.forEach(item => {
            const cost = item.price * item.quantity;
            subtotal += cost;

            const hasImage = item.image && item.image.trim() !== '';
            const visualContent = hasImage
                ? `<img src="${item.image}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px;" alt="${item.name}">`
                : `<span style="font-size: 1.2rem; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">${item.emoji}</span>`;

            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap: 10px;">
                    ${visualContent}
                    <div>
                        <span style="font-size: 0.95rem; font-weight: 500;">${item.name}</span>
                        <br><span style="font-size: 0.75rem; color: var(--text-muted);">${item.quantity} x ₹${item.price.toFixed(2)} (${item.unit})</span>
                    </div>
                </div>
                <span style="font-size: 0.95rem; font-weight: 600;">₹${cost.toFixed(2)}</span>
            `;
            elements.checkoutItemsList.appendChild(div);
        });

        // Calculate delivery fee
        const distance = cart[0].storeDistance;
        let deliveryFee = distance <= 2 ? 15.00 : 35.00;
        if (subtotal >= 300) {
            deliveryFee = 0.00; // Free delivery
        }

        const grandTotal = subtotal + deliveryFee + selectedTipAmount;

        elements.checkoutSubtotal.innerText = `₹${subtotal.toFixed(2)}`;
        elements.checkoutDeliveryFee.innerText = `₹${deliveryFee.toFixed(2)}`;
        
        if (selectedTipAmount > 0) {
            elements.checkoutRiderTipRow.style.display = 'flex';
            elements.checkoutRiderTipAmount.innerText = `₹${selectedTipAmount.toFixed(2)}`;
        } else {
            elements.checkoutRiderTipRow.style.display = 'none';
        }

        elements.checkoutGrandTotal.innerText = `₹${grandTotal.toFixed(2)}`;

        // Operational constraints validation
        const store = await db.getStoreById(cart[0].storeId);
        const minOrderVal = store ? (store.minOrderValue || 0) : 0;
        const maxRadius = store ? (store.deliveryRadius || 5.0) : 5.0;
        
        let blockCheckout = false;
        let warningText = "";

        if (subtotal < minOrderVal) {
            blockCheckout = true;
            warningText = `Minimum order for this store is ₹${minOrderVal}. Add ₹${(minOrderVal - subtotal).toFixed(0)} more.`;
        } else if (distance > maxRadius) {
            blockCheckout = true;
            warningText = `Out of range. Store limit is ${maxRadius} km (You are ${distance} km away).`;
        }

        if (blockCheckout) {
            elements.btnSubmitOrder.disabled = true;
            elements.btnSubmitOrder.style.background = 'var(--danger)';
            elements.btnSubmitOrder.style.borderColor = 'var(--danger)';
            elements.btnSubmitOrder.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${warningText}`;
            elements.btnSubmitOrder.style.fontSize = '0.85rem';
        } else {
            elements.btnSubmitOrder.disabled = false;
            elements.btnSubmitOrder.style.background = '';
            elements.btnSubmitOrder.style.borderColor = '';
            elements.btnSubmitOrder.innerHTML = 'Place Delivery Order';
            elements.btnSubmitOrder.style.fontSize = '';
        }
    }

    function resetTippingButtons() {
        selectedTipAmount = 0;
        elements.tipAmountInput.value = "0";
        elements.tipAlertMsg.style.display = 'none';
        document.querySelectorAll('.tip-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const maybeBtn = document.querySelector('.tip-btn[data-tip="0"]');
        if (maybeBtn) maybeBtn.classList.add('active');
    }

    async function processCheckoutSubmit(e) {
        if (e) e.preventDefault();
        if (cart.length === 0) return;
        
        const customer = {
            name: elements.checkoutName.value.trim(),
            phone: elements.checkoutPhone.value.trim(),
            address: elements.checkoutAddress.value.trim(),
            payment: document.querySelector('input[name="payment-method"]:checked').value,
            tip: selectedTipAmount
        };

        const storeId = cart[0].storeId;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let deliveryFee = cart[0].storeDistance <= 2 ? 15.00 : 35.00;
        if (subtotal >= 300) deliveryFee = 0.00;
        
        const grandTotal = subtotal + deliveryFee + selectedTipAmount;

        if (customer.payment === 'upi') {
            elements.upiGrandTotal.innerText = `₹${grandTotal.toFixed(2)}`;
            elements.upiLoaderContent.innerHTML = `
                <div style="width: 30px; height: 30px; border: 3px solid var(--border-color); border-top-color: var(--primary); border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Waiting for bank payment confirmation...</p>
            `;
            elements.modalUpiPayment.style.display = 'flex';
            elements.modalUpiPayment.classList.add('active');

            setTimeout(async () => {
                elements.upiLoaderContent.innerHTML = `
                    <div style="font-size: 2rem; color: var(--primary); margin-bottom: 12px;"><i class="fa-solid fa-circle-check"></i></div>
                    <p style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">Payment Verified! Confirming order...</p>
                `;
                
                const order = await db.createOrder(storeId, cart, customer);
                setTimeout(async () => {
                    elements.modalUpiPayment.style.display = 'none';
                    elements.modalUpiPayment.classList.remove('active');
                    
                    if (order) {
                        cart = [];
                        saveCartToStorage();
                        updateCartBadge();
                        showToast("Payment confirmed! Sourcing store rider.", "success");
                        
                        // Play Voice Alert
                        playSoundbox(`Payment of ${Math.round(grandTotal)} rupees received on Luxe Grocer`);
                        
                        await startOrderTracking(order);
                        await switchView('order-tracker');
                    } else {
                        showToast("Failed to place order. Try again.", "error");
                    }
                }, 1200);
            }, 2500);
        } else {
            const order = await db.createOrder(storeId, cart, customer);
            if (order) {
                cart = [];
                saveCartToStorage();
                updateCartBadge();
                showToast("COD Order placed successfully.", "success");
                
                playSoundbox(`New cash on delivery order received on Luxe Grocer. Value ${Math.round(grandTotal)} rupees`);
                
                await startOrderTracking(order);
                await switchView('order-tracker');
            } else {
                showToast("Failed to place order. Try again.", "error");
            }
        }
    }

    // --- Order Cancellation Grace Period Timer ---
    function startCancelGracePeriodTimer(orderId) {
        if (cancelGraceTimer) clearInterval(cancelGraceTimer);
        cancelSecondsLeft = 60;
        elements.cancelGraceBox.style.display = 'flex';
        
        elements.cancelTimerText.innerText = cancelSecondsLeft;
        elements.cancelTimerCircle.style.strokeDasharray = '100, 100';

        cancelGraceTimer = setInterval(() => {
            cancelSecondsLeft--;
            elements.cancelTimerText.innerText = cancelSecondsLeft;
            
            const pct = (cancelSecondsLeft / 60) * 100;
            elements.cancelTimerCircle.style.strokeDasharray = `${pct}, 100`;

            if (cancelSecondsLeft <= 0) {
                clearInterval(cancelGraceTimer);
                elements.cancelGraceBox.style.display = 'none';
            }
        }, 1000);
    }

    // --- Live Order Tracker ---
    async function startOrderTracking(order) {
        trackingOrder = order;
        driverProgress = 0;
        scratchCardClaimed = false;

        elements.trackerShopName.innerText = `Ordering from: ${order.storeName}`;
        elements.trackerOrderId.innerText = `#${order.id}`;
        elements.trackerStorePhone.href = `tel:${order.storePhone}`;

        if (order.deliveryOtp) {
            elements.trackerOtpCode.innerText = order.deliveryOtp;
            elements.trackerOtpBox.style.display = 'flex';
        } else {
            elements.trackerOtpBox.style.display = 'none';
        }

        await updateTrackerTimeline();
        renderTrackerMap();
        startCancelGracePeriodTimer(order.id);
    }

    function animateRiderMarker() {
        const interval = setInterval(() => {
            if (driverProgress >= 100 || !trackingOrder) {
                clearInterval(interval);
                return;
            }
            driverProgress += 5;
            const riderMarker = document.getElementById('map-rider-marker');
            if (riderMarker) {
                const storePt = { x: 30, y: 70 };
                const homePt = { x: 70, y: 30 };
                
                const curX = storePt.x + (homePt.x - storePt.x) * (driverProgress / 100);
                const curY = storePt.y + (homePt.y - storePt.y) * (driverProgress / 100);
                
                riderMarker.style.left = `${curX}%`;
                riderMarker.style.top = `${curY}%`;
            }
        }, 500);
    }

    async function forceAdvanceSimulation() {
        if (!trackingOrder) return;
        const currentOrders = await db.getOrders();
        const activeOrd = currentOrders.find(o => o.id === trackingOrder.id);
        
        if (!activeOrd) return;

        if (activeOrd.status === 'Pending') {
            await db.updateOrderStatus(activeOrd.id, 'Preparing');
            showToast("Simulated: Store is packing.");
        } else if (activeOrd.status === 'Preparing') {
            await db.updateOrderStatus(activeOrd.id, 'Out for Delivery');
            showToast("Simulated: Rider dispatched.");
        } else if (activeOrd.status === 'Out for Delivery') {
            await db.updateOrderStatus(activeOrd.id, 'Delivered');
            showToast("Simulated: Order completed.");
        }
    }

    async function updateTrackerTimeline() {
        if (!trackingOrder) return;
        const freshOrder = await db.getOrderById(trackingOrder.id);
        if (!freshOrder) return;

        elements.trackerTimelineSteps.innerHTML = '';
        
        const possibleStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
        const activeIdx = possibleStatuses.indexOf(freshOrder.status);

        // Hide cancel window if status is no longer Pending
        if (freshOrder.status !== 'Pending') {
            if (cancelGraceTimer) clearInterval(cancelGraceTimer);
            elements.cancelGraceBox.style.display = 'none';
        }

        // Toggle OTP card visibility based on active delivery states
        if (freshOrder.status === 'Delivered' || freshOrder.status === 'Cancelled') {
            elements.trackerOtpBox.style.display = 'none';
        } else if (freshOrder.deliveryOtp) {
            elements.trackerOtpCode.innerText = freshOrder.deliveryOtp;
            elements.trackerOtpBox.style.display = 'flex';
        }

        possibleStatuses.forEach((status, idx) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'timeline-step';
            if (idx < activeIdx) {
                stepDiv.classList.add('completed');
            } else if (idx === activeIdx) {
                stepDiv.classList.add('active');
            }

            const record = freshOrder.statusTimeline.find(t => t.status === status);
            const timeStr = record ? new Date(record.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const desc = record ? record.desc : db.getDefaultStatusDesc(status);

            stepDiv.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <h4>${status === 'Pending' ? 'Order Received' : status}</h4>
                    <p>${desc}</p>
                    ${timeStr ? `<div class="timeline-time">${timeStr}</div>` : ''}
                </div>
            `;
            elements.trackerTimelineSteps.appendChild(stepDiv);
        });
    }

    // Map renderer
    function renderTrackerMap() {
        elements.trackerMapFrame.innerHTML = '';
        
        for (let i = 10; i < 100; i += 15) {
            const hLine = document.createElement('div');
            hLine.className = 'map-grid-line map-grid-h';
            hLine.style.top = `${i}%`;
            elements.trackerMapFrame.appendChild(hLine);
            
            const vLine = document.createElement('div');
            vLine.className = 'map-grid-line map-grid-v';
            vLine.style.left = `${i}%`;
            elements.trackerMapFrame.appendChild(vLine);
        }

        const storePt = { x: 30, y: 70 };
        const shopMarker = document.createElement('div');
        shopMarker.className = 'map-point point-shop';
        shopMarker.style.left = `${storePt.x}%`;
        shopMarker.style.top = `${storePt.y}%`;
        shopMarker.innerHTML = `
            <div class="map-label" style="min-width:100px;">🏠 ${trackingOrder.storeName}</div>
        `;
        elements.trackerMapFrame.appendChild(shopMarker);

        const homePt = { x: 70, y: 30 };
        const homeMarker = document.createElement('div');
        homeMarker.className = 'map-point point-home';
        homeMarker.style.left = `${homePt.x}%`;
        homeMarker.style.top = `${homePt.y}%`;
        homeMarker.innerHTML = `
            <div class="map-label">📍 Your Home</div>
        `;
        elements.trackerMapFrame.appendChild(homeMarker);

        const pathLine = document.createElement('div');
        pathLine.className = 'route-line';
        const dx = homePt.x - storePt.x;
        const dy = homePt.y - storePt.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        pathLine.style.left = `${storePt.x}%`;
        pathLine.style.top = `${storePt.y}%`;
        pathLine.style.width = `${distance}%`;
        pathLine.style.transform = `rotate(${angle}deg)`;
        elements.trackerMapFrame.appendChild(pathLine);

        const riderMarker = document.createElement('div');
        riderMarker.id = 'map-rider-marker';
        riderMarker.className = 'map-point point-driver';
        
        const isDispatched = ['Out for Delivery', 'Delivered'].includes(trackingOrder.status);
        const isDone = trackingOrder.status === 'Delivered';
        
        const startX = isDone ? homePt.x : (isDispatched ? storePt.x + (homePt.x - storePt.x)*(driverProgress/100) : storePt.x);
        const startY = isDone ? homePt.y : (isDispatched ? storePt.y + (homePt.y - storePt.y)*(driverProgress/100) : storePt.y);

        riderMarker.style.left = `${startX}%`;
        riderMarker.style.top = `${startY}%`;
        riderMarker.innerHTML = `
            <div class="map-label" style="background:var(--accent); border-color:var(--accent);">🛵 Direct Rider</div>
        `;
        elements.trackerMapFrame.appendChild(riderMarker);
    }

    // --- Reward Modals Scratch reveal ---
    function initScratchCard(rewardText, codeText) {
        const canvas = elements.scratchCanvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.globalCompositeOperation = 'source-over';
        canvas.style.opacity = '1';
        
        elements.btnScratchDone.disabled = true;
        elements.btnScratchDone.innerText = "Scratch card to reveal";
        
        const rewardContainer = document.querySelector('.scratch-reward-content');
        if (rewardContainer) {
            rewardContainer.querySelector('h4').innerText = rewardText;
            elements.scratchCodeText.innerText = codeText;
        }

        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#9ca3af');
        grad.addColorStop(0.5, '#e5e7eb');
        grad.addColorStop(1, '#4b5563');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Scratch Here! 🎁', width / 2, height / 2);
        
        let isDrawing = false;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 36;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
        
        function scratch(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            
            checkScratchAmount();
        }
        
        canvas.onmousedown = (e) => {
            isDrawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };
        canvas.onmousemove = scratch;
        canvas.onmouseup = () => isDrawing = false;
        canvas.onmouseleave = () => isDrawing = false;
        
        canvas.ontouchstart = (e) => {
            isDrawing = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };
        canvas.ontouchmove = scratch;
        canvas.ontouchend = () => isDrawing = false;
        
        let completed = false;
        function checkScratchAmount() {
            if (completed) return;
            const imgData = ctx.getImageData(0, 0, width, height);
            const pixels = imgData.data;
            let cleared = 0;
            
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] === 0) {
                    cleared++;
                }
            }
            
            const percentage = (cleared / (pixels.length / 4)) * 100;
            if (percentage > 45) {
                completed = true;
                canvas.style.opacity = '0';
                setTimeout(() => {
                    ctx.clearRect(0, 0, width, height);
                }, 400);
                
                elements.btnScratchDone.disabled = false;
                elements.btnScratchDone.innerText = "Claim Reward!";
                showConfetti();
            }
        }
    }

    // CSS particle confetti animation
    function showConfetti() {
        const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#6366f1'];
        const container = document.body;
        
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            p.style.position = 'fixed';
            p.style.width = `${Math.random() * 8 + 6}px`;
            p.style.height = `${Math.random() * 12 + 8}px`;
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.left = `${Math.random() * 100}vw`;
            p.style.top = `-20px`;
            p.style.zIndex = '9999';
            p.style.borderRadius = '2px';
            p.style.pointerEvents = 'none';
            p.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            container.appendChild(p);
            
            const duration = Math.random() * 2 + 1.5;
            const horizontalShift = (Math.random() - 0.5) * 200;
            
            p.animate([
                { top: '-20px', transform: `rotate(0deg) translateX(0)` },
                { top: '100vh', transform: `rotate(${Math.random() * 720}deg) translateX(${horizontalShift}px)` }
            ], {
                duration: duration * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            setTimeout(() => p.remove(), duration * 1000);
        }
    }

    function handleOrderDelivered(order) {
        scratchCardClaimed = true;
        playSoundbox(`Order delivered successfully. Settle status completed. Enjoy your premium grocery produce!`);
        
        setTimeout(() => {
            elements.modalScratchCard.style.display = 'flex';
            elements.modalScratchCard.classList.add('active');
            
            const rewards = [
                { text: "20% OFF next purchase!", code: "LUXETREAT20" },
                { text: "₹100 Luxe Wallet Cash!", code: "LUCKYSAVER" },
                { text: "Free Fresh Paneer next order!", code: "FREEPANEER" }
            ];
            const reward = rewards[Math.floor(Math.random() * rewards.length)];
            initScratchCard(reward.text, reward.code);
        }, 1200);
    }

    // --- Server-Sent Events (SSE) Sync ---
    const sse = new EventSource('http://localhost:5000/api/sync');
    sse.onmessage = async (e) => {
        try {
            const { event, data } = JSON.parse(e.data);
            console.log("SSE event received on consumer storefront:", event, data);
            
            if (event === 'orders_updated' && trackingOrder && data === trackingOrder.id) {
                const fresh = await db.getOrderById(data);
                if (fresh) {
                    const prevStatus = trackingOrder.status;
                    trackingOrder = fresh;
                    
                    await updateTrackerTimeline();
                    renderTrackerMap();
                    
                    if (fresh.status === 'Out for Delivery' && prevStatus !== 'Out for Delivery') {
                        animateRiderMarker();
                    }
                    if (fresh.status === 'Delivered' && !scratchCardClaimed) {
                        handleOrderDelivered(fresh);
                    }
                }
            }
            
            if (event === 'store_onboarded' || event === 'store_updated') {
                if (currentView === 'landing') {
                    await renderStores();
                } else if (currentView === 'store-profile' && activeStore && activeStore.id === data) {
                    await loadStoreProfile(data);
                }
            }
            
            if (event === 'catalog_changed') {
                if (activeStore && activeStore.id === data) {
                    await loadStoreProfile(data);
                }
            }
        } catch (err) {
            console.error("Error parsing SSE message:", err);
        }
    };

    // --- Click Event Listeners ---
    
    elements.btnLogo.addEventListener('click', async (e) => {
        e.preventDefault();
        await switchView('landing');
    });

    elements.btnCart.addEventListener('click', async () => {
        await renderCart();
        elements.cartOverlayElement.classList.add('active');
        elements.cartDrawerElement.classList.add('active');
    });

    elements.btnCloseCart.addEventListener('click', () => {
        elements.cartOverlayElement.classList.remove('active');
        elements.cartDrawerElement.classList.remove('active');
    });

    elements.cartOverlayElement.addEventListener('click', () => {
        elements.cartOverlayElement.classList.remove('active');
        elements.cartDrawerElement.classList.remove('active');
    });

    elements.btnGlobalSearch.addEventListener('click', () => triggerGlobalSearch());
    elements.globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerGlobalSearch();
    });

    // Autocomplete visual dropdown suggestions
    elements.globalSearchInput.addEventListener('input', async () => {
        const query = elements.globalSearchInput.value.trim();
        if (query.length < 1) {
            elements.searchAutocompleteBox.style.display = 'none';
            return;
        }
        
        const matches = await db.searchProductsGlobally(query);
        if (matches.length === 0) {
            elements.searchAutocompleteBox.style.display = 'none';
            return;
        }
        
        elements.searchAutocompleteBox.innerHTML = '';
        
        matches.slice(0, 5).forEach(match => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            const hasImage = match.product.image && match.product.image.trim() !== '';
            const thumbHtml = hasImage
                ? `<img src="${match.product.image}" class="autocomplete-thumb" alt="${match.product.name}">`
                : `<div class="autocomplete-thumb" style="font-size: 1.5rem; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03);">${getProductEmoji(match.product.name, match.product.category)}</div>`;
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; flex-grow: 1;">
                    ${thumbHtml}
                    <div class="autocomplete-info">
                        <h4>${match.product.name}</h4>
                        <span>${match.store.name} (${match.store.distance} km)</span>
                    </div>
                </div>
                <div class="autocomplete-price-add">
                    <div class="autocomplete-price">₹${match.product.price.toFixed(2)}</div>
                    <button class="btn-premium btn-upsell-add" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 6px;"><i class="fa-solid fa-plus"></i> Add</button>
                </div>
            `;
            
            item.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-upsell-add')) return;
                elements.searchAutocompleteBox.style.display = 'none';
                elements.globalSearchInput.value = match.product.name;
                await loadStoreProfile(match.store.id);
            });
            
            item.querySelector('.btn-upsell-add').addEventListener('click', async (e) => {
                await addToCart(match.store.id, match.product, e);
            });
            
            elements.searchAutocompleteBox.appendChild(item);
        });
        
        elements.searchAutocompleteBox.style.display = 'flex';
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#global-search-input') && !e.target.closest('#search-autocomplete-box')) {
            if (elements.searchAutocompleteBox) {
                elements.searchAutocompleteBox.style.display = 'none';
            }
        }
    });

    document.querySelectorAll('.suggestion-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const query = badge.getAttribute('data-tag');
            elements.globalSearchInput.value = badge.innerText.substring(2);
            triggerGlobalSearch(query);
        });
    });

    elements.btnChangeLocation.addEventListener('click', () => {
        const userLoc = db.getUserLocation();
        elements.locAddress.value = userLoc.address;
        elements.locLat.value = userLoc.lat;
        elements.locLng.value = userLoc.lng;
        elements.modalLocationElement.classList.add('active');
    });

    elements.btnCloseLocationModal.addEventListener('click', () => elements.modalLocationElement.classList.remove('active'));
    elements.btnLocPresetH.addEventListener('click', () => setLocationMock('hsr'));
    elements.btnLocPresetK.addEventListener('click', () => setLocationMock('kor'));
    elements.btnLocPresetI.addEventListener('click', () => setLocationMock('ind'));

    elements.locationSimulationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        db.setUserLocation(
            elements.locLat.value,
            elements.locLng.value,
            elements.locAddress.value.trim()
        );
        await updateLocationUI();
        elements.modalLocationElement.classList.remove('active');
        showToast("Simulation coordinates updated successfully!");
    });

    elements.btnBackToLandingFromSearch.addEventListener('click', async () => await switchView('landing'));
    elements.btnBackToLandingFromStore.addEventListener('click', async () => await switchView('landing'));
    elements.btnBackToStoreFromCheckout.addEventListener('click', async () => {
        if (activeStore) {
            await loadStoreProfile(activeStore.id);
        } else {
            await switchView('landing');
        }
    });

    elements.filterDistanceSlider.addEventListener('input', async () => {
        elements.distanceSliderValue.innerText = `${elements.filterDistanceSlider.value} km`;
        const q = elements.globalSearchInput.value || "Milk";
        const matches = await db.searchProductsGlobally(q);
        renderSearchResults(matches);
    });

    document.querySelectorAll('input[name="search-sort"]').forEach(radio => {
        radio.addEventListener('change', async () => {
            const q = elements.globalSearchInput.value || "Milk";
            const matches = await db.searchProductsGlobally(q);
            renderSearchResults(matches);
        });
    });

    elements.storeLocalSearch.addEventListener('input', () => {
        renderStoreProducts();
    });

    // Checkout tipping button clicks
    document.querySelectorAll('.tip-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const amount = parseInt(btn.getAttribute('data-tip')) || 0;
            selectedTipAmount = amount;
            elements.tipAmountInput.value = amount;
            
            if (amount > 0) {
                elements.tipAlertMsg.style.display = 'block';
            } else {
                elements.tipAlertMsg.style.display = 'none';
            }
            
            await renderCheckoutSummary();
        });
    });

    // Auth event listeners
    elements.btnAuthTrigger.addEventListener('click', async () => {
        if (db.token) {
            db.logout();
            showToast("Logged out successfully.");
            await initAuth();
            if (currentView === 'checkout') {
                await switchView('landing');
            }
        } else {
            toggleAuthModal(true);
        }
    });

    elements.btnCloseAuthModal.addEventListener('click', () => toggleAuthModal(false));

    elements.linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        elements.formCustomerLogin.style.display = 'none';
        elements.formCustomerRegister.style.display = 'flex';
        document.getElementById('auth-modal-title').innerText = "Create Luxe Profile";
        document.getElementById('auth-modal-subtitle').innerText = "Register for secure, direct hyperlocal deliveries";
    });

    elements.linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        elements.formCustomerLogin.style.display = 'flex';
        elements.formCustomerRegister.style.display = 'none';
        document.getElementById('auth-modal-title').innerText = "Welcome to LuxeGrocer";
        document.getElementById('auth-modal-subtitle').innerText = "Sign in to access premium local catalog shelves";
    });

    elements.formCustomerLogin.addEventListener('submit', handleLoginSubmit);
    elements.formCustomerRegister.addEventListener('submit', handleRegisterSubmit);

    elements.btnCartCheckout.addEventListener('click', async () => {
        elements.cartOverlayElement.classList.remove('active');
        elements.cartDrawerElement.classList.remove('active');
        
        if (!db.token) {
            showToast("Please sign in or register to place an order.", "info");
            toggleAuthModal(true);
            return;
        }

        if (db.currentUser) {
            elements.checkoutName.value = db.currentUser.name || '';
            elements.checkoutPhone.value = db.currentUser.phone || '';
            elements.checkoutAddress.value = db.currentUser.address || '';
        } else {
            const orders = await db.getOrders();
            if (orders.length > 0) {
                const lastOrder = orders[orders.length - 1];
                elements.checkoutName.value = lastOrder.customer.name;
                elements.checkoutPhone.value = lastOrder.customer.phone;
                elements.checkoutAddress.value = lastOrder.customer.address;
            }
        }

        await switchView('checkout');
    });

    elements.checkoutPaymentForm.addEventListener('submit', processCheckoutSubmit);

    // Cancel order button click
    elements.btnCancelOrder.addEventListener('click', async () => {
        if (trackingOrder) {
            if (cancelGraceTimer) clearInterval(cancelGraceTimer);
            
            // Mark as cancelled in local DB
            await db.updateOrderStatus(trackingOrder.id, 'Cancelled', 'Order cancelled by customer during grace window.');
            showToast("Your order has been cancelled successfully.", "info");
            
            trackingOrder = null;
            await switchView('landing');
        }
    });

    elements.btnSimAdvance.addEventListener('click', forceAdvanceSimulation);
    elements.btnTrackerDone.addEventListener('click', async () => {
        trackingOrder = null;
        await switchView('landing');
    });

    elements.btnScratchDone.addEventListener('click', () => {
        elements.modalScratchCard.style.display = 'none';
        elements.modalScratchCard.classList.remove('active');
        showToast("Mystery coupon claimed successfully!", "success");
    });

    elements.btnCloseUpiModal.addEventListener('click', () => {
        elements.modalUpiPayment.style.display = 'none';
        elements.modalUpiPayment.classList.remove('active');
    });

    async function setLocationMock(presetName) {
        if (presetName === 'hsr') {
            db.setUserLocation(12.9100, 77.6400, "Sector 3, HSR Layout, Bengaluru, Karnataka");
        } else if (presetName === 'kor') {
            db.setUserLocation(12.9250, 77.6220, "4th Block, Koramangala, Bengaluru, Karnataka");
        } else if (presetName === 'ind') {
            db.setUserLocation(12.9719, 77.6412, "100 Feet Road, Indiranagar, Bengaluru, Karnataka");
        }
        await updateLocationUI();
        elements.modalLocationElement.classList.remove('active');
        showToast("Simulation coordinates updated successfully!");
    }

    // --- Bootstrapping ---
    async function bootstrap() {
        db.initDatabase();
        loadCartFromStorage();
        await initAuth();
        await updateLocationUI();
        if (!trackingOrder) {
            await switchView('landing');
        }
    }
    bootstrap();
});
