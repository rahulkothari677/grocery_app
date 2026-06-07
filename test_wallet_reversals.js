// test_wallet_reversals.js - Verify Customer Wallet credits, split checkout, and substitution reversals
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Customer Wallet Credits & Reversals Verification Test ===");

    // Step 1: Login
    console.log("\n1. Logging in users...");
    const merchantLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    if (!merchantLogin.ok) throw new Error("Merchant login failed");
    const { token: merchantToken } = await merchantLogin.json();
    console.log("Merchant logged in successfully.");

    const customerLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerLogin.ok) throw new Error("Customer login failed");
    const { token: customerToken } = await customerLogin.json();
    console.log("Customer logged in successfully.");

    // Helper: get wallet balance
    async function getWalletBalance() {
        const res = await fetch(`${BASE_URL}/wallet/balance`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        if (!res.ok) throw new Error("Failed to fetch wallet balance");
        const data = await res.json();
        return data.walletBalance;
    }

    // Helper: add funds
    async function addWalletFunds(amount) {
        const res = await fetch(`${BASE_URL}/wallet/add-funds`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({ amount })
        });
        if (!res.ok) throw new Error("Failed to add funds");
        const data = await res.json();
        return data.walletBalance;
    }

    // --- TEST A: INITIAL WALLET CHECK & TOPUP ---
    console.log("\n--- TEST A: Topup and Balance Checks ---");
    let balance = await getWalletBalance();
    console.log(`Initial wallet balance: ₹${balance}`);
    
    // Add ₹1500 to wallet
    const newBalance = await addWalletFunds(1500);
    console.log(`Wallet balance after adding ₹1500: ₹${newBalance}`);
    if (newBalance !== balance + 1500) {
        throw new Error(`Expected wallet balance to be ${balance + 1500}, got ${newBalance}`);
    }
    balance = newBalance;

    // --- TEST B: INSUFFICIENT BALANCE ERROR ---
    console.log("\n--- TEST B: Insufficient Balance Rejection ---");
    const targetQuantity = Math.ceil((balance + 500) / 240);
    const largeOrderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-3', name: 'Artisanal Butter (Salted)', price: 240.00, quantity: targetQuantity, emoji: '🧈' }
            ],
            deliveryFee: 0,
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "wallet"
            }
        })
    });
    console.log(`Large order payment response status: ${largeOrderRes.status}`);
    if (largeOrderRes.ok) {
        throw new Error("Order with insufficient wallet balance should have failed!");
    }
    const errData = await largeOrderRes.json();
    console.log(`Rejection error message: "${errData.error}"`);
    if (!errData.error.toLowerCase().includes("insufficient")) {
        throw new Error("Expected insufficient balance error message");
    }

    // --- TEST C: SUCCESSFUL FULL WALLET PAYMENT ---
    console.log("\n--- TEST C: Successful Full Wallet Payment ---");
    // Greek Yogurt: ₹120. Order total: 2 * 120 + 20 delivery = ₹260
    const orderRes1 = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-2', name: 'Organic Greek Yogurt', price: 120.00, quantity: 2, emoji: '🍦' }
            ],
            deliveryFee: 20,
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "wallet"
            }
        })
    });
    if (!orderRes1.ok) throw new Error(`Failed to place wallet order: ${await orderRes1.text()}`);
    let order1 = await orderRes1.json();
    console.log(`Order 1 placed with Wallet. ID: ${order1.id}, Grand Total: ₹${order1.customer.walletAmountPaid}`);
    const expectedTotal = 240 + order1.deliveryFee;
    if (order1.customer.walletAmountPaid !== expectedTotal) {
        throw new Error(`Expected walletAmountPaid to be ${expectedTotal}, got ${order1.customer.walletAmountPaid}`);
    }

    let balAfterOrder1 = await getWalletBalance();
    console.log(`Wallet balance after order 1 (should be decremented by ${expectedTotal}): ₹${balAfterOrder1}`);
    if (balAfterOrder1 !== balance - expectedTotal) {
        throw new Error(`Expected wallet balance to be ${balance - expectedTotal}, got ${balAfterOrder1}`);
    }
    balance = balAfterOrder1;

    // --- TEST D: DECLINE SWAP REFUND ---
    console.log("\n--- TEST D: Decline Swap Refund to Wallet ---");
    // Propose swap: Yogurt for Paneer (₹110)
    const propRes1 = await fetch(`${BASE_URL}/orders/${order1.id}/substitution-proposal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
            originalItemId: 'p1-2',
            suggestedProduct: {
                id: 'p1-4',
                name: 'Fresh Paneer (Cottage Cheese)',
                price: 110.00,
                emoji: '🧀',
                unit: '250g'
            }
        })
    });
    if (!propRes1.ok) throw new Error("Proposal 1 failed");
    order1 = await propRes1.json();

    // Customer declines. Refund should be value of original item (2 * 120 = ₹240) minus any delivery adjustment.
    // Wait, the delivery fee was ₹20 because subtotal was ₹240 (< ₹300).
    // When the item is removed, subtotal becomes ₹0, so delivery fee becomes ₹0.
    // Grand total before: ₹260. Grand total after: ₹0. Refund is ₹260!
    console.log("Customer declining substitution...");
    const declineRes = await fetch(`${BASE_URL}/orders/${order1.id}/substitution-response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ action: 'Decline' })
    });
    if (!declineRes.ok) throw new Error("Decline response failed");
    order1 = await declineRes.json();
    console.log(`Order 1 updated status timeline: ${order1.statusTimeline[order1.statusTimeline.length - 1].desc}`);

    let balAfterDecline = await getWalletBalance();
    console.log(`Wallet balance after declining substitution (should be refunded ${expectedTotal}): ₹${balAfterDecline}`);
    if (balAfterDecline !== balance + expectedTotal) {
        throw new Error(`Expected wallet balance to be restored to ${balance + expectedTotal}, got ${balAfterDecline}`);
    }
    balance = balAfterDecline;

    // --- TEST E: SPLIT PAYMENT CHECKOUT ---
    console.log("\n--- TEST E: Split Payment checkout ---");
    // Set wallet balance to ₹150 for clean testing
    const currentBal = await getWalletBalance();
    // To set to exactly 150, we can add/deduct, or just make an order of size currentBal - 150.
    // Let's deduct:
    const resMe = await fetch(`${BASE_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${customerToken}` } });
    const meData = await resMe.json();
    console.log(`Clearing wallet balance by placing dummy order...`);
    // Or we can just mock it by making order size larger than wallet balance and requesting a split.
    // Let's place a split order:
    // User wallet balance is around ₹1500. Let's make an order of ₹2000.
    // subtotal = ₹1920 (8 * 240). Delivery fee = 0. Grand total = ₹1920.
    // Wallet applied = ~₹1500. Split amount paid = ~₹420 via UPI.
    const splitOrderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-3', name: 'Artisanal Butter (Salted)', price: 240.00, quantity: 8, emoji: '🧈' } // ₹1920
            ],
            deliveryFee: 0,
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "split",
                splitPaymentMethod: "upi",
                transactionId: "TXN123456"
            }
        })
    });
    if (!splitOrderRes.ok) throw new Error(`Failed to place split order: ${await splitOrderRes.text()}`);
    const splitOrder = await splitOrderRes.json();
    console.log(`Split Order placed successfully! ID: ${splitOrder.id}`);
    console.log(`  Wallet portion paid: ₹${splitOrder.customer.walletAmountPaid}`);
    console.log(`  UPI portion paid: ₹${splitOrder.customer.splitAmountPaid}`);
    
    if (splitOrder.customer.walletAmountPaid !== balance) {
        throw new Error(`Expected wallet portion paid to equal full balance of ${balance}, got ${splitOrder.customer.walletAmountPaid}`);
    }
    
    const balAfterSplit = await getWalletBalance();
    console.log(`Wallet balance after split checkout (should be ₹0): ₹${balAfterSplit}`);
    if (balAfterSplit !== 0) {
        throw new Error(`Expected wallet balance to be 0, got ${balAfterSplit}`);
    }
    balance = balAfterSplit;

    // --- TEST F: INSTANT CANCEL REFUND ---
    console.log("\n--- TEST F: Order Cancellation Refund to Wallet ---");
    // Cancel the split order. The full grand total of ₹1920 (both wallet and UPI portions) should be refunded back to the wallet!
    const cancelRes = await fetch(`${BASE_URL}/orders/${splitOrder.id}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            status: 'Cancelled',
            description: 'Cancelled by customer during grace window.'
        })
    });
    if (!cancelRes.ok) throw new Error(`Cancel failed: ${await cancelRes.text()}`);
    const cancelledOrder = await cancelRes.json();
    console.log(`Order cancellation status: ${cancelledOrder.status}`);
    
    const balAfterCancel = await getWalletBalance();
    console.log(`Wallet balance after order cancellation (should be refunded ₹1920): ₹${balAfterCancel}`);
    if (balAfterCancel !== 1920) {
        throw new Error(`Expected wallet balance to be refunded to 1920, got ${balAfterCancel}`);
    }

    console.log("\nPASS: ALL CUSTOMER WALLET AND REVERSALS TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
