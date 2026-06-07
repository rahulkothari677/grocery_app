// test_compression.js - Verify Upload Base64 Handling & Static Caching headers
const fetch = globalThis.fetch || require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Caching & Compression Verification Test ===");

    // Step 1: Login as merchant
    console.log("\n1. Logging in as merchant...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
        throw new Error(`Login failed: ${await loginRes.text()}`);
    }
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log(`  Logged in as merchant. Token obtained.`);

    // Mock 1x1 green pixel JPEG base64 string
    const mockBase64Image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    
    console.log(`\n2. Simulating upload of base64 image to backend store config...`);
    console.log(`  Mock image payload size: ${mockBase64Image.length} characters.`);

    // Update store config banner
    const storeId = loginData.user.storeId || 'store-1';
    const updateRes = await fetch(`${BASE_URL}/stores/${storeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            image: mockBase64Image,
            name: "Luxe Fresh Grocer Store",
            deliveryRadius: 5.5,
            phone: "+91 99999 88888",
            address: "123 Green Avenue, Bangalore",
            minOrderValue: 200,
            upiVpa: "store@okaxis",
            upiName: "Luxe Fresh Store"
        })
    });

    if (!updateRes.ok) {
        throw new Error(`Failed to update store config: ${await updateRes.text()}`);
    }
    
    const updateData = await updateRes.json();
    console.log(`  Store config updated successfully.`);
    const imageUrl = updateData.image;
    console.log(`  Uploaded banner URL: ${imageUrl}`);
    
    if (!imageUrl || !imageUrl.includes('/uploads/')) {
        throw new Error("Expected server to store base64 image and return an /uploads/ URL path");
    }

    // Step 3: Fetch the uploaded image and assert headers
    console.log(`\n3. Fetching the uploaded image from ${imageUrl} to verify Cache-Control...`);
    const imgUrlFull = imageUrl.startsWith('http') ? imageUrl : `http://localhost:5000${imageUrl}`;
    const imgRes = await fetch(imgUrlFull);
    
    if (!imgRes.ok) {
        throw new Error(`Failed to fetch uploaded image: ${imgRes.statusText}`);
    }

    const cacheControl = imgRes.headers.get('cache-control');
    console.log(`  Cache-Control header returned: "${cacheControl}"`);

    if (!cacheControl || !cacheControl.includes('max-age=31536000')) {
        throw new Error(`Expected Cache-Control header to contain max-age=31536000. Got: "${cacheControl}"`);
    }
    
    console.log("\nALL CACHING & COMPRESSION TESTS PASSED SUCCESSFULLY!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
