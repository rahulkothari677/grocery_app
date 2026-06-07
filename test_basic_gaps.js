// test_basic_gaps.js - Verification test suite for Categories CRUD, Operating Hours, Default Address, Tipping, and Suspend Lockouts
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Basic Features GAPs Integration Test ===\n");

    // ----------------------------------------------------
    // SETUP: Authentic Tokens
    // ----------------------------------------------------
    console.log("Step 0: Authenticating console users...");
    
    // Admin Login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@luxe.com', password: 'admin123' })
    });
    if (!adminRes.ok) throw new Error("Admin authentication failed.");
    const { token: adminToken } = await adminRes.json();
    console.log("✅ Admin authenticated.");

    // Customer Login
    const customerRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerRes.ok) throw new Error("Customer authentication failed.");
    const { token: customerToken, user: customerUser } = await customerRes.json();
    console.log("✅ Customer authenticated.");

    // Merchant Login
    const merchantRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    if (!merchantRes.ok) throw new Error("Merchant authenticated failed.");
    const { token: merchantToken } = await merchantRes.json();
    console.log("✅ Merchant authenticated.\n");

    // ----------------------------------------------------
    // TEST 1: Categories CRUD API
    // ----------------------------------------------------
    console.log("--- TEST 1: Admin Dynamic Categories CRUD ---");
    
    // Create category
    const catId = `gourmet_cat_${Date.now()}`;
    const createCatRes = await fetch(`${BASE_URL}/admin/categories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            id: catId,
            name: 'Gourmet Selection',
            icon: '🧀',
            image: 'assets/category_gourmet.png',
            parentId: null
        })
    });
    if (!createCatRes.ok) throw new Error("Failed to create category");
    console.log(`✅ Category "${catId}" created successfully.`);

    // Verify it is listed in public list
    const getCatsRes = await fetch(`${BASE_URL}/categories`);
    const categories = await getCatsRes.json();
    const createdCat = categories.find(c => c.id === catId);
    if (!createdCat) throw new Error("Created category not found in public categories list.");
    console.log("✅ Category listed in public endpoint.");

    // Update category name
    const updateCatRes = await fetch(`${BASE_URL}/admin/categories/${catId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            name: 'Super Gourmet Selection',
            icon: '🥞',
            image: 'assets/category_gourmet_updated.png',
            parentId: null
        })
    });
    if (!updateCatRes.ok) throw new Error("Failed to update category name.");
    console.log("✅ Category updated successfully.");

    // Verify update
    const getCatsRes2 = await fetch(`${BASE_URL}/categories`);
    const categories2 = await getCatsRes2.json();
    const updatedCat = categories2.find(c => c.id === catId);
    if (!updatedCat || updatedCat.name !== 'Super Gourmet Selection') throw new Error("Category updates not reflected.");
    console.log("✅ Category updates verified.");

    // Delete category
    const deleteCatRes = await fetch(`${BASE_URL}/admin/categories/${catId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!deleteCatRes.ok) throw new Error("Failed to delete category.");
    console.log("✅ Category deleted successfully.");

    // Verify delete
    const getCatsRes3 = await fetch(`${BASE_URL}/categories`);
    const categories3 = await getCatsRes3.json();
    if (categories3.some(c => c.id === catId)) throw new Error("Category still exists after deletion.");
    console.log("✅ Category deletion verified.\n");

    // ----------------------------------------------------
    // TEST 2: Operating Hours & Auto-Closed Validation
    // ----------------------------------------------------
    console.log("--- TEST 2: Operating Hours & Auto-Closed Overrides ---");
    
    // Get store original config
    const storeRes = await fetch(`${BASE_URL}/stores/store-1`);
    const originalStore = await storeRes.json();
    const originalHours = originalStore.operatingHours || {};
    console.log(`Original store status: ${originalStore.status}`);

    // Set today to closed
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = days[new Date().getDay()];
    const newHours = { ...originalHours };
    newHours[todayName] = { open: '09:00', close: '22:00', isClosed: true };

    console.log(`Setting operating hours for today (${todayName}) to isClosed: true...`);
    const setHoursRes = await fetch(`${BASE_URL}/stores/store-1/operating-hours`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({ operatingHours: newHours })
    });
    if (!setHoursRes.ok) throw new Error("Failed to update store operating hours.");
    console.log("✅ Operating hours updated.");

    // Fetch store and check if dynamically status overridden to "Closed"
    const storeRes2 = await fetch(`${BASE_URL}/stores/store-1`);
    const storeAfterOverride = await storeRes2.json();
    console.log(`Store status after override: ${storeAfterOverride.status}`);
    if (storeAfterOverride.status !== 'Closed') {
        throw new Error("Expected store status to be dynamically set to 'Closed' when current time falls in a closed day/hour.");
    }
    console.log("✅ Auto-closed override verified.");

    // Reset operating hours to original
    await fetch(`${BASE_URL}/stores/store-1/operating-hours`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({ operatingHours: originalHours })
    });
    console.log("✅ Operating hours reverted to original.\n");

    // ----------------------------------------------------
    // TEST 3: Default Address Management
    // ----------------------------------------------------
    console.log("--- TEST 3: Default Address Management ---");
    
    // Add address 1
    const addr1Res = await fetch(`${BASE_URL}/users/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ tag: 'Home', lat: 12.9251, lng: 77.6221, address: 'Address 1, Koramangala' })
    });
    const addr1 = await addr1Res.json();
    console.log(`Created address 1 with ID: ${addr1.id}`);

    // Add address 2
    const addr2Res = await fetch(`${BASE_URL}/users/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ tag: 'Office', lat: 12.9252, lng: 77.6222, address: 'Address 2, Koramangala' })
    });
    const addr2 = await addr2Res.json();
    console.log(`Created address 2 with ID: ${addr2.id}`);

    // Make address 2 default
    console.log(`Making address 2 (${addr2.id}) default...`);
    const makeDefaultRes = await fetch(`${BASE_URL}/users/addresses/${addr2.id}/make-default`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (!makeDefaultRes.ok) throw new Error("Failed to make address default.");
    
    // Verify default settings
    const getAddrRes = await fetch(`${BASE_URL}/users/addresses`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const addressesList = await getAddrRes.json();
    const updatedAddr1 = addressesList.find(a => a.id === addr1.id);
    const updatedAddr2 = addressesList.find(a => a.id === addr2.id);

    console.log(`Address 1 default flag: ${updatedAddr1.isDefault}`);
    console.log(`Address 2 default flag: ${updatedAddr2.isDefault}`);

    if (updatedAddr1.isDefault || !updatedAddr2.isDefault) {
        throw new Error("Default address flags not updated correctly.");
    }
    console.log("✅ Default address management verified.\n");

    // Clean up addresses
    await fetch(`${BASE_URL}/users/addresses/${addr1.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    await fetch(`${BASE_URL}/users/addresses/${addr2.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    // ----------------------------------------------------
    // TEST 4: Post-Delivery Rider Tipping & Ledger Entries
    // ----------------------------------------------------
    console.log("--- TEST 4: Post-Delivery Rider Tipping & Ledger Logs ---");
    
    // Add funds to customer wallet to ensure sufficient balance for tipping
    await fetch(`${BASE_URL}/wallet/add-funds`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ amount: 500 })
    });

    const initialWalletBalanceRes = await fetch(`${BASE_URL}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const { walletBalance: initialBalance } = await initialWalletBalanceRes.json();
    console.log(`Customer wallet balance before tip: ₹${initialBalance}`);

    // Place new order
    const orderPayload = {
        storeId: 'store-1',
        items: [{ id: 'p1-1', name: 'Premium Full Cream Milk', price: 68, quantity: 1 }],
        deliveryFee: 15.00,
        customer: {
            name: 'Rahul Sharma',
            phone: '+91 98765 43210',
            address: '4th Block, Koramangala, Bengaluru',
            payment: 'wallet' // Pay fully with wallet
        }
    };
    const orderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify(orderPayload)
    });
    const orderData = await orderRes.json();
    const orderId = orderData.id;
    console.log(`Placed order #${orderId}. Total cost: ₹${orderData.grandTotal}`);

    // Update order status to Delivering, assign a rider
    await fetch(`${BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
            status: 'Out for Delivery',
            deliveryStaff: { name: 'Vinay Kumar', phone: '+91 9988776655' }
        })
    });

    // Retrieve order's deliveryOtp from database
    const adminOrdersRes = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const allOrders = await adminOrdersRes.json();
    const activeOrder = allOrders.find(o => o.id === orderId);
    const otp = activeOrder.deliveryOtp;
    console.log(`Order delivery verification OTP: ${otp}`);

    // Verify OTP to set order to Delivered
    const verifyOtpRes = await fetch(`${BASE_URL}/orders/${orderId}/verify-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({ otp })
    });
    if (!verifyOtpRes.ok) throw new Error("OTP verification failed.");
    console.log("✅ Order status set to Delivered.");

    // Submit post-delivery tip
    console.log("Submitting ₹50 tip for the rider...");
    const tipRes = await fetch(`${BASE_URL}/orders/${orderId}/tip`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ amount: 50 })
    });
    if (!tipRes.ok) {
        const err = await tipRes.json();
        throw new Error("Failed to submit tip: " + err.error);
    }
    console.log("✅ Tip submitted successfully.");

    // Check balance after tip
    const postTipBalanceRes = await fetch(`${BASE_URL}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const { walletBalance: postTipBalance } = await postTipBalanceRes.json();
    console.log(`Customer wallet balance after tip: ₹${postTipBalance}`);
    
    // Check ledger entries for 'rider_tip' type
    const ledgerRes = await fetch(`${BASE_URL}/admin/ledger`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ledger = await ledgerRes.json();
    const tipEntry = ledger.find(entry => entry.orderId === orderId && entry.type === 'rider_tip');
    if (!tipEntry) throw new Error("Rider tip ledger log entry not created.");
    console.log(`✅ Tip entry verified in accounting ledger. Description: "${tipEntry.description}"\n`);

    // ----------------------------------------------------
    // TEST 5: User accounts suspension lockouts
    // ----------------------------------------------------
    console.log("--- TEST 5: User Suspension Lockouts ---");
    
    // Create new customer to suspend (to avoid messing up Rahul)
    const tempUserEmail = `temp_cust_${Date.now()}@luxe.com`;
    console.log(`Registering temporary customer user: ${tempUserEmail}...`);
    const regCustRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: tempUserEmail,
            password: 'password123',
            name: 'Temp Buyer',
            phone: '+91 99999 00000',
            role: 'customer'
        })
    });
    const regCustData = await regCustRes.json();
    const tempUserId = regCustData.user.id;
    console.log(`Registered user ID: ${tempUserId}`);

    // Suspend user
    console.log(`Suspending user ${tempUserId}...`);
    const suspendRes = await fetch(`${BASE_URL}/admin/users/${tempUserId}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!suspendRes.ok) throw new Error("Failed to suspend user");
    console.log("✅ User account status set to Suspended.");

    // Attempt login as suspended user
    console.log("Attempting login as suspended user...");
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUserEmail, password: 'password123' })
    });
    console.log(`Login response status: ${badLoginRes.status}`);
    if (badLoginRes.status !== 403) {
        throw new Error("Expected 403 Forbidden when logging in as a suspended user.");
    }
    const badLoginData = await badLoginRes.json();
    console.log(`Rejection message: "${badLoginData.error}"`);
    if (!badLoginData.error.toLowerCase().includes('suspended')) {
        throw new Error("Expected suspension error message.");
    }
    console.log("✅ Login blockade verified.");

    // Reactivate user
    console.log(`Reactivating user ${tempUserId}...`);
    const reactivateRes = await fetch(`${BASE_URL}/admin/users/${tempUserId}/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!reactivateRes.ok) throw new Error("Failed to reactivate user");
    console.log("✅ User account status set back to Active.");

    // Verify login works again
    const goodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUserEmail, password: 'password123' })
    });
    if (!goodLoginRes.ok) throw new Error("Login failed after reactivation.");
    console.log("✅ User successfully authenticated after reactivation.\n");

    // ----------------------------------------------------
    // TEST 6: SSE Live System Broadcast
    // ----------------------------------------------------
    console.log("--- TEST 6: Live SSE Broadcast Alerts ---");
    const broadcastMsg = "Live Broadcast Test Message: Platform running perfectly!";
    console.log(`Sending live SSE alert broadcast: "${broadcastMsg}"...`);
    const broadcastRes = await fetch(`${BASE_URL}/admin/broadcast`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ message: broadcastMsg })
    });
    if (!broadcastRes.ok) throw new Error("SSE broadcast post failed.");
    console.log("✅ Live broadcast event emitted.\n");

    console.log("==================================================");
    console.log("  ALL BASIC FEATURES GAPs TESTS COMPLETED 100%!   ");
    console.log("==================================================");
}

runTest().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("❌ Test suite execution failed!");
    console.error(err);
    process.exit(1);
});
