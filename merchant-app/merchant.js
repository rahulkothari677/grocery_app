// merchant.js - LuxeGrocer Merchant Partner Portal Controller

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let ownedStoreId = null;
    let activeOwnerPane = 'analytics'; // Default pane
    let activeOrdersTab = 'active'; // 'active' or 'past'

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
        btnOwnerNavSettings: document.getElementById('btn-owner-nav-settings'),
        
        ownerPaneAnalytics: document.getElementById('owner-pane-analytics'),
        ownerPaneOrders: document.getElementById('owner-pane-orders'),
        ownerPaneInventory: document.getElementById('owner-pane-inventory'),
        ownerPaneReviews: document.getElementById('owner-pane-reviews'),
        ownerPaneSettings: document.getElementById('owner-pane-settings'),
        ownerReviewsAvgRating: document.getElementById('owner-reviews-avg-rating'),
        ownerReviewsStarsVisual: document.getElementById('owner-reviews-stars-visual'),
        ownerReviewsCount: document.getElementById('owner-reviews-count'),
        ownerReviewsList: document.getElementById('owner-reviews-list'),
        
        btnTestSoundbox: document.getElementById('btn-test-soundbox'),
        ownerStatRevenue: document.getElementById('owner-stat-revenue'),
        ownerStatOrders: document.getElementById('owner-stat-orders'),
        ownerStatAverage: document.getElementById('owner-stat-average'),
        ownerStatRadius: document.getElementById('owner-stat-radius'),
        
        analyticsRevenueChart: document.getElementById('analytics-revenue-chart'),
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
        merchantProfilePwdConfirm: document.getElementById('merchant-profile-pwd-confirm')
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
        elements.btnOwnerNavSettings.classList.remove('active');

        elements.ownerPaneAnalytics.style.display = 'none';
        elements.ownerPaneOrders.style.display = 'none';
        elements.ownerPaneInventory.style.display = 'none';
        elements.ownerPaneReviews.style.display = 'none';
        elements.ownerPaneSettings.style.display = 'none';

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
        } else {
            elements.btnOwnerNavSettings.classList.add('active');
            elements.ownerPaneSettings.style.display = 'block';
        }
        activeOwnerPane = paneName;
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
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const baseMockValues = [450, 1200, 850, 1500, 2200, 3100, 1800];
        baseMockValues[6] += totalRevenue;
        
        const maxVal = Math.max(...baseMockValues) || 1000;
        
        elements.analyticsRevenueChart.innerHTML = '';
        days.forEach((day, idx) => {
            const val = baseMockValues[idx];
            const heightPercent = (val / maxVal) * 100;
            
            const col = document.createElement('div');
            col.className = 'chart-bar-col';
            col.innerHTML = `
                <span class="chart-value">₹${Math.round(val)}</span>
                <div class="chart-bar" style="height: ${heightPercent}%"></div>
                <span class="chart-label">${day}</span>
            `;
            elements.analyticsRevenueChart.appendChild(col);
        });
        
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
            
            const itemsSummary = order.items.map(item => `
                <div style="display:flex; justify-content:space-between; font-size: 0.9rem; margin-bottom: 6px;">
                    <span>${item.emoji} ${item.name} (x${item.quantity})</span>
                    <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('');

            const badgeClass = order.status.toLowerCase().replace(' ', '-');

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
                    <div style="border-top:1px dashed var(--border-color); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700;">
                        <span>Grand Total (incl. delivery)</span>
                        <span>₹${(order.subtotal + order.deliveryFee).toFixed(2)}</span>
                    </div>
                </div>

                <div class="order-card-footer">
                    <div>
                        <span style="font-size:0.8rem; color: var(--text-muted);">Payment: <strong>${order.customer.payment.toUpperCase()}</strong></span>
                    </div>
                    <div style="display:flex; gap: 8px;" class="order-action-buttons">
                        <!-- Actions injected -->
                    </div>
                </div>
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
                    await db.updateOrderStatus(order.id, 'Preparing', `Store owner accepted and is packaging your items. Estimated preparation: ${prepTime}.`);
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
                    await db.updateOrderStatus(order.id, 'Out for Delivery');
                    showToast("Order sent out for delivery!");
                    playSoundbox("Rider dispatched for direct home delivery.");
                    await renderOwnerOrders();
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

            elements.ownerOrdersQueueList.appendChild(card);
        });
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
            minOrderValue: parseFloat(elements.settingsStoreMov.value) || 0
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
            }
        } catch (err) {
            console.error("Error parsing SSE event in merchant:", err);
        }
    };

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
    elements.btnOwnerNavSettings.addEventListener('click', () => showOwnerPanel('settings'));

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

    elements.btnTestSoundbox.addEventListener('click', () => {
        playSoundbox("Payment of 250 rupees received on Luxe Grocer");
        showToast("Voice alert triggered successfully.");
    });

    // --- Bootstrapping ---
    db.initDatabase();
    loadOwnerPortal();
});
