// merchant.js - LuxeGrocer Merchant Partner Portal Controller

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let ownedStoreId = localStorage.getItem('luxegrocer_owned_store_id') || null;
    let activeOwnerPane = 'analytics'; // Default pane

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
        btnOwnerNavSettings: document.getElementById('btn-owner-nav-settings'),
        
        ownerPaneAnalytics: document.getElementById('owner-pane-analytics'),
        ownerPaneOrders: document.getElementById('owner-pane-orders'),
        ownerPaneInventory: document.getElementById('owner-pane-inventory'),
        ownerPaneSettings: document.getElementById('owner-pane-settings'),
        
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
        regStorePrepTime: document.getElementById('reg-store-prep-time'),

        // Toast
        toastNotification: document.getElementById('toast-notification'),
        toastIcon: document.getElementById('toast-icon'),
        toastMessage: document.getElementById('toast-message')
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

    // --- Merchant View Controller ---
    async function loadOwnerPortal() {
        if (!ownedStoreId) {
            elements.ownerNoStoreAlert.style.display = 'block';
            elements.ownerDashboardWorkspace.style.display = 'none';
        } else {
            const store = await db.getStoreById(ownedStoreId);
            if (!store) {
                localStorage.removeItem('luxegrocer_owned_store_id');
                ownedStoreId = null;
                await loadOwnerPortal();
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

            await showOwnerPanel(activeOwnerPane);
        }
    }

    async function showOwnerPanel(paneName) {
        elements.btnOwnerNavAnalytics.classList.remove('active');
        elements.btnOwnerNavOrders.classList.remove('active');
        elements.btnOwnerNavInventory.classList.remove('active');
        elements.btnOwnerNavSettings.classList.remove('active');

        elements.ownerPaneAnalytics.style.display = 'none';
        elements.ownerPaneOrders.style.display = 'none';
        elements.ownerPaneInventory.style.display = 'none';
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
        const storeOrders = allOrders.filter(o => o.storeId === ownedStoreId);

        storeOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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

        storeOrders.forEach(order => {
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
            
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${visual}
                        <div>
                            <strong>${prod.name}</strong>
                            <br><span style="font-size: 0.75rem; color: var(--text-muted);">${prod.desc || 'No description.'}</span>
                        </div>
                    </div>
                </td>
                <td><span style="text-transform: capitalize;">${prod.category}</span></td>
                <td><strong>₹${prod.price.toFixed(2)}</strong></td>
                <td>${prod.unit}</td>
                <td><span class="${prod.stock > 0 ? 'product-stock-tag in-stock' : 'product-stock-tag out-stock'}">${prod.stock} items</span></td>
                <td>
                    <div style="display:flex; gap: 8px;">
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

            elements.ownerInventoryTableBody.appendChild(tr);
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
            localStorage.setItem('luxegrocer_owned_store_id', newStore.id);
            elements.modalRegisterStoreElement.classList.remove('active');
            elements.registerStoreForm.reset();
            regStoreCustomBannerBase64 = null;
            elements.regStoreBannerPreview.innerHTML = `<span style="font-size: 1rem; color: var(--text-muted);">🖼️</span>`;
            showToast("Congratulations! Your digital storefront is registered successfully.");
            await loadOwnerPortal();
        }
    }

    async function saveProductFromForm(e) {
        e.preventDefault();
        
        const prodData = {
            name: elements.prodName.value.trim(),
            category: elements.prodCategory.value,
            price: parseFloat(elements.prodPrice.value),
            unit: elements.prodUnit.value.trim(),
            stock: parseInt(elements.prodStock.value),
            desc: elements.prodDesc.value.trim(),
            image: prodCustomImageBase64 || ''
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
        
        if (product) {
            elements.modalProductTitle.innerText = "Edit Product Listing";
            elements.modalProductId.value = product.id;
            elements.prodName.value = product.name;
            elements.prodCategory.value = product.category;
            elements.prodPrice.value = product.price;
            elements.prodUnit.value = product.unit;
            elements.prodStock.value = product.stock;
            elements.prodDesc.value = product.desc || '';
            
            if (product.image && product.image.trim() !== '') {
                elements.prodImagePreview.innerHTML = `<img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover;">`;
                prodCustomImageBase64 = product.image;
            } else {
                elements.prodImagePreview.innerHTML = `<span style="font-size: 1.2rem; color: var(--text-muted);">📷</span>`;
            }
        } else {
            elements.modalProductTitle.innerText = "Add New Product Listing";
            elements.modalProductId.value = "";
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
    elements.btnOwnerNavSettings.addEventListener('click', () => showOwnerPanel('settings'));

    elements.btnOpenAddProductModal.addEventListener('click', () => openAddEditProductModal());
    elements.btnCloseProductModal.addEventListener('click', () => elements.modalProductElement.classList.remove('active'));
    elements.ownerProductForm.addEventListener('submit', saveProductFromForm);
    elements.ownerSettingsForm.addEventListener('submit', saveStoreSettings);

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

    elements.btnTestSoundbox.addEventListener('click', () => {
        playSoundbox("Payment of 250 rupees received on Luxe Grocer");
        showToast("Voice alert triggered successfully.");
    });

    // --- Bootstrapping ---
    db.initDatabase();
    loadOwnerPortal();
});
