// test_security.js - Validate Helmet headers, input sanitization, and API route schemas
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer API Security Hardening & Input Validation Test ===");

    // 1. Verify Helmet Security Headers
    console.log("\n1. Verifying Helmet security headers on API responses...");
    const pingRes = await fetch(`${BASE_URL}/stores`);
    if (!pingRes.ok) throw new Error("Failed to contact API");
    
    const headers = pingRes.headers;
    const helmetHeaders = [
        'x-dns-prefetch-control',
        'x-frame-options',
        'content-security-policy',
        'x-content-type-options',
        'cross-origin-resource-policy'
    ];
    
    let headersFound = 0;
    helmetHeaders.forEach(h => {
        if (headers.has(h)) {
            console.log(`  Header found: ${h} -> ${headers.get(h)}`);
            headersFound++;
        }
    });
    
    if (headersFound < 3) {
        throw new Error("Failed: Helmet security headers are missing or not properly applied!");
    }
    console.log("PASS: Helmet headers successfully verified.");

    // 2. Validate Registration Inputs
    console.log("\n2. Testing invalid user registration payloads...");
    
    // Test 2.1: Invalid Email Address Format
    console.log("Testing invalid email registration...");
    const badEmailRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'bad-email-format',
            password: 'adminpassword',
            role: 'customer',
            name: 'Security Test'
        })
    });
    
    console.log(`  Response status: ${badEmailRes.status}`);
    const badEmailData = await badEmailRes.json();
    console.log("  Response body:", badEmailData);
    if (badEmailRes.status !== 400 || !badEmailData.error.toLowerCase().includes('email')) {
        throw new Error("Failed: Expected registration to block invalid email formats with 400 Bad Request");
    }
    console.log("PASS: Invalid email format blocked successfully.");

    // Test 2.2: Short password
    console.log("Testing short password registration (less than 6 chars)...");
    const badPwdRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test_sec_pwd@luxe.com',
            password: '123',
            role: 'customer',
            name: 'Security Test'
        })
    });
    
    console.log(`  Response status: ${badPwdRes.status}`);
    const badPwdData = await badPwdRes.json();
    console.log("  Response body:", badPwdData);
    if (badPwdRes.status !== 400 || !badPwdData.error.toLowerCase().includes('password')) {
        throw new Error("Failed: Expected registration to block short passwords with 400 Bad Request");
    }
    console.log("PASS: Weak/short password blocked successfully.");

    // 3. Test HTML/XSS Sanitization
    console.log("\n3. Testing input sanitization against XSS injection vectors...");
    const xssEmail = `xss_${Date.now()}@luxe.com`;
    const xssName = '<script>alert("XSS Vulnerability")</script> Name';
    
    const xssRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: xssEmail,
            password: 'adminpassword123',
            role: 'customer',
            name: xssName
        })
    });
    
    if (!xssRegisterRes.ok) {
        throw new Error(`XSS register request failed: ${await xssRegisterRes.text()}`);
    }
    
    const xssUserData = await xssRegisterRes.json();
    console.log("  Registered name in token response:", xssUserData.user.name);
    
    if (xssUserData.user.name.includes('<script>') || xssUserData.user.name.includes('</script>')) {
        throw new Error("Failed: Script tags were not properly sanitized in user registration!");
    }
    console.log("PASS: User name input successfully sanitized and script tags replaced.");

    // 4. Test Catalog Product Validations
    console.log("\n4. Testing catalog product validation boundaries...");
    // First, login as merchant to get token
    const merchantLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    if (!merchantLogin.ok) throw new Error("Failed merchant authentication");
    const { token: merchantToken } = await merchantLogin.json();

    // Test 4.1: Negative price
    console.log("Testing product creation with negative price...");
    const badPriceRes = await fetch(`${BASE_URL}/stores/store-1/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
            name: 'Unsafe Milk',
            category: 'dairy',
            price: -15.00,
            stock: 20
        })
    });
    
    console.log(`  Response status: ${badPriceRes.status}`);
    const badPriceData = await badPriceRes.json();
    console.log("  Response body:", badPriceData);
    if (badPriceRes.status !== 400 || !badPriceData.error.toLowerCase().includes('price')) {
        throw new Error("Failed: Expected negative product prices to be blocked with 400 Bad Request");
    }
    console.log("PASS: Negative product price blocked successfully.");

    // 5. Test Order Placement Validations
    console.log("\n5. Testing order placement validations...");
    // Login customer
    const customerLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    const { token: customerToken } = await customerLogin.json();

    // Test 5.1: Empty items list order
    console.log("Testing checkout order with empty items list...");
    const badOrderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [],
            deliveryFee: 20,
            discount: 0,
            customer: {
                name: "Test Customer",
                phone: "+91 99999 99999",
                address: "HSR Layout",
                payment: "cod"
            }
        })
    });
    
    console.log(`  Response status: ${badOrderRes.status}`);
    const badOrderData = await badOrderRes.json();
    console.log("  Response body:", badOrderData);
    if (badOrderRes.status !== 400 || !badOrderData.error.toLowerCase().includes('item')) {
        throw new Error("Failed: Expected order checkout with empty items to be blocked with 400 Bad Request");
    }
    console.log("PASS: Empty order placement blocked successfully.");

    // Test 5.2: Invalid payment method
    console.log("Testing checkout order with invalid payment method...");
    const badPaymentRes = await fetch(`${BASE_URL}/orders`, {
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
            customer: {
                name: "Test Customer",
                phone: "+91 99999 99999",
                address: "HSR Layout",
                payment: "invalid_payment_method"
            }
        })
    });
    
    console.log(`  Response status: ${badPaymentRes.status}`);
    const badPaymentData = await badPaymentRes.json();
    console.log("  Response body:", badPaymentData);
    if (badPaymentRes.status !== 400 || !badPaymentData.error.toLowerCase().includes('payment')) {
        throw new Error("Failed: Expected order checkout with invalid payment method to be blocked with 400 Bad Request");
    }
    console.log("PASS: Invalid payment method blocked successfully.");

    console.log("\nALL SECURITY HARDENING AND ROUTE SCHEMA VALIDATION TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
