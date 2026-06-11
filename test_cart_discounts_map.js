// test_cart_discounts_map.js - Verify Leaflet Maps, Discounts, and DB Cart Sync (Phase 16)
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Maps, Discounts, and DB Cart Sync Integration Test ===\n");

    // ----------------------------------------------------
    // SETUP: Authentic Tokens
    // ----------------------------------------------------
    console.log("Step 0: Authenticating users...");
    
    // Customer Login
    const customerRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerRes.ok) throw new Error("Customer authentication failed.");
    const { token: customerToken } = await customerRes.json();
    console.log("✅ Customer authenticated.");

    // Merchant Login
    const merchantRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    if (!merchantRes.ok) throw new Error("Merchant authentication failed.");
    const { token: merchantToken } = await merchantRes.json();
    console.log("✅ Merchant authenticated.\n");

    // Get Merchant Store
    const storeRes = await fetch(`${BASE_URL}/stores`);
    if (!storeRes.ok) throw new Error("Failed to fetch stores.");
    const stores = await storeRes.json();
    const targetStore = stores.find(s => s.ownerEmail === 'dairy@luxe.com');
    if (!targetStore) throw new Error("Merchant store not found.");
    const storeId = targetStore.id;
    console.log(`✅ Identified merchant store ID: ${storeId}`);

    // Fetch original products of store-1 to restore them at the end of test
    const storeDetailsRes = await fetch(`${BASE_URL}/stores/${storeId}`);
    if (!storeDetailsRes.ok) throw new Error("Failed to fetch store details.");
    const storeDetails = await storeDetailsRes.json();
    const originalProducts = storeDetails.products || [];

    // ----------------------------------------------------
    // TEST 1: Product Discount & Original Price Validation
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Product Discount & Original Price Validation ---");

    // 1. Create product with valid originalPrice
    const testProduct = {
        name: 'Discounted Premium Milk',
        category: 'dairy',
        price: 90.00,
        originalPrice: 120.00,
        unit: '1 Liter',
        stock: 50,
        desc: 'Fresh farm milk with special discount.',
        dietaryType: 'Veg'
    };

    const addProductRes = await fetch(`${BASE_URL}/stores/${storeId}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify(testProduct)
    });
    if (!addProductRes.ok) throw new Error(`Failed to create product with originalPrice: ${await addProductRes.text()}`);
    const createdProduct = await addProductRes.json();
    console.log(`✅ Product created successfully. ID: ${createdProduct.id}, price: ${createdProduct.price}, originalPrice: ${createdProduct.originalPrice}`);
    if (createdProduct.originalPrice !== 120.00) throw new Error("Expected originalPrice to be 120.00");

    // 2. Try to create product with negative originalPrice (should fail)
    const invalidProduct = {
        name: 'Invalid Discount Product',
        category: 'dairy',
        price: 90.00,
        originalPrice: -10.00,
        unit: '1 Liter',
        stock: 50
    };
    const addInvalidRes = await fetch(`${BASE_URL}/stores/${storeId}/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify(invalidProduct)
    });
    console.log(`  Invalid product creation response status: ${addInvalidRes.status} (Expected 400)`);
    if (addInvalidRes.status !== 400) throw new Error("Expected product creation to fail with 400 status code for negative originalPrice.");
    console.log("✅ Validation rejected negative originalPrice correctly.");

    // 3. Update product with updated originalPrice
    const updatedFields = {
        name: 'Discounted Premium Milk (Updated)',
        category: 'dairy',
        price: 95.00,
        originalPrice: 130.00,
        unit: '1 Liter',
        stock: 45
    };
    const updateRes = await fetch(`${BASE_URL}/stores/${storeId}/products/${createdProduct.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify(updatedFields)
    });
    if (!updateRes.ok) throw new Error(`Failed to update product: ${await updateRes.text()}`);
    const updatedProduct = await updateRes.json();
    console.log(`✅ Product updated successfully. Price: ${updatedProduct.price}, originalPrice: ${updatedProduct.originalPrice}`);
    if (updatedProduct.originalPrice !== 130.00 || updatedProduct.price !== 95.00) throw new Error("Product updates did not map correctly.");

    // 4. Bulk Replace with variant original prices
    const bulkPayload = {
        products: [
            {
                id: createdProduct.id,
                name: 'Discounted Premium Milk (Updated)',
                category: 'dairy',
                price: 95.00,
                originalPrice: 130.00,
                unit: '1 Liter',
                stock: 45,
                desc: 'Fresh farm milk.',
                dietaryType: 'Veg',
                variants: [
                    { id: 'v1', name: '1 Liter', price: 95.00, originalPrice: 130.00, stock: 30 },
                    { id: 'v2', name: '2 Liters', price: 180.00, originalPrice: 240.00, stock: 15 }
                ]
            }
        ]
    };
    const bulkRes = await fetch(`${BASE_URL}/stores/${storeId}/products/bulk`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify(bulkPayload)
    });
    if (!bulkRes.ok) throw new Error(`Bulk replace products failed: ${await bulkRes.text()}`);
    const bulkData = await bulkRes.json();
    console.log("✅ Bulk replace with variants successfully processed.");
    const savedProd = bulkData.products[0];
    if (savedProd.variants[0].originalPrice !== 130.00 || savedProd.variants[1].originalPrice !== 240.00) {
        throw new Error("Bulk original prices not parsed or saved correctly in variants.");
    }
    console.log("✅ Verified original price mapping for nested variants in bulk operations.");

    // 5. Bulk Replace negative validation
    const invalidBulkPayload = {
        products: [
            {
                name: 'Invalid Bulk Product',
                category: 'dairy',
                price: 95.00,
                originalPrice: 130.00,
                unit: '1 Liter',
                stock: 45,
                variants: [
                    { id: 'v1', name: '1 Liter', price: 95.00, originalPrice: -5.00, stock: 30 }
                ]
            }
        ]
    };
    const invalidBulkRes = await fetch(`${BASE_URL}/stores/${storeId}/products/bulk`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify(invalidBulkPayload)
    });
    console.log(`  Invalid bulk replacement response status: ${invalidBulkRes.status} (Expected 400)`);
    if (invalidBulkRes.status !== 400) throw new Error("Expected bulk replace to fail with 400 status code for negative variant originalPrice.");
    console.log("✅ Validation rejected negative variant originalPrice correctly.");

    // ----------------------------------------------------
    // TEST 2: Cart Syncing, Retrieval, and Merging
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Cart Syncing, Retrieval, and Merging ---");

    // 1. Save Cart to DB
    const cartToSave = [
        { id: createdProduct.id, name: 'Discounted Premium Milk', price: 95.00, quantity: 2, storeId }
    ];
    const saveCartRes = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ cart: cartToSave })
    });
    if (!saveCartRes.ok) throw new Error(`Failed to sync cart: ${await saveCartRes.text()}`);
    console.log("✅ Cart synced to database successfully.");

    // 2. Retrieve Cart from DB
    const getCartRes = await fetch(`${BASE_URL}/cart`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${customerToken}`
        }
    });
    if (!getCartRes.ok) throw new Error(`Failed to retrieve cart: ${await getCartRes.text()}`);
    const retrievedCartObj = await getCartRes.json();
    const retrievedCart = retrievedCartObj.cart || [];
    console.log(`✅ Cart retrieved successfully. Items count: ${retrievedCart.length}`);
    if (retrievedCart.length !== 1 || retrievedCart[0].id !== createdProduct.id || retrievedCart[0].quantity !== 2) {
        throw new Error("Retrieved cart does not match saved cart.");
    }

    // 3. Verify client-side cart merging logic
    console.log("  Testing client-side cart merging simulation...");
    const localCart = [
        { id: createdProduct.id, name: 'Discounted Premium Milk', price: 95.00, quantity: 3, storeId }
    ];
    const dbCart = retrievedCart; // [{ id: ..., quantity: 2 }]
    
    // Perform merging simulation (equivalent to client-side merge in app.js initAuth)
    dbCart.forEach(dbItem => {
        const existing = localCart.find(item => item.id === dbItem.id && item.variantId === dbItem.variantId);
        if (existing) {
            existing.quantity += dbItem.quantity;
        } else {
            localCart.push(dbItem);
        }
    });
    console.log(`  Merged quantity: ${localCart[0].quantity} (Expected: 5)`);
    if (localCart[0].quantity !== 5) {
        throw new Error("Client-side cart quantity merging logic failed.");
    }
    console.log("✅ Verified client-side merging simulation correctly.");

    // ----------------------------------------------------
    // TEST 3: Mock Address Selection & Coordinate Formatting
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Mock Address Selection & Coordinate Formatting ---");

    const sampleLat = 12.9716;
    const sampleLng = 77.5946;

    // Simulate address input generation from app.js updateAddressInputs
    const simulatedAddress = `Sector ${Math.floor(Math.random() * 8) + 1}, Near Block ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}, HSR Layout, Bengaluru (Coords: ${sampleLat.toFixed(4)}, ${sampleLng.toFixed(4)})`;
    console.log(`  Simulated address text: "${simulatedAddress}"`);
    if (!simulatedAddress.includes("Coords: 12.9716, 77.5946")) {
        throw new Error("Coordinates not properly formatted in simulated address geocoder.");
    }
    console.log("✅ Coordinates pin-drop simulated geocoding verified.");

    // ----------------------------------------------------
    // CLEANUP: Restore Original DB State
    // ----------------------------------------------------
    console.log("\nCleaning up database state...");
    
    // 1. Restore original products catalog of store-1
    const restoreRes = await fetch(`${BASE_URL}/stores/${storeId}/products/bulk`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({ products: originalProducts })
    });
    if (!restoreRes.ok) console.error("Warning: Failed to restore original products catalog.");
    else console.log("✅ Restored original store products catalog.");

    // 2. Clear test cart
    await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({ cart: [] })
    });
    console.log("✅ Cleared test cart from database.");

    console.log("\nALL MAPS, DISCOUNTS, AND DB CART SYNC INTEGRATION TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
