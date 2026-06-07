// test_sockets_queues.js - Verify Socket.io connections, BullMQ background queues, and Stripe Sandboxes
const io = require('socket.io-client');
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function runTest() {
    console.log("=== LuxeGrocer Sockets, Queues & Stripe Payments Verification Test ===");

    // Step 1: Login a customer to place an order
    console.log("\n1. Logging in customer...");
    const customerLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerLogin.ok) throw new Error("Customer login failed");
    const { token: customerToken, user } = await customerLogin.json();
    console.log(`Customer logged in. Token acquired for: ${user.name}`);

    // Place a pending order
    console.log("Placing a new order...");
    const orderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-1', name: 'Premium Full Cream Milk', price: 68.00, quantity: 2 } // Subtotal = ₹136
            ],
            deliveryFee: 20, // Total = ₹156
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "stripe" // Paying via Stripe Sandbox
            }
        })
    });
    if (!orderRes.ok) throw new Error(`Order placement failed: ${await orderRes.text()}`);
    const order = await orderRes.json();
    console.log(`Order placed successfully. ID: ${order.id}, Status: ${order.status}`);

    // Step 2: Establish Socket.io Connection
    console.log("\n2. Connecting to Socket.io server...");
    const socket = io(SOCKET_URL);
    
    await new Promise((resolve, reject) => {
        socket.on('connect', () => {
            console.log(`  Connected via WebSocket with ID: ${socket.id}`);
            resolve();
        });
        socket.on('connect_error', (err) => {
            reject(new Error(`WebSocket connection failed: ${err.message}`));
        });
    });

    // Register user and join order room
    socket.emit('register', user.id);
    socket.emit('join_order', order.id);
    console.log(`  Registered user ${user.id} and joined order room order_${order.id}`);

    // Listen for incoming chat messages and status updates
    let receivedMessage = null;
    let receivedStatusUpdate = null;

    socket.on('new_message', (msg) => {
        console.log(`  [WS Client] Received message event: "${msg.text}" from ${msg.senderName}`);
        receivedMessage = msg;
    });

    socket.on('order_status_updated', (orderId) => {
        console.log(`  [WS Client] Received order status updated event for Order #${orderId}`);
        receivedStatusUpdate = orderId;
    });

    // Send a message over socket
    console.log("Sending a real-time message via socket...");
    socket.emit('send_message', {
        orderId: order.id,
        senderRole: 'customer',
        senderName: user.name,
        text: "Please pack it well, thank you!"
    });

    // Wait a brief moment to receive the message echo
    await new Promise(r => setTimeout(r, 1000));
    if (!receivedMessage || receivedMessage.text !== "Please pack it well, thank you!") {
        throw new Error("Did not receive real-time message event via Socket.io");
    }
    console.log("PASS: WebSocket real-time chat pipeline verified.");

    // Step 3: Test Stripe Checkout Sandbox
    console.log("\n3. Testing Stripe Checkout Session & Webhook callback...");
    const stripeCheckoutRes = await fetch(`${BASE_URL}/payments/stripe/checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ orderId: order.id })
    });
    if (!stripeCheckoutRes.ok) throw new Error(`Stripe checkout request failed: ${await stripeCheckoutRes.text()}`);
    const stripeSession = await stripeCheckoutRes.json();
    console.log(`  Stripe Checkout Session URL: ${stripeSession.url}`);

    // Simulate clicking "Pay Now" on the Stripe checkout sandbox page
    // Triggering the mock webhook processor (POST /api/payments/stripe/trigger-webhook)
    console.log("  Simulating Stripe payment completion...");
    const payRes = await fetch(`${BASE_URL}/payments/stripe/trigger-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `orderId=${order.id}&sessionId=${stripeSession.sessionId}`
    });
    if (!payRes.ok) throw new Error(`Failed to simulate payment: ${await payRes.text()}`);
    
    // Fetch the updated order to confirm payment details and status
    const checkOrderRes = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const allOrders = await checkOrderRes.json();
    const updatedOrder = allOrders.find(o => o.id === order.id);
    console.log(`  Updated Order status: ${updatedOrder.status}, PaymentStatus: ${updatedOrder.customer.paymentStatus}, PayoutSettled: ${updatedOrder.payoutSettled}`);

    if (updatedOrder.customer.paymentStatus !== 'Paid' || !updatedOrder.payoutSettled) {
        throw new Error("Expected order to be marked Paid and payout settled after Stripe webhook trigger.");
    }
    
    // Verify ledger accounting credit/debit entries were logged
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@luxe.com', password: 'admin123' })
    });
    const { token: adminToken } = await adminLogin.json();
    const ledgerRes = await fetch(`${BASE_URL}/admin/ledger`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ledger = await ledgerRes.json();
    const stripeLedgerEntries = ledger.filter(l => l.orderId === order.id && l.type.startsWith('stripe_'));
    console.log(`  Ledger credit/debit transaction lines logged: ${stripeLedgerEntries.length}`);
    if (stripeLedgerEntries.length !== 2) {
        throw new Error("Expected precisely 2 ledger entries (debit and credit) for the Stripe transaction.");
    }
    console.log("PASS: Stripe sandbox payment checkout flow & double-entry ledger bookkeeping verified.");

    // Step 4: Test Background Timeout cancellation queue
    console.log("\n4. Testing Background Queue Timeout cancellation...");
    // Let's create a new pending order
    const pendingOrderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-1', name: 'Premium Full Cream Milk', price: 68.00, quantity: 1 }
            ],
            deliveryFee: 20,
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "cod"
            }
        })
    });
    const pendingOrder = await pendingOrderRes.json();
    console.log(`  New pending timeout order ID: ${pendingOrder.id}, Status: ${pendingOrder.status}`);

    // Call our test queue trigger route to schedule cancellation in 1 second
    console.log("  Requesting 1-second auto-cancellation timer via test queue route...");
    const scheduleRes = await fetch(`${BASE_URL}/test/queue-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pendingOrder.id, delayMs: 1000 })
    });
    if (!scheduleRes.ok) throw new Error("Failed to request queue job schedule");

    // Wait 2 seconds and verify if order is cancelled
    console.log("  Waiting for queue worker to process cancellation...");
    await new Promise(r => setTimeout(r, 2000));

    const checkTimeoutOrderRes = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const allOrdersAfter = await checkTimeoutOrderRes.json();
    const timedOutOrder = allOrdersAfter.find(o => o.id === pendingOrder.id);
    console.log(`  Order status after wait: ${timedOutOrder.status}`);
    
    if (timedOutOrder.status !== 'Cancelled') {
        throw new Error("Expected background worker to automatically cancel the order after timeout delay.");
    }
    console.log("PASS: Background worker cancellation timer successfully executed.");

    // Clean up
    socket.disconnect();
    console.log("\nALL PHASE 15 SOCKETS, QUEUES & PAYMENTS TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
