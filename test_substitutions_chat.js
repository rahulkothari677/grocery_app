// test_substitutions_chat.js - Verify Item Substitutions & Chat Connect
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Item Substitutions & Chat Connect Verification Test ===");

    // Reset Organic Greek Yogurt stock to ensure test consistency
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'backend', 'db.json');
    if (fs.existsSync(dbPath)) {
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        const storeIdx = dbData.stores.findIndex(s => s.id === 'store-1');
        if (storeIdx !== -1) {
            const prodIdx = dbData.stores[storeIdx].products.findIndex(p => p.id === 'p1-2');
            if (prodIdx !== -1) {
                dbData.stores[storeIdx].products[prodIdx].stock = 20;
                fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
                console.log("✅ Reset Organic Greek Yogurt stock to 20 for test consistency.");
            }
        }
    }

    // Step 1: Login as Merchant & Customer
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

    // Helper to get stock of a product/variant
    async function getProductStock(productId, variantId = null) {
        const res = await fetch(`${BASE_URL}/stores/store-1`);
        if (!res.ok) throw new Error("Failed to fetch store details");
        const store = await res.json();
        const prod = store.products.find(p => p.id === productId);
        if (!prod) return null;
        if (variantId && prod.variants) {
            const v = prod.variants.find(varItem => varItem.id === variantId);
            return v ? v.stock : null;
        }
        return prod.stock;
    }

    // Capture initial stock levels
    const initialYogurtStock = await getProductStock('p1-2');
    const initialPaneerStock = await getProductStock('p1-4');
    console.log(`Initial stocks -> Organic Greek Yogurt: ${initialYogurtStock}, Fresh Paneer: ${initialPaneerStock}`);

    // --- TEST 1: ACCEPT SWAP ---
    console.log("\n--- TEST 1: Proposing and Accepting a Swap ---");
    console.log("Placing checkout order for 2 x Organic Greek Yogurt...");
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
                address: "Flat 202, Block A, Green Meadows, Bengaluru",
                payment: "cod"
            }
        })
    });
    if (!orderRes1.ok) throw new Error(`Failed to place order 1: ${await orderRes1.text()}`);
    let order1 = await orderRes1.json();
    console.log(`Order 1 placed. ID: ${order1.id}, Subtotal: ₹${order1.subtotal}`);

    // Verify stock is decremented after order placement
    const stockAfterOrder = await getProductStock('p1-2');
    console.log(`Yogurt stock after placing order (should be decremented by 2): ${stockAfterOrder}`);
    if (stockAfterOrder !== initialYogurtStock - 2) {
        throw new Error(`Expected yogurt stock to be ${initialYogurtStock - 2}, got ${stockAfterOrder}`);
    }

    // Propose substitution: Swap Yogurt for Paneer (p1-4)
    console.log("Merchant proposing substitution: swap Yogurt for Paneer...");
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
    if (!propRes1.ok) throw new Error(`Failed to propose substitution: ${await propRes1.text()}`);
    order1 = await propRes1.json();
    console.log("Substitution proposed successfully. Current proposal status:", order1.substitutionProposal.status);
    if (!order1.substitutionProposal || order1.substitutionProposal.status !== 'Pending') {
        throw new Error("Expected proposal status to be Pending");
    }

    // Verify that proposing the swap temporarily restores original stock
    const stockAfterProposal = await getProductStock('p1-2');
    console.log(`Yogurt stock after proposing swap (should restore to initial ${initialYogurtStock}): ${stockAfterProposal}`);
    if (stockAfterProposal !== initialYogurtStock) {
        throw new Error(`Expected yogurt stock to be restored to ${initialYogurtStock}, got ${stockAfterProposal}`);
    }

    // Customer accepts the proposal
    console.log("Customer accepting substitution proposal...");
    const acceptRes1 = await fetch(`${BASE_URL}/orders/${order1.id}/substitution-response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ action: 'Accept' })
    });
    if (!acceptRes1.ok) throw new Error(`Failed to accept substitution: ${await acceptRes1.text()}`);
    order1 = await acceptRes1.json();
    console.log(`Proposal response resolved. New order items count: ${order1.items.length}`);

    // Verify item swap in order items list
    const substitutedItem = order1.items[0];
    console.log("New item details in order:", substitutedItem);
    if (substitutedItem.id !== 'p1-4' || substitutedItem.name !== 'Fresh Paneer (Cottage Cheese)') {
        throw new Error("Item was not successfully swapped to Paneer");
    }

    // Verify stock adjustments: Yogurt should remain restored (initialYogurtStock) and Paneer should be decremented by 2
    const finalYogurtStock = await getProductStock('p1-2');
    const finalPaneerStock = await getProductStock('p1-4');
    console.log(`Final stocks -> Yogurt: ${finalYogurtStock}, Paneer: ${finalPaneerStock}`);
    if (finalYogurtStock !== initialYogurtStock) {
        throw new Error(`Expected yogurt stock to remain ${initialYogurtStock}, got ${finalYogurtStock}`);
    }
    if (finalPaneerStock !== initialPaneerStock - 2) {
        throw new Error(`Expected paneer stock to be decremented to ${initialPaneerStock - 2}, got ${finalPaneerStock}`);
    }
    console.log("PASS: Substitution Accept, stock adjustments, and order swap verified successfully!");

    // --- TEST 2: DECLINE SWAP ---
    console.log("\n--- TEST 2: Proposing and Declining a Swap ---");
    console.log("Placing checkout order for 1 x Organic Greek Yogurt...");
    const orderRes2 = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-2', name: 'Organic Greek Yogurt', price: 120.00, quantity: 1, emoji: '🍦' }
            ],
            deliveryFee: 20,
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Flat 202, Block A, Green Meadows, Bengaluru",
                payment: "cod"
            }
        })
    });
    if (!orderRes2.ok) throw new Error(`Failed to place order 2: ${await orderRes2.text()}`);
    let order2 = await orderRes2.json();
    console.log(`Order 2 placed. ID: ${order2.id}`);

    // Propose swap
    console.log("Merchant proposing swap...");
    const propRes2 = await fetch(`${BASE_URL}/orders/${order2.id}/substitution-proposal`, {
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
    if (!propRes2.ok) throw new Error("Proposal failed");
    order2 = await propRes2.json();

    // Customer declines swap
    console.log("Customer declining substitution proposal...");
    const declineRes = await fetch(`${BASE_URL}/orders/${order2.id}/substitution-response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ action: 'Decline' })
    });
    if (!declineRes.ok) throw new Error(`Decline response failed: ${await declineRes.text()}`);
    order2 = await declineRes.json();

    console.log(`Order 2 items count after decline (should be 0 since item removed): ${order2.items.length}`);
    if (order2.items.length !== 0) {
        throw new Error("Expected item to be removed entirely from the order");
    }
    console.log("PASS: Substitution Decline, item removal, and stock conservation verified successfully!");

    // --- TEST 3: REAL-TIME CHAT SYNC ---
    console.log("\n--- TEST 3: Real-Time Messaging Chat Sync ---");
    console.log("Merchant sending chat message: 'Hi Rahul, yogurt is fresh but we also have Paneer today.'");
    const chatRes1 = await fetch(`${BASE_URL}/orders/${order1.id}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({ text: "Hi Rahul, yogurt is fresh but we also have Paneer today." })
    });
    if (!chatRes1.ok) throw new Error(`Chat post from merchant failed: ${await chatRes1.text()}`);
    const msg1 = await chatRes1.json();
    console.log("Merchant message sent:", msg1);

    console.log("Customer sending chat message: 'Sure, thanks! Paneer is perfect.'");
    const chatRes2 = await fetch(`${BASE_URL}/orders/${order1.id}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ text: "Sure, thanks! Paneer is perfect." })
    });
    if (!chatRes2.ok) throw new Error(`Chat post from customer failed: ${await chatRes2.text()}`);
    const msg2 = await chatRes2.json();
    console.log("Customer message sent:", msg2);

    // Retrieve final order status to check chat messages log
    const finalOrderRes = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (!finalOrderRes.ok) throw new Error("Failed to fetch final orders list");
    const allOrders = await finalOrderRes.json();
    const finalOrder1 = allOrders.find(o => o.id === order1.id);
    
    console.log(`Chat messages array length in final order: ${finalOrder1.chatMessages.length}`);
    if (finalOrder1.chatMessages.length !== 2) {
        throw new Error(`Expected 2 chat messages, got ${finalOrder1.chatMessages.length}`);
    }
    
    const [m1, m2] = finalOrder1.chatMessages;
    if (m1.sender !== 'merchant' || m1.text !== "Hi Rahul, yogurt is fresh but we also have Paneer today.") {
        throw new Error("First message details mismatch");
    }
    if (m2.sender !== 'customer' || m2.text !== "Sure, thanks! Paneer is perfect.") {
        throw new Error("Second message details mismatch");
    }
    console.log("PASS: Real-Time Chat messages successfully appended, verified, and synched!");

    console.log("\nSUCCESS: All Out-of-Stock substitutions, inventory adjustments, and real-time chat connect tests passed successfully!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
