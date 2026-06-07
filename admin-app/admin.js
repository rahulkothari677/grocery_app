// admin-app/admin.js - Platform Administration Portal Controller

// Intercept console.error to log to server
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    fetch('http://localhost:5000/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'admin-app console.error', error: args.join(' ') })
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
        body: JSON.stringify({ source: 'admin-app window.onerror', error: errData })
    }).catch(() => {});
});
const BASE_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('luxegrocer_admin_auth_token') || '';
let currentPane = 'dashboard';
let systemLogs = [];

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogout = document.getElementById('btn-logout');
const adminName = document.getElementById('admin-name');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const toast = document.getElementById('toast');
const configForm = document.getElementById('config-form');

// Pane Elements
const panes = {
    dashboard: document.getElementById('pane-dashboard'),
    stores: document.getElementById('pane-stores'),
    settlements: document.getElementById('pane-settlements'),
    ledger: document.getElementById('pane-ledger'),
    config: document.getElementById('pane-config'),
    banners: document.getElementById('pane-banners')
};

const bannerForm = document.getElementById('banner-form');
const bannerText = document.getElementById('banner-text');
const bannerImageUrl = document.getElementById('banner-image-url');
const bannerActive = document.getElementById('banner-active');
const adminBannerList = document.getElementById('admin-banner-list');

// Stat Card Elements
const statGrossVolume = document.getElementById('stat-gross-volume');
const statActiveStores = document.getElementById('stat-active-stores');
const statPayoutsCount = document.getElementById('stat-payouts-count');
const statPendingSettlements = document.getElementById('stat-pending-settlements');

// Grid lists
const alertsList = document.getElementById('alerts-list');
const systemLogsList = document.getElementById('system-logs-list');
const storesTableBody = document.getElementById('stores-table-body');
const settlementsTableBody = document.getElementById('settlements-table-body');
const ledgerTableBody = document.getElementById('ledger-table-body');

// Refresh buttons
const btnRefreshStores = document.getElementById('btn-refresh-stores');
const btnRefreshSettlements = document.getElementById('btn-refresh-settlements');
const btnRefreshLedger = document.getElementById('btn-refresh-ledger');

// Toast Helper
function showToast(message, isError = false) {
    toast.innerText = message;
    toast.className = 'toast-notification' + (isError ? ' error' : '') + ' show';
    setTimeout(() => {
        toast.className = 'toast-notification' + (isError ? ' error' : '');
    }, 3000);
}

// Log System Activity
function logActivity(message) {
    const time = new Date().toLocaleTimeString();
    systemLogs.unshift({ time, message });
    if (systemLogs.length > 20) systemLogs.pop();
    renderLogs();
}

function renderLogs() {
    if (!systemLogsList) return;
    if (systemLogs.length === 0) {
        systemLogsList.innerHTML = '<div class="empty-placeholder">Waiting for activity logs...</div>';
        return;
    }
    systemLogsList.innerHTML = systemLogs.map(log => `
        <div class="log-item">
            <span class="log-time">[${log.time}]</span>
            <span class="log-text">${log.message}</span>
        </div>
    `).join('');
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        if (btnThemeToggle) {
            btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    } else {
        document.body.classList.remove('light-theme');
        if (btnThemeToggle) {
            btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }
}

if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('luxegrocer_theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('luxegrocer_theme', newTheme);
        applyTheme(newTheme);
    });
}

