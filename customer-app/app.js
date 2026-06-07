// app.js - LuxeGrocer Consumer-Centric Client-Side Controller

// Intercept console.error to log to server
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'customer-app console.error', error: args.join(' ') })
    }).catch(() => {});
};

window.addEventListener('error', (event) => {
    const errData = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : ''
    };
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'customer-app window.onerror', error: errData })
    }).catch(() => {});

    const errDiv = document.createElement('div');
    errDiv.style.position = 'fixed';
    errDiv.style.top = '0';
    errDiv.style.left = '0';
    errDiv.style.width = '100%';
    errDiv.style.background = '#ef4444';
    errDiv.style.color = 'white';
    errDiv.style.padding = '15px';
    errDiv.style.zIndex = '99999';
    errDiv.style.fontSize = '0.9rem';
    errDiv.style.fontFamily = 'monospace';
    errDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    errDiv.innerHTML = `<strong>JS Error:</strong> ${event.message} <br> <strong>File:</strong> ${event.filename}:${event.lineno}:${event.colno}`;
    if (document.body) {
        document.body.appendChild(errDiv);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(errDiv);
        });
    }
});

// Event Logging Hooks for Debugging
document.addEventListener('click', (e) => {
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source: 'customer-app CLICK',
            tagName: e.target.tagName,
            id: e.target.id,
            className: e.target.className,
            text: e.target.innerText ? e.target.innerText.substring(0, 30) : ''
        })
    }).catch(() => {});
});

