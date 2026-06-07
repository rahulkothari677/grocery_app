// test_admin_governance.js - Verify Platform Admin Portal, Governance Audits & Ledger Accounting
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Platform Admin Portal & Governance Auditing Verification Test ===");

    // Step 1: Logins
    console.log("\n1. Logging in users...");
    
    // Admin login
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@luxe.com', password: 'admin123' })
    });
    if (!adminLogin.ok) throw new Error("Admin login failed");
    const resData = await adminLogin.json();
    const adminToken = resData.token;
    const adminRole = resData.user.role;
    console.log(`Admin logged in successfully. Role: ${adminRole}`);
    if (adminRole !== 'admin') throw new Error("Expected role to be 'admin'");

    // Customer login
    const customerLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerLogin.ok) throw new Error("Customer login failed");
    const { token: customerToken } = await customerLogin.json();
    console.log("Customer logged in successfully.");

    // Merchant login
    const merchantLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'organic@luxe.com', password: 'admin123' })
    });
    if (!merchantLogin.ok) throw new Error("Merchant login failed");
    const { token: merchantToken } = await merchantLogin.json();
    console.log("Merchant logged in successfully.");


    // --- TEST 1: ROLE ACCESS SECURITY RESTRICTIONS ---
    console.log("\n--- TEST 1: Verifying Administrator Access Restrictions ---");
    
    // Customer attempts to fetch admin ledger
    const badLedgerRes = await fetch(`${BASE_URL}/admin/ledger`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    console.log(`Customer accessing ledger status: ${badLedgerRes.status}`);
    if (badLedgerRes.status !== 403) {
        throw new Error("Expected 403 Forbidden when customer accesses admin endpoint.");
    }
    const badLedgerData = await badLedgerRes.json();
    console.log(`Rejection error text: "${badLedgerData.error}"`);

    // Merchant attempts to fetch admin config
    const badConfigRes = await fetch(`${BASE_URL}/admin/config`, {
        headers: { 'Authorization': `Bearer ${merchantToken}` }
    });
    console.log(`Merchant accessing configuration status: ${badConfigRes.status}`);
    if (badConfigRes.status !== 403) {
        throw new Error("Expected 403 Forbidden when merchant accesses admin config.");
    }
    console.log("PASS: Security access controls successfully verified.");


    // --- TEST 2: STORE APPROVAL FLOW ---
    console.log("\n--- TEST 2: Verifying New Store Registration & Approval Flow ---");
    
    // Register a new merchant user first (to avoid duplicate store owner restrictions)
    const newMerchantEmail = `temp_merchant_${Date.now()}@luxe.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: newMerchantEmail,
            password: 'admin123',
            role: 'merchant',
            name: 'Temp Bakery Owner',
            phone: '+91 99009 90099'
        })
    });
    if (!regRes.ok) throw new Error(`Registration failed: ${await regRes.text()}`);
    const regData = await regRes.json();
    const tempMerchantToken = regData.token;
    const storeId = regData.user.storeId;
    console.log(`Registered temporary merchant: ${newMerchantEmail}, Store ID: ${storeId}`);

    // Fetch the auto-created store to verify it starts as Pending Approval
    const storeGetRes = await fetch(`${BASE_URL}/stores/${storeId}`);
    if (!storeGetRes.ok) throw new Error(`Failed to fetch auto-created store: ${await storeGetRes.text()}`);
    const newStore = await storeGetRes.json();
    console.log(`Auto-created store info: Name: ${newStore.name}, Status: ${newStore.status}`);
    if (newStore.status !== 'Pending Approval') {
        throw new Error("Expected newly registered store to start in 'Pending Approval' status");
    }

    // Admin approves the store
    console.log("Admin approving the pending store...");
    const approveRes = await fetch(`${BASE_URL}/admin/stores/${storeId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!approveRes.ok) throw new Error("Admin approval request failed");
    const approvedStore = await approveRes.json();
    console.log(`Store approved status: ${approvedStore.status}`);
    if (approvedStore.status !== 'Open') {
        throw new Error("Expected approved store status to change to 'Open'");
    }
    console.log("PASS: Store registration and administrator approval audit verified successfully.");


    // --- TEST 3: PAYOUT SETTLEMENTS & ACCOUNTING LEDGERS ---
    console.log("\n--- TEST 3: Placing Order, UPI Payment Settlement & Ledger Bookkeeping ---");
    
    // Customer places a UPI payment order with UTR reference ID
    const orderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-2', name: 'Organic Greek Yogurt', price: 120.00, quantity: 2, emoji: '🍦' } // Subtotal ₹240
            ],
            deliveryFee: 20, // Total = ₹260
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "upi",
                transactionId: "UTR9876543210" // 12-digit mock bank UTR
            }
        })
    });
    if (!orderRes.ok) throw new Error(`Failed to place UPI order: ${await orderRes.text()}`);
    const order = await orderRes.json();
    console.log(`UPI order placed successfully. ID: ${order.id}, UTR Ref: ${order.customer.transactionId}, payoutSettled: ${order.payoutSettled}`);
    if (order.payoutSettled) {
        throw new Error("New order should not be marked as payout settled until admin verification.");
    }

    // Admin fetches settlements queue
    console.log("Admin fetching settlements queue...");
    const settlementsRes = await fetch(`${BASE_URL}/admin/settlements`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const settlements = await settlementsRes.json();
    const hasOrder = settlements.some(s => s.id === order.id);
    console.log(`  Does admin see the UPI order in settlements queue? ${hasOrder}`);
    if (!hasOrder) throw new Error("Admin settlements queue must contain the placed UPI order.");

    // Admin verifies settlement
    console.log(`Admin verifying and settling payment for Order #${order.id}...`);
    const verifyRes = await fetch(`${BASE_URL}/admin/settlements/${order.id}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!verifyRes.ok) throw new Error(`Verification settlement failed: ${await verifyRes.text()}`);
    const verifyData = await verifyRes.json();
    console.log(`  Payout settled: ${verifyData.order.payoutSettled}, Settle Amount: ₹${verifyData.payoutAmount}`);
    const expectedTotal = order.grandTotal;
    if (!verifyData.order.payoutSettled || verifyData.payoutAmount !== expectedTotal) {
        throw new Error(`Expected payoutSettled to be true and payout amount to match ₹${expectedTotal} grand total.`);
    }

    // Admin fetches ledger
    console.log("Admin retrieving double-entry accounting ledger entries...");
    const ledgerRes = await fetch(`${BASE_URL}/admin/ledger`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ledger = await ledgerRes.json();
    console.log(`Total ledger entries: ${ledger.length}`);

    // Verify double-entry ledger debit & credit matching lines
    const paymentLine = ledger.find(l => l.orderId === order.id && l.type === 'order_payment');
    const payoutLine = ledger.find(l => l.orderId === order.id && l.type === 'order_payout');

    console.log(`  Payment credit entry -> credit: ₹${paymentLine ? paymentLine.credit : 0}, debit: ₹${paymentLine ? paymentLine.debit : 0}`);
    console.log(`  Payout debit entry -> credit: ₹${payoutLine ? payoutLine.credit : 0}, debit: ₹${payoutLine ? payoutLine.debit : 0}`);

    if (!paymentLine || paymentLine.credit !== expectedTotal || paymentLine.debit !== 0) {
        throw new Error("Invalid ledger journal payment line details.");
    }
    if (!payoutLine || payoutLine.debit !== expectedTotal || payoutLine.credit !== 0) {
        throw new Error("Invalid ledger journal payout line details.");
    }
    console.log("PASS: Payout settlement verification and accounting ledger double-entry lines successfully checked.");


    // --- TEST 4: SYSTEM CONFIGURATION OVERRIDES ---
    console.log("\n--- TEST 4: Verifying Global Configuration Settings Overrides ---");
    
    // Admin saves new config settings
    const testConfig = {
        subscriptionTrialDays: 20,
        subscriptionMonthlyFee: 599,
        subscriptionYearlyFee: 5999,
        baseDeliveryFee: 25.00,
        baseDeliveryRadius: 2.5,
        perKmDeliveryFee: 12.00,
        freeDeliveryThreshold: 350.00
    };
    console.log("Saving new configuration parameter overrides...");
    const saveConfigRes = await fetch(`${BASE_URL}/admin/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(testConfig)
    });
    if (!saveConfigRes.ok) throw new Error("Failed to save admin configurations settings");
    
    // Retrieve configuration settings
    const getConfigRes = await fetch(`${BASE_URL}/admin/config`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const retrievedConfig = await getConfigRes.json();
    console.log(`Retrieved Config -> Trial Days: ${retrievedConfig.subscriptionTrialDays}, Monthly Fee: ₹${retrievedConfig.subscriptionMonthlyFee}, Free threshold: ₹${retrievedConfig.freeDeliveryThreshold}`);

    if (retrievedConfig.subscriptionTrialDays !== 20 || retrievedConfig.subscriptionMonthlyFee !== 599 || retrievedConfig.freeDeliveryThreshold !== 350) {
        throw new Error("Retrieved configuration values do not match settings posted.");
    }
    console.log("PASS: Configuration settings parameters saved and retrieved successfully.");

    console.log("\nALL PHASE 13 PLATFORM ADMIN PORTAL & GOVERNANCE TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
