// merchant.js - LuxeGrocer Merchant Partner Portal Controller

// Intercept console.error to log to server
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'merchant-app console.error', error: args.join(' ') })
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
        body: JSON.stringify({ source: 'merchant-app window.onerror', error: errData })
    }).catch(() => {});
});

// Event Logging Hooks for Debugging
document.addEventListener('click', (e) => {
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source: 'merchant-app CLICK',
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
            source: 'merchant-app SUBMIT',
            id: e.target.id,
            emailVal: e.target.querySelector('input[type="email"]') ? e.target.querySelector('input[type="email"]').value : 'not_found'
        })
    }).catch(() => {});
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let ownedStoreId = null;
    let activeOwnerPane = 'analytics'; // Default pane
    let activeOrdersTab = 'active'; // 'active' or 'past'
    const openChatOrderIds = new Set();
    const activeChatInputValues = {};

    // Custom uploads temporary Base64 states
    let regStoreCustomBannerBase64 = null;
    let settingsStoreCustomBannerBase64 = null;
    let prodCustomImageBase64 = null;

    // --- DOM Elements Cache ---
    const elements = {
        ownerNoStoreAlert: document.getElementById('owner-no-store-alert'),
        btnOpenRegisterModal: document.getElementById('btn-open-register-modal'),
        ownerDashboardWorkspace: document.getElementById('owner-dashboard-workspace'),
        ownerSidebarStoreEmoji: document.getElementById('owner-sidebar-store-emoji'),
        ownerSidebarStoreName: document.getElementById('owner-sidebar-store-name'),
        ownerSidebarStoreCategory: document.getElementById('owner-sidebar-store-category'),
        
        btnOwnerNavAnalytics: document.getElementById('btn-owner-nav-analytics'),
        btnOwnerNavOrders: document.getElementById('btn-owner-nav-orders'),
        btnOwnerNavInventory: document.getElementById('btn-owner-nav-inventory'),
        btnOwnerNavReviews: document.getElementById('btn-owner-nav-reviews'),
        btnOwnerNavBilling: document.getElementById('btn-owner-nav-billing'),
        btnOwnerNavSettings: document.getElementById('btn-owner-nav-settings'),
        
        ownerPaneAnalytics: document.getElementById('owner-pane-analytics'),
        ownerPaneOrders: document.getElementById('owner-pane-orders'),
        ownerPaneInventory: document.getElementById('owner-pane-inventory'),
        ownerPaneReviews: document.getElementById('owner-pane-reviews'),
        ownerPaneBilling: document.getElementById('owner-pane-billing'),
        ownerPaneSettings: document.getElementById('owner-pane-settings'),
        btnOwnerNavCoupons: document.getElementById('btn-owner-nav-coupons'),
        ownerPaneCoupons: document.getElementById('owner-pane-coupons'),
        formCouponCreate: document.getElementById('form-coupon-create'),
        couponCreateCode: document.getElementById('coupon-create-code'),
        couponCreateType: document.getElementById('coupon-create-type'),
        couponCreateValue: document.getElementById('coupon-create-value'),
        couponCreateMin: document.getElementById('coupon-create-min'),
        couponCreateDesc: document.getElementById('coupon-create-desc'),
        ownerCouponsTableBody: document.getElementById('owner-coupons-table-body'),
        billingStatusCallout: document.getElementById('billing-status-callout'),
        billingStatusIcon: document.getElementById('billing-status-icon'),
        billingStatusTitle: document.getElementById('billing-status-title'),
        billingStatusDesc: document.getElementById('billing-status-desc'),
        billingPlanName: document.getElementById('billing-plan-name'),
        billingDetailStatus: document.getElementById('billing-detail-status'),
        billingDetailExpiry: document.getElementById('billing-detail-expiry'),
        formBillingRenew: document.getElementById('form-billing-renew'),
        billingRenewPlanSelect: document.getElementById('billing-renew-plan-select'),
        ownerReviewsAvgRating: document.getElementById('owner-reviews-avg-rating'),
        ownerReviewsStarsVisual: document.getElementById('owner-reviews-stars-visual'),
        ownerReviewsCount: document.getElementById('owner-reviews-count'),
        ownerReviewsList: document.getElementById('owner-reviews-list'),
        
        btnTestSoundbox: document.getElementById('btn-test-soundbox'),
        ownerStatRevenue: document.getElementById('owner-stat-revenue'),
        ownerStatOrders: document.getElementById('owner-stat-orders'),
        ownerStatAverage: document.getElementById('owner-stat-average'),
        ownerStatRadius: document.getElementById('owner-stat-radius'),
        
        analyticsHourlySalesChart: document.getElementById('analytics-hourly-sales-chart'),
        analyticsWeeklyOrdersChart: document.getElementById('analytics-weekly-orders-chart'),
        btnThemeToggle: document.getElementById('btn-theme-toggle'),
        analyticsCategoriesChart: document.getElementById('analytics-categories-chart'),
        analyticsProductsList: document.getElementById('analytics-products-list'),
        ownerOrdersQueueList: document.getElementById('owner-orders-queue-list'),
        ownerInventoryTableBody: document.getElementById('owner-inventory-table-body'),
        
        btnOpenAddProductModal: document.getElementById('btn-open-add-product-modal'),
        ownerSettingsForm: document.getElementById('owner-settings-form'),
        settingsStoreName: document.getElementById('settings-store-name'),
        settingsStoreRadius: document.getElementById('settings-store-radius'),
        settingsStorePhone: document.getElementById('settings-store-phone'),
        settingsStoreAddress: document.getElementById('settings-store-address'),
        settingsStoreBannerFile: document.getElementById('settings-store-banner-file'),
        settingsStoreBannerPreview: document.getElementById('settings-store-banner-preview'),
        settingsStoreMov: document.getElementById('settings-store-mov'),
        settingsStoreUpiVpa: document.getElementById('settings-store-upi-vpa'),
        settingsStoreUpiName: document.getElementById('settings-store-upi-name'),

        // Modals
        modalProductElement: document.getElementById('modal-product-element'),
        btnCloseProductModal: document.getElementById('btn-close-product-modal'),
        ownerProductForm: document.getElementById('owner-product-form'),
        modalProductTitle: document.getElementById('modal-product-title'),
        modalProductId: document.getElementById('modal-product-id'),
        prodName: document.getElementById('prod-name'),
        prodCategory: document.getElementById('prod-category'),
        prodPrice: document.getElementById('prod-price'),
        prodUnit: document.getElementById('prod-unit'),
        prodStock: document.getElementById('prod-stock'),
        prodDesc: document.getElementById('prod-desc'),
        prodImageFile: document.getElementById('prod-image-file'),
        prodImagePreview: document.getElementById('prod-image-preview'),
        prodHasVariants: document.getElementById('prod-has-variants'),
        prodVariantsSection: document.getElementById('prod-variants-section'),
        btnAddVariantRow: document.getElementById('btn-add-variant-row'),
        variantsRowsContainer: document.getElementById('variants-rows-container'),

        modalRegisterStoreElement: document.getElementById('modal-register-store-element'),
        btnCloseRegisterModal: document.getElementById('btn-close-register-modal'),
        registerStoreForm: document.getElementById('register-store-form'),
        regStoreName: document.getElementById('reg-store-name'),
        regStoreCat: document.getElementById('reg-store-cat'),
        regStoreRadius: document.getElementById('reg-store-radius'),
        regStorePhone: document.getElementById('reg-store-phone'),
        regStoreBanner: document.getElementById('reg-store-banner'),
        regStoreBannerFile: document.getElementById('reg-store-banner-file'),
        regStoreBannerPreview: document.getElementById('reg-store-banner-preview'),
        regStoreAddress: document.getElementById('reg-store-address'),
        regStoreMov: document.getElementById('reg-store-mov'),

        // Toast
        toastNotification: document.getElementById('toast-notification'),
        toastIcon: document.getElementById('toast-icon'),
        toastMessage: document.getElementById('toast-message'),

        // Merchant Auth
        merchantAuthWorkspace: document.getElementById('merchant-auth-workspace'),
        formMerchantLogin: document.getElementById('form-merchant-login'),
        formMerchantRegister: document.getElementById('form-merchant-register'),
        merchantLoginEmail: document.getElementById('merchant-login-email'),
        merchantLoginPassword: document.getElementById('merchant-login-password'),
        merchantRegName: document.getElementById('merchant-reg-name'),
        merchantRegEmail: document.getElementById('merchant-reg-email'),
        merchantRegPassword: document.getElementById('merchant-reg-password'),
        merchantRegStoreName: document.getElementById('merchant-reg-store-name'),
        merchantRegPhone: document.getElementById('merchant-reg-phone'),
        merchantRegAddress: document.getElementById('merchant-reg-address'),
        linkMerchantToRegister: document.getElementById('link-merchant-to-register'),
        linkMerchantToLogin: document.getElementById('link-merchant-to-login'),
        btnMerchantLogout: document.getElementById('btn-merchant-logout'),
        btnMerchantActiveOrdersTab: document.getElementById('btn-merchant-active-orders-tab'),
        btnMerchantPastOrdersTab: document.getElementById('btn-merchant-past-orders-tab'),
        btnToggleStoreStatus: document.getElementById('btn-toggle-store-status'),

        // Password Recovery
        linkMerchantForgotPassword: document.getElementById('link-merchant-forgot-password'),
        modalMerchantForgotPassword: document.getElementById('modal-merchant-forgot-password'),
        btnCloseMerchantForgotModal: document.getElementById('btn-close-merchant-forgot-modal'),
        formMerchantForgotRequest: document.getElementById('form-merchant-forgot-request'),
        formMerchantForgotReset: document.getElementById('form-merchant-forgot-reset'),
        merchantForgotEmail: document.getElementById('merchant-forgot-email'),
        merchantForgotOtp: document.getElementById('merchant-forgot-otp'),
        merchantForgotNewPassword: document.getElementById('merchant-forgot-new-password'),

        // Profile Password Change
        ownerChangePasswordForm: document.getElementById('owner-change-password-form'),
        ownerChangePwdOld: document.getElementById('owner-change-pwd-old'),
        ownerChangePwdNew: document.getElementById('owner-change-pwd-new'),
        ownerChangePwdConfirm: document.getElementById('owner-change-pwd-confirm'),

        // Unified Profile Modal Settings
        btnMerchantProfile: document.getElementById('btn-merchant-profile'),
        modalMerchantProfile: document.getElementById('modal-merchant-profile'),
        btnCloseMerchantProfileModal: document.getElementById('btn-close-merchant-profile-modal'),
        merchantProfileAvatar: document.getElementById('merchant-profile-avatar'),
        merchantProfileName: document.getElementById('merchant-profile-name'),
        merchantProfileEmail: document.getElementById('merchant-profile-email'),
        merchantProfileChangePasswordForm: document.getElementById('merchant-profile-change-password-form'),
        merchantProfilePwdOld: document.getElementById('merchant-profile-pwd-old'),
        merchantProfilePwdNew: document.getElementById('merchant-profile-pwd-new'),
        merchantProfilePwdConfirm: document.getElementById('merchant-profile-pwd-confirm'),
        
        // Delivery Staff & Assign Rider Modals
        modalAssignRider: document.getElementById('modal-assign-rider'),
        assignRiderSelect: document.getElementById('assign-rider-select'),
        btnConfirmAssignRider: document.getElementById('btn-confirm-assign-rider'),
        btnCloseAssignModal: document.getElementById('btn-close-assign-modal'),
        deliveryStaffListContainer: document.getElementById('delivery-staff-list-container'),
        formAddDeliveryStaff: document.getElementById('form-add-delivery-staff'),

        // Substitution Modal Elements
        modalSuggestSubstitution: document.getElementById('modal-suggest-substitution'),
        substituteSelectProduct: document.getElementById('substitute-select-product'),
        btnConfirmSubstitute: document.getElementById('btn-confirm-substitute'),
        btnCloseSubstituteModal: document.getElementById('btn-close-substitute-modal'),
        substituteOrderId: document.getElementById('substitute-order-id'),
        substituteOriginalItemId: document.getElementById('substitute-original-item-id'),
        substituteOriginalItemName: document.getElementById('substitute-original-item-name'),
        formSuggestSubstitution: document.getElementById('form-suggest-substitution')
    };

    // --- Toast Notifications ---
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

    // --- Voice Soundbox Helper ---
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

    // --- Emoji Fallback Selector ---
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

    // --- Local HTML5 Canvas Image Compressor ---
    function compressImageFile(file, maxWidth, maxHeight, quality, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                callback(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Merchant Authentication Handlers ---
    async function handleMerchantLogin(e) {
        e.preventDefault();
        const email = elements.merchantLoginEmail.value.trim();
        const password = elements.merchantLoginPassword.value;
        
        const res = await db.login(email, password);
        if (res.success) {
            if (res.user.role !== 'merchant') {
                db.logout();
                showToast("Only merchant accounts can log in here.", "error");
                return;
            }
            showToast(`Welcome back, ${res.user.name}!`, "success");
            elements.formMerchantLogin.reset();
            await loadOwnerPortal();
        } else {
            showToast(res.error, "error");
        }
    }

    async function handleMerchantRegister(e) {
        e.preventDefault();
        const registerData = {
            email: elements.merchantRegEmail.value.trim(),
            password: elements.merchantRegPassword.value,
            role: 'merchant',
            name: elements.merchantRegName.value.trim(),
            storeName: elements.merchantRegStoreName.value.trim(),
            phone: elements.merchantRegPhone.value.trim(),
            address: elements.merchantRegAddress.value.trim()
        };
        
        const res = await db.register(registerData);
        if (res.success) {
            showToast(`Merchant profile and store initialized successfully!`, "success");
            elements.formMerchantRegister.reset();
            await loadOwnerPortal();
        } else {
            showToast(res.error, "error");
        }
    }

    async function handleOwnerChangePassword(e) {
        e.preventDefault();
        const oldPassword = elements.ownerChangePwdOld.value;
        const newPassword = elements.ownerChangePwdNew.value;
        const confirmPassword = elements.ownerChangePwdConfirm.value;

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
                elements.ownerChangePasswordForm.reset();
            } else {
                showToast(data.error || "Failed to update password", "error");
            }
        } catch (err) {
            console.error("Error changing password:", err);
            showToast("Network connection error", "error");
        }
    }

    async function handleMerchantForgotRequestSubmit(e) {
        e.preventDefault();
        const email = elements.merchantForgotEmail.value.trim();
        
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
                
                elements.formMerchantForgotRequest.style.display = 'none';
                elements.formMerchantForgotReset.style.display = 'flex';
                elements.merchantForgotOtp.value = '';
                elements.merchantForgotNewPassword.value = '';
            } else {
                showToast(data.error || "Password reset request failed", "error");
            }
        } catch (err) {
            console.error("Forgot password request error:", err);
            showToast("Network connection error", "error");
        }
    }

    async function handleMerchantForgotResetSubmit(e) {
        e.preventDefault();
        const email = elements.merchantForgotEmail.value.trim();
        const otp = elements.merchantForgotOtp.value.trim();
        const newPassword = elements.merchantForgotNewPassword.value;

        try {
            const res = await fetch(`${db.baseUrl}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Password has been reset successfully!", "success");
                
                elements.modalMerchantForgotPassword.style.display = 'none';
                elements.modalMerchantForgotPassword.classList.remove('active');
                
                // Show login form
                elements.formMerchantLogin.style.display = 'flex';
                elements.formMerchantRegister.style.display = 'none';
                document.getElementById('merchant-auth-title').innerText = "Partner Portal";
                document.getElementById('merchant-auth-subtitle').innerText = "Access your digital shelf manager & deliveries console";
            } else {
                showToast(data.error || "Reset password failed", "error");
            }
        } catch (err) {
            console.error("Reset password error:", err);
            showToast("Network connection error", "error");
        }
    }

    // --- Merchant View Controller ---
    async function loadOwnerPortal() {
        const user = await db.loadCurrentUser();
        
        if (!user || user.role !== 'merchant') {
            elements.merchantAuthWorkspace.style.display = 'block';
            elements.ownerNoStoreAlert.style.display = 'none';
            elements.ownerDashboardWorkspace.style.display = 'none';
            elements.btnMerchantLogout.style.display = 'none';
            if (elements.btnMerchantProfile) elements.btnMerchantProfile.style.display = 'none';
            return;
        }
        
        elements.merchantAuthWorkspace.style.display = 'none';
        elements.btnMerchantLogout.style.display = 'inline-flex';
        elements.btnMerchantLogout.innerText = `Sign Out (${user.name.split(' ')[0]})`;
        if (elements.btnMerchantProfile) elements.btnMerchantProfile.style.display = 'inline-flex';
        
        ownedStoreId = user.storeId || null;
        
        if (!ownedStoreId) {
            elements.ownerNoStoreAlert.style.display = 'block';
            elements.ownerDashboardWorkspace.style.display = 'none';
        } else {
            const store = await db.getStoreById(ownedStoreId);
            if (!store) {
                ownedStoreId = null;
                elements.ownerNoStoreAlert.style.display = 'block';
                elements.ownerDashboardWorkspace.style.display = 'none';
                return;
            }

            elements.ownerNoStoreAlert.style.display = 'none';
            elements.ownerDashboardWorkspace.style.display = 'grid';

            elements.ownerSidebarStoreName.innerText = store.name;
            elements.ownerSidebarStoreCategory.innerText = store.category;
            
            elements.settingsStoreName.value = store.name;
            elements.settingsStoreRadius.value = store.deliveryRadius;
            elements.settingsStorePhone.value = store.phone;
            elements.settingsStoreAddress.value = store.address;
            elements.settingsStoreMov.value = store.minOrderValue || 0;
            elements.settingsStoreUpiVpa.value = store.upiVpa || '';
            elements.settingsStoreUpiName.value = store.upiName || '';

            // Load settings banner preview
            if (store.image && store.image.trim() !== '') {
                elements.settingsStoreBannerPreview.innerHTML = `<img src="${store.image}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                elements.settingsStoreBannerPreview.innerHTML = `<span style="font-size: 1rem; color: var(--text-muted);">🖼️</span>`;
            }
            elements.settingsStoreBannerFile.value = '';
            settingsStoreCustomBannerBase64 = store.image; // Keep existing

            // Update Store Status toggle UI button
            const status = store.status || 'Open';
            if (status === 'Closed') {
                elements.btnToggleStoreStatus.innerText = "🔴 Closed / Offline";
                elements.btnToggleStoreStatus.style.background = "#ef4444";
                elements.btnToggleStoreStatus.style.borderColor = "#ef4444";
            } else {
                elements.btnToggleStoreStatus.innerText = "🟢 Open for Delivery";
                elements.btnToggleStoreStatus.style.background = "#10b981";
                elements.btnToggleStoreStatus.style.borderColor = "#10b981";
            }

            await showOwnerPanel(activeOwnerPane);
        }
    }

    async function showOwnerPanel(paneName) {
        elements.btnOwnerNavAnalytics.classList.remove('active');
        elements.btnOwnerNavOrders.classList.remove('active');
        elements.btnOwnerNavInventory.classList.remove('active');
        elements.btnOwnerNavReviews.classList.remove('active');
        elements.btnOwnerNavBilling.classList.remove('active');
        elements.btnOwnerNavSettings.classList.remove('active');
        if (elements.btnOwnerNavCoupons) elements.btnOwnerNavCoupons.classList.remove('active');

        elements.ownerPaneAnalytics.style.display = 'none';
        elements.ownerPaneOrders.style.display = 'none';
        elements.ownerPaneInventory.style.display = 'none';
        elements.ownerPaneReviews.style.display = 'none';
        elements.ownerPaneBilling.style.display = 'none';
        elements.ownerPaneSettings.style.display = 'none';
        if (elements.ownerPaneCoupons) elements.ownerPaneCoupons.style.display = 'none';

        if (paneName === 'analytics') {
            elements.btnOwnerNavAnalytics.classList.add('active');
            elements.ownerPaneAnalytics.style.display = 'block';
            await renderMerchantAnalytics();
        } else if (paneName === 'orders') {
            elements.btnOwnerNavOrders.classList.add('active');
            elements.ownerPaneOrders.style.display = 'block';
            await renderOwnerOrders();
        } else if (paneName === 'inventory') {
            elements.btnOwnerNavInventory.classList.add('active');
            elements.ownerPaneInventory.style.display = 'block';
            await renderOwnerInventory();
        } else if (paneName === 'reviews') {
            elements.btnOwnerNavReviews.classList.add('active');
            elements.ownerPaneReviews.style.display = 'block';
            await renderMerchantReviews();
        } else if (paneName === 'billing') {
            elements.btnOwnerNavBilling.classList.add('active');
            elements.ownerPaneBilling.style.display = 'block';
            await renderMerchantBilling();
        } else if (paneName === 'coupons') {
            if (elements.btnOwnerNavCoupons) elements.btnOwnerNavCoupons.classList.add('active');
            if (elements.ownerPaneCoupons) elements.ownerPaneCoupons.style.display = 'block';
            await renderOwnerCoupons();
        } else {
            elements.btnOwnerNavSettings.classList.add('active');
            elements.ownerPaneSettings.style.display = 'block';
            await renderDeliveryStaffSettings();
        }
        activeOwnerPane = paneName;
    }

    function drawLineChart(container, labels, dataPoints, colorPrimary = '#10b981') {
        container.innerHTML = '';
        const width = 500;
        const height = 200;
        const padding = 35;
        
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const maxVal = Math.max(...dataPoints, 100) * 1.1; // 10% headroom
        
        // Build points
        const points = dataPoints.map((val, idx) => {
            const x = padding + (idx / (dataPoints.length - 1)) * chartWidth;
            const y = height - padding - (val / maxVal) * chartHeight;
            return { x, y, val };
        });
        
        // Generate SVG path
        let pathD = '';
        let areaD = '';
        
        if (points.length > 0) {
            pathD = `M ${points[0].x} ${points[0].y}`;
            areaD = `M ${points[0].x} ${height - padding}`;
            for (let i = 0; i < points.length; i++) {
                pathD += ` L ${points[i].x} ${points[i].y}`;
                areaD += ` L ${points[i].x} ${points[i].y}`;
            }
            areaD += ` L ${points[points.length - 1].x} ${height - padding} Z`;
        }
        
        // Grid lines
        let gridLines = '';
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding + (i / gridSteps) * chartHeight;
            const val = maxVal - (i / gridSteps) * maxVal;
            gridLines += `
                <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                <text x="${padding - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">₹${Math.round(val)}</text>
            `;
        }
        
        // X-Axis labels & point markers
        let xLabels = '';
        points.forEach((pt, idx) => {
            xLabels += `
                <text x="${pt.x}" y="${height - padding + 18}" fill="var(--text-muted)" font-size="10" text-anchor="middle">${labels[idx]}</text>
                <g class="chart-marker-group">
                    <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="${colorPrimary}" stroke="#1e293b" stroke-width="1.5" />
                    <title>${labels[idx]}: ₹${Math.round(pt.val)}</title>
                </g>
            `;
        });
        
        const svgHtml = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
                <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${colorPrimary}" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="${colorPrimary}" stop-opacity="0"/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                ${gridLines}
                <path d="${areaD}" fill="url(#lineGrad)" />
                <path d="${pathD}" fill="none" stroke="${colorPrimary}" stroke-width="3" filter="url(#glow)" stroke-linecap="round" stroke-linejoin="round" />
                ${xLabels}
            </svg>
        `;
        container.innerHTML = svgHtml;
    }

    function drawBarChart(container, labels, dataPoints, colorPrimary = '#3b82f6') {
        container.innerHTML = '';
        const width = 500;
        const height = 200;
        const padding = 35;
        
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const maxVal = Math.max(...dataPoints, 5) * 1.1; // 10% headroom
        
        // Grid lines
        let gridLines = '';
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding + (i / gridSteps) * chartHeight;
            const val = Math.round(maxVal - (i / gridSteps) * maxVal);
            gridLines += `
                <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                <text x="${padding - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">${val}</text>
            `;
        }
        
        const barCount = dataPoints.length;
        const barWidth = (chartWidth / barCount) * 0.55;
        const spacing = (chartWidth / barCount) * 0.45;
        
        let bars = '';
        dataPoints.forEach((val, idx) => {
            const x = padding + idx * (barWidth + spacing) + spacing / 2;
            const barHeight = (val / maxVal) * chartHeight;
            const y = height - padding - barHeight;
            
            bars += `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#barGrad)" rx="4" ry="4" class="chart-bar-svg">
                    <title>${labels[idx]}: ${val} orders</title>
                </rect>
                <text x="${x + barWidth / 2}" y="${y - 6}" fill="var(--text-main)" font-size="9" font-weight="bold" text-anchor="middle">${val}</text>
                <text x="${x + barWidth / 2}" y="${height - padding + 18}" fill="var(--text-muted)" font-size="10" text-anchor="middle">${labels[idx]}</text>
            `;
        });
        
        const svgHtml = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
                <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${colorPrimary}"/>
                        <stop offset="100%" stop-color="#1d4ed8"/>
                    </linearGradient>
                </defs>
                ${gridLines}
                ${bars}
            </svg>
        `;
        container.innerHTML = svgHtml;
    }

    function drawDonutChart(container, categoryData) {
        container.innerHTML = '';
        
        const data = Object.entries(categoryData).filter(([cat, val]) => val > 0);
        if (data.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No category data available</div>';
            return;
        }
        
        const total = data.reduce((sum, [cat, val]) => sum + val, 0);
        
        const colors = {
            dairy: '#10b981',    // Emerald
            fruits: '#14b8a6',   // Teal
            veggies: '#06b6d4',  // Cyan
            bakery: '#f59e0b',   // Amber
            beverages: '#3b82f6',// Blue
            pantry: '#8b5cf6',   // Purple
            other: '#64748b'     // Slate
        };
        
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        
        let currentOffset = 0;
        let circlesHtml = '';
        let legendHtml = '<div style="display: flex; flex-direction: column; gap: 8px; margin-left: 24px; font-size: 0.85rem; text-align: left;">';
        
        data.forEach(([cat, val]) => {
            const percent = (val / total) * 100;
            const dashArray = `${(percent / 100) * circumference} ${circumference}`;
            const color = colors[cat] || colors.other;
            
            circlesHtml += `
                <circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="${color}" stroke-width="16"
                        stroke-dasharray="${dashArray}" stroke-dashoffset="${currentOffset}"
                        transform="rotate(-90 100 100)" stroke-linecap="round" style="transition: stroke-dashoffset 0.5s ease;" />
            `;
            
            currentOffset -= (percent / 100) * circumference;
            
            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
            legendHtml += `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                    <span style="color: var(--text-main); font-weight: 500;">${label}:</span>
                    <span style="color: var(--text-muted);">${val} (${Math.round(percent)}%)</span>
                </div>
            `;
        });
        
        legendHtml += '</div>';
        
        const svgHtml = `
            <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                <svg width="140" height="140" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.03)" stroke-width="18" />
                    ${circlesHtml}
                    <text x="100" y="105" fill="var(--text-main)" font-size="18" font-weight="bold" text-anchor="middle">${total}</text>
                    <text x="100" y="125" fill="var(--text-muted)" font-size="10" text-anchor="middle">Sales</text>
                </svg>
                ${legendHtml}
            </div>
        `;
        container.innerHTML = svgHtml;
    }

    async function renderMerchantAnalytics() {
        const store = await db.getStoreById(ownedStoreId);
        if (!store) return;
        
        const allOrders = await db.getOrders();
        const storeOrders = allOrders.filter(o => o.storeId === ownedStoreId && o.status === 'Delivered');
        
        const totalRevenue = storeOrders.reduce((sum, o) => sum + o.subtotal, 0);
        const ordersCount = storeOrders.length;
        const avgTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;
        
        elements.ownerStatRevenue.innerText = `₹${totalRevenue.toFixed(2)}`;
        elements.ownerStatOrders.innerText = ordersCount;
        elements.ownerStatAverage.innerText = `₹${avgTicket.toFixed(2)}`;
        elements.ownerStatRadius.innerText = `${store.deliveryRadius.toFixed(1)} km`;
        
        // 1. Daily Revenue dynamics
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const revenueByDay = { 'Sun': 1800, 'Mon': 450, 'Tue': 1200, 'Wed': 850, 'Thu': 1500, 'Fri': 2200, 'Sat': 3100 };
        storeOrders.forEach(o => {
            const date = new Date(o.timestamp);
            const dayName = daysOfWeek[date.getDay()];
            if (revenueByDay[dayName] !== undefined) {
                revenueByDay[dayName] += o.subtotal;
            }
        });
        const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyRevenueData = orderedDays.map(d => revenueByDay[d]);
        drawLineChart(elements.analyticsHourlySalesChart, orderedDays, dailyRevenueData, '#10b981');

        // 2. Weekly Orders volume
        const ordersByDay = { 'Sun': 8, 'Mon': 3, 'Tue': 6, 'Wed': 5, 'Thu': 8, 'Fri': 11, 'Sat': 15 };
        storeOrders.forEach(o => {
            const date = new Date(o.timestamp);
            const dayName = daysOfWeek[date.getDay()];
            if (ordersByDay[dayName] !== undefined) {
                ordersByDay[dayName] += 1;
            }
        });
        const weeklyOrdersData = orderedDays.map(d => ordersByDay[d]);
        drawBarChart(elements.analyticsWeeklyOrdersChart, orderedDays, weeklyOrdersData, '#3b82f6');

        // 3. Category Sales aggregates
        const categorySales = {
            dairy: 0,
            fruits: 0,
            veggies: 0,
            bakery: 0,
            beverages: 0,
            pantry: 0
        };
        storeOrders.forEach(o => {
            o.items.forEach(item => {
                const prod = store.products.find(p => p.id === item.productId);
                if (prod && prod.category) {
                    categorySales[prod.category] = (categorySales[prod.category] || 0) + item.quantity;
                } else {
                    const lowerName = item.name.toLowerCase();
                    let inferredCategory = 'other';
                    if (lowerName.includes('milk') || lowerName.includes('butter') || lowerName.includes('paneer') || lowerName.includes('cheese') || lowerName.includes('yogurt')) {
                        inferredCategory = 'dairy';
                    } else if (lowerName.includes('apple') || lowerName.includes('mango') || lowerName.includes('banana')) {
                        inferredCategory = 'fruits';
                    } else if (lowerName.includes('cucumber') || lowerName.includes('tomato') || lowerName.includes('spinach')) {
                        inferredCategory = 'veggies';
                    } else if (lowerName.includes('bread') || lowerName.includes('croissant') || lowerName.includes('sourdough')) {
                        inferredCategory = 'bakery';
                    } else if (lowerName.includes('juice') || lowerName.includes('beverage')) {
                        inferredCategory = 'beverages';
                    }
                    categorySales[inferredCategory] = (categorySales[inferredCategory] || 0) + item.quantity;
                }
            });
        });
        const totalCategorySales = Object.values(categorySales).reduce((a, b) => a + b, 0);
        if (totalCategorySales === 0) {
            categorySales.dairy = 10;
            categorySales.fruits = 5;
            categorySales.veggies = 8;
            categorySales.bakery = 4;
        }
        drawDonutChart(elements.analyticsCategoriesChart, categorySales);

        // 4. Top products list
        const productSales = {};
        storeOrders.forEach(o => {
            o.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });
        
        if (Object.keys(productSales).length === 0) {
            store.products.slice(0, 3).forEach(p => {
                productSales[p.name] = 4;
            });
        }
        
        const sortedSales = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
            
        const maxUnits = sortedSales.length > 0 ? sortedSales[0][1] : 10;
        
        elements.analyticsProductsList.innerHTML = '';
        sortedSales.forEach(([name, qty]) => {
            const percent = (qty / maxUnits) * 100;
            const row = document.createElement('div');
            row.className = 'metric-bar-wrapper';
            row.innerHTML = `
                <div class="metric-bar-row">
                    <span>${name}</span>
                    <strong>${qty} sold</strong>
                </div>
                <div class="metric-bar-outer">
                    <div class="metric-bar-inner" style="width: ${percent}%"></div>
                </div>
            `;
            elements.analyticsProductsList.appendChild(row);
        });
    }

    async function renderOwnerOrders() {
        elements.ownerOrdersQueueList.innerHTML = '';
        const allOrders = await db.getOrders();
        let storeOrders = allOrders.filter(o => o.storeId === ownedStoreId);

        // Sort descending
        storeOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Filter based on active vs past tab
        if (activeOrdersTab === 'active') {
            storeOrders = storeOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
        } else {
            storeOrders = storeOrders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');
        }

        if (storeOrders.length === 0) {
            elements.ownerOrdersQueueList.innerHTML = `
                <div class="glass-panel" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-bell-slash" style="font-size: 3rem; margin-bottom: 16px;"></i>
                    <h3>No delivery orders yet</h3>
                    <p style="margin-top: 8px;">Pending client requests will populate here.</p>
                </div>
            `;
            return;
        }

        const seenIds = new Set();
        storeOrders.forEach(order => {
            if (seenIds.has(order.id)) return;
            seenIds.add(order.id);

            const card = document.createElement('div');
            card.className = 'glass-card owner-order-card';

            const formattedTime = new Date(order.timestamp).toLocaleString();
            
            const itemsSummary = order.items.map(item => {
                const canSuggestAlternative = (order.status === 'Pending' || order.status === 'Preparing') && (!order.substitutionProposal || order.substitutionProposal.status !== 'Pending');
                const swapButtonHtml = canSuggestAlternative
                    ? `<button type="button" class="btn-premium btn-suggest-alternative-item" data-item-id="${item.id}" data-item-name="${item.name}" style="padding: 2px 8px; font-size: 0.7rem; margin-left: 8px; background: rgba(20, 184, 166, 0.1); border: 1px solid var(--primary); color: var(--primary); cursor: pointer; border-radius: 4px;"><i class="fa-solid fa-arrows-rotate"></i> Swap</button>`
                    : '';
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size: 0.9rem; margin-bottom: 6px;">
                        <span>${item.emoji || '📦'} ${item.name} (x${item.quantity}) ${swapButtonHtml}</span>
                        <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `;
            }).join('');

            const badgeClass = order.status.toLowerCase().replace(' ', '-');

            const isUpi = order.customer.payment === 'upi';
            const utrHtml = isUpi && order.customer.transactionId
                ? `<div style="margin-top: 8px; padding: 8px 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 6px; font-size: 0.8rem; color: #93c5fd; text-align: left;">
                    <i class="fa-solid fa-qrcode" style="margin-right: 5px; color: var(--secondary);"></i> <strong>UPI Settlement UTR:</strong> <span style="font-family: monospace; font-weight: bold; letter-spacing: 0.5px;">${order.customer.transactionId}</span>
                   </div>`
                : '';

            let proposalHtml = '';
            if (order.substitutionProposal) {
                const prop = order.substitutionProposal;
                const originalItem = order.items.find(i => i.id === prop.originalItemId) || { name: 'Item' };
                const badgeStyle = prop.status === 'Pending' ? 'background: rgba(245, 158, 11, 0.1); border: 1px solid var(--accent); color: var(--accent);' : 'background: rgba(16, 185, 129, 0.1); border: 1px solid var(--primary); color: var(--primary);';
                proposalHtml = `
                    <div style="margin-top: 10px; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; ${badgeStyle}">
                        <i class="fa-solid fa-arrows-rotate"></i> <strong>Swap Proposed:</strong> Replace ${originalItem.name || 'Out-of-Stock Item'} with ${prop.suggestedProduct.name} (₹${prop.suggestedProduct.price}) - <strong>${prop.status}</strong>
                    </div>
                `;
            }

            // Chat Messages rendering
            const chatMessages = order.chatMessages || [];
            const isChatOpen = openChatOrderIds.has(order.id);
            const chatBoxDisplay = isChatOpen ? 'flex' : 'none';
            const chatMessagesHtml = chatMessages.map(msg => {
                const isMe = msg.sender === 'merchant';
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

            const chatContainerHtml = `
                <div class="order-chat-container" data-order-id="${order.id}" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 12px;">
                    <button type="button" class="btn-premium btn-toggle-chat" data-order-id="${order.id}" style="width: 100%; padding: 6px 12px; font-size: 0.8rem; background: transparent; border: 1px solid var(--border-color); color: var(--text-main); margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; height: 32px;">
                        <i class="fa-solid fa-comments"></i> 
                        Chat with Customer 
                        <span class="chat-badge" style="background: var(--accent); color: var(--text-dark); padding: 1px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: bold; ${chatMessages.length > 0 ? '' : 'display: none;'}">${chatMessages.length}</span>
                    </button>
                    <div class="order-chat-drawer" style="display: ${chatBoxDisplay}; flex-direction: column; gap: 10px;">
                        <div class="order-chat-messages" style="max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; display: flex; flex-direction: column;">
                            ${chatMessagesHtml || '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px 0;">No messages yet. Send a message to start chat.</div>'}
                        </div>
                        <form class="order-chat-form" data-order-id="${order.id}" style="display: flex; gap: 8px; margin: 0;">
                            <input type="text" class="glass-input chat-input-text" data-order-id="${order.id}" placeholder="Type message..." value="${activeChatInputValues[order.id] || ''}" required style="flex-grow: 1; padding: 6px 12px; font-size: 0.8rem; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.03); color: white; border: 1px solid var(--border-color);">
                            <button type="submit" class="btn-premium" style="padding: 6px 12px; font-size: 0.8rem; height: 32px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-paper-plane"></i></button>
                        </form>
                    </div>
                </div>
            `;

            card.innerHTML = `
                <div class="order-card-header">
                    <div>
                        <strong style="font-size: 1.1rem; color: var(--primary);">Order #${order.id}</strong>
                        <span style="font-size:0.75rem; color: var(--text-muted); margin-left: 10px;">${formattedTime}</span>
                    </div>
                    <span class="status-badge ${badgeClass}">${order.status}</span>
                </div>
                
                <div style="margin-bottom: 14px;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Customer Info:</div>
                    <strong>${order.customer.name}</strong> (${order.customer.phone})<br>
                    <span style="font-size: 0.85rem; color: var(--text-muted);">${order.customer.address}</span>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 14px;">
                    ${itemsSummary}
                    ${proposalHtml}
                    <div style="border-top:1px dashed var(--border-color); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700;">
                        <span>Grand Total (incl. delivery)</span>
                        <span>₹${(order.subtotal + order.deliveryFee).toFixed(2)}</span>
                    </div>
                    ${utrHtml}
                </div>

                <div class="order-card-footer">
                    <div>
                        <span style="font-size:0.8rem; color: var(--text-muted);">Payment: <strong>${order.customer.payment.toUpperCase()}</strong></span>
                    </div>
                    <div style="display:flex; gap: 8px;" class="order-action-buttons">
                        <!-- Actions injected -->
                    </div>
                </div>
                
                ${chatContainerHtml}
            `;

            const btnContainer = card.querySelector('.order-action-buttons');
            
            if (order.status === 'Pending') {
                const acceptForm = document.createElement('form');
                acceptForm.style.display = 'flex';
                acceptForm.style.gap = '8px';
                acceptForm.style.alignItems = 'center';
                
                acceptForm.innerHTML = `
                    <select class="prep-time-select" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03); color: white; font-size: 0.8rem; height: 32px; outline: none; cursor: pointer;">
                        <option value="10 Mins">10 Mins</option>
                        <option value="15 Mins" selected>15 Mins</option>
                        <option value="20 Mins">20 Mins</option>
                        <option value="30 Mins">30 Mins</option>
                        <option value="45 Mins">45 Mins</option>
                    </select>
                    <button type="submit" class="btn-premium" style="padding: 8px 16px; font-size: 0.8rem; height: 32px;"><i class="fa-solid fa-check"></i> Accept</button>
                `;
                
                acceptForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const prepTime = acceptForm.querySelector('.prep-time-select').value;
                    const prepMinutes = parseInt(prepTime) || 15;
                    await db.updateOrderStatus(order.id, 'Preparing', `Store owner accepted and is packaging your items. Estimated preparation: ${prepTime}.`, { prepTimeMinutes: prepMinutes });
                    showToast(`Order accepted. Prep time set to ${prepTime}.`);
                    playSoundbox(`New order accepted. Estimated preparation time ${prepTime}.`);
                    await renderOwnerOrders();
                });
                btnContainer.appendChild(acceptForm);
            } else if (order.status === 'Preparing') {
                const deliverBtn = document.createElement('button');
                deliverBtn.className = 'btn-premium';
                deliverBtn.style.padding = '8px 16px';
                deliverBtn.style.fontSize = '0.8rem';
                deliverBtn.style.background = 'linear-gradient(135deg, var(--secondary) 0%, #3b82f6 100%)';
                deliverBtn.innerHTML = '<i class="fa-solid fa-truck"></i> Dispatch Rider';
                deliverBtn.addEventListener('click', async () => {
                    await openAssignRiderModal(order.id);
                });
                btnContainer.appendChild(deliverBtn);
            } else if (order.status === 'Out for Delivery') {
                const verifyForm = document.createElement('form');
                verifyForm.style.display = 'flex';
                verifyForm.style.gap = '8px';
                verifyForm.style.alignItems = 'center';
                verifyForm.innerHTML = `
                    <input type="text" class="otp-input-field" maxlength="4" required placeholder="Enter OTP" style="width: 100px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03); color: white; text-align: center; font-family: monospace; font-size: 0.85rem; letter-spacing: 1.5px;">
                    <button type="submit" class="btn-premium" style="padding: 8px 16px; font-size: 0.8rem;"><i class="fa-solid fa-key"></i> Verify OTP</button>
                `;
                
                verifyForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const enteredOtp = verifyForm.querySelector('.otp-input-field').value;
                    const res = await db.verifyDeliveryOtp(order.id, enteredOtp);
                    
                    if (res.success) {
                        showToast(res.msg, "success");
                        playSoundbox("Order delivery successfully completed and verified.");
                        await renderOwnerOrders();
                    } else {
                        showToast(res.msg, "error");
                    }
                });
                btnContainer.appendChild(verifyForm);
            }

            // Bind chat events
            const toggleChatBtn = card.querySelector('.btn-toggle-chat');
            const chatDrawer = card.querySelector('.order-chat-drawer');
            const chatMessagesContainer = card.querySelector('.order-chat-messages');
            const chatForm = card.querySelector('.order-chat-form');
            const chatInput = card.querySelector('.chat-input-text');

            // Scroll chat to bottom initially if open
            if (isChatOpen && chatMessagesContainer) {
                setTimeout(() => {
                    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                }, 50);
            }

            toggleChatBtn.addEventListener('click', () => {
                if (openChatOrderIds.has(order.id)) {
                    openChatOrderIds.delete(order.id);
                    chatDrawer.style.display = 'none';
                } else {
                    openChatOrderIds.add(order.id);
                    chatDrawer.style.display = 'flex';
                    setTimeout(() => {
                        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                        chatInput.focus();
                    }, 50);
                }
            });

            chatInput.addEventListener('input', (e) => {
                activeChatInputValues[order.id] = e.target.value;
            });

            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;
                
                try {
                    const response = await fetch(`${db.baseUrl}/orders/${order.id}/chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('luxegrocer_merchant_auth_token')}`
                        },
                        body: JSON.stringify({ text })
                    });
                    
                    if (response.ok) {
                        chatInput.value = '';
                        activeChatInputValues[order.id] = '';
                        // Render will be triggered via SSE automatically
                    } else {
                        const err = await response.json();
                        showToast(err.error || 'Failed to send message', 'error');
                    }
                } catch (err) {
                    console.error('Chat error:', err);
                    showToast('Failed to send message', 'error');
                }
            });

            // Bind swap buttons
            const swapButtons = card.querySelectorAll('.btn-suggest-alternative-item');
            swapButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.getAttribute('data-item-id');
                    const itemName = btn.getAttribute('data-item-name');
                    openSuggestSubstitutionModal(order.id, itemId, itemName);
                });
            });

            elements.ownerOrdersQueueList.appendChild(card);
        });
    }

    async function openSuggestSubstitutionModal(orderId, itemId, itemName) {
        elements.substituteOrderId.value = orderId;
        elements.substituteOriginalItemId.value = itemId;
        elements.substituteOriginalItemName.innerText = itemName;
        
        elements.substituteSelectProduct.innerHTML = '';
        
        const store = await db.getStoreById(ownedStoreId);
        if (!store || !store.products || store.products.length === 0) {
            elements.substituteSelectProduct.innerHTML = '<option value="">-- No products available in catalog --</option>';
            elements.modalSuggestSubstitution.style.display = 'flex';
            return;
        }
        
        let optionsHtml = '';
        store.products.forEach(prod => {
            if (prod.variants && prod.variants.length > 0) {
                prod.variants.forEach(v => {
                    if (v.stock > 0) {
                        const emoji = getProductEmoji(prod.name, prod.category) || '📦';
                        optionsHtml += `
                            <option value="${prod.id}::${v.id}" data-id="${prod.id}" data-name="${prod.name} (${v.name})" data-price="${v.price}" data-emoji="${emoji}" data-unit="${v.name}" data-variant-id="${v.id}" data-variant-name="${v.name}">
                                ${emoji} ${prod.name} - ${v.name} (₹${v.price} | Stock: ${v.stock})
                            </option>
                        `;
                    }
                });
            } else {
                if (prod.stock > 0) {
                    const emoji = getProductEmoji(prod.name, prod.category) || '📦';
                    optionsHtml += `
                        <option value="${prod.id}" data-id="${prod.id}" data-name="${prod.name}" data-price="${prod.price}" data-emoji="${emoji}" data-unit="${prod.unit || '1 Unit'}" data-variant-id="" data-variant-name="">
                            ${emoji} ${prod.name} (₹${prod.price} | Stock: ${prod.stock})
                        </option>
                    `;
                }
            }
        });
        
        if (!optionsHtml) {
            elements.substituteSelectProduct.innerHTML = '<option value="">-- No in-stock alternative products --</option>';
        } else {
            elements.substituteSelectProduct.innerHTML = optionsHtml;
        }
        
        elements.modalSuggestSubstitution.style.display = 'flex';
    }

    async function renderOwnerInventory() {
        elements.ownerInventoryTableBody.innerHTML = '';
        const store = await db.getStoreById(ownedStoreId);
        if (!store) return;

        if (store.products.length === 0) {
            elements.ownerInventoryTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="fa-solid fa-boxes-packing" style="font-size: 2.5rem; margin-bottom: 12px; display:block;"></i>
                        No products listed in your digital storefront menu.
                    </td>
                </tr>
            `;
            return;
        }

        store.products.forEach(prod => {
            const tr = document.createElement('tr');
            const emoji = getProductEmoji(prod.name, prod.category);
            const hasImg = prod.image && prod.image.trim() !== '';
            const visual = hasImg 
                ? `<img src="${prod.image}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px;">`
                : `<span style="font-size: 1.5rem;">${emoji}</span>`;
            
            let variantsHtml = '';
            if (prod.variants && prod.variants.length > 0) {
                variantsHtml = `
                    <div class="inventory-variants-list" style="margin-top: 6px; padding-left: 10px; border-left: 2px solid var(--primary); font-size: 0.8rem; color: var(--text-muted); text-align: left;">
                        ${prod.variants.map(v => `<div>• ${v.name}: <strong>₹${v.price.toFixed(2)}</strong> (${v.stock} items)</div>`).join('')}
                    </div>
                `;
            }

            const totalStock = prod.variants && prod.variants.length > 0 
                ? prod.variants.reduce((sum, v) => sum + v.stock, 0) 
                : prod.stock;

            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${visual}
                        <div>
                            <strong>${prod.name}</strong>
                            <br><span style="font-size: 0.75rem; color: var(--text-muted);">${prod.desc || 'No description.'}</span>
                            ${variantsHtml}
                        </div>
                    </div>
                </td>
                <td><span style="text-transform: capitalize;">${prod.category}</span></td>
                <td><strong>${prod.variants && prod.variants.length > 0 ? 'Multiple' : `₹${prod.price.toFixed(2)}`}</strong></td>
                <td>${prod.variants && prod.variants.length > 0 ? '-' : prod.unit}</td>
                <td><span class="${totalStock > 0 ? 'product-stock-tag in-stock' : 'product-stock-tag out-stock'}">${totalStock} items</span></td>
                <td>
                    <div style="display:flex; gap: 8px;">
                        <button class="btn-icon toggle-stock-btn" style="width:32px; height:32px; border-color:var(--secondary); color:var(--secondary);" title="Toggle Stock (Quick 0/20)"><i class="fa-solid fa-arrows-rotate" style="font-size:0.8rem;"></i></button>
                        <button class="btn-icon edit-prod-btn" style="width:32px; height:32px;" title="Edit Product"><i class="fa-solid fa-pencil" style="font-size:0.8rem;"></i></button>
                        <button class="btn-icon delete-prod-btn" style="width:32px; height:32px; border-color:rgba(239, 68, 68, 0.2); color:var(--danger);" title="Delete Product"><i class="fa-solid fa-trash-can" style="font-size:0.8rem;"></i></button>
                    </div>
                </td>
            `;

            tr.querySelector('.edit-prod-btn').addEventListener('click', () => openAddEditProductModal(prod));
            tr.querySelector('.delete-prod-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete ${prod.name} from inventory?`)) {
                    await db.deleteProduct(ownedStoreId, prod.id);
                    showToast("Product deleted successfully.");
                    await renderOwnerInventory();
                }
            });
            tr.querySelector('.toggle-stock-btn').addEventListener('click', async () => {
                let updatedStock;
                let updatedVariants = null;

                if (prod.variants && prod.variants.length > 0) {
                    const currentTotal = prod.variants.reduce((sum, v) => sum + v.stock, 0);
                    updatedStock = currentTotal > 0 ? 0 : 20 * prod.variants.length;
                    updatedVariants = prod.variants.map(v => ({
                        ...v,
                        stock: currentTotal > 0 ? 0 : 20
                    }));
                } else {
                    updatedStock = prod.stock > 0 ? 0 : 20;
                }

                const payload = {
                    ...prod,
                    stock: updatedStock
                };
                if (updatedVariants) {
                    payload.variants = updatedVariants;
                }

                await db.updateProduct(ownedStoreId, prod.id, payload);
                showToast(`Stock levels set to ${updatedStock > 0 ? 'In Stock' : 'Out of Stock'}.`);
                await renderOwnerInventory();
            });

            elements.ownerInventoryTableBody.appendChild(tr);
        });
    }

    async function renderMerchantReviews() {
        elements.ownerReviewsList.innerHTML = '';
        const store = await db.getStoreById(ownedStoreId);
        if (!store) return;

        const ratingVal = store.rating !== undefined ? parseFloat(store.rating) : 5.0;
        const reviewsCount = store.reviewsCount || 0;

        elements.ownerReviewsAvgRating.innerText = ratingVal.toFixed(1);
        
        // Stars visual
        const roundedStars = Math.round(ratingVal);
        elements.ownerReviewsStarsVisual.innerText = '★'.repeat(roundedStars) + '☆'.repeat(5 - roundedStars);
        elements.ownerReviewsCount.innerText = `${reviewsCount} ${reviewsCount === 1 ? 'review' : 'reviews'}`;

        const reviews = store.reviews || [];

        if (reviews.length === 0) {
            elements.ownerReviewsList.innerHTML = `
                <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-muted); border-radius: 16px;">
                    <i class="fa-solid fa-comments" style="font-size: 3rem; margin-bottom: 16px; color: var(--text-muted); opacity: 0.5;"></i>
                    <h3>No customer feedback yet</h3>
                    <p style="margin-top: 8px; font-size: 0.85rem;">Reviews from doorstep delivery completions will appear here.</p>
                </div>
            `;
            return;
        }

        // Sort descending (newest first)
        const sortedReviews = [...reviews].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedReviews.forEach(rev => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.padding = '20px';
            card.style.marginBottom = '16px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '12px';

            const formattedTime = new Date(rev.timestamp).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Get Initials
            const nameParts = (rev.userName || 'Customer').split(' ');
            const initials = nameParts.map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');

            const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; color: var(--text-dark); text-shadow: 0 1px 1px rgba(255,255,255,0.2);">
                            ${initials}
                        </div>
                        <div>
                            <strong style="color: var(--text-main); font-size: 0.95rem;">${rev.userName || 'Customer'}</strong>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${formattedTime}</div>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                        <div style="color: var(--accent); font-size: 0.95rem; font-weight: bold; letter-spacing: 1px;">${stars}</div>
                        <span style="font-size: 0.75rem; background: rgba(245, 158, 11, 0.1); color: var(--accent); padding: 2px 8px; border-radius: 4px; font-weight: 600;">${rev.rating.toFixed(1)} / 5.0</span>
                    </div>
                </div>
                <div style="font-size: 0.9rem; line-height: 1.5; color: rgba(255, 255, 255, 0.95); background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 8px;">
                    ${rev.comment ? rev.comment : '<em style="color: var(--text-muted); font-size: 0.85rem;">No written comment left.</em>'}
                </div>
            `;
            elements.ownerReviewsList.appendChild(card);
        });
    }

    async function renderMerchantBilling() {
        const store = await db.getStoreById(ownedStoreId);
        if (!store) return;

        const sub = store.subscription || { plan: 'Premium Trial', status: 'Active', expiresAt: new Date().toISOString() };
        elements.billingPlanName.innerText = sub.plan;
        elements.billingDetailStatus.innerText = sub.status;
        
        const isSuspended = sub.status === 'Suspended' || store.status === 'Suspended';
        if (isSuspended) {
            elements.billingStatusIcon.innerText = '🔴';
            elements.billingStatusTitle.innerText = 'Store Front Suspended';
            elements.billingStatusDesc.innerText = 'Your shop is currently hidden from local search results due to an expired subscription plan. Process payment below to instantly restore visibility.';
            elements.billingStatusCallout.style.borderLeftColor = 'var(--danger)';
            elements.billingStatusCallout.style.background = 'rgba(239, 68, 68, 0.05)';
            elements.billingDetailStatus.style.color = 'var(--danger)';
        } else {
            elements.billingStatusIcon.innerText = '🟢';
            elements.billingStatusTitle.innerText = 'Store Shelf Active';
            elements.billingStatusDesc.innerText = 'Your store is open, listing items, and receiving local checkouts.';
            elements.billingStatusCallout.style.borderLeftColor = 'var(--primary)';
            elements.billingStatusCallout.style.background = 'rgba(255,255,255,0.02)';
            elements.billingDetailStatus.style.color = 'var(--primary)';
        }

        const expiryDate = new Date(sub.expiresAt);
        elements.billingDetailExpiry.innerText = expiryDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    async function saveStoreOnboarding(e) {
        e.preventDefault();
        
        const storeData = {
            name: elements.regStoreName.value.trim(),
            category: elements.regStoreCat.value,
            deliveryRadius: parseFloat(elements.regStoreRadius.value),
            phone: elements.regStorePhone.value.trim(),
            image: regStoreCustomBannerBase64 || elements.regStoreBanner.value,
            address: elements.regStoreAddress.value.trim(),
            minOrderValue: parseFloat(elements.regStoreMov.value) || 0,
            products: []
        };

        const newStore = await db.registerStore(storeData);
        if (newStore) {
            ownedStoreId = newStore.id;
            await db.loadCurrentUser(); // Refresh local profile storeId mapping
            elements.modalRegisterStoreElement.classList.remove('active');
            elements.registerStoreForm.reset();
            regStoreCustomBannerBase64 = null;
            elements.regStoreBannerPreview.innerHTML = `<span style="font-size: 1rem; color: var(--text-muted);">🖼️</span>`;
            showToast("Congratulations! Your digital storefront is registered successfully.");
            await loadOwnerPortal();
        }
    }

    function addVariantRow(variant = null) {
        const row = document.createElement('div');
        row.className = 'variant-row';
        row.style.display = 'flex';
        row.style.gap = '10px';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';

        const nameVal = variant ? variant.name : '';
        const priceVal = variant ? variant.price : '';
        const stockVal = variant ? variant.stock : '';
        const vId = variant ? variant.id : 'v-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        row.innerHTML = `
            <input type="hidden" class="variant-id" value="${vId}">
            <input type="text" class="glass-input variant-name" required placeholder="Size/Unit (e.g. 500ml)" style="flex: 2; font-size: 0.85rem; padding: 6px 10px; height: 36px;" value="${nameVal}">
            <input type="number" step="0.01" class="glass-input variant-price" required placeholder="Price (₹)" style="flex: 1; font-size: 0.85rem; padding: 6px 10px; height: 36px;" value="${priceVal}">
            <input type="number" class="glass-input variant-stock" required placeholder="Stock" style="flex: 1; font-size: 0.85rem; padding: 6px 10px; height: 36px;" value="${stockVal}">
            <button type="button" class="btn-icon btn-remove-variant-row" style="width: 36px; height: 36px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2); flex-shrink: 0;" title="Remove Option"><i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i></button>
        `;

        row.querySelector('.btn-remove-variant-row').addEventListener('click', () => {
            row.remove();
        });

        elements.variantsRowsContainer.appendChild(row);
    }

    async function saveProductFromForm(e) {
        e.preventDefault();
        
        const hasVariants = elements.prodHasVariants.checked;
        let price = 0;
        let stock = 0;
        let unit = '';
        let variants = null;

        if (hasVariants) {
            const rows = elements.variantsRowsContainer.querySelectorAll('.variant-row');
            if (rows.length === 0) {
                showToast("Please add at least one variant option.", "error");
                return;
            }
            variants = [];
            rows.forEach((row, idx) => {
                const vId = row.querySelector('.variant-id').value;
                const name = row.querySelector('.variant-name').value.trim();
                const p = parseFloat(row.querySelector('.variant-price').value) || 0.0;
                const s = parseInt(row.querySelector('.variant-stock').value) || 0;
                variants.push({ id: vId, name, price: p, stock: s });
                stock += s;
                if (idx === 0) {
                    price = p;
                    unit = name;
                }
            });
        } else {
            price = parseFloat(elements.prodPrice.value);
            unit = elements.prodUnit.value.trim();
            stock = parseInt(elements.prodStock.value);
        }

        const prodData = {
            name: elements.prodName.value.trim(),
            category: elements.prodCategory.value,
            price,
            unit,
            stock,
            desc: elements.prodDesc.value.trim(),
            image: prodCustomImageBase64 || '',
            variants
        };

        const pId = elements.modalProductId.value;

        if (pId) {
            await db.updateProduct(ownedStoreId, pId, prodData);
            showToast("Product details updated.");
        } else {
            await db.addProduct(ownedStoreId, prodData);
            showToast("Product added to your inventory catalog.");
        }

        elements.modalProductElement.classList.remove('active');
        elements.ownerProductForm.reset();
        prodCustomImageBase64 = null;
        await renderOwnerInventory();
    }

    function openAddEditProductModal(product = null) {
        elements.ownerProductForm.reset();
        prodCustomImageBase64 = null;
        elements.prodImageFile.value = '';
        elements.variantsRowsContainer.innerHTML = '';
        
        if (product) {
            elements.modalProductTitle.innerText = "Edit Product Listing";
            elements.modalProductId.value = product.id;
            elements.prodName.value = product.name;
            elements.prodCategory.value = product.category;
            elements.prodPrice.value = product.price || '';
            elements.prodUnit.value = product.unit || '';
            elements.prodStock.value = product.stock || '';
            elements.prodDesc.value = product.desc || '';
            
            if (product.variants && product.variants.length > 0) {
                elements.prodHasVariants.checked = true;
                elements.prodVariantsSection.style.display = 'block';
                elements.prodPrice.disabled = true;
                elements.prodUnit.disabled = true;
                elements.prodStock.disabled = true;
                elements.prodPrice.removeAttribute('required');
                elements.prodUnit.removeAttribute('required');
                elements.prodStock.removeAttribute('required');
                product.variants.forEach(v => addVariantRow(v));
            } else {
                elements.prodHasVariants.checked = false;
                elements.prodVariantsSection.style.display = 'none';
                elements.prodPrice.disabled = false;
                elements.prodUnit.disabled = false;
                elements.prodStock.disabled = false;
                elements.prodPrice.setAttribute('required', '');
                elements.prodUnit.setAttribute('required', '');
                elements.prodStock.setAttribute('required', '');
            }

            if (product.image && product.image.trim() !== '') {
                elements.prodImagePreview.innerHTML = `<img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover;">`;
                prodCustomImageBase64 = product.image;
            } else {
                elements.prodImagePreview.innerHTML = `<span style="font-size: 1.2rem; color: var(--text-muted);">📷</span>`;
            }
        } else {
            elements.modalProductTitle.innerText = "Add New Product Listing";
            elements.modalProductId.value = "";
            elements.prodHasVariants.checked = false;
            elements.prodVariantsSection.style.display = 'none';
            elements.prodPrice.disabled = false;
            elements.prodUnit.disabled = false;
            elements.prodStock.disabled = false;
            elements.prodPrice.setAttribute('required', '');
            elements.prodUnit.setAttribute('required', '');
            elements.prodStock.setAttribute('required', '');
            elements.prodImagePreview.innerHTML = `<span style="font-size: 1.2rem; color: var(--text-muted);">📷</span>`;
        }

        elements.modalProductElement.classList.add('active');
    }

    async function saveStoreSettings(e) {
        e.preventDefault();
        
        const configData = {
            name: elements.settingsStoreName.value.trim(),
            deliveryRadius: parseFloat(elements.settingsStoreRadius.value),
            phone: elements.settingsStorePhone.value.trim(),
            address: elements.settingsStoreAddress.value.trim(),
            minOrderValue: parseFloat(elements.settingsStoreMov.value) || 0,
            upiVpa: elements.settingsStoreUpiVpa.value.trim(),
            upiName: elements.settingsStoreUpiName.value.trim()
        };
        
        if (settingsStoreCustomBannerBase64) {
            configData.image = settingsStoreCustomBannerBase64;
        }
        
        const updated = await db.updateStoreConfig(ownedStoreId, configData);
        if (updated) {
            showToast("Merchant settings updated.");
            await loadOwnerPortal();
        } else {
            showToast("Failed to update settings.", "error");
        }
    }

    async function renderDeliveryStaffSettings() {
        if (!ownedStoreId) return;
        elements.deliveryStaffListContainer.innerHTML = '';
        
        const staffList = await db.getDeliveryStaff(ownedStoreId);
        
        if (staffList.length === 0) {
            elements.deliveryStaffListContainer.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
                        No delivery staff registered yet.
                    </td>
                </tr>
            `;
            return;
        }
        
        staffList.forEach(staff => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 12px 16px;"><strong>${staff.name}</strong></td>
                <td style="padding: 12px 16px;">${staff.phone}</td>
                <td style="padding: 12px 16px;">
                    <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 600;">
                        ${staff.status}
                    </span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                    <button class="btn-icon delete-staff-btn" style="width: 32px; height: 32px; border-color: rgba(239, 68, 68, 0.2); color: var(--danger);" title="Remove Rider"><i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i></button>
                </td>
            `;
            
            tr.querySelector('.delete-staff-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to remove delivery staff member ${staff.name}?`)) {
                    const success = await db.deleteDeliveryStaff(ownedStoreId, staff.id);
                    if (success) {
                        showToast("Delivery staff removed.");
                        await renderDeliveryStaffSettings();
                    } else {
                        showToast("Failed to remove delivery staff.", "error");
                    }
                }
            });
            
            elements.deliveryStaffListContainer.appendChild(tr);
        });
    }

    async function handleAddDeliveryStaff(e) {
        e.preventDefault();
        const nameInput = document.getElementById('delivery-staff-name');
        const phoneInput = document.getElementById('delivery-staff-phone');
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!name || !phone) {
            showToast("Please enter name and phone.", "error");
            return;
        }
        
        const newStaff = await db.addDeliveryStaff(ownedStoreId, { name, phone });
        if (newStaff) {
            showToast("Delivery staff added successfully.");
            nameInput.value = '';
            phoneInput.value = '';
            await renderDeliveryStaffSettings();
        } else {
            showToast("Failed to add delivery staff.", "error");
        }
    }

    async function openAssignRiderModal(orderId) {
        if (!ownedStoreId) return;
        
        document.getElementById('assign-rider-order-id').value = orderId;
        elements.assignRiderSelect.innerHTML = '';
        
        const staffList = await db.getDeliveryStaff(ownedStoreId);
        
        if (staffList.length === 0) {
            document.getElementById('assign-rider-empty-warning').style.display = 'block';
            elements.assignRiderSelect.style.display = 'none';
            elements.btnConfirmAssignRider.disabled = true;
        } else {
            document.getElementById('assign-rider-empty-warning').style.display = 'none';
            elements.assignRiderSelect.style.display = 'block';
            elements.btnConfirmAssignRider.disabled = false;
            
            staffList.forEach(staff => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ name: staff.name, phone: staff.phone });
                opt.innerText = `${staff.name} (${staff.phone})`;
                elements.assignRiderSelect.appendChild(opt);
            });
        }
        
        elements.modalAssignRider.style.display = 'flex';
        elements.modalAssignRider.classList.add('active');
    }

    async function handleAssignRiderSubmit(e) {
        e.preventDefault();
        const orderId = document.getElementById('assign-rider-order-id').value;
        const selectedValue = elements.assignRiderSelect.value;
        
        if (!selectedValue) {
            showToast("Please select a rider first.", "error");
            return;
        }
        
        const rider = JSON.parse(selectedValue);
        const success = await db.updateOrderStatus(orderId, 'Out for Delivery', `Rider ${rider.name} (${rider.phone}) is out for delivery.`, {
            deliveryStaff: rider
        });
        
        if (success) {
            elements.modalAssignRider.style.display = 'none';
            elements.modalAssignRider.classList.remove('active');
            showToast("Order sent out for delivery!");
            playSoundbox("Rider dispatched for direct home delivery.");
            await renderOwnerOrders();
        } else {
            showToast("Failed to dispatch order.", "error");
        }
    }

    // --- Server-Sent Events (SSE) Sync ---
    const sse = new EventSource('http://localhost:5000/api/sync');
    sse.onmessage = async (e) => {
        try {
            const { event, data } = JSON.parse(e.data);
            console.log("SSE event received in merchant:", event, data);
            
            if (event === 'order_placed') {
                if (data.storeId === ownedStoreId) {
                    playSoundbox(`New order received on Luxe Grocer of ${Math.round(data.subtotal)} rupees.`);
                    showToast(`New order #${data.id} placed!`);
                    
                    if (activeOwnerPane === 'orders') {
                        await renderOwnerOrders();
                    } else if (activeOwnerPane === 'analytics') {
                        await renderMerchantAnalytics();
                    }
                }
            } else if (event === 'orders_updated') {
                // Refresh views on order status update
                if (activeOwnerPane === 'orders') {
                    await renderOwnerOrders();
                } else if (activeOwnerPane === 'analytics') {
                    await renderMerchantAnalytics();
                }
            } else if (event === 'store_updated' && data === ownedStoreId) {
                await loadOwnerPortal();
            } else if (event === 'sys_notification') {
                showSimulatedNotification(data.message);
            }
        } catch (err) {
            console.error("Error parsing SSE event in merchant:", err);
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

    // --- Event Listeners ---
    elements.linkMerchantToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        elements.formMerchantLogin.style.display = 'none';
        elements.formMerchantRegister.style.display = 'flex';
        document.getElementById('merchant-auth-title').innerText = "Register Partner";
        document.getElementById('merchant-auth-subtitle').innerText = "Register your merchant profile and launch your shelf";
    });

    elements.linkMerchantToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        elements.formMerchantLogin.style.display = 'flex';
        elements.formMerchantRegister.style.display = 'none';
        document.getElementById('merchant-auth-title').innerText = "Partner Portal";
        document.getElementById('merchant-auth-subtitle').innerText = "Access your digital shelf manager & deliveries console";
    });

    const btnAutofillMerchantDemo = document.getElementById('btn-autofill-merchant-demo');
    if (btnAutofillMerchantDemo) {
        btnAutofillMerchantDemo.addEventListener('click', (e) => {
            e.preventDefault();
            elements.merchantLoginEmail.value = 'organic@luxe.com';
            elements.merchantLoginPassword.value = 'admin123';
        });
    }

    elements.formMerchantLogin.addEventListener('submit', handleMerchantLogin);
    elements.formMerchantRegister.addEventListener('submit', handleMerchantRegister);
    
    elements.btnMerchantLogout.addEventListener('click', async () => {
        db.logout();
        showToast("Logged out successfully.");
        await loadOwnerPortal();
    });

    elements.btnOpenRegisterModal.addEventListener('click', () => {
        elements.modalRegisterStoreElement.classList.add('active');
    });
    
    elements.btnCloseRegisterModal.addEventListener('click', () => {
        elements.modalRegisterStoreElement.classList.remove('active');
    });

    elements.registerStoreForm.addEventListener('submit', saveStoreOnboarding);
    
    elements.btnOwnerNavAnalytics.addEventListener('click', () => showOwnerPanel('analytics'));
    elements.btnOwnerNavOrders.addEventListener('click', () => showOwnerPanel('orders'));
    elements.btnOwnerNavInventory.addEventListener('click', () => showOwnerPanel('inventory'));
    elements.btnOwnerNavReviews.addEventListener('click', () => showOwnerPanel('reviews'));
    elements.btnOwnerNavBilling.addEventListener('click', () => showOwnerPanel('billing'));
    elements.btnOwnerNavSettings.addEventListener('click', () => showOwnerPanel('settings'));
    if (elements.btnOwnerNavCoupons) {
        elements.btnOwnerNavCoupons.addEventListener('click', () => showOwnerPanel('coupons'));
    }

    if (elements.btnMerchantActiveOrdersTab) {
        elements.btnMerchantActiveOrdersTab.addEventListener('click', async () => {
            activeOrdersTab = 'active';
            elements.btnMerchantActiveOrdersTab.className = 'btn-premium';
            elements.btnMerchantPastOrdersTab.className = 'btn-outline';
            elements.btnMerchantPastOrdersTab.style.borderColor = 'var(--border-color)';
            elements.btnMerchantPastOrdersTab.style.color = 'var(--text-muted)';
            elements.btnMerchantActiveOrdersTab.style.borderColor = '';
            elements.btnMerchantActiveOrdersTab.style.color = '';
            await renderOwnerOrders();
        });
    }

    if (elements.btnMerchantPastOrdersTab) {
        elements.btnMerchantPastOrdersTab.addEventListener('click', async () => {
            activeOrdersTab = 'past';
            elements.btnMerchantPastOrdersTab.className = 'btn-premium';
            elements.btnMerchantActiveOrdersTab.className = 'btn-outline';
            elements.btnMerchantActiveOrdersTab.style.borderColor = 'var(--border-color)';
            elements.btnMerchantActiveOrdersTab.style.color = 'var(--text-muted)';
            elements.btnMerchantPastOrdersTab.style.borderColor = '';
            elements.btnMerchantPastOrdersTab.style.color = '';
            await renderOwnerOrders();
        });
    }

    elements.btnOpenAddProductModal.addEventListener('click', () => openAddEditProductModal());
    elements.btnCloseProductModal.addEventListener('click', () => elements.modalProductElement.classList.remove('active'));
    elements.ownerProductForm.addEventListener('submit', saveProductFromForm);
    elements.ownerSettingsForm.addEventListener('submit', saveStoreSettings);

    // Substitution listeners
    elements.formSuggestSubstitution.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = elements.substituteOrderId.value;
        const originalItemId = elements.substituteOriginalItemId.value;
        
        const selectedOpt = elements.substituteSelectProduct.options[elements.substituteSelectProduct.selectedIndex];
        if (!selectedOpt || !selectedOpt.value) {
            showToast('Please select a valid substitute product.', 'error');
            return;
        }
        
        const suggestedProduct = {
            id: selectedOpt.getAttribute('data-id'),
            name: selectedOpt.getAttribute('data-name'),
            price: parseFloat(selectedOpt.getAttribute('data-price')),
            emoji: selectedOpt.getAttribute('data-emoji') || '📦',
            unit: selectedOpt.getAttribute('data-unit') || '1 Unit',
            variantId: selectedOpt.getAttribute('data-variant-id') || null,
            variantName: selectedOpt.getAttribute('data-variant-name') || null
        };
        
        try {
            const response = await fetch(`${db.baseUrl}/orders/${orderId}/substitution-proposal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('luxegrocer_merchant_auth_token')}`
                },
                body: JSON.stringify({
                    originalItemId,
                    suggestedProduct
                })
            });
            
            if (response.ok) {
                showToast('Substitution proposal sent successfully!', 'success');
                elements.modalSuggestSubstitution.style.display = 'none';
                await renderOwnerOrders();
            } else {
                const err = await response.json();
                showToast(err.error || 'Failed to send substitution proposal.', 'error');
            }
        } catch (err) {
            console.error('Substitution error:', err);
            showToast('Failed to send proposal', 'error');
        }
    });

    elements.btnCloseSubstituteModal.addEventListener('click', () => {
        elements.modalSuggestSubstitution.style.display = 'none';
    });

    if (elements.formBillingRenew) {
        elements.formBillingRenew.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedPlan = elements.billingRenewPlanSelect.value;
            try {
                const res = await fetch(`${db.baseUrl}/stores/${ownedStoreId}/subscription/renew`, {
                    method: 'POST',
                    headers: db.getHeaders(),
                    body: JSON.stringify({ plan: selectedPlan })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast("Subscription payment approved! Plan renewed successfully.", "success");
                    elements.formBillingRenew.reset();
                    await loadOwnerPortal();
                } else {
                    showToast(data.error || "Subscription renewal failed", "error");
                }
            } catch (err) {
                console.error("Error renewing subscription:", err);
                showToast("Network connection error", "error");
            }
        });
    }

    if (elements.prodHasVariants) {
        elements.prodHasVariants.addEventListener('change', () => {
            const hasVariants = elements.prodHasVariants.checked;
            if (hasVariants) {
                elements.prodVariantsSection.style.display = 'block';
                elements.prodPrice.disabled = true;
                elements.prodUnit.disabled = true;
                elements.prodStock.disabled = true;
                elements.prodPrice.removeAttribute('required');
                elements.prodUnit.removeAttribute('required');
                elements.prodStock.removeAttribute('required');
                if (elements.variantsRowsContainer.children.length === 0) {
                    addVariantRow();
                }
            } else {
                elements.prodVariantsSection.style.display = 'none';
                elements.prodPrice.disabled = false;
                elements.prodUnit.disabled = false;
                elements.prodStock.disabled = false;
                elements.prodPrice.setAttribute('required', '');
                elements.prodUnit.setAttribute('required', '');
                elements.prodStock.setAttribute('required', '');
            }
        });
    }

    if (elements.btnAddVariantRow) {
        elements.btnAddVariantRow.addEventListener('click', () => {
            addVariantRow();
        });
    }

    // Custom uploader input listeners
    elements.prodImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImageFile(file, 250, 250, 0.7, (base64) => {
                prodCustomImageBase64 = base64;
                elements.prodImagePreview.innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; object-fit: cover;">`;
            });
        }
    });

    elements.regStoreBannerFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImageFile(file, 600, 300, 0.7, (base64) => {
                regStoreCustomBannerBase64 = base64;
                elements.regStoreBannerPreview.innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; object-fit: cover;">`;
            });
        }
    });

    elements.settingsStoreBannerFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImageFile(file, 600, 300, 0.7, (base64) => {
                settingsStoreCustomBannerBase64 = base64;
                elements.settingsStoreBannerPreview.innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; object-fit: cover;">`;
            });
        }
    });

    if (elements.btnToggleStoreStatus) {
        elements.btnToggleStoreStatus.addEventListener('click', async () => {
            if (!ownedStoreId) return;
            const store = await db.getStoreById(ownedStoreId);
            if (!store) return;
            const currentStatus = store.status || 'Open';
            const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
            
            const updated = await db.updateStoreConfig(ownedStoreId, { status: newStatus });
            if (updated) {
                showToast(`Store status set to ${newStatus === 'Open' ? 'Open for Delivery' : 'Closed / Offline'}.`, "success");
                await loadOwnerPortal();
            } else {
                showToast("Failed to update store status.", "error");
            }
        });
    }

    // Password change & recovery event listeners
    if (elements.linkMerchantForgotPassword) {
        elements.linkMerchantForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            elements.formMerchantForgotRequest.style.display = 'flex';
            elements.formMerchantForgotReset.style.display = 'none';
            elements.modalMerchantForgotPassword.style.display = 'flex';
            elements.modalMerchantForgotPassword.classList.add('active');
        });
    }

    if (elements.btnCloseMerchantForgotModal) {
        elements.btnCloseMerchantForgotModal.addEventListener('click', () => {
            elements.modalMerchantForgotPassword.style.display = 'none';
            elements.modalMerchantForgotPassword.classList.remove('active');
        });
    }

    if (elements.formMerchantForgotRequest) {
        elements.formMerchantForgotRequest.addEventListener('submit', handleMerchantForgotRequestSubmit);
    }

    if (elements.formMerchantForgotReset) {
        elements.formMerchantForgotReset.addEventListener('submit', handleMerchantForgotResetSubmit);
    }

    if (elements.ownerChangePasswordForm) {
        elements.ownerChangePasswordForm.addEventListener('submit', handleOwnerChangePassword);
    }

    // Account Settings Modal Listeners
    if (elements.btnMerchantProfile) {
        elements.btnMerchantProfile.addEventListener('click', async () => {
            const user = await db.loadCurrentUser();
            if (user) {
                elements.merchantProfileName.innerText = user.name;
                elements.merchantProfileEmail.innerText = user.email;
                const nameParts = user.name.split(' ');
                const initials = nameParts.map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');
                elements.merchantProfileAvatar.innerText = initials || 'M';
                
                elements.merchantProfileChangePasswordForm.reset();
                elements.modalMerchantProfile.style.display = 'flex';
                elements.modalMerchantProfile.classList.add('active');
            }
        });
    }

    if (elements.btnCloseMerchantProfileModal) {
        elements.btnCloseMerchantProfileModal.addEventListener('click', () => {
            elements.modalMerchantProfile.style.display = 'none';
            elements.modalMerchantProfile.classList.remove('active');
        });
    }

    if (elements.merchantProfileChangePasswordForm) {
        elements.merchantProfileChangePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = elements.merchantProfilePwdOld.value;
            const newPassword = elements.merchantProfilePwdNew.value;
            const confirmPassword = elements.merchantProfilePwdConfirm.value;

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
                    elements.merchantProfileChangePasswordForm.reset();
                    elements.modalMerchantProfile.style.display = 'none';
                    elements.modalMerchantProfile.classList.remove('active');
                } else {
                    showToast(data.error || "Failed to update password", "error");
                }
            } catch (err) {
                console.error("Error changing password:", err);
                showToast("Network connection error", "error");
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

    elements.btnTestSoundbox.addEventListener('click', () => {
        playSoundbox("Payment of 250 rupees received on Luxe Grocer");
        showToast("Voice alert triggered successfully.");
    });

    if (elements.btnCloseAssignModal) {
        elements.btnCloseAssignModal.addEventListener('click', () => {
            elements.modalAssignRider.style.display = 'none';
            elements.modalAssignRider.classList.remove('active');
        });
    }

    if (elements.formAddDeliveryStaff) {
        elements.formAddDeliveryStaff.addEventListener('submit', handleAddDeliveryStaff);
    }

    const formAssignRiderDispatch = document.getElementById('form-assign-rider-dispatch');
    if (formAssignRiderDispatch) {
        formAssignRiderDispatch.addEventListener('submit', handleAssignRiderSubmit);
    }

    async function renderOwnerCoupons() {
        if (!elements.ownerCouponsTableBody) return;
        elements.ownerCouponsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Loading coupons...</td></tr>';
        
        const coupons = await db.getCoupons();
        if (coupons.length === 0) {
            elements.ownerCouponsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No coupons active for your store. Create one!</td></tr>';
            return;
        }
        
        elements.ownerCouponsTableBody.innerHTML = coupons.map(c => {
            const discountDisplay = c.discountType === 'free-delivery' ? 'Free Delivery' : `₹${c.value}`;
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 12px 5px;"><strong>${c.code}</strong></td>
                    <td style="padding: 12px 5px; text-transform: capitalize;">${c.discountType.replace('-', ' ')}</td>
                    <td style="padding: 12px 5px;">${discountDisplay}</td>
                    <td style="padding: 12px 5px;">₹${c.minOrderValue}</td>
                    <td style="padding: 12px 5px; text-align: right;">
                        <button class="btn-premium btn-sm" onclick="ownerDeleteCoupon('${c.code}')" style="background: var(--danger); border-color: var(--danger);">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.ownerDeleteCoupon = async function(code) {
        if (!confirm(`Are you sure you want to delete coupon code ${code}?`)) return;
        const deleted = await db.deleteCoupon(code);
        if (deleted) {
            showToast("Coupon deleted successfully.", "success");
            await renderOwnerCoupons();
        } else {
            showToast("Failed to delete coupon.", "error");
        }
    };

    if (elements.formCouponCreate) {
        elements.formCouponCreate.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                code: elements.couponCreateCode.value.trim().toUpperCase(),
                discountType: elements.couponCreateType.value,
                value: parseFloat(elements.couponCreateValue.value) || 0,
                minOrderValue: parseFloat(elements.couponCreateMin.value) || 0,
                desc: elements.couponCreateDesc.value.trim()
            };
            
            const res = await db.createCoupon(payload);
            if (res && !res.error) {
                showToast("Coupon created successfully!", "success");
                elements.formCouponCreate.reset();
                await renderOwnerCoupons();
            } else {
                showToast(res && res.error ? res.error : "Failed to create coupon.", "error");
            }
        });
    }

    // --- Bootstrapping ---
    applyTheme(localStorage.getItem('luxegrocer_theme') || 'dark');
    db.initDatabase();
    loadOwnerPortal();
});
