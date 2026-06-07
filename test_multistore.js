// test_multistore.js - Verify Multi-Store Cart Splits & Checkout Isolation
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Multi-Store Checkout & Merchant Isolation Verification Test ===");

    // Step 1: Login Customers and Merchants
    console.log("\n1. Logging in users...");
    const customerLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerLogin.ok) throw new Error("Customer login failed");
    const { token: customerToken } = await customerLogin.json();
    console.log("Customer logged in successfully.");

    const dairyMerchantLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    if (!dairyMerchantLogin.ok) throw new Error("Dairy Merchant login failed");
    const { token: dairyToken } = await dairyMerchantLogin.json();
    console.log("Dairy Merchant logged in successfully.");

    const artisanMerchantLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'artisan@luxe.com', password: 'admin123' })
    });
    if (!artisanMerchantLogin.ok) throw new Error("Artisan Merchant login failed");
    const { token: artisanToken } = await artisanMerchantLogin.json();
    console.log("Artisan Merchant logged in successfully.");

    // --- TEST 1: PLACE COMBINED MULTI-STORE ORDER ---
    console.log("\n--- TEST 1: Placing a combined checkout order containing items from multiple stores ---");
    // Items:
    // - Store 1 (Dairy): 2 x Greek Yogurt (2 * ₹120 = ₹240)
    // - Store 3 (Artisan Bakery): 1 x Sourdough (1 * ₹160 = ₹160)
    // Cumulative subtotal: ₹400 (Qualifies for Free Delivery because subtotal >= 300!)
    const checkoutRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            items: [
                { id: 'p1-2', productId: 'p1-2', name: 'Organic Greek Yogurt', price: 120.00, quantity: 2, emoji: '🍦', storeId: 'store-1', storeName: 'GreenValley Dairy Boutique', storeDistance: 1.5 },
                { id: 'p3-1', productId: 'p3-1', name: 'Sourdough Country Loaf', price: 160.00, quantity: 1, emoji: '🍞', storeId: 'store-3', storeName: 'Artisan Crumb & Grain', storeDistance: 3.2 }
            ],
            deliveryFee: 0,
            discount: 50, // Applied ₹50 coupon
            voucherCode: 'WEEKEND50',
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "cod",
                tip: 30 // ₹30 rider tip support
            }
        })
    });
    if (!checkoutRes.ok) throw new Error(`Multi-store checkout failed: ${await checkoutRes.text()}`);
    const masterOrder = await checkoutRes.json();
    console.log(`Checkout success! Master Order ID: ${masterOrder.id}`);
    console.log(`Is Master Order? ${masterOrder.isMaster}`);
    console.log(`Number of split sub-orders: ${masterOrder.subOrders ? masterOrder.subOrders.length : 0}`);

    if (!masterOrder.isMaster || !masterOrder.subOrders || masterOrder.subOrders.length !== 2) {
        throw new Error("Expected checkout split into exactly 2 sub-orders under a MasterOrder");
    }

    const subOrder1 = masterOrder.subOrders[0];
    const subOrder2 = masterOrder.subOrders[1];

    console.log(`Sub-order 1 -> Store: ${subOrder1.storeName}, Items count: ${subOrder1.items.length}, Subtotal: ₹${subOrder1.subtotal}, Delivery: ₹${subOrder1.deliveryFee}, Discount: ₹${subOrder1.discount}`);
    console.log(`Sub-order 2 -> Store: ${subOrder2.storeName}, Items count: ${subOrder2.items.length}, Subtotal: ₹${subOrder2.subtotal}, Delivery: ₹${subOrder2.deliveryFee}, Discount: ₹${subOrder2.discount}`);

    // Verify Free Delivery was applied to both (since cumulative subtotal >= 300)
    if (subOrder1.deliveryFee !== 0 || subOrder2.deliveryFee !== 0) {
        throw new Error("Expected free delivery fee of ₹0 on both sub-orders");
    }

    // Verify pro-rated coupon discount:
    // Total subtotal = ₹400.
    // Store 1 subtotal = ₹240. Pro-rated discount = (240 / 400) * 50 = ₹30
    // Store 3 subtotal = ₹160. Pro-rated discount = (160 / 400) * 50 = ₹20
    if (subOrder1.discount !== 30 || subOrder2.discount !== 20) {
        throw new Error(`Expected pro-rated discounts to be ₹30 and ₹20, got ₹${subOrder1.discount} and ₹${subOrder2.discount}`);
    }

    // --- TEST 2: MERCHANT ISOLATION ---
    console.log("\n--- TEST 2: Verifying Merchant Fulfillments Isolation ---");
    
    // Dairy Merchant fetches their dashboard orders
    console.log("Fetching orders for Dairy Merchant...");
    const dairyOrdersRes = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${dairyToken}` }
    });
    const dairyOrders = await dairyOrdersRes.json();
    console.log(`Dairy Merchant has ${dairyOrders.length} orders in queue.`);
    
    const hasDairyChild = dairyOrders.some(o => o.id === subOrder1.id);
    const hasArtisanChildInDairy = dairyOrders.some(o => o.id === subOrder2.id);
    console.log(`  Does Dairy Merchant see their sub-order? ${hasDairyChild}`);
    console.log(`  Does Dairy Merchant see Artisan's sub-order? ${hasArtisanChildInDairy}`);
    
    if (!hasDairyChild) throw new Error("Dairy Merchant cannot find their sub-order!");
    if (hasArtisanChildInDairy) throw new Error("SECURITY FAIL: Dairy Merchant is able to see Artisan Merchant's sub-order!");

    // Artisan Merchant fetches their dashboard orders
    console.log("\nFetching orders for Artisan Merchant...");
    const artisanOrdersRes = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${artisanToken}` }
    });
    const artisanOrders = await artisanOrdersRes.json();
    console.log(`Artisan Merchant has ${artisanOrders.length} orders in queue.`);
    
    const hasArtisanChild = artisanOrders.some(o => o.id === subOrder2.id);
    const hasDairyChildInArtisan = artisanOrders.some(o => o.id === subOrder1.id);
    console.log(`  Does Artisan Merchant see their sub-order? ${hasArtisanChild}`);
    console.log(`  Does Artisan Merchant see Dairy's sub-order? ${hasDairyChildInArtisan}`);
    
    if (!hasArtisanChild) throw new Error("Artisan Merchant cannot find their sub-order!");
    if (hasDairyChildInArtisan) throw new Error("SECURITY FAIL: Artisan Merchant is able to see Dairy Merchant's sub-order!");

    console.log("\nPASS: ALL MULTI-STORE SPLIT AND ISOLATION TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