// Initialize View State
async function initApp() {
    applyTheme(localStorage.getItem('luxegrocer_theme') || 'dark');
    if (token) {
        // Verify token role
        try {
            const res = await fetch(`${BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.role === 'admin') {
                    authContainer.style.display = 'none';
                    appContainer.style.display = 'block';
                    adminName.innerText = data.name || 'Platform Administrator';
                    logActivity("Administrator session resumed successfully.");
                    await showPane('dashboard');
                    startSSE();
                    return;
                }
            }
        } catch (err) {
            console.error("Token verification failed:", err);
        }
        // If invalid or network fails, clear token
        localStorage.removeItem('luxegrocer_admin_auth_token');
        token = '';
    }
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
}

// SSE Live Updates
let eventSource = null;
function startSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(`${BASE_URL}/sync`);
    eventSource.addEventListener('message', async (e) => {
        try {
            const eventData = JSON.parse(e.data);
            if (eventData.event === 'order_placed') {
                logActivity(`New order placed! ID: ${eventData.data.id || 'N/A'}`);
                if (currentPane === 'dashboard' || currentPane === 'settlements') refreshData();
            } else if (eventData.event === 'status_changed') {
                logActivity(`Order ${eventData.data.id} status updated to ${eventData.data.status}`);
                if (currentPane === 'dashboard' || currentPane === 'settlements') refreshData();
            } else if (eventData.event === 'store_updated') {
                logActivity(`Store ${eventData.data} operational properties modified.`);
                if (currentPane === 'stores') refreshData();
            }
        } catch (err) {
            console.error("Error parsing SSE sync stream:", err);
        }
    });
    eventSource.onerror = () => {
        console.warn("SSE link broken. Reconnecting...");
    };
}

// Handle Login Form
const btnAutofillAdminDemo = document.getElementById('btn-autofill-admin-demo');
if (btnAutofillAdminDemo) {
    btnAutofillAdminDemo.addEventListener('click', (e) => {
        e.preventDefault();
        loginEmail.value = 'admin@luxe.com';
        loginPassword.value = 'admin123';
    });
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value })
        });
        const data = await res.json();
        if (res.ok) {
            if (!data.user || data.user.role !== 'admin') {
                showToast("Access Denied: Administrator credentials required.", true);
                return;
            }
            token = data.token;
            localStorage.setItem('luxegrocer_admin_auth_token', token);
            showToast("Authenticated successfully.");
            initApp();
        } else {
            showToast(data.error || "Authentication failed.", true);
        }
    } catch (err) {
        showToast("Network connection error.", true);
    }
});

// Handle Logout
btnLogout.addEventListener('click', () => {
    localStorage.removeItem('luxegrocer_admin_auth_token');
    token = '';
    if (eventSource) eventSource.close();
    showToast("Session closed.");
    initApp();
});

// Tab Navigation Click Hooks
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const pane = tab.dataset.pane;
        await showPane(pane);
    });
});

// View Change Logic
async function showPane(paneName) {
    currentPane = paneName;
    Object.keys(panes).forEach(p => {
        panes[p].style.display = p === paneName ? 'block' : 'none';
    });
    await refreshData();
}

// Dynamic Refreshes
async function refreshData() {
    if (!token) return;
    try {
        if (currentPane === 'dashboard') {
            await renderDashboard();
        } else if (currentPane === 'stores') {
            await renderStoresTable();
        } else if (currentPane === 'settlements') {
            await renderSettlementsTable();
        } else if (currentPane === 'ledger') {
            await renderLedgerTable();
        } else if (currentPane === 'config') {
            await renderConfigForm();
        } else if (currentPane === 'banners') {
            await renderBannersTable();
        }
    } catch (err) {
        console.error(`Error loading pane ${currentPane}:`, err);
        showToast("Error retrieving data from platform API.", true);
    }
}

// 1. Dashboard Tab Data Loading
async function renderDashboard() {
    // Fetch dashboard statistics
    const resStores = await fetch(`${BASE_URL}/admin/stores`, { headers: { 'Authorization': `Bearer ${token}` } });
    const stores = resStores.ok ? await resStores.json() : [];
    
    const resLedger = await fetch(`${BASE_URL}/admin/ledger`, { headers: { 'Authorization': `Bearer ${token}` } });
    const ledger = resLedger.ok ? await resLedger.json() : [];
    
    const resSettlements = await fetch(`${BASE_URL}/admin/settlements`, { headers: { 'Authorization': `Bearer ${token}` } });
    const settlements = resSettlements.ok ? await resSettlements.json() : [];

    // Aggregate statistics
    let grossVolume = 0;
    ledger.forEach(entry => {
        if (entry.credit) grossVolume += entry.credit;
    });

    const activeStores = stores.filter(s => s.status !== 'Suspended').length;
    const pendingSettlements = settlements.filter(s => s.customer.payment === 'upi' && !s.payoutSettled).length;
    const settledPayouts = settlements.filter(s => s.payoutSettled).length;

    statGrossVolume.innerText = `₹${grossVolume.toFixed(2)}`;
    statActiveStores.innerText = activeStores;
    statPayoutsCount.innerText = settledPayouts;
    statPendingSettlements.innerText = pendingSettlements;

    // Render Urgent Alerts (Pending approvals + unsettled payouts)
    alertsList.innerHTML = '';
    const pendingStores = stores.filter(s => s.status === 'Pending Approval');
    const pendingPayoutOrders = settlements.filter(s => s.customer.payment === 'upi' && !s.payoutSettled);

    let alertsCount = 0;

    pendingStores.forEach(store => {
        alertsCount++;
        const card = document.createElement('div');
        card.className = 'alert-card';
        card.innerHTML = `
            <div class="alert-info">
                <h4><i class="fa-solid fa-store" style="color: #60a5fa"></i> Store Audit Required</h4>
                <p>"${store.name}" registered and is waiting for approval.</p>
            </div>
            <div class="alert-action">
                <button class="btn-premium btn-sm" onclick="approveStore('${store.id}')">Approve</button>
            </div>
        `;
        alertsList.appendChild(card);
    });

    pendingPayoutOrders.forEach(order => {
        alertsCount++;
        const card = document.createElement('div');
        card.className = 'alert-card';
        const totalVal = parseFloat(order.grandTotal) || 0;
        card.innerHTML = `
            <div class="alert-info">
                <h4><i class="fa-solid fa-receipt" style="color: var(--accent)"></i> Verify Payout UTR</h4>
                <p>Order #${order.id} total ₹${totalVal.toFixed(2)}: UTR "${order.customer.transactionId || 'N/A'}"</p>
            </div>
            <div class="alert-action">
                <button class="btn-premium btn-sm" onclick="verifySettlement('${order.id}')">Settle</button>
            </div>
        `;
        alertsList.appendChild(card);
    });

    if (alertsCount === 0) {
        alertsList.innerHTML = '<div class="empty-placeholder">No urgent alerts. System healthy.</div>';
    }
}

// 2. Stores Tab Data Loading
async function renderStoresTable() {
    storesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted)">Loading store list...</td></tr>';
    const res = await fetch(`${BASE_URL}/admin/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch stores");
    const stores = await res.json();
    
    if (stores.length === 0) {
        storesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted)">No merchants registered on this platform.</td></tr>';
        return;
    }

    storesTableBody.innerHTML = stores.map(store => {
        const sub = store.subscription || {};
        const expires = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'N/A';
        const plan = sub.plan || 'No Active Plan';
        const badgeClass = (store.status || '').toLowerCase().replace(' ', '_');
        
        let actionsHtml = '';
        if (store.status === 'Pending Approval') {
            actionsHtml = `<button class="btn-premium btn-sm" onclick="approveStore('${store.id}')">Approve Store</button>`;
        } else if (store.status === 'Suspended') {
            actionsHtml = `<button class="btn-outline btn-sm" onclick="approveStore('${store.id}')">Lift Suspension</button>`;
        } else {
            actionsHtml = `<button class="btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger)" onclick="suspendStore('${store.id}')">Suspend Store</button>`;
        }

        return `
            <tr>
                <td><strong>${store.name}</strong></td>
                <td>${store.ownerEmail}</td>
                <td>${store.category}</td>
                <td><span class="status-badge ${badgeClass}">${store.status}</span></td>
                <td>${plan}</td>
                <td>${expires}</td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    }).join('');
}

// 3. Settlements Tab Data Loading
async function renderSettlementsTable() {
    settlementsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted)">Loading payout requests...</td></tr>';
    const res = await fetch(`${BASE_URL}/admin/settlements`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch settlements");
    const settlements = await res.json();

    if (settlements.length === 0) {
        settlementsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted)">No digital checkout transactions recorded.</td></tr>';
        return;
    }

    settlementsTableBody.innerHTML = settlements.map(order => {
        const isUpi = order.customer.payment === 'upi';
        const isWallet = order.customer.payment === 'wallet';
        const isSplit = order.customer.payment === 'split';
        const paymentLabel = isSplit ? `Split (Wallet + ${order.customer.splitPaymentMethod.toUpperCase()})` : order.customer.payment.toUpperCase();
        
        let statusBadge = '';
        let actionBtn = '';
        
        if (order.payoutSettled) {
            statusBadge = '<span class="status-badge settled">Settle Verified</span>';
            actionBtn = `<span style="color: var(--text-muted); font-size: 0.85rem">Verified</span>`;
        } else if (isUpi || (isSplit && order.customer.splitPaymentMethod === 'upi')) {
            statusBadge = '<span class="status-badge unsettled">Pending Settlement</span>';
            actionBtn = `<button class="btn-premium btn-sm" onclick="verifySettlement('${order.id}')">Verify UTR & Settle</button>`;
        } else {
            // Cash on delivery or fully wallet-based orders don't need manual platform settlement approvals
            statusBadge = '<span class="status-badge settled">Direct Clearing</span>';
            actionBtn = `<span style="color: var(--text-muted); font-size: 0.85rem">N/A (Auto-Clear)</span>`;
        }

        const dateStr = new Date(order.timestamp).toLocaleString();
        const utr = order.customer.transactionId || (isWallet ? 'Wallet Direct' : 'N/A');

        const totalVal = parseFloat(order.grandTotal) || 0;
        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${order.storeName}</td>
                <td>₹${totalVal.toFixed(2)}</td>
                <td>${paymentLabel}</td>
                <td><code style="font-size: 0.9rem">${utr}</code></td>
                <td>${dateStr}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

// 4. Ledger Tab Data Loading
async function renderLedgerTable() {
    ledgerTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted)">Loading ledger journal logs...</td></tr>';
    const res = await fetch(`${BASE_URL}/admin/ledger`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch ledger");
    const ledger = await res.json();

    if (ledger.length === 0) {
        ledgerTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted)">Ledger accounting journal is empty.</td></tr>';
        return;
    }

    // Sort descending by timestamp
    ledger.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    ledgerTableBody.innerHTML = ledger.map(entry => {
        const debit = entry.debit ? `₹${entry.debit.toFixed(2)}` : '-';
        const credit = entry.credit ? `₹${entry.credit.toFixed(2)}` : '-';
        const dateStr = new Date(entry.timestamp).toLocaleString();
        
        return `
            <tr>
                <td><code style="font-size: 0.85rem">${entry.id}</code></td>
                <td><strong>${entry.orderId || entry.storeId || 'Platform'}</strong></td>
                <td><span style="font-weight:600; text-transform:uppercase; font-size:0.8rem">${entry.type}</span></td>
                <td style="color: var(--danger)">${debit}</td>
                <td style="color: var(--primary)">${credit}</td>
                <td>${entry.description}</td>
                <td>${dateStr}</td>
            </tr>
        `;
    }).join('');
}

// 5. Config Tab Data Loading
async function renderConfigForm() {
    const res = await fetch(`${BASE_URL}/admin/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch system configurations");
    const config = await res.json();

    document.getElementById('config-trial-days').value = config.subscriptionTrialDays;
    document.getElementById('config-monthly-fee').value = config.subscriptionMonthlyFee;
    document.getElementById('config-yearly-fee').value = config.subscriptionYearlyFee;
    document.getElementById('config-base-fee').value = config.baseDeliveryFee;
    document.getElementById('config-base-radius').value = config.baseDeliveryRadius;
    document.getElementById('config-per-km-fee').value = config.perKmDeliveryFee;
    document.getElementById('config-free-threshold').value = config.freeDeliveryThreshold;
}

// Global functions exposed to window for buttons onclick event mapping
window.approveStore = async function(id) {
    try {
        const res = await fetch(`${BASE_URL}/admin/stores/${id}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Store approved and active.");
            logActivity(`Approved store with ID: ${id}`);
            refreshData();
        } else {
            showToast("Failed to approve store.", true);
        }
    } catch (err) {
        showToast("Connection failed.", true);
    }
};

window.suspendStore = async function(id) {
    if (!confirm("Are you sure you want to suspend this store? Customers will no longer be able to browse or check out products from this storefront.")) return;
    try {
        const res = await fetch(`${BASE_URL}/admin/stores/${id}/suspend`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Store suspended.");
            logActivity(`Suspended store with ID: ${id}`);
            refreshData();
        } else {
            showToast("Failed to suspend store.", true);
        }
    } catch (err) {
        showToast("Connection failed.", true);
    }
};

window.verifySettlement = async function(orderId) {
    try {
        const res = await fetch(`${BASE_URL}/admin/settlements/${orderId}/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Settle Verified! Credited ₹${data.payoutAmount.toFixed(2)} to store account.`);
            logActivity(`Settled payout for order #${orderId}. Ledger transaction updated.`);
            refreshData();
        } else {
            showToast(data.error || "Failed to settle payment.", true);
        }
    } catch (err) {
        showToast("Connection failed.", true);
    }
};

// Handle config updates
configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        subscriptionTrialDays: parseInt(document.getElementById('config-trial-days').value),
        subscriptionMonthlyFee: parseFloat(document.getElementById('config-monthly-fee').value),
        subscriptionYearlyFee: parseFloat(document.getElementById('config-yearly-fee').value),
        baseDeliveryFee: parseFloat(document.getElementById('config-base-fee').value),
        baseDeliveryRadius: parseFloat(document.getElementById('config-base-radius').value),
        perKmDeliveryFee: parseFloat(document.getElementById('config-per-km-fee').value),
        freeDeliveryThreshold: parseFloat(document.getElementById('config-free-threshold').value)
    };

    try {
        const res = await fetch(`${BASE_URL}/admin/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Global configurations saved successfully.");
            logActivity("Updated global platform configuration constants.");
            refreshData();
        } else {
            showToast("Failed to save settings.", true);
        }
    } catch (err) {
        showToast("Network failure.", true);
    }
});

// 6. Banners Tab Data Loading
async function renderBannersTable() {
    if (!adminBannerList) return;
    adminBannerList.innerHTML = '<tr><td style="text-align: center; color: var(--text-muted)">Loading banners...</td></tr>';
    
    const res = await fetch(`${BASE_URL}/banners`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch banners");
    const banners = await res.json();
    
    if (banners.length === 0) {
        adminBannerList.innerHTML = '<div class="empty-placeholder" style="padding: 20px; color: var(--text-muted);">No active banners. Add one above!</div>';
        return;
    }
    
    let html = `
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="text-align: left; padding: 10px;">ID</th>
                    <th style="text-align: left; padding: 10px;">Banner Text</th>
                    <th style="text-align: left; padding: 10px;">Image URL</th>
                    <th style="text-align: left; padding: 10px;">Status</th>
                    <th style="text-align: left; padding: 10px;">Action</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    banners.forEach(b => {
        const imagePreview = b.imageUrl ? `<a href="${b.imageUrl}" target="_blank" style="color: var(--primary); text-decoration: none;">View Image</a>` : 'N/A';
        const statusBadge = b.active ? '<span class="status-badge settled">Active</span>' : '<span class="status-badge suspended">Inactive</span>';
        
        html += `
            <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; font-size: 0.85rem;"><code style="font-size:0.85rem;">${b.id}</code></td>
                <td style="padding: 10px; font-weight: 500;">${b.text}</td>
                <td style="padding: 10px; font-size: 0.85rem;">${imagePreview}</td>
                <td style="padding: 10px;">${statusBadge}</td>
                <td style="padding: 10px;">
                    <button class="btn-premium btn-sm" onclick="deleteBanner('${b.id}')" style="background: var(--danger);">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    adminBannerList.innerHTML = html;
}

window.deleteBanner = async function(id) {
    if (!confirm("Are you sure you want to delete this promotional banner?")) return;
    try {
        const res = await fetch(`${BASE_URL}/banners/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Banner deleted successfully.");
            logActivity(`Deleted promotional banner: ${id}`);
            refreshData();
        } else {
            const data = await res.json();
            showToast(data.error || "Failed to delete banner.", true);
        }
    } catch (err) {
        showToast("Network failure.", true);
    }
};

// Wire banner form submit
if (bannerForm) {
    bannerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            text: bannerText.value.trim(),
            imageUrl: bannerImageUrl.value.trim(),
            active: bannerActive.checked
        };
        
        try {
            const res = await fetch(`${BASE_URL}/banners`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast("Promotional banner added successfully.");
                logActivity(`Created new promotional banner: "${payload.text.substring(0, 20)}..."`);
                bannerForm.reset();
                refreshData();
            } else {
                const data = await res.json();
                showToast(data.error || "Failed to create banner.", true);
            }
        } catch (err) {
            showToast("Network failure.", true);
        }
    });
}

// Register Refresh Click Handlers
if (btnRefreshStores) btnRefreshStores.addEventListener('click', refreshData);
if (btnRefreshSettlements) btnRefreshSettlements.addEventListener('click', refreshData);
if (btnRefreshLedger) btnRefreshLedger.addEventListener('click', refreshData);

// App Boot
initApp();
