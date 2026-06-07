// test_extended_features.js - Verify Admin Banners, Merchant Coupons, Storefront Checkout & Referrals
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Extended Marketing, Coupons & Referrals Verification Test ===");

    // Step 1: Logins
    console.log("\n1. Logging in default admin, customer, and merchants...");
    
    // Log in Admin
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@luxe.com', password: 'admin123' })
    });
    if (!adminLogin.ok) throw new Error("Admin login failed");
    const adminToken = (await adminLogin.json()).token;
    console.log("Admin logged in successfully.");

    // Log in Dairy Merchant
    const dairyLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dairy@luxe.com', password: 'admin123' })
    });
    if (!dairyLogin.ok) throw new Error("Dairy Merchant login failed");
    const { token: dairyToken, user: dairyUser } = await dairyLogin.json();
    console.log(`Dairy Merchant logged in successfully. Store ID: ${dairyUser.storeId}`);

    // Log in Artisan Merchant
    const artisanLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'artisan@luxe.com', password: 'admin123' })
    });
    if (!artisanLogin.ok) throw new Error("Artisan Merchant login failed");
    const { token: artisanToken, user: artisanUser } = await artisanLogin.json();
    console.log(`Artisan Merchant logged in successfully. Store ID: ${artisanUser.storeId}`);

    // Log in a default customer
    const customerLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul@luxe.com', password: 'admin123' })
    });
    if (!customerLogin.ok) throw new Error("Customer login failed");
    const customerToken = (await customerLogin.json()).token;
    console.log("Customer logged in successfully.");


    // --- TEST 1: ADMIN PROMOTIONAL BANNERS CRUD ---
    console.log("\n--- TEST 1: Verifying Admin Banners CRUD ---");
    
    // Get initial active banners
    const initBannersRes = await fetch(`${BASE_URL}/banners`);
    if (!initBannersRes.ok) throw new Error("Failed to get initial banners");
    const initBanners = await initBannersRes.json();
    console.log(`Initial active banners count: ${initBanners.length}`);

    // Create a new banner
    const bannerPayload = {
        text: "Automated Test Banner: 50% discount on fresh milk!",
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200",
        linkUrl: "/store-1",
        active: true
    };
    const createBannerRes = await fetch(`${BASE_URL}/banners`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(bannerPayload)
    });
    if (!createBannerRes.ok) throw new Error(`Failed to create banner: ${await createBannerRes.text()}`);
    const newBanner = await createBannerRes.json();
    console.log(`Created banner successfully. ID: ${newBanner.id}`);

    // Unauthorized attempt to create banner (using customer token)
    const badBannerRes = await fetch(`${BASE_URL}/banners`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify(bannerPayload)
    });
    console.log(`Unauthorized banner creation response status: ${badBannerRes.status}`);
    if (badBannerRes.status !== 403) throw new Error("Expected 403 Forbidden for customer banner creation");

    // Fetch active banners again to verify addition
    const postBannersRes = await fetch(`${BASE_URL}/banners`);
    const postBanners = await postBannersRes.json();
    console.log(`Active banners count after creation: ${postBanners.length}`);
    const addedBanner = postBanners.find(b => b.id === newBanner.id);
    if (!addedBanner) throw new Error("Created banner not found in active banners list!");
    if (addedBanner.text !== bannerPayload.text) throw new Error("Banner text does not match!");

    // Delete banner
    const deleteBannerRes = await fetch(`${BASE_URL}/banners/${newBanner.id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });
    if (!deleteBannerRes.ok) throw new Error("Failed to delete banner");
    console.log("Deleted banner successfully.");

    // Fetch active banners again to verify deletion
    const finalBannersRes = await fetch(`${BASE_URL}/banners`);
    const finalBanners = await finalBannersRes.json();
    if (finalBanners.some(b => b.id === newBanner.id)) throw new Error("Deleted banner still exists in active banners list!");
    console.log("PASS: Admin Banners CRUD verified successfully.");


    // --- TEST 2: MERCHANT COUPON MANAGER & ISOLATION ---
    console.log("\n--- TEST 2: Verifying Merchant Coupon CRUD & Isolation ---");
    
    // Create a voucher for Dairy store using Dairy Merchant token
    const dairyVoucherCode = 'DAIRYTEST10';
    const createVoucherPayload = {
        code: dairyVoucherCode,
        discountType: 'percent',
        value: 10,
        minOrderValue: 100,
        desc: '10% off on GreenValley Dairy Boutique'
    };
    const createVoucherRes = await fetch(`${BASE_URL}/vouchers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dairyToken}`
        },
        body: JSON.stringify(createVoucherPayload)
    });
    if (!createVoucherRes.ok) throw new Error(`Failed to create merchant voucher: ${await createVoucherRes.text()}`);
    const createdVoucher = await createVoucherRes.json();
    console.log(`Created Dairy voucher successfully: ${createdVoucher.code}, StoreID: ${createdVoucher.storeId}`);
    if (createdVoucher.storeId !== dairyUser.storeId) {
        throw new Error("Created voucher storeId does not match merchant's storeId");
    }

    // Verify Artisan Merchant cannot see Dairy Merchant's voucher
    const artisanVouchersRes = await fetch(`${BASE_URL}/vouchers`, {
        headers: { 'Authorization': `Bearer ${artisanToken}` }
    });
    const artisanVouchers = await artisanVouchersRes.json();
    const hasDairyVoucher = artisanVouchers.some(v => v.code === dairyVoucherCode);
    console.log(`Artisan Merchant sees Dairy's voucher: ${hasDairyVoucher}`);
    if (hasDairyVoucher) throw new Error("SECURITY FAIL: Artisan Merchant sees Dairy Merchant's voucher!");

    // Verify Artisan Merchant cannot delete Dairy Merchant's voucher
    const badDeleteVoucherRes = await fetch(`${BASE_URL}/vouchers/${dairyVoucherCode}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${artisanToken}` }
    });
    console.log(`Artisan delete Dairy voucher status: ${badDeleteVoucherRes.status}`);
    if (badDeleteVoucherRes.status !== 403) throw new Error("Expected 403 Forbidden for unauthorized voucher deletion");

    console.log("PASS: Merchant voucher isolation verified successfully.");


    // --- TEST 3: STORE-SPECIFIC CHECKOUT VALIDATION & SPLIT ---
    console.log("\n--- TEST 3: Verifying Checkout with Store-Specific Coupon ---");

    // We will place a combined checkout order:
    // - Dairy (store-1): 1 x Greek Yogurt (₹120)
    // - Artisan (store-3): 1 x Sourdough (₹160)
    // Apply coupon: DAIRYTEST10 (10% off, min subtotal ₹100 for store-1)
    // Total subtotal: 120 + 160 = ₹280.
    // Dairy subtotal: 120 (qualifies for coupon).
    // Artisan subtotal: 160.
    // Expected total discount: 10% of 120 = ₹12.00.
    // Pro-ration check: The discount must NOT be pro-rated. Dairy sub-order must get full ₹12 discount, and Artisan sub-order gets ₹0.
    
    const checkoutRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
            items: [
                { id: 'p1-2', productId: 'p1-2', name: 'Organic Greek Yogurt', price: 120.00, quantity: 1, emoji: '🍦', storeId: 'store-1', storeName: 'GreenValley Dairy Boutique', storeDistance: 1.5 },
                { id: 'p3-1', productId: 'p3-1', name: 'Sourdough Country Loaf', price: 160.00, quantity: 1, emoji: '🍞', storeId: 'store-3', storeName: 'Artisan Crumb & Grain', storeDistance: 3.2 }
            ],
            deliveryFee: 40, // Base delivery
            discount: 12.00, // Client calculated discount (10% of 120)
            voucherCode: dairyVoucherCode,
            customer: {
                name: "Rahul Sharma",
                phone: "+91 98765 43210",
                address: "Sector 4, HSR Layout, Bengaluru",
                payment: "cod"
            }
        })
    });
    if (!checkoutRes.ok) throw new Error(`Combined checkout failed: ${await checkoutRes.text()}`);
    const masterOrder = await checkoutRes.json();
    console.log(`Checkout success! Master Order ID: ${masterOrder.id}`);
    
    if (!masterOrder.isMaster || !masterOrder.subOrders || masterOrder.subOrders.length !== 2) {
        throw new Error("Expected checkout split into exactly 2 sub-orders");
    }

    const subOrderDairy = masterOrder.subOrders.find(o => o.storeId === 'store-1');
    const subOrderArtisan = masterOrder.subOrders.find(o => o.storeId === 'store-3');

    console.log(`Dairy Sub-Order -> Subtotal: ₹${subOrderDairy.subtotal}, Discount: ₹${subOrderDairy.discount}`);
    console.log(`Artisan Sub-Order -> Subtotal: ₹${subOrderArtisan.subtotal}, Discount: ₹${subOrderArtisan.discount}`);

    if (subOrderDairy.discount !== 12.00) {
        throw new Error(`Expected Dairy Sub-Order to get full discount of ₹12.00, got ₹${subOrderDairy.discount}`);
    }
    if (subOrderArtisan.discount !== 0) {
        throw new Error(`Expected Artisan Sub-Order to get discount of ₹0, got ₹${subOrderArtisan.discount}`);
    }

    console.log("PASS: Store-specific checkout validation and split pro-ration bypass passed.");


    // --- TEST 4: USER REFERRAL SYSTEM FLOW ---
    console.log("\n--- TEST 4: Verifying User Referral System Flow ---");

    const uniqueReferrerEmail = `referrer_${Date.now()}@luxe.com`;
    const uniqueRefereeEmail = `referee_${Date.now()}@luxe.com`;

    // 1. Register a new customer as Referrer
    console.log(`Registering new referrer user: ${uniqueReferrerEmail}...`);
    const regReferrerRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: uniqueReferrerEmail,
            password: 'admin123',
            role: 'customer',
            name: 'Referrer User',
            phone: '+91 99999 11111'
        })
    });
    if (!regReferrerRes.ok) throw new Error(`Referrer registration failed: ${await regReferrerRes.text()}`);
    const { token: referrerToken } = await regReferrerRes.json();

    // 2. Fetch referrer details to get their generated referral code
    const referrerProfileRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${referrerToken}` }
    });
    const referrerProfile = await referrerProfileRes.json();
    const referrerRefCode = referrerProfile.referralCode;
    const initialReferrerWallet = referrerProfile.walletBalance || 0;
    console.log(`Referrer registered. Referral Code: ${referrerRefCode}, Initial Wallet: ₹${initialReferrerWallet}`);
    if (!referrerRefCode) throw new Error("Expected referrer to have a generated referralCode");

    // 3. Register a new customer as Referee using referrer's code
    console.log(`Registering new referee user using code ${referrerRefCode}...`);
    const regRefereeRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: uniqueRefereeEmail,
            password: 'admin123',
            role: 'customer',
            name: 'Referee User',
            phone: '+91 99999 22222',
            referralCode: referrerRefCode
        })
    });
    if (!regRefereeRes.ok) throw new Error(`Referee registration failed: ${await regRefereeRes.text()}`);
    const { token: refereeToken, user: refereeUser } = await regRefereeRes.json();

    // 4. Fetch referee profile and assert they received ₹100 pre-credit
    const refereeProfileRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${refereeToken}` }
    });
    const refereeProfile = await refereeProfileRes.json();
    console.log(`Referee registered. Wallet balance: ₹${refereeProfile.walletBalance}`);
    if (refereeProfile.walletBalance !== 100.00) {
        throw new Error(`Expected referee to have pre-credited ₹100.00, got ₹${refereeProfile.walletBalance}`);
    }

    // 5. Referee places their first order
    console.log("Referee placing their first order...");
    const refereeOrderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refereeToken}`
        },
        body: JSON.stringify({
            storeId: 'store-1',
            items: [
                { id: 'p1-2', productId: 'p1-2', name: 'Organic Greek Yogurt', price: 120.00, quantity: 2, emoji: '🍦', storeId: 'store-1', storeName: 'GreenValley Dairy Boutique', storeDistance: 1.5 }
            ],
            deliveryFee: 20.00,
            discount: 0,
            voucherCode: '',
            customer: {
                name: "Referee User",
                phone: "+91 99999 22222",
                address: "HSR Layout, Bengaluru",
                payment: "cod"
            }
        })
    });
    if (!refereeOrderRes.ok) throw new Error(`Referee order placement failed: ${await refereeOrderRes.text()}`);
    const refereeOrder = await refereeOrderRes.json();
    console.log(`Referee order placed successfully. ID: ${refereeOrder.id}, Status: ${refereeOrder.status}`);

    // Since the order is split (even for single store it might return master order or single order depending on backend config),
    // let's retrieve the actual order ID to update. If it's master order, let's find the sub-order ID.
    const orderIdToDeliver = refereeOrder.isMaster ? refereeOrder.subOrders[0].id : refereeOrder.id;

    // 6. Update order status to Delivered (using Dairy Merchant token)
    console.log(`Dairy Merchant updating referee order status to Delivered...`);
    const statusUpdateRes = await fetch(`${BASE_URL}/orders/${orderIdToDeliver}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dairyToken}`
        },
        body: JSON.stringify({
            status: 'Delivered',
            description: 'Order delivered successfully by rider.'
        })
    });
    if (!statusUpdateRes.ok) throw new Error(`Failed to deliver referee order: ${await statusUpdateRes.text()}`);
    const updatedOrder = await statusUpdateRes.json();
    console.log(`Order status updated to: ${updatedOrder.status}`);

    // 7. Fetch referrer details again and assert they received ₹50 reward
    const postReferrerProfileRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${referrerToken}` }
    });
    const postReferrerProfile = await postReferrerProfileRes.json();
    const expectedReferrerWallet = initialReferrerWallet + 50.00;
    console.log(`Referrer final wallet balance: ₹${postReferrerProfile.walletBalance}`);
    if (postReferrerProfile.walletBalance !== expectedReferrerWallet) {
        throw new Error(`Expected referrer wallet to be ₹${expectedReferrerWallet}, got ₹${postReferrerProfile.walletBalance}`);
    }

    // 8. Retrieve admin ledger and verify the referral_reward ledger entry
    console.log("Admin checking ledger entries for referral_reward...");
    const ledgerRes = await fetch(`${BASE_URL}/admin/ledger`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const ledger = await ledgerRes.json();
    const rewardEntry = ledger.find(l => l.orderId === orderIdToDeliver && l.type === 'referral_reward');
    if (!rewardEntry) {
        throw new Error("Expected to find a referral_reward ledger entry for this order");
    }
    console.log(`Found ledger entry: ID: ${rewardEntry.id}, Description: "${rewardEntry.description}"`);
    if (rewardEntry.debit !== 50.00) {
        throw new Error(`Expected debit amount of ₹50.00, got ₹${rewardEntry.debit}`);
    }

    console.log("PASS: User Referral system flow and rewards verified successfully.");


    // Cleanup Dairy Voucher
    console.log("\nCleaning up: deleting Dairy Voucher...");
    const deleteVoucherRes = await fetch(`${BASE_URL}/vouchers/${dairyVoucherCode}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${dairyToken}` }
    });
    if (deleteVoucherRes.ok) {
        console.log("Dairy Voucher deleted successfully.");
    }

    console.log("\nALL EXTENDED MARKETING AND REFERRAL TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