document.addEventListener('submit', (e) => {
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source: 'customer-app SUBMIT',
            id: e.target.id,
            emailVal: e.target.querySelector('input[type="email"]') ? e.target.querySelector('input[type="email"]').value : 'not_found'
        })
    }).catch(() => {});
});

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
    let lastDeliveredOrder = null;
    let customerChatOpen = false;

    // Grace cancellation timer state
    let cancelGraceTimer = null;
    let cancelSecondsLeft = 60;
    let selectedTipAmount = 0;
    let activeAccountTab = 'profile';
    let appliedVoucher = null;
    let filterOpenOnly = false;
    let filterVegOnly = false;
    let storeSortBy = 'distance';
    let checkoutCustomerData = null;
    let checkoutDiscount = 0;

    // --- DOM Elements Cache ---
    const elements = {
        // Nav elements
        btnLogo: document.getElementById('btn-logo'),
        activeLocationText: document.getElementById('active-location-text'),
        btnChangeLocation: document.getElementById('btn-change-location'),
        btnCart: document.getElementById('btn-cart'),
        cartBadge: document.getElementById('cart-badge'),
        btnThemeToggle: document.getElementById('btn-theme-toggle'),

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
        trackerRiderBox: document.getElementById('tracker-rider-box'),
        trackerRiderName: document.getElementById('tracker-rider-name'),
        btnCallRider: document.getElementById('btn-call-rider'),

        // Substitution and Chat Elements
        trackerSubstitutionBox: document.getElementById('tracker-substitution-box'),
        trackerSubstitutionText: document.getElementById('tracker-substitution-text'),
        btnTrackerDeclineSub: document.getElementById('btn-tracker-decline-sub'),
        btnTrackerAcceptSub: document.getElementById('btn-tracker-accept-sub'),
        trackerChatBox: document.getElementById('tracker-chat-box'),
        btnToggleCustomerChat: document.getElementById('btn-toggle-customer-chat'),
        customerChatBadge: document.getElementById('customer-chat-badge'),
        customerChatChevron: document.getElementById('customer-chat-chevron'),
        customerChatDrawer: document.getElementById('customer-chat-drawer'),
        customerChatMessages: document.getElementById('customer-chat-messages'),
        customerChatForm: document.getElementById('customer-chat-form'),
        customerChatInput: document.getElementById('customer-chat-input'),

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
        upiQrImage: document.getElementById('upi-qr-image'),
        upiPayeeVpa: document.getElementById('upi-payee-vpa'),
        upiPayeeName: document.getElementById('upi-payee-name'),
        upiTransactionId: document.getElementById('upi-transaction-id'),
        formUpiPaymentConfirmation: document.getElementById('form-upi-payment-confirmation'),
        btnSubmitUpiTransaction: document.getElementById('btn-submit-upi-transaction'),
        
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
        linkToLogin: document.getElementById('link-to-login'),
        btnTrackActiveOrder: document.getElementById('btn-track-active-order'),
        regReferral: document.getElementById('reg-referral'),
        
        // Password Recovery
        linkForgotPassword: document.getElementById('link-forgot-password'),
        modalForgotPassword: document.getElementById('modal-forgot-password'),
        btnCloseForgotModal: document.getElementById('btn-close-forgot-modal'),
        formForgotRequest: document.getElementById('form-forgot-request'),
        formForgotReset: document.getElementById('form-forgot-reset'),
        forgotEmail: document.getElementById('forgot-email'),
        forgotOtp: document.getElementById('forgot-otp'),
        forgotNewPassword: document.getElementById('forgot-new-password'),

        // Profile Password Change
        formChangePassword: document.getElementById('form-change-password'),
        changePwdOld: document.getElementById('change-pwd-old'),
        changePwdNew: document.getElementById('change-pwd-new'),
        changePwdConfirm: document.getElementById('change-pwd-confirm'),

        // Account Drawer elements
        accountOverlayElement: document.getElementById('account-overlay-element'),
        accountDrawerElement: document.getElementById('account-drawer-element'),
        btnCloseAccount: document.getElementById('btn-close-account'),
        btnAccountTrigger: document.getElementById('btn-account-trigger'),
        accountTriggerText: document.getElementById('account-trigger-text'),
        btnAccountLogout: document.getElementById('btn-account-logout'),

        // Account tab buttons
        tabBtnProfile: document.getElementById('tab-btn-profile'),
        tabBtnAddresses: document.getElementById('tab-btn-addresses'),
        tabBtnHistory: document.getElementById('tab-btn-history'),
        tabBtnVouchers: document.getElementById('tab-btn-vouchers'),
        tabBtnWallet: document.getElementById('tab-btn-wallet'),

        // Account tab panes
        paneAccountProfile: document.getElementById('pane-account-profile'),
        paneAccountAddresses: document.getElementById('pane-account-addresses'),
        paneAccountHistory: document.getElementById('pane-account-history'),
        paneAccountVouchers: document.getElementById('pane-account-vouchers'),
        paneAccountWallet: document.getElementById('pane-account-wallet'),
        accountWalletBalance: document.getElementById('account-wallet-balance'),
        formAddFunds: document.getElementById('form-add-funds'),
        walletAddAmount: document.getElementById('wallet-add-amount'),

        // Checkout Wallet elements
        checkoutWalletBalanceVal: document.getElementById('checkout-wallet-balance-val'),
        checkoutWalletSplitBox: document.getElementById('checkout-wallet-split-box'),
        checkoutSplitWalletApplied: document.getElementById('checkout-split-wallet-applied'),
        checkoutSplitRemaining: document.getElementById('checkout-split-remaining'),

        // Profile Form
        formAccountProfile: document.getElementById('form-account-profile'),
        accountProfileName: document.getElementById('account-profile-name'),
        accountProfilePhone: document.getElementById('account-profile-phone'),
        accountProfileEmail: document.getElementById('account-profile-email'),

        // Saved Addresses Panel
        accountAddressList: document.getElementById('account-address-list'),
        btnAddNewAddress: document.getElementById('btn-add-new-address'),
        formAccountAddress: document.getElementById('form-account-address'),
        accountAddressId: document.getElementById('account-address-id'),
        accountAddressTag: document.getElementById('account-address-tag'),
        accountAddressDetail: document.getElementById('account-address-detail'),
        accountAddressLat: document.getElementById('account-address-lat'),
        accountAddressLng: document.getElementById('account-address-lng'),
        btnCancelAddressForm: document.getElementById('btn-cancel-address-form'),
        btnAddrPresetH: document.getElementById('btn-addr-preset-h'),
        btnAddrPresetK: document.getElementById('btn-addr-preset-k'),
        btnAddrPresetI: document.getElementById('btn-addr-preset-i'),

        // Order History Panel
        accountHistoryOrders: document.getElementById('account-history-orders'),

        // Vouchers Panel
        accountVoucherList: document.getElementById('account-voucher-list'),

        // Checkout Coupon / Address selector
        checkoutAddressSelectGroup: document.getElementById('checkout-address-select-group'),
        checkoutAddressSelect: document.getElementById('checkout-address-select'),
        couponCodeInput: document.getElementById('coupon-code-input'),
        btnApplyCoupon: document.getElementById('btn-apply-coupon'),
        couponAppliedMsg: document.getElementById('coupon-applied-msg'),
        appliedCouponCode: document.getElementById('applied-coupon-code'),
        btnRemoveCoupon: document.getElementById('btn-remove-coupon'),
        couponErrorMsg: document.getElementById('coupon-error-msg'),
        checkoutDiscountRow: document.getElementById('checkout-discount-row'),
        checkoutDiscountAmount: document.getElementById('checkout-discount-amount'),
        favoritesCarouselContainer: document.getElementById('favorites-carousel-container'),
        favoritesCarouselList: document.getElementById('favorites-carousel-list'),
        btnFilterOpenOnly: document.getElementById('btn-filter-open-only'),
        btnFilterVegOnly: document.getElementById('btn-filter-veg-only'),
        searchFilterVegOnly: document.getElementById('search-filter-veg-only'),
        selectStoreSort: document.getElementById('select-store-sort'),
        modalStoreReview: document.getElementById('modal-store-review'),
        btnCloseReviewModal: document.getElementById('btn-close-review-modal'),
        formStoreReview: document.getElementById('form-store-review'),
        reviewStoreNameText: document.getElementById('review-store-name-text'),
        reviewRatingValue: document.getElementById('review-rating-value'),
        reviewComment: document.getElementById('review-comment')
    };

    // --- Customer Authentication Helpers ---
    async function initAuth() {
        const user = await db.loadCurrentUser();
        if (user) {
            if (elements.btnAuthTrigger) elements.btnAuthTrigger.style.display = 'none';
            if (elements.btnAccountTrigger) {
                elements.accountTriggerText.innerText = user.name.split(' ')[0];
                elements.btnAccountTrigger.style.display = 'inline-flex';
                elements.btnAccountTrigger.title = `Logged in as ${user.name}`;
            }
            elements.checkoutName.value = user.name;
            elements.checkoutPhone.value = user.phone || '';
            elements.checkoutAddress.value = user.address || '';
            
            // Populate profile forms
            elements.accountProfileName.value = user.name;
            elements.accountProfilePhone.value = user.phone || '';
            elements.accountProfileEmail.value = user.email;
            
            const referralCodeVal = user.referralCode || 'N/A';
            const referralDisplayElement = document.getElementById('account-referral-code');
            if (referralDisplayElement) {
                referralDisplayElement.innerText = referralCodeVal;
            }

            // Load saved addresses and populate dropdown
            await populateCheckoutAddressSelect();

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
            if (elements.btnAuthTrigger) {
                elements.authTriggerText.innerText = 'Sign In';
                elements.btnAuthTrigger.style.display = 'inline-flex';
                elements.btnAuthTrigger.title = 'Login or Register';
            }
            if (elements.btnAccountTrigger) elements.btnAccountTrigger.style.display = 'none';
            if (elements.checkoutAddressSelectGroup) elements.checkoutAddressSelectGroup.style.display = 'none';
        }
        await updateActiveOrderButtonVisibility();
    }

    function showAccountTab(tabName) {
        // Remove active class from all tab buttons
        elements.tabBtnProfile.classList.remove('active');
        elements.tabBtnAddresses.classList.remove('active');
        elements.tabBtnHistory.classList.remove('active');
        elements.tabBtnVouchers.classList.remove('active');
        if (elements.tabBtnWallet) elements.tabBtnWallet.classList.remove('active');

        // Set text colors
        elements.tabBtnProfile.style.color = 'var(--text-muted)';
        elements.tabBtnProfile.style.borderBottomColor = 'transparent';
        elements.tabBtnAddresses.style.color = 'var(--text-muted)';
        elements.tabBtnAddresses.style.borderBottomColor = 'transparent';
        elements.tabBtnHistory.style.color = 'var(--text-muted)';
        elements.tabBtnHistory.style.borderBottomColor = 'transparent';
        elements.tabBtnVouchers.style.color = 'var(--text-muted)';
        elements.tabBtnVouchers.style.borderBottomColor = 'transparent';
        if (elements.tabBtnWallet) {
            elements.tabBtnWallet.style.color = 'var(--text-muted)';
            elements.tabBtnWallet.style.borderBottomColor = 'transparent';
        }

        // Hide all panes
        elements.paneAccountProfile.style.display = 'none';
        elements.paneAccountAddresses.style.display = 'none';
        elements.paneAccountHistory.style.display = 'none';
        elements.paneAccountVouchers.style.display = 'none';
        if (elements.paneAccountWallet) elements.paneAccountWallet.style.display = 'none';

        // Show targets
        const activeBtn = document.getElementById(`tab-btn-${tabName}`);
        const activePane = document.getElementById(`pane-account-${tabName}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.color = 'white';
            activeBtn.style.borderBottomColor = 'var(--primary)';
        }
        if (activePane) {
            activePane.style.display = 'block';
        }

        activeAccountTab = tabName;

        if (tabName === 'addresses') {
            renderAddresses();
        } else if (tabName === 'history') {
            renderOrderHistory();
        } else if (tabName === 'vouchers') {
            renderVouchers();
        } else if (tabName === 'wallet') {
            renderWallet();
        }
    }

    async function renderWallet() {
        if (!elements.accountWalletBalance) return;
        elements.accountWalletBalance.innerText = 'Loading...';
        const balance = await db.getWalletBalance();
        elements.accountWalletBalance.innerText = `₹${parseFloat(balance || 0).toFixed(2)}`;
    }

    async function renderAddresses() {
        elements.accountAddressList.innerHTML = '';
        elements.formAccountAddress.style.display = 'none';
        
        const addresses = await db.getSavedAddresses();
        if (addresses.length === 0) {
            elements.accountAddressList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                    <i class="fa-solid fa-map-location-dot" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p style="font-size: 0.85rem;">No saved addresses yet.</p>
                </div>
            `;
            return;
        }

        addresses.forEach(addr => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.padding = '12px 16px';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.background = 'rgba(255,255,255,0.02)';
            
            const emoji = addr.tag === 'Home' ? '🏠' : (addr.tag === 'Work' ? '💼' : '📍');
            const defaultBadge = addr.isDefault 
                ? `<span style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 0.7rem; font-weight: bold; padding: 2px 8px; border-radius: 12px; margin-left: 8px; border: 1px solid #10b981;">Default</span>`
                : `<button class="btn-outline make-default-btn" data-id="${addr.id}" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; margin-left: 8px; cursor: pointer; height: auto;">Make Default</button>`;
            
            card.innerHTML = `
                <div style="flex-grow: 1; text-align: left;">
                    <div style="display: flex; align-items: center;">
                        <strong style="font-size: 0.9rem; color: var(--primary);">${emoji} ${addr.tag}</strong>
                        ${defaultBadge}
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-main); margin-top: 4px; line-height: 1.3;">${addr.address}</p>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">Coords: ${addr.lat.toFixed(4)}, ${addr.lng.toFixed(4)}</span>
                </div>
                <button class="btn-icon delete-addr-btn" style="width: 32px; height: 32px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);" title="Delete Address">
                    <i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i>
                </button>
            `;

            const makeDefaultBtn = card.querySelector('.make-default-btn');
            if (makeDefaultBtn) {
                makeDefaultBtn.addEventListener('click', async () => {
                    const ok = await db.makeAddressDefault(addr.id);
                    if (ok) {
                        showToast("Default address updated!");
                        await renderAddresses();
                        await populateCheckoutAddressSelect();
                    } else {
                        showToast("Failed to update default address.", "error");
                    }
                });
            }

            card.querySelector('.delete-addr-btn').addEventListener('click', async () => {
                if (confirm(`Delete saved address "${addr.tag}"?`)) {
                    const ok = await db.deleteSavedAddress(addr.id);
                    if (ok) {
                        showToast("Address deleted successfully!");
                        await renderAddresses();
                        await populateCheckoutAddressSelect();
                    }
                }
            });

            elements.accountAddressList.appendChild(card);
        });
    }

    async function renderOrderHistory() {
        elements.accountHistoryOrders.innerHTML = '';
        const orders = await db.getOrders();
        
        if (orders.length === 0) {
            elements.accountHistoryOrders.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fa-solid fa-bag-shopping" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p style="font-size: 0.85rem;">You have not placed any orders yet.</p>
                </div>
            `;
            return;
        }

        orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.padding = '14px 16px';
            card.style.background = 'rgba(255,255,255,0.02)';
            
            const badgeClass = order.status.toLowerCase().replace(' ', '-');
            const itemsList = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
            const dateStr = new Date(order.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            
            const reorderBtnId = `reorder-${order.id}`;
            const tipBtnId = `tip-rider-${order.id}`;
            const invoiceBtnId = `invoice-${order.id}`;
            
            const isDelivered = order.status === 'Delivered';
            const tipBtnHtml = isDelivered 
                ? `<button class="btn-premium btn-tip-rider" id="${tipBtnId}" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 6px; background: var(--secondary); border-color: var(--secondary); margin-right: 8px;"><i class="fa-solid fa-hand-holding-dollar"></i> Tip Rider</button>`
                : '';
            const invoiceBtnHtml = `<button class="btn-outline btn-view-invoice" id="${invoiceBtnId}" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 6px; margin-right: 8px;"><i class="fa-solid fa-receipt"></i> Invoice</button>`;
            
            const discountHtml = order.discount && order.discount > 0
                ? `<div style="font-size: 0.75rem; color: var(--secondary); margin-top: 4px; text-align: left;">Voucher Discount: -₹${order.discount.toFixed(2)}</div>`
                : '';
            const utrHtml = order.customer && order.customer.payment === 'upi' && order.customer.transactionId
                ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; text-align: left;">UPI Ref: <span style="font-family: monospace; font-weight: bold;">${order.customer.transactionId}</span></div>`
                : '';
            const riderTipHtml = order.riderTip && order.riderTip > 0
                ? `<div style="font-size: 0.75rem; color: var(--primary); margin-top: 4px; text-align: left;">Rider Tip: ₹${order.riderTip.toFixed(2)}</div>`
                : '';
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                    <div style="text-align: left;">
                        <strong style="font-size: 0.85rem; color: var(--text-main);">${order.storeName}</strong>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">${dateStr} | #${order.id}</div>
                    </div>
                    <span class="status-badge ${badgeClass}" style="font-size:0.7rem; padding: 4px 8px;">${order.status}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px; text-align: left;">
                    <strong>Items:</strong> ${itemsList}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align: left;">
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">₹${(order.subtotal + order.deliveryFee + (order.riderTip || 0) - (order.discount || 0)).toFixed(2)}</span>
                        ${discountHtml}
                        ${utrHtml}
                        ${riderTipHtml}
                    </div>
                    <div style="display: flex;">
                        ${invoiceBtnHtml}
                        ${tipBtnHtml}
                        <button class="btn-premium btn-reorder" id="${reorderBtnId}" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 6px;"><i class="fa-solid fa-rotate-left"></i> Reorder</button>
                    </div>
                </div>
            `;
            
            card.querySelector('.btn-view-invoice').addEventListener('click', () => {
                openInvoiceModal(order);
            });
            
            if (isDelivered) {
                card.querySelector('.btn-tip-rider').addEventListener('click', () => {
                    openTipRiderModal(order.id);
                });
            }

            card.querySelector('.btn-reorder').addEventListener('click', async () => {
                let success = false;
                const store = await db.getStoreById(order.storeId);
                if (!store) {
                    showToast("This store is no longer active or available.", "error");
                    return;
                }
                
                cart = [];
                
                for (const item of order.items) {
                    const storeProduct = store.products.find(p => p.id === item.id);
                    if (storeProduct && storeProduct.stock > 0) {
                        const qty = Math.min(item.quantity, storeProduct.stock);
                        for (let q = 0; q < qty; q++) {
                            await addToCart(order.storeId, storeProduct);
                        }
                        success = true;
                    }
                }
                
                if (success) {
                    showToast("Items added to cart! Proceeding to checkout...", "success");
                    elements.accountOverlayElement.classList.remove('active');
                    elements.accountDrawerElement.classList.remove('active');
                    await renderCart();
                    await switchView('checkout');
                } else {
                    showToast("Could not reorder. Items are currently out of stock.", "error");
                }
            });

            elements.accountHistoryOrders.appendChild(card);
        });
    }

    async function renderVouchers() {
        elements.accountVoucherList.innerHTML = '';
        const vouchers = await db.getVouchers();
        
        if (vouchers.length === 0) {
            elements.accountVoucherList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                    <i class="fa-solid fa-ticket" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p style="font-size: 0.85rem;">No active discount codes available.</p>
                </div>
            `;
            return;
        }

        vouchers.forEach(v => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.padding = '12px 16px';
            card.style.background = 'rgba(255,255,255,0.02)';
            card.style.borderLeft = '4px solid var(--secondary)';
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color: var(--secondary); font-family: monospace; font-size: 0.95rem; background: rgba(16,185,129,0.1); padding: 4px 10px; border-radius: 6px; border: 1px dashed var(--secondary);">${v.code}</strong>
                    <button class="btn-outline btn-copy-code" style="font-size:0.7rem; padding: 4px 8px; border-radius: 6px;" data-code="${v.code}">Copy</button>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-main); margin-top: 8px; font-weight: 500; text-align: left;">${v.desc}</p>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; text-align: left;">Min. purchase required: ₹${v.minOrderValue}</div>
            `;

            card.querySelector('.btn-copy-code').addEventListener('click', () => {
                navigator.clipboard.writeText(v.code);
                showToast(`Code "${v.code}" copied to clipboard!`);
            });

            elements.accountVoucherList.appendChild(card);
        });
    }

    async function populateCheckoutAddressSelect() {
        elements.checkoutAddressSelect.innerHTML = '';
        const addresses = await db.getSavedAddresses();
        
        if (addresses.length === 0) {
            elements.checkoutAddressSelectGroup.style.display = 'none';
            return;
        }

        elements.checkoutAddressSelectGroup.style.display = 'block';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.innerText = '-- Choose a Saved Address or type below --';
        elements.checkoutAddressSelect.appendChild(defaultOption);

        let defaultAddrVal = null;
        addresses.forEach(addr => {
            const opt = document.createElement('option');
            const valStr = JSON.stringify({ address: addr.address, lat: addr.lat, lng: addr.lng });
            opt.value = valStr;
            opt.innerText = `${addr.tag}: ${addr.address}${addr.isDefault ? ' (Default)' : ''}`;
            if (addr.isDefault) {
                opt.selected = true;
                defaultAddrVal = valStr;
            }
            elements.checkoutAddressSelect.appendChild(opt);
        });

        if (defaultAddrVal) {
            elements.checkoutAddressSelect.value = defaultAddrVal;
            const parsed = JSON.parse(defaultAddrVal);
            elements.checkoutAddress.value = parsed.address;
            if (cart.length > 0) {
                cart[0].storeDistance = db.calculateDistance(parsed.lat, parsed.lng, activeStore ? activeStore.lat : parsed.lat, activeStore ? activeStore.lng : parsed.lng);
                renderCheckoutSummary();
            }
        }
    }

    async function updateActiveOrderButtonVisibility() {
        if (!db.token) {
            if (elements.btnTrackActiveOrder) elements.btnTrackActiveOrder.style.display = 'none';
            return;
        }
        try {
            const orders = await db.getOrders();
            const activeOrder = orders.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
            if (activeOrder) {
                if (elements.btnTrackActiveOrder) elements.btnTrackActiveOrder.style.display = 'inline-flex';
            } else {
                if (elements.btnTrackActiveOrder) elements.btnTrackActiveOrder.style.display = 'none';
            }
        } catch (err) {
            console.error("Error checking active orders for button visibility:", err);
            if (elements.btnTrackActiveOrder) elements.btnTrackActiveOrder.style.display = 'none';
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
            address: elements.regAddress.value.trim(),
            referralCode: elements.regReferral ? elements.regReferral.value.trim() : ''
        };

        const res = await db.register(registerData);
        if (res.success) {
            showToast("Account created successfully! Welcome, " + res.user.name + ".", "success");
            toggleAuthModal(false);
            await initAuth();
        } else {
            showToast(res.error, "error");
        }
    }

    async function handleChangePasswordSubmit(e) {
        e.preventDefault();
        const oldPassword = elements.changePwdOld.value;
        const newPassword = elements.changePwdNew.value;
        const confirmPassword = elements.changePwdConfirm.value;

        if (newPassword !== confirmPassword) {
            showToast("New passwords do not match!", "error");
            return;
        }

        try {
            const res = await fetch(`${db.baseUrl}/auth/change-password`, {
                method: 'PUT',
                headers: db.getHeaders(),
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Password updated successfully!", "success");
                elements.formChangePassword.reset();
            } else {
                showToast(data.error || "Failed to update password", "error");
            }
        } catch (err) {
            console.error("Error changing password:", err);
            showToast("Network connection error", "error");
        }
    }

    async function handleForgotRequestSubmit(e) {
        e.preventDefault();
        const email = elements.forgotEmail.value.trim();
        
        try {
            const res = await fetch(`${db.baseUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Reset code sent! Check console / alert.", "success");
                alert(`[MOCK EMAIL SERVICE]\nTo: ${email}\nYour LuxeGrocer password reset code is: ${data.otp}`);
                
                elements.formForgotRequest.style.display = 'none';
                elements.formForgotReset.style.display = 'flex';
                elements.forgotOtp.value = '';
                elements.forgotNewPassword.value = '';
            } else {
                showToast(data.error || "Password reset request failed", "error");
            }
        } catch (err) {
            console.error("Forgot password request error:", err);
            showToast("Network connection error", "error");
        }
    }

    async function handleForgotResetSubmit(e) {
        e.preventDefault();
        const email = elements.forgotEmail.value.trim();
        const otp = elements.forgotOtp.value.trim();
        const newPassword = elements.forgotNewPassword.value;

        try {
            const res = await fetch(`${db.baseUrl}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Password has been reset successfully!", "success");
                
                elements.modalForgotPassword.style.display = 'none';
                elements.modalForgotPassword.classList.remove('active');
                
                toggleAuthModal(true);
            } else {
                showToast(data.error || "Reset password failed", "error");
            }
        } catch (err) {
            console.error("Reset password error:", err);
            showToast("Network connection error", "error");
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
                await renderFavoritesCarousel();
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

    function getFavorites() {
        const stored = localStorage.getItem('luxegrocer_favorites');
        return stored ? JSON.parse(stored) : [];
    }

    function toggleFavorite(storeId, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        let favs = getFavorites();
        if (favs.includes(storeId)) {
            favs = favs.filter(id => id !== storeId);
            showToast("Removed store from bookmarks.");
        } else {
            favs.push(storeId);
            showToast("Added store to bookmarks! ❤️", "success");
        }
        localStorage.setItem('luxegrocer_favorites', JSON.stringify(favs));
        renderStores();
        renderFavoritesCarousel();
        
        // Also update store profile details if active
        if (activeStore && activeStore.id === storeId) {
            loadStoreProfile(storeId);
        }
    }

    async function renderFavoritesCarousel() {
        if (!elements.favoritesCarouselList || !elements.favoritesCarouselContainer) return;
        elements.favoritesCarouselList.innerHTML = '';
        
        const favs = getFavorites();
        if (favs.length === 0) {
            elements.favoritesCarouselContainer.style.display = 'none';
            return;
        }

        const stores = await db.getStores();
        const favStores = stores.filter(s => favs.includes(s.id));

        if (favStores.length === 0) {
            elements.favoritesCarouselContainer.style.display = 'none';
            return;
        }

        elements.favoritesCarouselContainer.style.display = 'block';

        favStores.forEach(store => {
            const card = document.createElement('div');
            card.className = 'glass-card store-card-compact';
            card.style.display = 'inline-block';
            card.style.width = '240px';
            card.style.flexShrink = '0';
            card.style.cursor = 'pointer';
            card.style.marginRight = '10px';
            card.style.position = 'relative';
            
            const isClosed = store.status === 'Closed';
            if (isClosed) {
                card.style.opacity = '0.65';
                card.style.filter = 'grayscale(0.7)';
            }

            card.innerHTML = `
                <div class="store-banner-wrapper" style="position: relative; height: 110px;">
                    ${isClosed ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 5; border-radius: 12px 12px 0 0;"><span style="color: white; font-weight: 800; letter-spacing: 1px; font-size: 0.8rem; border: 1.5px solid white; padding: 2px 8px; border-radius: 4px; background: rgba(239, 68, 68, 0.75);">CLOSED</span></div>` : ''}
                    <img class="store-banner-img" src="${store.image}" style="height: 100%; width: 100%; object-fit: cover;" alt="${store.name}">
                    <span class="store-badge" style="font-size: 0.7rem; padding: 3px 8px; top: 8px; left: 8px;">${store.category}</span>
                    <button class="btn-icon btn-fav-toggle" data-id="${store.id}" style="position: absolute; top: 8px; right: 8px; z-index: 10; border-radius: 50%; width: 28px; height: 28px; background: rgba(0,0,0,0.5); border: none; color: #f43f5e;" title="Remove Bookmark">
                        <i class="fa-solid fa-heart" style="font-size: 0.85rem;"></i>
                    </button>
                </div>
                <div class="store-details" style="padding: 10px 12px;">
                    <div class="store-title-row" style="margin-bottom: 4px;">
                        <h4 style="margin: 0; font-size: 0.85rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); text-align: left;">${store.name}</h4>
                        <span class="store-rating" style="font-size: 0.75rem;"><i class="fa-solid fa-star"></i> ${store.rating.toFixed(1)}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                        <span>${store.distance} km</span>
                        <span style="color: var(--secondary); font-weight: 600;">${isClosed ? 'Offline' : Math.round(store.distance * 3 + 5) + ' Mins'}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-fav-toggle')) return;
                loadStoreProfile(store.id);
            });

            card.querySelector('.btn-fav-toggle').addEventListener('click', (e) => {
                toggleFavorite(store.id, e);
            });

            elements.favoritesCarouselList.appendChild(card);
        });
    }

    async function renderStores() {
        elements.storeListContainer.innerHTML = '';
        let stores = await db.getStores();

        // 1. Filter by open only
        if (filterOpenOnly) {
            stores = stores.filter(s => s.status !== 'Closed');
        }

        // Filter by Veg only
        if (filterVegOnly) {
            stores = stores.filter(s => s.products && s.products.some(p => p.dietaryType === 'Veg'));
        }

        // 2. Sort stores
        if (storeSortBy === 'rating') {
            stores.sort((a, b) => b.rating - a.rating);
        } else if (storeSortBy === 'delivery-fee') {
            stores.sort((a, b) => db.getDeliveryFee(a.distance, 0) - db.getDeliveryFee(b.distance, 0));
        } else if (storeSortBy === 'speed') {
            stores.sort((a, b) => a.distance - b.distance); // distance is proxy for speed
        } else {
            // Default: distance
            stores.sort((a, b) => a.distance - b.distance);
        }

        const favs = getFavorites();

        stores.forEach(store => {
            const card = document.createElement('div');
            card.className = 'glass-card store-card';
            const isClosed = store.status === 'Closed';
            const isSuspended = store.status === 'Suspended' || (store.subscription && store.subscription.status === 'Suspended');
            if (isClosed || isSuspended) {
                card.style.opacity = '0.65';
                card.style.filter = 'grayscale(0.7)';
            }
            const isFav = favs.includes(store.id);

            card.innerHTML = `
                <div class="store-banner-wrapper" style="position: relative;">
                    ${isSuspended ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 5; border-radius: 12px 12px 0 0;"><span style="color: white; font-weight: 800; letter-spacing: 1.5px; font-size: 0.95rem; border: 1.5px solid white; padding: 4px 12px; border-radius: 4px; background: rgba(220, 38, 38, 0.85);">SUSPENDED</span></div>` : (isClosed ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 5; border-radius: 12px 12px 0 0;"><span style="color: white; font-weight: 800; letter-spacing: 1.5px; font-size: 0.95rem; border: 1.5px solid white; padding: 4px 12px; border-radius: 4px; background: rgba(239, 68, 68, 0.75);">CLOSED</span></div>` : '')}
                    <img class="store-banner-img" src="${store.image}" alt="${store.name}">
                    <div class="store-overlay"></div>
                    <span class="store-badge">${store.category}</span>
                    <button class="btn-icon btn-fav-toggle" data-id="${store.id}" style="position: absolute; top: 12px; right: 12px; z-index: 10; border-radius: 50%; width: 36px; height: 36px; background: rgba(0,0,0,0.45); border: none; color: ${isFav ? '#f43f5e' : 'white'};" title="${isFav ? 'Remove Bookmark' : 'Bookmark Store'}">
                        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size: 1.1rem;"></i>
                    </button>
                </div>
                <div class="store-details">
                    <div class="store-title-row">
                        <h3 class="store-name">${store.name}</h3>
                        <span class="store-rating"><i class="fa-solid fa-star"></i> ${store.rating.toFixed(1)}</span>
                    </div>
                    <div class="store-info-tags">
                        <span class="store-info-tag"><i class="fa-solid fa-person-biking"></i> ${store.distance} km away</span>
                        <span class="store-info-tag" style="color: var(--secondary); display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-circle" style="font-size: 0.5rem; color: ${isClosed || isSuspended ? '#ef4444' : '#10b981'}; animation: ${isClosed || isSuspended ? 'none' : 'pulse 1.5s infinite'};"></i> <strong>${isSuspended ? 'Suspended' : (isClosed ? 'Offline' : Math.round(store.distance * 3 + 5) + ' Mins')}</strong></span>
                    </div>
                    <div class="store-address"><i class="fa-solid fa-map-pin"></i> ${store.address}</div>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-fav-toggle')) return;
                loadStoreProfile(store.id);
            });

            card.querySelector('.btn-fav-toggle').addEventListener('click', (e) => {
                toggleFavorite(store.id, e);
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
        const vegOnlyChecked = elements.searchFilterVegOnly && elements.searchFilterVegOnly.checked;
        let filtered = matches.filter(match => match.store.distance <= maxDist);
        if (vegOnlyChecked) {
            filtered = filtered.filter(match => match.product.dietaryType === 'Veg');
        }

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

            let dietaryHtml = '';
            if (match.product.dietaryType === 'Veg') {
                dietaryHtml = `<span class="dietary-badge veg" style="position: absolute; top: 12px; left: 12px; z-index: 10; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 2px solid #10b981; background: transparent; border-radius: 4px; padding: 2px;" title="Veg"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span></span>`;
            } else if (match.product.dietaryType === 'Non-Veg') {
                dietaryHtml = `<span class="dietary-badge non-veg" style="position: absolute; top: 12px; left: 12px; z-index: 10; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 2px solid #ef4444; background: transparent; border-radius: 4px; padding: 2px;" title="Non-Veg"><span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span></span>`;
            }

            const priceHtml = match.product.originalPrice 
                ? `<span class="product-price-slashed">₹${match.product.originalPrice.toFixed(2)}</span>₹${match.product.price.toFixed(2)}` 
                : `₹${match.product.price.toFixed(2)}`;
            
            let variantSelectorHtml = '';
            if (match.product.variants && match.product.variants.length > 0) {
                variantSelectorHtml = `
                    <div class="product-variant-selector" style="margin-top: 8px; margin-bottom: 8px;">
                        <select class="variant-select glass-input" style="width: 100%; padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white;">
                            ${match.product.variants.map(v => `<option value="${v.id}">${v.name} - ₹${v.price.toFixed(2)}</option>`).join('')}
                        </select>
                    </div>
                `;
            }
            
            card.innerHTML = `
                ${badgeHtml}
                ${dietaryHtml}
                <div class="compare-emoji">${visualContent}</div>
                <div class="compare-info">
                    <h3>${match.product.name}</h3>
                    <div class="compare-desc">${match.product.desc || 'No description available.'}</div>
                    ${variantSelectorHtml}
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
                        Unit: <strong id="search-unit-tag-${match.product.id}-${match.store.id}">${match.product.unit}</strong> | Stock: 
                        <span class="${match.product.stock > 0 ? 'product-stock-tag in-stock' : 'product-stock-tag out-stock'}" id="search-stock-tag-${match.product.id}-${match.store.id}">${match.product.stock > 0 ? `${match.product.stock} available` : 'Out of Stock'}</span>
                    </div>
                    <a href="#" class="compare-shop-link" data-store-id="${match.store.id}">
                        <i class="fa-solid fa-shop"></i> Available at <strong>${match.store.name}</strong> (${match.store.distance} km)
                    </a>
                    <div style="font-size: 0.8rem; color: var(--secondary); margin-top: 6px; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-circle" style="font-size: 0.4rem; color: #10b981; animation: pulse 1.5s infinite;"></i> Delivery in ${Math.round(match.store.distance * 3 + 5)} Mins
                    </div>
                </div>
                <div class="compare-action-block">
                    <div class="price" id="search-price-tag-${match.product.id}-${match.store.id}">${priceHtml}</div>
                    <button class="btn-premium btn-add-cart" data-store-id="${match.store.id}" data-product-id="${match.product.id}" ${match.product.stock === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-plus"></i> Add to Cart
                    </button>
                </div>
            `;

            if (match.product.variants && match.product.variants.length > 0) {
                const selectEl = card.querySelector('.variant-select');
                const updateSearchCardUI = () => {
                    const selectedId = selectEl.value;
                    const variant = match.product.variants.find(v => v.id === selectedId);
                    if (variant) {
                        const priceTag = card.querySelector(`#search-price-tag-${match.product.id}-${match.store.id}`);
                        const unitTag = card.querySelector(`#search-unit-tag-${match.product.id}-${match.store.id}`);
                        const stockTag = card.querySelector(`#search-stock-tag-${match.product.id}-${match.store.id}`);
                        
                        priceTag.innerText = `₹${variant.price.toFixed(2)}`;
                        unitTag.innerText = variant.name;
                        
                        if (variant.stock > 0) {
                            stockTag.className = 'product-stock-tag in-stock';
                            stockTag.innerText = `${variant.stock} available`;
                            card.querySelector('.btn-add-cart').disabled = false;
                        } else {
                            stockTag.className = 'product-stock-tag out-stock';
                            stockTag.innerText = 'Out of Stock';
                            card.querySelector('.btn-add-cart').disabled = true;
                        }
                    }
                };
                selectEl.addEventListener('change', updateSearchCardUI);
                // Run initially to set first variant
                updateSearchCardUI();
            }

            card.querySelector('.compare-shop-link').addEventListener('click', async (e) => {
                e.preventDefault();
                await loadStoreProfile(match.store.id);
            });

            card.querySelector('.btn-add-cart').addEventListener('click', async (e) => {
                let selectedVariant = null;
                if (match.product.variants && match.product.variants.length > 0) {
                    const selectedId = card.querySelector('.variant-select').value;
                    selectedVariant = match.product.variants.find(v => v.id === selectedId);
                }
                await addToCart(match.store.id, match.product, selectedVariant, e);
            });

            elements.searchComparisonContainer.appendChild(card);
        });
    }

    async function loadStoreProfile(storeId) {
        const store = await db.getStoreById(storeId);
        if (!store) return;
        activeStore = store;
        activeCategoryFilter = 'all';

        const isFav = getFavorites().includes(store.id);
        const isClosed = store.status === 'Closed';
        const isSuspended = store.status === 'Suspended' || (store.subscription && store.subscription.status === 'Suspended');
        
        let warningBannerHtml = '';
        if (isSuspended) {
            warningBannerHtml = `
                <div class="glass-panel" style="background: rgba(220, 38, 38, 0.08); border: 1.5px solid rgba(220, 38, 38, 0.25); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; color: #fca5a5; font-size: 0.88rem; line-height: 1.45;">
                    <span style="font-size: 1.8rem; flex-shrink: 0;">⚠️</span>
                    <div>
                        <strong>Store Operations Temporarily Suspended:</strong> This storefront is currently offline as the owner's billing plan subscription has expired. Catalog browsing is open, but adding items to cart and placing checkouts are temporarily disabled.
                    </div>
                </div>
            `;
        }

        elements.storeProfileHeaderContainer.innerHTML = `
            ${warningBannerHtml}
            <div class="store-profile-header" style="${isClosed || isSuspended ? 'filter: grayscale(0.4); opacity: 0.85;' : ''}">
                <img class="store-header-banner" src="${store.image}" alt="${store.name}">
                <div class="store-header-overlay"></div>
                <div class="store-header-content">
                    <div class="store-header-left">
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                            <h1 style="margin: 0; display: inline-flex; align-items: center; gap: 10px;">
                                ${store.name}
                                <button class="btn-icon btn-fav-profile-toggle" data-id="${store.id}" style="border-radius: 50%; width: 36px; height: 36px; background: rgba(0,0,0,0.45); border: none; color: ${isFav ? '#f43f5e' : 'white'}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="${isFav ? 'Remove Bookmark' : 'Bookmark Store'}">
                                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size: 1.1rem;"></i>
                                </button>
                            </h1>
                            ${isSuspended ? `<span style="background: #dc2626; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; letter-spacing: 1px;">SUSPENDED</span>` : (isClosed ? `<span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; letter-spacing: 1px;">CLOSED OFFLINE</span>` : '')}
                        </div>
                        <p><i class="fa-solid fa-map-pin"></i> ${store.address} | <i class="fa-solid fa-phone"></i> ${store.phone}</p>
                    </div>
                    <div class="store-header-stats">
                        <div class="store-stat-box">
                            <h4>★ ${store.rating.toFixed(1)}</h4>
                            <span>Rating</span>
                        </div>
                        <div class="store-stat-box">
                            <h4 style="color: ${isClosed || isSuspended ? 'var(--danger)' : 'var(--secondary)'}; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"><i class="fa-solid fa-circle" style="font-size: 0.5rem; color: ${isClosed || isSuspended ? '#ef4444' : '#10b981'}; ${isClosed || isSuspended ? '' : 'animation: pulse 1.5s infinite;'}"></i> ${isSuspended ? 'Suspended' : (isClosed ? 'Offline' : Math.round(store.distance * 3 + 5) + ' Mins')}</h4>
                            <span>ETA (${store.distance} km)</span>
                        </div>
                        <div class="store-stat-box">
                            <h4>₹${db.getDeliveryFee(store.distance, 0).toFixed(2)}</h4>
                            <span>Direct Delivery</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const favProfileBtn = elements.storeProfileHeaderContainer.querySelector('.btn-fav-profile-toggle');
        if (favProfileBtn) {
            favProfileBtn.addEventListener('click', (e) => {
                toggleFavorite(store.id, e);
            });
        }

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
        if (filterVegOnly) {
            products = products.filter(p => p.dietaryType === 'Veg');
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

            let dietaryHtml = '';
            if (prod.dietaryType === 'Veg') {
                dietaryHtml = `<span class="dietary-badge veg" style="position: absolute; top: 12px; left: 12px; z-index: 10; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 2px solid #10b981; background: transparent; border-radius: 4px; padding: 2px;" title="Veg"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span></span>`;
            } else if (prod.dietaryType === 'Non-Veg') {
                dietaryHtml = `<span class="dietary-badge non-veg" style="position: absolute; top: 12px; left: 12px; z-index: 10; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 2px solid #ef4444; background: transparent; border-radius: 4px; padding: 2px;" title="Non-Veg"><span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span></span>`;
            }

            const priceHtml = prod.originalPrice 
                ? `<span class="product-price-slashed">₹${prod.originalPrice.toFixed(2)}</span>₹${prod.price.toFixed(2)}` 
                : `₹${prod.price.toFixed(2)}`;
            
            const isClosed = activeStore && activeStore.status === 'Closed';
            const isSuspended = activeStore && (activeStore.status === 'Suspended' || (activeStore.subscription && activeStore.subscription.status === 'Suspended'));
            
            let variantSelectorHtml = '';
            if (prod.variants && prod.variants.length > 0) {
                variantSelectorHtml = `
                    <div class="product-variant-selector" style="margin-top: 8px;">
                        <select class="variant-select glass-input" style="width: 100%; padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white;">
                            ${prod.variants.map(v => `<option value="${v.id}">${v.name} - ₹${v.price.toFixed(2)}</option>`).join('')}
                        </select>
                    </div>
                `;
            }

            card.innerHTML = `
                ${badgeHtml}
                ${dietaryHtml}
                <div class="product-card-top">
                    <div class="product-emoji-container">${visualContent}</div>
                    <span class="product-stock-tag ${prod.stock > 0 ? 'in-stock' : 'out-stock'}" id="stock-tag-${prod.id}">${prod.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div class="product-info">
                    <h3>${prod.name}</h3>
                    <div class="product-unit" id="unit-tag-${prod.id}">${prod.unit}</div>
                    <p class="product-desc">${prod.desc || 'Fresh item sourced locally.'}</p>
                    ${variantSelectorHtml}
                </div>
                <div class="product-footer">
                    <div class="product-price" id="price-tag-${prod.id}">${priceHtml}</div>
                    <button class="btn-premium btn-add-cart" ${prod.stock === 0 || isClosed || isSuspended ? 'disabled' : ''}>
                        ${isSuspended ? 'Suspended' : (isClosed ? 'Closed' : '<i class="fa-solid fa-cart-plus"></i> Add')}
                    </button>
                </div>
            `;

            if (prod.variants && prod.variants.length > 0) {
                const selectEl = card.querySelector('.variant-select');
                const updateCardUI = () => {
                    const selectedId = selectEl.value;
                    const variant = prod.variants.find(v => v.id === selectedId);
                    if (variant) {
                        const priceTag = card.querySelector(`#price-tag-${prod.id}`);
                        const unitTag = card.querySelector(`#unit-tag-${prod.id}`);
                        const stockTag = card.querySelector(`#stock-tag-${prod.id}`);
                        
                        priceTag.innerText = `₹${variant.price.toFixed(2)}`;
                        unitTag.innerText = variant.name;
                        
                        if (variant.stock > 0) {
                            stockTag.className = 'product-stock-tag in-stock';
                            stockTag.innerText = 'In Stock';
                            card.querySelector('.btn-add-cart').disabled = isClosed;
                        } else {
                            stockTag.className = 'product-stock-tag out-stock';
                            stockTag.innerText = 'Out of Stock';
                            card.querySelector('.btn-add-cart').disabled = true;
                        }
                    }
                };
                selectEl.addEventListener('change', updateCardUI);
                // Run initially to set first variant
                updateCardUI();
            }

            card.querySelector('.btn-add-cart').addEventListener('click', async (e) => {
                let selectedVariant = null;
                if (prod.variants && prod.variants.length > 0) {
                    const selectedId = card.querySelector('.variant-select').value;
                    selectedVariant = prod.variants.find(v => v.id === selectedId);
                }
                await addToCart(activeStore.id, prod, selectedVariant, e);
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
    async function addToCart(storeId, product, variant = null, event = null) {
        // Handle argument shifting if third parameter is an Event
        if (variant && (variant instanceof Event || typeof variant.clientX !== 'undefined' || typeof variant.preventDefault === 'function')) {
            event = variant;
            variant = null;
        }

        const store = await db.getStoreById(storeId);
        if (store) {
            if (store.status === 'Suspended' || (store.subscription && store.subscription.status === 'Suspended')) {
                showToast("This store has been temporarily suspended by the platform.", "error");
                return;
            }
            if (store.status === 'Closed') {
                showToast("This store is currently closed/offline. You cannot order from here.", "error");
                return;
            }
        }

        // If product has variants, and none is supplied, default to the first variant
        if (product.variants && product.variants.length > 0 && !variant) {
            variant = product.variants[0];
        }

        const itemId = variant ? `${product.id}-${variant.id}` : product.id;
        const itemName = variant ? `${product.name} (${variant.name})` : product.name;
        const itemPrice = variant ? variant.price : product.price;
        const itemUnit = variant ? variant.name : product.unit;
        const maxStock = variant ? variant.stock : product.stock;

        const existingItem = cart.find(item => item.id === itemId);
        
        if (existingItem) {
            if (existingItem.quantity >= maxStock) {
                showToast("Store stock limit reached", "error");
                return;
            }
            existingItem.quantity++;
        } else {
            const itemImage = product.image && product.image.trim() !== '' ? product.image : '';
            cart.push({
                id: itemId,
                productId: product.id,
                variantId: variant ? variant.id : null,
                name: itemName,
                price: itemPrice,
                quantity: 1,
                emoji: getProductEmoji(product.name, product.category),
                image: itemImage,
                unit: itemUnit,
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
        showToast(`Added ${itemName} to cart.`);
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

    async function updateQuantity(itemId, action) {
        const itemIndex = cart.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;

        const cartItem = cart[itemIndex];
        const store = await db.getStoreById(cartItem.storeId);
        const product = store ? store.products.find(p => p.id === cartItem.productId || p.id === cartItem.id) : null;

        let maxStock = product ? product.stock : 0;
        if (product && cartItem.variantId && product.variants) {
            const v = product.variants.find(varItem => varItem.id === cartItem.variantId);
            if (v) maxStock = v.stock;
        }

        if (action === 'increase') {
            if (cartItem.quantity >= maxStock) {
                showToast("Cannot add more, stock limit reached", "error");
                return;
            }
            cartItem.quantity++;
        } else if (action === 'decrease') {
            cartItem.quantity--;
            if (cartItem.quantity <= 0) {
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
        
        // Group cart items by store
        const groups = {};
        cart.forEach(item => {
            if (!groups[item.storeId]) {
                groups[item.storeId] = {
                    storeId: item.storeId,
                    storeName: item.storeName,
                    storeDistance: item.storeDistance,
                    items: [],
                    subtotal: 0
                };
            }
            groups[item.storeId].items.push(item);
            groups[item.storeId].subtotal += item.price * item.quantity;
            subtotal += item.price * item.quantity;
        });

        // Render groups
        Object.values(groups).forEach(group => {
            // Group Header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'cart-store-group-header';
            groupHeader.style.padding = '8px 12px';
            groupHeader.style.background = 'rgba(255, 255, 255, 0.04)';
            groupHeader.style.fontSize = '0.8rem';
            groupHeader.style.fontWeight = 'bold';
            groupHeader.style.color = 'var(--primary)';
            groupHeader.style.display = 'flex';
            groupHeader.style.justifyContent = 'space-between';
            groupHeader.style.alignItems = 'center';
            groupHeader.style.borderRadius = '6px';
            groupHeader.style.marginTop = '12px';
            groupHeader.style.marginBottom = '6px';
            groupHeader.innerHTML = `
                <span><i class="fa-solid fa-store"></i> ${group.storeName}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">${group.storeDistance.toFixed(1)} km</span>
            `;
            elements.cartItemsWrapper.appendChild(groupHeader);

            group.items.forEach(item => {
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
                        <span class="shop-name">${item.unit}</span>
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
        });

        // Compute total delivery fee (sum of delivery fees of each store)
        let deliveryFee = 0;
        Object.values(groups).forEach(group => {
            deliveryFee += db.getDeliveryFee(group.storeDistance, group.subtotal);
        });

        // Compute dynamic free delivery indicator progress
        const FREE_DELIVERY_THRESHOLD = 300;
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
            elements.savingsValue.innerText = "UNLOCKED! 🎉";
            elements.savingsValue.style.color = "var(--primary)";
            elements.savingsProgressBar.style.width = "100%";
            elements.savingsMsg.innerHTML = "You saved delivery fees! Enjoy <strong>FREE store-to-door delivery</strong>.";
            deliveryFee = 0.00;
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
            let topUpsells = [];
            try {
                const productIds = cart.map(item => item.id).join(',');
                const res = await fetch(`${db.baseUrl}/recommendations/frequently-bought-together?productIds=${encodeURIComponent(productIds)}&limit=5`);
                if (res.ok) {
                    const recs = await res.json();
                    topUpsells = recs
                        .filter(r => r.storeId === store.id && !cart.some(item => item.id === r.id))
                        .slice(0, 3);
                }
            } catch (err) {
                console.error("Failed to fetch upsells from backend, falling back to local scoring:", err);
            }
            
            if (topUpsells.length === 0) {
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
                    topUpsells = scored.slice(0, 3).map(s => s.product);
                }
            }

            if (topUpsells.length > 0) {
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
        const groups = {};
        cart.forEach(item => {
            if (!groups[item.storeId]) {
                groups[item.storeId] = {
                    storeId: item.storeId,
                    storeName: item.storeName,
                    storeDistance: item.storeDistance,
                    items: [],
                    subtotal: 0
                };
            }
            groups[item.storeId].items.push(item);
            groups[item.storeId].subtotal += item.price * item.quantity;
            subtotal += item.price * item.quantity;
        });

        // Render grouping in summary
        Object.values(groups).forEach(group => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'checkout-store-group-header';
            groupHeader.style.padding = '6px 10px';
            groupHeader.style.background = 'rgba(255, 255, 255, 0.03)';
            groupHeader.style.fontSize = '0.85rem';
            groupHeader.style.fontWeight = 'bold';
            groupHeader.style.color = 'var(--primary)';
            groupHeader.style.marginTop = '10px';
            groupHeader.style.marginBottom = '6px';
            groupHeader.style.borderRadius = '6px';
            groupHeader.style.display = 'flex';
            groupHeader.style.justifyContent = 'space-between';
            groupHeader.innerHTML = `
                <span><i class="fa-solid fa-store"></i> ${group.storeName}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(${group.storeDistance.toFixed(1)} km)</span>
            `;
            elements.checkoutItemsList.appendChild(groupHeader);

            group.items.forEach(item => {
                const cost = item.price * item.quantity;
                const hasImage = item.image && item.image.trim() !== '';
                const visualContent = hasImage
                    ? `<img src="${item.image}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px;" alt="${item.name}">`
                    : `<span style="font-size: 1.2rem; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">${item.emoji}</span>`;

                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                div.style.padding = '4px 8px';
                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap: 10px;">
                        ${visualContent}
                        <div style="text-align: left;">
                            <span style="font-size: 0.95rem; font-weight: 500;">${item.name}</span>
                            <br><span style="font-size: 0.75rem; color: var(--text-muted);">${item.quantity} x ₹${item.price.toFixed(2)} (${item.unit})</span>
                        </div>
                    </div>
                    <span style="font-size: 0.95rem; font-weight: 600;">₹${cost.toFixed(2)}</span>
                `;
                elements.checkoutItemsList.appendChild(div);
            });
        });

        // Compute total delivery fee
        let deliveryFee = 0;
        Object.values(groups).forEach(group => {
            deliveryFee += db.getDeliveryFee(group.storeDistance, group.subtotal);
        });

        // Check cumulative free delivery progress
        const FREE_DELIVERY_THRESHOLD = 300;
        let discount = 0;
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
            deliveryFee = 0.00;
        }

        if (appliedVoucher) {
            const storeSubtotals = {};
            cart.forEach(item => {
                storeSubtotals[item.storeId] = (storeSubtotals[item.storeId] || 0) + (item.price * item.quantity);
            });
            
            const matchingSubtotal = appliedVoucher.storeId ? (storeSubtotals[appliedVoucher.storeId] || 0) : subtotal;
            
            if (matchingSubtotal < appliedVoucher.minOrderValue) {
                appliedVoucher = null;
                elements.couponAppliedMsg.style.display = 'none';
                elements.couponErrorMsg.style.display = 'block';
                elements.couponErrorMsg.innerText = `Coupon removed: Requires min purchase of ₹${appliedVoucher.minOrderValue}`;
            } else {
                if (appliedVoucher.discountType === 'fixed') {
                    discount = Math.min(appliedVoucher.value, matchingSubtotal);
                } else if (appliedVoucher.discountType === 'free-delivery') {
                    if (appliedVoucher.storeId) {
                        const group = groups[appliedVoucher.storeId];
                        discount = group ? db.getDeliveryFee(group.storeDistance, group.subtotal) : 0;
                    } else {
                        discount = deliveryFee;
                    }
                    deliveryFee = Math.max(0, deliveryFee - discount);
                }
            }
        }

        const grandTotal = subtotal + deliveryFee + selectedTipAmount - discount;

        elements.checkoutSubtotal.innerText = `₹${subtotal.toFixed(2)}`;
        elements.checkoutDeliveryFee.innerText = `₹${deliveryFee.toFixed(2)}`;
        
        if (selectedTipAmount > 0) {
            elements.checkoutRiderTipRow.style.display = 'flex';
            elements.checkoutRiderTipAmount.innerText = `₹${selectedTipAmount.toFixed(2)}`;
        } else {
            elements.checkoutRiderTipRow.style.display = 'none';
        }

        if (discount > 0) {
            elements.checkoutDiscountRow.style.display = 'flex';
            elements.checkoutDiscountAmount.innerText = `-₹${discount.toFixed(2)}`;
        } else {
            elements.checkoutDiscountRow.style.display = 'none';
        }

        elements.checkoutGrandTotal.innerText = `₹${grandTotal.toFixed(2)}`;

        // Operational constraints validation
        const store = await db.getStoreById(cart[0].storeId);
        const minOrderVal = store ? (store.minOrderValue || 0) : 0;
        const maxRadius = store ? (store.deliveryRadius || 5.0) : 5.0;
        const isSuspended = store && (store.status === 'Suspended' || (store.subscription && store.subscription.status === 'Suspended'));
        
        let blockCheckout = false;
        let warningText = "";

        if (isSuspended) {
            blockCheckout = true;
            warningText = "This store has been temporarily suspended by the platform.";
        } else if (subtotal < minOrderVal) {
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

        // Wallet Balance & Split Setup
        const walletBalance = await db.getWalletBalance();
        if (elements.checkoutWalletBalanceVal) {
            elements.checkoutWalletBalanceVal.innerText = `₹${parseFloat(walletBalance).toFixed(2)}`;
        }

        const updateWalletSplitDisplay = () => {
            const selectedPaymentEl = document.querySelector('input[name="payment-method"]:checked');
            const selectedPayment = selectedPaymentEl ? selectedPaymentEl.value : 'upi';
            if (selectedPayment === 'wallet' && walletBalance < grandTotal) {
                elements.checkoutWalletSplitBox.style.display = 'block';
                elements.checkoutSplitWalletApplied.innerText = `₹${parseFloat(walletBalance).toFixed(2)}`;
                elements.checkoutSplitRemaining.innerText = `₹${parseFloat(grandTotal - walletBalance).toFixed(2)}`;
            } else {
                elements.checkoutWalletSplitBox.style.display = 'none';
            }
        };

        document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
            radio.removeEventListener('change', updateWalletSplitDisplay);
            radio.addEventListener('change', updateWalletSplitDisplay);
        });
        
        updateWalletSplitDisplay();
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
        
        const storeId = cart[0].storeId;
        const store = await db.getStoreById(storeId);
        if (store) {
            if (store.status === 'Suspended' || (store.subscription && store.subscription.status === 'Suspended')) {
                showToast("Checkout failed. This store has been temporarily suspended.", "error");
                return;
            }
            if (store.status === 'Closed') {
                showToast("Checkout failed. This store is currently closed/offline.", "error");
                return;
            }
        }
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let deliveryFee = db.getDeliveryFee(cart[0].storeDistance, subtotal);

        let discount = 0;
        if (appliedVoucher) {
            if (appliedVoucher.discountType === 'fixed') {
                discount = Math.min(appliedVoucher.value, subtotal);
            } else if (appliedVoucher.discountType === 'free-delivery') {
                discount = deliveryFee;
                deliveryFee = 0.00;
            }
        }

        const customer = {
            name: elements.checkoutName.value.trim(),
            phone: elements.checkoutPhone.value.trim(),
            address: elements.checkoutAddress.value.trim(),
            payment: document.querySelector('input[name="payment-method"]:checked').value,
            tip: selectedTipAmount
        };

        const grandTotal = subtotal + deliveryFee + selectedTipAmount - discount;
        const walletBalance = await db.getWalletBalance();

        if (customer.payment === 'wallet') {
            if (walletBalance < grandTotal) {
                customer.payment = 'split';
                customer.splitPaymentMethod = document.querySelector('input[name="wallet-split-method"]:checked').value;
            }
        }

        if (customer.payment === 'upi' || (customer.payment === 'split' && customer.splitPaymentMethod === 'upi')) {
            const upiAmount = customer.payment === 'split' ? (grandTotal - walletBalance) : grandTotal;
            elements.upiGrandTotal.innerText = `₹${upiAmount.toFixed(2)}`;
            
            // Set payee details from store configuration
            const upiVpa = store.upiVpa || 'luxegrocer@okaxis';
            const upiName = store.upiName || store.name;
            
            elements.upiPayeeVpa.innerText = upiVpa;
            elements.upiPayeeName.innerText = upiName;
            
            // Construct UPI Link and dynamic QR code URL
            const upiUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${upiAmount.toFixed(2)}&cu=INR`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUrl)}`;
            
            elements.upiQrImage.src = qrCodeUrl;
            elements.upiTransactionId.value = '';
            
            // Store checkout data globally so transaction form can access it
            checkoutCustomerData = customer;
            checkoutDiscount = discount;
            
            // Display UPI Scan Modal
            elements.modalUpiPayment.style.display = 'flex';
            elements.modalUpiPayment.classList.add('active');
        } else {
            const deliveryInstructions = document.getElementById('checkout-instructions') ? document.getElementById('checkout-instructions').value.trim() : '';
            const order = await db.createOrder(storeId, cart, customer, discount, appliedVoucher ? appliedVoucher.code : '', deliveryInstructions);
            if (order) {
                cart = [];
                appliedVoucher = null;
                saveCartToStorage();
                updateCartBadge();
                
                let successMsg = "COD Order placed successfully.";
                if (customer.payment === 'wallet') {
                    successMsg = "Order paid successfully via Wallet!";
                    playSoundbox(`New order received on Luxe Grocer. Paid via wallet. Value ${Math.round(grandTotal)} rupees`);
                } else if (customer.payment === 'split') {
                    successMsg = `Order placed! ₹${walletBalance.toFixed(2)} paid via Wallet, rest ₹${(grandTotal - walletBalance).toFixed(2)} COD.`;
                    playSoundbox(`New order received on Luxe Grocer. Paid with wallet split. Value ${Math.round(grandTotal)} rupees`);
                } else {
                    playSoundbox(`New cash on delivery order received on Luxe Grocer. Value ${Math.round(grandTotal)} rupees`);
                }
                showToast(successMsg, "success");
                
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
        let orderToTrack = order;
        
        const multiStoreSelector = document.getElementById('tracker-multi-store-selector');
        const subOrderSelect = document.getElementById('select-tracker-sub-order');
        
        if (order.isMaster && order.subOrders && order.subOrders.length > 0) {
            if (multiStoreSelector && subOrderSelect) {
                multiStoreSelector.style.display = 'flex';
                subOrderSelect.innerHTML = '';
                order.subOrders.forEach((sub, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.innerText = `${sub.storeName} (${sub.status})`;
                    subOrderSelect.appendChild(opt);
                });
                
                subOrderSelect.onchange = async () => {
                    const idx = parseInt(subOrderSelect.value);
                    const selectedSub = order.subOrders[idx];
                    await refreshTrackerSubOrder(selectedSub);
                };
            }
            orderToTrack = order.subOrders[0];
        } else {
            if (multiStoreSelector) multiStoreSelector.style.display = 'none';
        }

        await refreshTrackerSubOrder(orderToTrack);
    }

    async function refreshTrackerSubOrder(order) {
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
        if (order.status === 'Out for Delivery') {
            animateRiderMarker();
        }
        if (order.status === 'Pending') {
            startCancelGracePeriodTimer(order.id);
        } else {
            if (cancelGraceTimer) clearInterval(cancelGraceTimer);
            elements.cancelGraceBox.style.display = 'none';
        }
        await updateActiveOrderButtonVisibility();
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
        
        let possibleStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
        if (freshOrder.status === 'Cancelled') {
            possibleStatuses = ['Pending', 'Cancelled'];
        }
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

        // Toggle Rider Card visibility based on assignment and status
        if (freshOrder.deliveryStaff && ['Out for Delivery', 'Delivered'].includes(freshOrder.status)) {
            elements.trackerRiderName.innerText = freshOrder.deliveryStaff.name;
            elements.btnCallRider.href = `tel:${freshOrder.deliveryStaff.phone}`;
            elements.trackerRiderBox.style.display = 'flex';
        } else {
            elements.trackerRiderBox.style.display = 'none';
        }

        // --- Out-of-Stock Substitution Check ---
        const prop = freshOrder.substitutionProposal;
        if (prop && prop.status === 'Pending') {
            const originalItem = freshOrder.items.find(i => i.id === prop.originalItemId) || { name: 'Item', quantity: 1 };
            elements.trackerSubstitutionText.innerHTML = `
                Store owner proposed swapping out-of-stock <strong>${originalItem.name}</strong> 
                with <strong>${prop.suggestedProduct.name}</strong> (${prop.suggestedProduct.emoji || '📦'}) for the same quantity. 
                <br><span style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:block;">
                Suggested product price: <strong>₹${prop.suggestedProduct.price.toFixed(2)}</strong> (vs original ₹${originalItem.price.toFixed(2)})
                </span>
            `;
            elements.trackerSubstitutionBox.style.display = 'flex';
        } else {
            elements.trackerSubstitutionBox.style.display = 'none';
        }

        // --- Real-time Order Chat Updates ---
        const chatMessages = freshOrder.chatMessages || [];
        elements.customerChatBadge.innerText = chatMessages.length;
        if (chatMessages.length > 0) {
            elements.customerChatBadge.style.display = 'inline-block';
        } else {
            elements.customerChatBadge.style.display = 'none';
        }

        const messagesHtml = chatMessages.map(msg => {
            const isMe = msg.sender === 'customer';
            const align = isMe ? 'text-align: right;' : 'text-align: left;';
            const bg = isMe ? 'background: rgba(20, 184, 166, 0.2); border-radius: 8px 8px 0 8px; margin-left: 20px;' : 'background: rgba(255,255,255,0.05); border-radius: 8px 8px 8px 0; margin-right: 20px;';
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return `
                <div style="${align} margin-bottom: 6px;">
                    <div style="display: inline-block; padding: 6px 10px; font-size: 0.8rem; border: 1px solid var(--border-color); ${bg}">
                        <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: bold; margin-bottom: 2px;">${msg.senderName}</div>
                        <div style="color: var(--text-main); word-break: break-word;">${msg.text}</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; text-align: right;">${time}</div>
                    </div>
                </div>
            `;
        }).join('');

        elements.customerChatMessages.innerHTML = messagesHtml || '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px 0;">No messages yet. Ask the store owner for status updates.</div>';

        // Auto-scroll chat to bottom
        if (customerChatOpen && elements.customerChatMessages) {
            setTimeout(() => {
                elements.customerChatMessages.scrollTop = elements.customerChatMessages.scrollHeight;
            }, 50);
        }

        possibleStatuses.forEach((status, idx) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'timeline-step';
            if (idx < activeIdx) {
                stepDiv.classList.add('completed');
            } else if (idx === activeIdx) {
                stepDiv.classList.add('active');
                if (status === 'Cancelled') {
                    stepDiv.classList.add('cancelled');
                }
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
        lastDeliveredOrder = order;
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
            
            if (event === 'orders_updated') {
                await updateActiveOrderButtonVisibility();
                if (trackingOrder && data === trackingOrder.id) {
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
            if (event === 'sys_notification') {
                if (data && data.type === 'broadcast') {
                    const alertBar = document.getElementById('broadcast-alert-bar');
                    const alertText = document.getElementById('broadcast-alert-text');
                    if (alertBar && alertText) {
                        alertText.innerText = data.message;
                        alertBar.style.display = 'flex';
                    }
                } else {
                    showSimulatedNotification(data.message || data);
                }
            }
        } catch (err) {
            console.error("Error parsing SSE message:", err);
        }
    };

    function showSimulatedNotification(message) {
        let container = document.getElementById('mock-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'mock-notification-container';
            container.style.position = 'fixed';
            container.style.bottom = '20px';
            container.style.right = '20px';
            container.style.zIndex = '99999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            container.style.maxWidth = '360px';
            container.style.width = '100%';
            document.body.appendChild(container);
        }
        
        const card = document.createElement('div');
        card.style.background = 'rgba(15, 23, 42, 0.95)';
        card.style.backdropFilter = 'blur(10px)';
        card.style.border = '1px solid var(--primary)';
        card.style.borderRadius = '12px';
        card.style.padding = '16px';
        card.style.color = 'white';
        card.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.4s ease-out';
        
        const isEmail = message.startsWith('Email');
        const icon = isEmail ? '📧' : '📱';
        const title = isEmail ? 'Simulated Email Sent' : 'Simulated SMS Sent';
        
        card.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: flex-start;">
                <div style="font-size: 1.5rem; background: rgba(20, 184, 166, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(20, 184, 166, 0.2);">${icon}</div>
                <div style="flex-grow: 1;">
                    <strong style="font-size: 0.9rem; color: var(--secondary); display: block; margin-bottom: 4px;">${title}</strong>
                    <p style="font-size: 0.8rem; color: #cbd5e1; margin: 0; line-height: 1.4;">${message}</p>
                </div>
                <button style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; font-size: 1.2rem; line-height: 1;" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        container.appendChild(card);
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 50);
        
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-20px)';
            setTimeout(() => card.remove(), 400);
        }, 6000);
    }

    // --- Click Event Listeners ---
    
    elements.btnLogo.addEventListener('click', async (e) => {
        e.preventDefault();
        await switchView('landing');
    });

    if (elements.btnTrackActiveOrder) {
        elements.btnTrackActiveOrder.addEventListener('click', async () => {
            try {
                const orders = await db.getOrders();
                const activeOrder = orders.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
                if (activeOrder) {
                    await startOrderTracking(activeOrder);
                    await switchView('order-tracker');
                } else {
                    showToast("No active order found to track.", "info");
                    elements.btnTrackActiveOrder.style.display = 'none';
                }
            } catch (err) {
                console.error("Error tracking active order from nav:", err);
            }
        });
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (elements.btnThemeToggle) {
                elements.btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        } else {
            document.body.classList.remove('light-theme');
            if (elements.btnThemeToggle) {
                elements.btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
        }
    }

    if (elements.btnThemeToggle) {
        elements.btnThemeToggle.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('luxegrocer_theme') || 'dark';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('luxegrocer_theme', newTheme);
            applyTheme(newTheme);
        });
    }

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

    const btnAutofillCustomerDemo = document.getElementById('btn-autofill-customer-demo');
    if (btnAutofillCustomerDemo) {
        btnAutofillCustomerDemo.addEventListener('click', (e) => {
            e.preventDefault();
            elements.loginEmail.value = 'rahul@luxe.com';
            elements.loginPassword.value = 'admin123';
        });
    }

    elements.formCustomerLogin.addEventListener('submit', handleLoginSubmit);
    elements.formCustomerRegister.addEventListener('submit', handleRegisterSubmit);
    elements.formChangePassword.addEventListener('submit', handleChangePasswordSubmit);
    
    if (elements.btnFilterOpenOnly) {
        elements.btnFilterOpenOnly.addEventListener('click', () => {
            filterOpenOnly = !filterOpenOnly;
            if (filterOpenOnly) {
                elements.btnFilterOpenOnly.style.background = 'var(--primary)';
                elements.btnFilterOpenOnly.style.borderColor = 'var(--primary)';
                elements.btnFilterOpenOnly.style.color = 'white';
            } else {
                elements.btnFilterOpenOnly.style.background = 'transparent';
                elements.btnFilterOpenOnly.style.borderColor = '';
                elements.btnFilterOpenOnly.style.color = '';
            }
            renderStores();
        });
    }

    if (elements.selectStoreSort) {
        elements.selectStoreSort.addEventListener('change', () => {
            storeSortBy = elements.selectStoreSort.value;
            renderStores();
        });
    }
    
    if (elements.linkForgotPassword) {
        elements.linkForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthModal(false);
            
            elements.formForgotRequest.style.display = 'flex';
            elements.formForgotReset.style.display = 'none';
            elements.formForgotRequest.reset();
            elements.formForgotReset.reset();
            
            elements.modalForgotPassword.style.display = 'flex';
            elements.modalForgotPassword.classList.add('active');
        });
    }

    if (elements.btnCloseForgotModal) {
        elements.btnCloseForgotModal.addEventListener('click', () => {
            elements.modalForgotPassword.style.display = 'none';
            elements.modalForgotPassword.classList.remove('active');
        });
    }

    if (elements.formForgotRequest) {
        elements.formForgotRequest.addEventListener('submit', handleForgotRequestSubmit);
    }
    if (elements.formForgotReset) {
        elements.formForgotReset.addEventListener('submit', handleForgotResetSubmit);
    }

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

    // Form confirmation submit listener for UPI Transaction ID
    elements.formUpiPaymentConfirmation.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (cart.length === 0 || !checkoutCustomerData) return;
        
        const utr = elements.upiTransactionId.value.trim();
        if (utr.length < 6) {
            showToast("Please enter a valid Transaction Ref No. (min 6 characters)", "error");
            return;
        }
        
        checkoutCustomerData.transactionId = utr;
        
        const storeId = cart[0].storeId;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = db.getDeliveryFee(cart[0].storeDistance, subtotal);
        const grandTotal = subtotal + deliveryFee + selectedTipAmount - checkoutDiscount;
        
        elements.btnSubmitUpiTransaction.disabled = true;
        elements.btnSubmitUpiTransaction.innerText = "Confirming Settlement...";
        
        const deliveryInstructions = document.getElementById('checkout-instructions') ? document.getElementById('checkout-instructions').value.trim() : '';
        const order = await db.createOrder(storeId, cart, checkoutCustomerData, checkoutDiscount, appliedVoucher ? appliedVoucher.code : '', deliveryInstructions);
        
        elements.btnSubmitUpiTransaction.disabled = false;
        elements.btnSubmitUpiTransaction.innerText = "Confirm & Submit Order";
        
        if (order) {
            elements.modalUpiPayment.style.display = 'none';
            elements.modalUpiPayment.classList.remove('active');
            cart = [];
            appliedVoucher = null;
            checkoutCustomerData = null;
            saveCartToStorage();
            updateCartBadge();
            let successMsg = "UPI Payment order confirmed! Waiting for merchant verification.";
            if (order.customer.payment === 'split') {
                successMsg = `Split Order placed! Wallet used: ₹${order.customer.walletAmountPaid.toFixed(2)}, UPI paid: ₹${order.customer.splitAmountPaid.toFixed(2)}.`;
            }
            showToast(successMsg, "success");
            const upiAmountPaid = order.customer.payment === 'split' ? order.customer.splitAmountPaid : grandTotal;
            playSoundbox(`Payment of ${Math.round(upiAmountPaid)} rupees received on Luxe Grocer`);
            await startOrderTracking(order);
            await switchView('order-tracker');
        } else {
            showToast("Failed to place order. Try again.", "error");
        }
    });

    elements.btnCancelOrder.addEventListener('click', () => {
        if (trackingOrder) {
            const cancelModal = document.getElementById('modal-cancel-reason');
            if (cancelModal) {
                cancelModal.style.display = 'flex';
                cancelModal.classList.add('active');
            }
        }
    });

    elements.btnSimAdvance.addEventListener('click', forceAdvanceSimulation);
    elements.btnTrackerDone.addEventListener('click', async () => {
        trackingOrder = null;
        await switchView('landing');
        await updateActiveOrderButtonVisibility();
    });

    // Customer Chat Toggle Listener
    elements.btnToggleCustomerChat.addEventListener('click', () => {
        if (elements.customerChatDrawer.style.display === 'none') {
            elements.customerChatDrawer.style.display = 'flex';
            elements.customerChatChevron.style.transform = 'rotate(180deg)';
            customerChatOpen = true;
            setTimeout(() => {
                elements.customerChatMessages.scrollTop = elements.customerChatMessages.scrollHeight;
                elements.customerChatInput.focus();
            }, 50);
        } else {
            elements.customerChatDrawer.style.display = 'none';
            elements.customerChatChevron.style.transform = 'rotate(0deg)';
            customerChatOpen = false;
        }
    });

    // Customer Chat Submit Form Listener
    elements.customerChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!trackingOrder) return;
        const text = elements.customerChatInput.value.trim();
        if (!text) return;

        try {
            const res = await fetch(`${db.baseUrl}/orders/${trackingOrder.id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('luxegrocer_customer_auth_token')}`
                },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                elements.customerChatInput.value = '';
                // The SSE stream will trigger updateTrackerTimeline which re-renders the chat box.
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to send message', 'error');
            }
        } catch (err) {
            console.error('Customer chat error:', err);
            showToast('Failed to send message', 'error');
        }
    });

    // Substitution proposal responses
    elements.btnTrackerAcceptSub.addEventListener('click', async () => {
        if (!trackingOrder) return;
        try {
            const res = await fetch(`${db.baseUrl}/orders/${trackingOrder.id}/substitution-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('luxegrocer_customer_auth_token')}`
                },
                body: JSON.stringify({ action: 'Accept' })
            });
            if (res.ok) {
                showToast('Substitution proposal accepted successfully!', 'success');
                // SSE handles the timeline sync and updating totals
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to accept substitution', 'error');
            }
        } catch (err) {
            console.error('Accept swap error:', err);
            showToast('Failed to accept substitution', 'error');
        }
    });

    elements.btnTrackerDeclineSub.addEventListener('click', async () => {
        if (!trackingOrder) return;
        try {
            const res = await fetch(`${db.baseUrl}/orders/${trackingOrder.id}/substitution-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('luxegrocer_customer_auth_token')}`
                },
                body: JSON.stringify({ action: 'Decline' })
            });
            if (res.ok) {
                showToast('Substitution proposal declined and item removed from order.', 'info');
                // SSE handles timeline sync
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to decline substitution', 'error');
            }
        } catch (err) {
            console.error('Decline swap error:', err);
            showToast('Failed to decline substitution', 'error');
        }
    });

    function openReviewModal(order) {
        elements.reviewStoreNameText.innerText = order.storeName;
        elements.reviewRatingValue.value = "0";
        elements.reviewComment.value = "";
        
        elements.modalStoreReview.querySelectorAll('.star-item i').forEach(star => {
            star.className = 'fa-regular fa-star';
            star.style.color = 'var(--text-muted)';
        });
        
        elements.modalStoreReview.style.display = 'flex';
        elements.modalStoreReview.classList.add('active');
    }

    elements.modalStoreReview.querySelectorAll('.star-item').forEach(item => {
        item.addEventListener('click', () => {
            const rating = parseInt(item.getAttribute('data-rating'));
            elements.reviewRatingValue.value = rating;
            
            elements.modalStoreReview.querySelectorAll('.star-item').forEach(star => {
                const starRating = parseInt(star.getAttribute('data-rating'));
                const icon = star.querySelector('i');
                if (starRating <= rating) {
                    icon.className = 'fa-solid fa-star';
                    icon.style.color = '#fbbf24';
                } else {
                    icon.className = 'fa-regular fa-star';
                    icon.style.color = 'var(--text-muted)';
                }
            });
        });
    });

    elements.formStoreReview.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(elements.reviewRatingValue.value);
        if (!rating || rating < 1 || rating > 5) {
            showToast("Please select a star rating first.", "error");
            return;
        }
        
        const comment = elements.reviewComment.value.trim();
        const storeId = lastDeliveredOrder ? lastDeliveredOrder.storeId : null;
        
        if (!storeId) {
            showToast("Error identifying store for review.", "error");
            return;
        }

        try {
            const res = await fetch(`${db.baseUrl}/stores/${storeId}/reviews`, {
                method: 'POST',
                headers: db.getHeaders(),
                body: JSON.stringify({ rating, comment })
            });
            if (res.ok) {
                showToast("Thank you for your feedback!", "success");
                elements.modalStoreReview.style.display = 'none';
                elements.modalStoreReview.classList.remove('active');
                lastDeliveredOrder = null;
            } else {
                showToast("Failed to submit feedback.", "error");
            }
        } catch (err) {
            console.error("Error submitting review:", err);
            showToast("Server connection error.", "error");
        }
    });

    if (elements.btnCloseReviewModal) {
        elements.btnCloseReviewModal.addEventListener('click', () => {
            elements.modalStoreReview.style.display = 'none';
            elements.modalStoreReview.classList.remove('active');
            lastDeliveredOrder = null;
        });
    }

    elements.btnScratchDone.addEventListener('click', () => {
        elements.modalScratchCard.style.display = 'none';
        elements.modalScratchCard.classList.remove('active');
        showToast("Mystery coupon claimed successfully!", "success");
        if (lastDeliveredOrder) {
            openReviewModal(lastDeliveredOrder);
        }
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

    // --- Account Drawer Toggles & Tabs ---
    if (elements.btnAccountTrigger) {
        elements.btnAccountTrigger.addEventListener('click', () => {
            elements.accountOverlayElement.classList.add('active');
            elements.accountDrawerElement.classList.add('active');
            showAccountTab('profile');
        });
    }

    if (elements.btnCloseAccount) {
        elements.btnCloseAccount.addEventListener('click', () => {
            elements.accountOverlayElement.classList.remove('active');
            elements.accountDrawerElement.classList.remove('active');
        });
    }

    if (elements.accountOverlayElement) {
        elements.accountOverlayElement.addEventListener('click', () => {
            elements.accountOverlayElement.classList.remove('active');
            elements.accountDrawerElement.classList.remove('active');
        });
    }

    elements.tabBtnProfile.addEventListener('click', () => showAccountTab('profile'));
    elements.tabBtnAddresses.addEventListener('click', () => showAccountTab('addresses'));
    elements.tabBtnHistory.addEventListener('click', () => showAccountTab('history'));
    elements.tabBtnVouchers.addEventListener('click', () => showAccountTab('vouchers'));
    if (elements.tabBtnWallet) {
        elements.tabBtnWallet.addEventListener('click', () => showAccountTab('wallet'));
    }
    if (elements.formAddFunds) {
        elements.formAddFunds.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amt = parseFloat(elements.walletAddAmount.value);
            if (isNaN(amt) || amt <= 0) {
                showToast("Please enter a valid amount.", "error");
                return;
            }
            const submitBtn = document.getElementById('btn-add-funds-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Adding...';
            }
            const newBal = await db.addWalletFunds(amt);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Add Funds';
            }
            if (newBal !== null) {
                elements.accountWalletBalance.innerText = `₹${parseFloat(newBal).toFixed(2)}`;
                elements.walletAddAmount.value = '500';
                showToast(`Successfully added ₹${amt.toFixed(2)} to your wallet!`, "success");
            } else {
                showToast("Failed to add funds. Try again.", "error");
            }
        });
    }

    // Profile update submit
    elements.formAccountProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${db.baseUrl}/auth/me`, {
                method: 'PUT',
                headers: db.getHeaders(),
                body: JSON.stringify({
                    name: elements.accountProfileName.value.trim(),
                    phone: elements.accountProfilePhone.value.trim()
                })
            });
            if (res.ok) {
                const updated = await res.json();
                db.currentUser = updated;
                elements.accountTriggerText.innerText = updated.name.split(' ')[0];
                elements.checkoutName.value = updated.name;
                elements.checkoutPhone.value = updated.phone;
                showToast("Profile details updated successfully!", "success");
            } else {
                showToast("Failed to update profile.", "error");
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            showToast("Server connection error.", "error");
        }
    });

    // Address Add form toggling
    elements.btnAddNewAddress.addEventListener('click', () => {
        elements.formAccountAddress.reset();
        elements.accountAddressId.value = '';
        elements.formAccountAddress.style.display = 'flex';
        // Auto fill HSR Preset by default
        elements.accountAddressTag.value = 'Home';
        elements.accountAddressLat.value = 12.9100;
        elements.accountAddressLng.value = 77.6400;
        elements.accountAddressDetail.value = 'Sector 3, HSR Layout, Bengaluru';
    });

    elements.btnCancelAddressForm.addEventListener('click', () => {
        elements.formAccountAddress.style.display = 'none';
    });

    // Preset address buttons
    elements.btnAddrPresetH.addEventListener('click', () => {
        elements.accountAddressLat.value = 12.9100;
        elements.accountAddressLng.value = 77.6400;
        elements.accountAddressDetail.value = 'Sector 3, HSR Layout, Bengaluru, Karnataka';
    });
    elements.btnAddrPresetK.addEventListener('click', () => {
        elements.accountAddressLat.value = 12.9250;
        elements.accountAddressLng.value = 77.6220;
        elements.accountAddressDetail.value = '4th Block, Koramangala, Bengaluru, Karnataka';
    });
    elements.btnAddrPresetI.addEventListener('click', () => {
        elements.accountAddressLat.value = 12.9719;
        elements.accountAddressLng.value = 77.6412;
        elements.accountAddressDetail.value = '100 Feet Road, Indiranagar, Bengaluru, Karnataka';
    });

    // Address form submit
    elements.formAccountAddress.addEventListener('submit', async (e) => {
        e.preventDefault();
        const addressData = {
            tag: elements.accountAddressTag.value,
            address: elements.accountAddressDetail.value.trim(),
            lat: parseFloat(elements.accountAddressLat.value) || 12.9250,
            lng: parseFloat(elements.accountAddressLng.value) || 77.6220
        };

        const added = await db.addSavedAddress(addressData);
        if (added) {
            showToast("Address saved successfully!", "success");
            elements.formAccountAddress.style.display = 'none';
            await renderAddresses();
            await populateCheckoutAddressSelect();
        } else {
            showToast("Failed to save address.", "error");
        }
    });

    // Coupon verification listeners
    elements.btnApplyCoupon.addEventListener('click', async () => {
        const code = elements.couponCodeInput.value.trim();
        if (!code) {
            showToast("Please enter a voucher code.", "info");
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const storeSubtotals = {};
        cart.forEach(item => {
            storeSubtotals[item.storeId] = (storeSubtotals[item.storeId] || 0) + (item.price * item.quantity);
        });
        const res = await db.validateVoucher(code, subtotal, storeSubtotals);
        if (res.success) {
            appliedVoucher = res.voucher;
            elements.couponAppliedMsg.style.display = 'flex';
            elements.appliedCouponCode.innerText = res.voucher.code;
            elements.couponErrorMsg.style.display = 'none';
            elements.couponCodeInput.value = '';
            showToast("Promo voucher applied successfully!", "success");
            await renderCheckoutSummary();
        } else {
            elements.couponErrorMsg.style.display = 'block';
            elements.couponErrorMsg.innerText = res.error;
            elements.couponAppliedMsg.style.display = 'none';
            showToast(res.error, "error");
        }
    });

    elements.btnRemoveCoupon.addEventListener('click', async () => {
        appliedVoucher = null;
        elements.couponAppliedMsg.style.display = 'none';
        elements.couponErrorMsg.style.display = 'none';
        showToast("Voucher removed successfully.");
        await renderCheckoutSummary();
    });

    elements.btnAccountLogout.addEventListener('click', async () => {
        elements.accountOverlayElement.classList.remove('active');
        elements.accountDrawerElement.classList.remove('active');
        db.logout();
        showToast("Signed out successfully.");
        await initAuth();
        await switchView('landing');
    });

    elements.checkoutAddressSelect.addEventListener('change', () => {
        const val = elements.checkoutAddressSelect.value;
        if (val) {
            const parsed = JSON.parse(val);
            elements.checkoutAddress.value = parsed.address;
            
            if (cart.length > 0) {
                cart[0].storeDistance = db.calculateDistance(parsed.lat, parsed.lng, activeStore ? activeStore.lat : parsed.lat, activeStore ? activeStore.lng : parsed.lng);
                renderCheckoutSummary();
            }
        }
    });

    let bannerInterval = null;
    async function initPromoBanners() {
        const carousel = document.getElementById('promo-banner-carousel');
        const slidesContainer = document.getElementById('promo-banner-slides');
        const dotsContainer = document.getElementById('promo-banner-dots');
        if (!carousel || !slidesContainer || !dotsContainer) return;
        
        if (bannerInterval) clearInterval(bannerInterval);
        
        const banners = await db.getBanners();
        if (banners.length === 0) {
            carousel.style.display = 'none';
            return;
        }
        
        carousel.style.display = 'block';
        slidesContainer.innerHTML = '';
        dotsContainer.innerHTML = '';
        
        banners.forEach((b, idx) => {
            const slide = document.createElement('div');
            slide.className = 'promo-slide';
            slide.style.position = 'absolute';
            slide.style.top = '0';
            slide.style.left = '0';
            slide.style.width = '100%';
            slide.style.height = '100%';
            slide.style.display = idx === 0 ? 'flex' : 'none';
            slide.style.alignItems = 'center';
            slide.style.padding = '24px 32px';
            slide.style.boxSizing = 'border-box';
            slide.style.backgroundSize = 'cover';
            slide.style.backgroundPosition = 'center';
            slide.style.transition = 'opacity 0.6s ease-in-out';
            if (b.imageUrl) {
                slide.style.backgroundImage = `linear-gradient(90deg, rgba(9, 13, 22, 0.95) 30%, rgba(9, 13, 22, 0.4) 100%), url('${b.imageUrl}')`;
            } else {
                slide.style.backgroundImage = `linear-gradient(90deg, var(--bg-card) 0%, rgba(20, 184, 166, 0.15) 100%)`;
            }
            
            slide.innerHTML = `
                <div style="max-width: 70%; z-index: 2;">
                    <span style="background: var(--primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Offer</span>
                    <h2 style="margin: 8px 0 0 0; font-size: 1.1rem; line-height: 1.4; font-weight: 700; color: white;">${b.text}</h2>
                </div>
            `;
            slidesContainer.appendChild(slide);
            
            const dot = document.createElement('button');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.border = 'none';
            dot.style.background = idx === 0 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.3)';
            dot.style.cursor = 'pointer';
            dot.style.padding = '0';
            dot.addEventListener('click', () => showSlide(idx));
            dotsContainer.appendChild(dot);
        });
        
        let currentSlideIdx = 0;
        function showSlide(index) {
            const slides = slidesContainer.querySelectorAll('.promo-slide');
            const dots = dotsContainer.querySelectorAll('button');
            if (slides.length === 0) return;
            
            slides.forEach((slide, idx) => {
                if (idx === index) {
                    slide.style.display = 'flex';
                    slide.style.opacity = '1';
                } else {
                    slide.style.display = 'none';
                    slide.style.opacity = '0';
                }
            });
            
            dots.forEach((dot, idx) => {
                dot.style.background = idx === index ? 'var(--primary)' : 'rgba(255, 255, 255, 0.3)';
            });
            currentSlideIdx = index;
        }
        
        if (banners.length > 1) {
            bannerInterval = setInterval(() => {
                let nextIdx = (currentSlideIdx + 1) % banners.length;
                showSlide(nextIdx);
            }, 5000);
        }
    }

    // --- Basic Gaps Features Setup & Event Handlers ---

    // 1. Delivery Instructions instruction chips click handler
    document.querySelectorAll('.inst-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const txt = btn.getAttribute('data-text');
            const textarea = document.getElementById('checkout-instructions');
            if (textarea) {
                const currentVal = textarea.value.trim();
                if (currentVal) {
                    textarea.value = currentVal + ', ' + txt;
                } else {
                    textarea.value = txt;
                }
            }
        });
    });

    // 2. Veg Only filter toggle button on landing page
    if (elements.btnFilterVegOnly) {
        elements.btnFilterVegOnly.addEventListener('click', () => {
            filterVegOnly = !filterVegOnly;
            if (filterVegOnly) {
                elements.btnFilterVegOnly.style.background = 'var(--primary)';
                elements.btnFilterVegOnly.style.borderColor = 'var(--primary)';
                elements.btnFilterVegOnly.style.color = 'white';
            } else {
                elements.btnFilterVegOnly.style.background = 'transparent';
                elements.btnFilterVegOnly.style.borderColor = '';
                elements.btnFilterVegOnly.style.color = '';
            }
            renderStores();
        });
    }

    // 3. Veg Only checkbox filter in search comparison results
    if (elements.searchFilterVegOnly) {
        elements.searchFilterVegOnly.addEventListener('change', async () => {
            const q = elements.globalSearchInput.value || "Milk";
            const matches = await db.searchProductsGlobally(q);
            renderSearchResults(matches);
        });
    }

    // 4. Cancellation feedback reasons select & modal forms
    const formCancelOrder = document.getElementById('form-cancel-order');
    const selectCancelReason = document.getElementById('cancel-reason-select');
    const inputCancelOther = document.getElementById('cancel-reason-other');
    const divCancelOtherGroup = document.getElementById('cancel-reason-other-group');
    const btnCloseCancelModal = document.getElementById('btn-close-cancel-modal');

    if (selectCancelReason) {
        selectCancelReason.addEventListener('change', () => {
            if (selectCancelReason.value === 'Other') {
                if (divCancelOtherGroup) divCancelOtherGroup.style.display = 'block';
                if (inputCancelOther) inputCancelOther.required = true;
            } else {
                if (divCancelOtherGroup) divCancelOtherGroup.style.display = 'none';
                if (inputCancelOther) inputCancelOther.required = false;
            }
        });
    }

    if (btnCloseCancelModal) {
        btnCloseCancelModal.addEventListener('click', () => {
            const cancelModal = document.getElementById('modal-cancel-reason');
            if (cancelModal) {
                cancelModal.style.display = 'none';
                cancelModal.classList.remove('active');
            }
        });
    }

    if (formCancelOrder) {
        formCancelOrder.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!trackingOrder) return;
            
            let reason = selectCancelReason.value;
            if (reason === 'Other' && inputCancelOther) {
                reason = inputCancelOther.value.trim() || 'Other';
            }
            
            if (cancelGraceTimer) clearInterval(cancelGraceTimer);
            
            const ok = await db.updateOrderStatus(trackingOrder.id, 'Cancelled', reason);
            if (ok) {
                showToast("Your order has been cancelled successfully.", "info");
            } else {
                showToast("Failed to cancel order.", "error");
            }
            
            const cancelModal = document.getElementById('modal-cancel-reason');
            if (cancelModal) {
                cancelModal.style.display = 'none';
                cancelModal.classList.remove('active');
            }
            
            trackingOrder = null;
            await switchView('landing');
            await updateActiveOrderButtonVisibility();
        });
    }

    // 5. Post-delivery tipping rider modal wiring
    let activeTipOrderId = null;
    let selectedPostTipAmount = 0;

    function openTipRiderModal(orderId) {
        activeTipOrderId = orderId;
        selectedPostTipAmount = 0;
        
        const modal = document.getElementById('modal-tip-rider');
        const customInput = document.getElementById('post-tip-custom');
        if (customInput) customInput.value = '';
        
        document.querySelectorAll('.post-tip-btn').forEach(btn => btn.classList.remove('active'));
        
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }

    document.querySelectorAll('.post-tip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.post-tip-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPostTipAmount = parseInt(btn.getAttribute('data-tip')) || 0;
            const customInput = document.getElementById('post-tip-custom');
            if (customInput) customInput.value = '';
        });
    });

    const customTipInput = document.getElementById('post-tip-custom');
    if (customTipInput) {
        customTipInput.addEventListener('input', () => {
            document.querySelectorAll('.post-tip-btn').forEach(b => b.classList.remove('active'));
            selectedPostTipAmount = parseInt(customTipInput.value) || 0;
        });
    }

    const btnCloseTipModal = document.getElementById('btn-close-tip-modal');
    if (btnCloseTipModal) {
        btnCloseTipModal.addEventListener('click', () => {
            const modal = document.getElementById('modal-tip-rider');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }

    const btnSubmitTip = document.getElementById('btn-submit-tip');
    if (btnSubmitTip) {
        btnSubmitTip.addEventListener('click', async () => {
            if (!activeTipOrderId || selectedPostTipAmount <= 0) {
                showToast("Please select or enter a valid tip amount.", "error");
                return;
            }
            
            try {
                const res = await fetch(`http://localhost:5000/api/orders/${activeTipOrderId}/tip`, {
                    method: 'POST',
                    headers: db.getHeaders(),
                    body: JSON.stringify({ tip: selectedPostTipAmount })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(`Thank you! ₹${selectedPostTipAmount} tip credited to rider wallet.`, "success");
                    const modal = document.getElementById('modal-tip-rider');
                    if (modal) {
                        modal.style.display = 'none';
                        modal.classList.remove('active');
                    }
                    await renderOrderHistory();
                } else {
                    showToast(data.error || "Failed to submit tip.", "error");
                }
            } catch (err) {
                console.error("Error submitting tip:", err);
                showToast("Network connection error.", "error");
            }
        });
    }

    // 6. Tax Invoice printing and breakdown modal wiring
    function openInvoiceModal(order) {
        const modal = document.getElementById('modal-invoice');
        if (!modal) return;
        
        document.getElementById('invoice-store-details').innerText = order.storeName;
        document.getElementById('invoice-id-date').innerHTML = `Order: #${order.id}<br>Date: ${new Date(order.timestamp).toLocaleDateString()}`;
        
        let custDetails = `Name: ${order.customer.name}<br>Phone: ${order.customer.phone || 'N/A'}<br>Address: ${order.customer.address}`;
        if (order.customer.payment) {
            custDetails += `<br>Payment: ${order.customer.payment.toUpperCase()}`;
        }
        document.getElementById('invoice-customer-details').innerHTML = custDetails;
        
        const itemsBody = document.getElementById('invoice-items-body');
        itemsBody.innerHTML = '';
        
        order.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 8px 0; text-align: left;">${item.name}</td>
                <td style="padding: 8px 0; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px 0; text-align: right;">₹${item.price.toFixed(2)}</td>
                <td style="padding: 8px 0; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
            `;
            itemsBody.appendChild(tr);
        });
        
        const subtotal = order.subtotal;
        const cgst = subtotal * 0.025;
        const sgst = subtotal * 0.025;
        
        document.getElementById('invoice-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
        document.getElementById('invoice-cgst').innerText = `₹${cgst.toFixed(2)}`;
        document.getElementById('invoice-sgst').innerText = `₹${sgst.toFixed(2)}`;
        document.getElementById('invoice-del-fee').innerText = `₹${order.deliveryFee.toFixed(2)}`;
        
        const discRow = document.getElementById('invoice-discount-row');
        if (order.discount && order.discount > 0) {
            discRow.style.display = 'flex';
            document.getElementById('invoice-discount').innerText = `-₹${order.discount.toFixed(2)}`;
        } else {
            discRow.style.display = 'none';
        }
        
        const tipRow = document.getElementById('invoice-tip-row');
        if (order.riderTip && order.riderTip > 0) {
            tipRow.style.display = 'flex';
            document.getElementById('invoice-tip').innerText = `₹${order.riderTip.toFixed(2)}`;
        } else {
            tipRow.style.display = 'none';
        }
        
        const grandTotal = subtotal + order.deliveryFee + (order.riderTip || 0) - (order.discount || 0);
        document.getElementById('invoice-grand-total').innerText = `₹${grandTotal.toFixed(2)}`;
        
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    const btnPrintInvoice = document.getElementById('btn-print-invoice');
    if (btnPrintInvoice) {
        btnPrintInvoice.addEventListener('click', () => {
            const printContent = document.getElementById('invoice-print-area').innerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Tax Invoice</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; background: white; }
                        h2 { color: #10b981; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
                        th { background: #f9f9f9; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }

    const btnCloseInvoiceModal = document.getElementById('btn-close-invoice-modal');
    if (btnCloseInvoiceModal) {
        btnCloseInvoiceModal.addEventListener('click', () => {
            const modal = document.getElementById('modal-invoice');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }
    const btnCloseInvoice = document.getElementById('btn-close-invoice');
    if (btnCloseInvoice) {
        btnCloseInvoice.addEventListener('click', () => {
            const modal = document.getElementById('modal-invoice');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    }

    // 7. Close broadcast alert banner
    const btnCloseBroadcast = document.getElementById('btn-close-broadcast');
    if (btnCloseBroadcast) {
        btnCloseBroadcast.addEventListener('click', () => {
            const alertBar = document.getElementById('broadcast-alert-bar');
            if (alertBar) alertBar.style.display = 'none';
        });
    }

    // --- Bootstrapping ---
    async function bootstrap() {
        applyTheme(localStorage.getItem('luxegrocer_theme') || 'dark');
        db.initDatabase();
        loadCartFromStorage();
        await initAuth();
        await initPromoBanners();
        await updateLocationUI();
        if (!trackingOrder) {
            await switchView('landing');
        }
    }
    bootstrap();
});
