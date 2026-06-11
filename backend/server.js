// server.js - LuxeGrocer Node.js/Express Backend Server
require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Fuse = require('fuse.js');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'luxegrocer-super-secret-jwt-key-2026';
const passwordRecoveryStore = {}; // Memory store for forgot-password OTPs (email -> { otp, expiry })

// Enable CORS as early as possible
app.use(cors());

// Helper to sanitize HTML inputs to prevent XSS
function sanitizeInput(val) {
    if (typeof val !== 'string') return val;
    return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

// Enable Helmet for security headers, allowing cross-origin resource requests for uploaded images
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Main API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'
});

// Auth-specific Rate Limiter (Brute-Force Protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // limit each IP to 25 attempts per windowMs
    message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '20mb' })); // Higher limit for Base64 image payloads

app.post('/api/debug-log', (req, res) => {
    console.log('[CLIENT DEBUG]', JSON.stringify(req.body));
    res.json({ success: true });
});

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        const bodyCopy = { ...req.body };
        if (bodyCopy.password) bodyCopy.password = '********';
        console.log('  Body:', JSON.stringify(bodyCopy));
    }
    next();
});

const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve static images from the uploads folder with caching headers
app.use('/uploads', express.static(UPLOADS_DIR, {
    maxAge: 31536000000, // 1 year in ms
    immutable: true,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
}));

// Default Seed Data matching store.js presets
const SEED_STORES = [
    {
        id: 'store-1',
        name: 'GreenValley Dairy Boutique',
        category: 'Dairy & Fresh Milk',
        rating: 4.9,
        reviewsCount: 128,
        image: 'assets/store_dairy.png',
        address: 'Sector 4, HSR Layout, Bengaluru',
        phone: '+91 98765 43210',
        deliveryRadius: 5.0,
        minOrderValue: 150,
        lat: 12.9141,
        lng: 77.6358,
        ownerEmail: 'dairy@luxe.com',
        upiVpa: 'dairy@paytm',
        upiName: 'GreenValley Dairy Boutique',
        products: [
            { 
                id: 'p1-1', 
                name: 'Premium Full Cream Milk', 
                category: 'dairy', 
                price: 68.00, 
                originalPrice: 75.00, 
                badgeText: 'Bestseller', 
                unit: '1 Liter', 
                stock: 50, 
                desc: 'Fresh farm-sourced pasteurized whole milk, rich in cream.', 
                rating: 4.8, 
                image: 'assets/prod_milk.png',
                variants: [
                    { id: 'p1-1-v1', name: '500ml', price: 36.00, stock: 30 },
                    { id: 'p1-1-v2', name: '1 Liter', price: 68.00, stock: 50 }
                ]
            },
            { id: 'p1-2', name: 'Organic Greek Yogurt', category: 'dairy', price: 120.00, originalPrice: 140.00, badgeText: 'Popular', unit: '400g', stock: 25, desc: 'Thick, creamy yogurt made from organic dairy culture.', rating: 4.9, image: 'assets/prod_yogurt.png' },
            { 
                id: 'p1-3', 
                name: 'Artisanal Butter (Salted)', 
                category: 'dairy', 
                price: 240.00, 
                originalPrice: 260.00, 
                badgeText: '', 
                unit: '250g', 
                stock: 15, 
                desc: 'Slow-churned, rich salted table butter with high fat content.', 
                rating: 4.7, 
                image: 'assets/prod_butter.png',
                variants: [
                    { id: 'p1-3-v1', name: '100g', price: 110.00, stock: 20 },
                    { id: 'p1-3-v2', name: '250g', price: 240.00, stock: 15 }
                ]
            },
            { id: 'p1-4', name: 'Fresh Paneer (Cottage Cheese)', category: 'dairy', price: 110.00, originalPrice: 130.00, badgeText: 'Fresh Pick', unit: '200g', stock: 30, desc: 'Soft and fresh cottage cheese blocks, handmade daily.', rating: 4.8, image: 'assets/prod_paneer.png' }
        ]
    },
    {
        id: 'store-2',
        name: 'Organic Harvest Grocers',
        category: 'Organic Vegetables',
        rating: 4.8,
        reviewsCount: 94,
        image: 'assets/store_organic.png',
        address: 'Main Road, Koramangala 3rd Block, Bengaluru',
        phone: '+91 91234 56789',
        deliveryRadius: 4.5,
        minOrderValue: 200,
        lat: 12.9279,
        lng: 77.6271,
        ownerEmail: 'organic@luxe.com',
        upiVpa: 'organic@ybl',
        upiName: 'Organic Harvest Grocers',
        products: [
            { id: 'p2-1', name: 'Organic Royal Gala Apples', category: 'fruits', price: 280.00, originalPrice: 320.00, badgeText: 'Organic', unit: '1 kg', stock: 15, desc: 'Crisp, sweet, and directly imported from organic orchards.', rating: 4.9, image: 'assets/prod_apples.png' },
            { id: 'p2-2', name: 'Fresh Alphonso Mangoes', category: 'fruits', price: 450.00, originalPrice: 550.00, badgeText: 'Season Special', unit: '1 Dozen', stock: 8, desc: 'Handpicked premium export-quality sweet mangoes.', rating: 5.0, image: 'assets/prod_mangoes.png' }
        ]
    },
    {
        id: 'store-3',
        name: 'Artisan Crumb & Grain',
        category: 'Bakery & Bread',
        rating: 4.7,
        reviewsCount: 82,
        image: 'assets/hero.png',
        address: '5th Cross, Indiranagar, Bengaluru',
        phone: '+91 93456 78901',
        deliveryRadius: 6.0,
        minOrderValue: 0,
        lat: 12.9719,
        lng: 77.6412,
        ownerEmail: 'artisan@luxe.com',
        upiVpa: 'artisan@okhdfcbank',
        upiName: 'Artisan Crumb & Grain',
        products: [
            { 
                id: 'p3-1', 
                name: 'Sourdough Country Loaf', 
                category: 'bakery', 
                price: 160.00, 
                originalPrice: 190.00, 
                badgeText: 'Artisan', 
                unit: '450g', 
                stock: 10, 
                desc: 'Wild yeast fermented sourdough bread with a crispy crust and chewy center.', 
                rating: 4.9, 
                image: 'assets/prod_sourdough.png',
                variants: [
                    { id: 'p3-1-v1', name: 'Half Loaf', price: 90.00, stock: 8 },
                    { id: 'p3-1-v2', name: 'Full Loaf', price: 160.00, stock: 10 }
                ]
            },
            { id: 'p3-2', name: 'All-Butter French Croissants', category: 'bakery', price: 180.00, originalPrice: 210.00, badgeText: 'Baked Daily', unit: '2 Units', stock: 12, desc: 'Flaky, laminated layers of pure butter pastry, baked daily.', rating: 4.8, image: 'assets/prod_croissants.png' },
            { id: 'p3-4', name: 'Cold-Pressed Orange Juice', category: 'beverages', price: 130.00, originalPrice: 150.00, badgeText: '100% Raw', unit: '300ml', stock: 15, desc: '100% natural, raw cold-pressed orange juice without added sugar.', rating: 4.7, image: 'assets/prod_juice.png' }
        ]
    }
];

// --- Database Seeding Helper ---
function seedDefaultUsers(dbData) {
    if (!dbData.users) {
        dbData.users = [];
    }
    const defaultPasswordHash = bcrypt.hashSync('admin123', 10);
    const defaultMerchants = [
        {
            id: 'user-dairy',
            email: 'dairy@luxe.com',
            password: defaultPasswordHash,
            role: 'merchant',
            name: 'Dairy Boutique Manager',
            storeId: 'store-1'
        },
        {
            id: 'user-organic',
            email: 'organic@luxe.com',
            password: defaultPasswordHash,
            role: 'merchant',
            name: 'Organic Harvest Manager',
            storeId: 'store-2'
        },
        {
            id: 'user-artisan',
            email: 'artisan@luxe.com',
            password: defaultPasswordHash,
            role: 'merchant',
            name: 'Artisan Bakery Manager',
            storeId: 'store-3'
        },
        {
            id: 'user-rahul',
            email: 'rahul@luxe.com',
            password: defaultPasswordHash,
            role: 'customer',
            name: 'Rahul Sharma',
            walletBalance: 0.00
        },
        {
            id: 'user-admin',
            email: 'admin@luxe.com',
            password: defaultPasswordHash,
            role: 'admin',
            name: 'Platform Administrator'
        }
    ];

    defaultMerchants.forEach(m => {
        const exists = dbData.users.some(u => u.email === m.email);
        if (!exists) {
            dbData.users.push(m);
        }
    });

    dbData.stores.forEach(store => {
        if (store.id === 'store-1' && !store.ownerEmail) {
            store.ownerEmail = 'dairy@luxe.com';
        } else if (store.id === 'store-2' && !store.ownerEmail) {
            store.ownerEmail = 'organic@luxe.com';
        } else if (store.id === 'store-3' && !store.ownerEmail) {
            store.ownerEmail = 'artisan@luxe.com';
        }
    });
}

const defaultCategories = [
    { id: 'dairy', name: 'Dairy & Fresh', parentId: null },
    { id: 'milk', name: 'Fresh Milk', parentId: 'dairy' },
    { id: 'yogurt', name: 'Yogurt & Cream', parentId: 'dairy' },
    { id: 'cheese', name: 'Artisanal Cheese', parentId: 'dairy' },
    { id: 'paneer', name: 'Fresh Paneer', parentId: 'cheese' },
    { id: 'fruits', name: 'Fruits & Berries', parentId: null },
    { id: 'bakery', name: 'Artisan Bakery', parentId: null },
    { id: 'beverages', name: 'Beverages', parentId: null }
];

// --- Database Mongoose Connection & Fallbacks ---
const mongoose = require('mongoose');

let useMongo = false;
let dbCache = null;

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/luxegrocer';
mongoose.connect(mongoUri)
  .then(async () => {
    console.log("=== Connected to MongoDB successfully! ===");
    useMongo = true;
    await syncFromMongo();
  })
  .catch(err => {
    console.warn(`=== MongoDB connection unavailable at ${mongoUri}. Falling back to local db.json ===`);
    useMongo = false;
  });

// Define Mongoose Schemas (Schemaless / strict:false to allow JSON seeding format)
const userSchema = new mongoose.Schema({}, { strict: false });
const storeSchema = new mongoose.Schema({}, { strict: false });
const orderSchema = new mongoose.Schema({}, { strict: false });
const voucherSchema = new mongoose.Schema({}, { strict: false });

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
const StoreModel = mongoose.models.Store || mongoose.model('Store', storeSchema);
const OrderModel = mongoose.models.Order || mongoose.model('Order', orderSchema);
const VoucherModel = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema);

// Synchronously reads and merges database cache
async function syncFromMongo() {
    try {
        const users = await UserModel.find({}).lean();
        const stores = await StoreModel.find({}).lean();
        const orders = await OrderModel.find({}).lean();
        const vouchers = await VoucherModel.find({}).lean();
        
        // If MongoDB is completely empty, seed it from db.json
        if (users.length === 0 && stores.length === 0) {
            console.log("[MONGO-SEED] MongoDB is empty. Seeding from db.json...");
            let seedData = { stores: SEED_STORES, orders: [], users: [] };
            if (fs.existsSync(DB_PATH)) {
                try {
                    seedData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
                } catch(e) {}
            }
            if (!seedData.users || seedData.users.length === 0) {
                seedDefaultUsers(seedData);
            }
            if (!seedData.vouchers) {
                seedData.vouchers = [
                    { code: 'LUXENEW', discountType: 'fixed', value: 100, minOrderValue: 300, desc: '₹100 off on first order above ₹300' },
                    { code: 'FREEDEL', discountType: 'free-delivery', value: 0, minOrderValue: 0, desc: 'Free Delivery on any order' },
                    { code: 'WEEKEND50', discountType: 'fixed', value: 50, minOrderValue: 250, desc: '₹50 off on orders above ₹250' }
                ];
            }
            
            await UserModel.insertMany(seedData.users);
            await StoreModel.insertMany(seedData.stores);
            await OrderModel.insertMany(seedData.orders);
            await VoucherModel.insertMany(seedData.vouchers);
            
            dbCache = seedData;
            console.log("[MONGO-SEED] Seeding completed successfully.");
        } else {
            dbCache = { users, stores, orders, vouchers };
            console.log("[MONGO-SYNC] Synced initial memory cache from MongoDB.");
        }
    } catch (err) {
        console.error("Error syncing from MongoDB:", err);
    }
}

async function syncToMongo(data) {
    if (!useMongo) return;
    try {
        // Sync users
        await UserModel.deleteMany({});
        if (data.users && data.users.length > 0) {
            await UserModel.insertMany(data.users);
        }
        // Sync stores
        await StoreModel.deleteMany({});
        if (data.stores && data.stores.length > 0) {
            await StoreModel.insertMany(data.stores);
        }
        // Sync orders
        await OrderModel.deleteMany({});
        if (data.orders && data.orders.length > 0) {
            await OrderModel.insertMany(data.orders);
        }
        // Sync vouchers
        await VoucherModel.deleteMany({});
        if (data.vouchers && data.vouchers.length > 0) {
            await VoucherModel.insertMany(data.vouchers);
        }
    } catch (err) {
        console.error("Error writing cache modifications to MongoDB:", err);
    }
}

// --- Database Read/Write Helpers ---
function readDb() {
    try {
        let dbData;
        if (useMongo && dbCache) {
            dbData = dbCache;
        } else {
            if (!fs.existsSync(DB_PATH)) {
                dbData = { stores: SEED_STORES, orders: [], users: [] };
                seedDefaultUsers(dbData);
                fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
                if (useMongo) {
                    dbCache = dbData;
                    syncToMongo(dbData);
                }
                return dbData;
            }
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            dbData = JSON.parse(raw);
        }
        
        let changed = false;
        if (!dbData.users) {
            dbData.users = [];
            changed = true;
        }
        dbData.users.forEach(u => {
            if (u.walletBalance === undefined) {
                u.walletBalance = 0.00;
                changed = true;
            }
            if (!u.referralCode) {
                const namePart = (u.name || 'USER').split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
                const randomPart = Math.floor(100 + Math.random() * 900);
                u.referralCode = `REF-${namePart}-${randomPart}`;
                changed = true;
            }
        });
        if (!dbData.banners) {
            dbData.banners = [
                {
                    id: "banner-1",
                    text: "Welcome to LuxeGrocer! Get ₹100 when you sign up using a friend's referral code.",
                    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200",
                    linkUrl: "",
                    active: true
                },
                {
                    id: "banner-2",
                    text: "Flash Sale: Premium Sourdough at Crumb & Grain is now ₹160. Order now!",
                    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200",
                    linkUrl: "",
                    active: true
                }
            ];
            changed = true;
        }
        if (!dbData.orders) {
            dbData.orders = [];
            changed = true;
        }
        const hasDairyMerchant = dbData.users.some(u => u.email === 'dairy@luxe.com');
        if (!hasDairyMerchant) {
            seedDefaultUsers(dbData);
            changed = true;
        }
        if (!dbData.vouchers) {
            dbData.vouchers = [
                { code: 'LUXENEW', discountType: 'fixed', value: 100, minOrderValue: 300, desc: '₹100 off on first order above ₹300' },
                { code: 'FREEDEL', discountType: 'free-delivery', value: 0, minOrderValue: 0, desc: 'Free Delivery on any order' },
                { code: 'WEEKEND50', discountType: 'fixed', value: 50, minOrderValue: 250, desc: '₹50 off on orders above ₹250' }
            ];
            changed = true;
        }

        if (!dbData.config) {
            dbData.config = {
                subscriptionTrialDays: 15,
                subscriptionMonthlyFee: 499,
                subscriptionYearlyFee: 4999,
                baseDeliveryFee: 20.00,
                baseDeliveryRadius: 2.0,
                perKmDeliveryFee: 10.00,
                freeDeliveryThreshold: 300.00
            };
            changed = true;
        }
        if (!dbData.ledger) {
            dbData.ledger = [];
            changed = true;
        }

        if (!dbData.categories) {
            dbData.categories = JSON.parse(JSON.stringify(defaultCategories));
            changed = true;
        }

        dbData.users.forEach(u => {
            if (u.status === undefined) {
                u.status = 'Active';
                changed = true;
            }
        });

        const defaultHours = {
            monday: { open: "09:00", close: "22:00", isClosed: false },
            tuesday: { open: "09:00", close: "22:00", isClosed: false },
            wednesday: { open: "09:00", close: "22:00", isClosed: false },
            thursday: { open: "09:00", close: "22:00", isClosed: false },
            friday: { open: "09:00", close: "22:00", isClosed: false },
            saturday: { open: "09:00", close: "22:00", isClosed: false },
            sunday: { open: "09:00", close: "22:00", isClosed: false }
        };

        dbData.stores.forEach(store => {
            if (!store.operatingHours) {
                store.operatingHours = defaultHours;
                changed = true;
            }
            if (store.products) {
                store.products.forEach(p => {
                    if (!p.dietaryType) {
                        p.dietaryType = 'Veg';
                        changed = true;
                    }
                });
            }
        });

        const now = new Date();
        dbData.stores.forEach(store => {
            if (!store.subscription) {
                store.subscription = {
                    plan: "Premium Monthly",
                    status: "Active",
                    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
                };
                changed = true;
            } else {
                const expiry = new Date(store.subscription.expiresAt);
                if (now > expiry && store.subscription.status !== 'Suspended') {
                    console.log(`[SUBSCRIPTION-EXPIRE] Store ${store.name} (${store.id}) subscription expired. Suspending storefront.`);
                    store.subscription.status = 'Suspended';
                    store.status = 'Suspended';
                    changed = true;
                }
            }

            if (!store.deliveryStaff) {
                if (store.id === 'store-1') {
                    store.deliveryStaff = [
                        { id: "staff-dairy-1", name: "Ramesh Kumar", phone: "+91 99887 76655", status: "Available" },
                        { id: "staff-dairy-2", name: "Suresh Dev", phone: "+91 98765 43210", status: "Available" }
                    ];
                } else if (store.id === 'store-2') {
                    store.deliveryStaff = [
                        { id: "staff-organic-1", name: "Anil Singh", phone: "+91 91234 56789", status: "Available" }
                    ];
                } else if (store.id === 'store-3') {
                    store.deliveryStaff = [
                        { id: "staff-artisan-1", name: "Vikram Seth", phone: "+91 93456 78901", status: "Available" }
                    ];
                } else {
                    store.deliveryStaff = [];
                }
                changed = true;
            }

            if (!store.upiVpa) {
                if (store.id === 'store-1') {
                    store.upiVpa = "dairy@paytm";
                    store.upiName = "GreenValley Dairy Boutique";
                } else if (store.id === 'store-2') {
                    store.upiVpa = "organic@ybl";
                    store.upiName = "Organic Harvest Grocers";
                } else if (store.id === 'store-3') {
                    store.upiVpa = "artisan@okhdfcbank";
                    store.upiName = "Artisan Crumb & Grain";
                } else {
                    store.upiVpa = `${store.ownerEmail ? store.ownerEmail.split('@')[0] : 'merchant'}@okaxis`;
                    store.upiName = store.name;
                }
                changed = true;
            }
        });

        if (changed) {
            if (useMongo) {
                dbCache = dbData;
                syncToMongo(dbData);
            }
            fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
        }
        return dbData;
    } catch (err) {
        console.error("Database read failure:", err);
        return { stores: [], orders: [], users: [] };
    }
}

function writeDb(data) {
    try {
        if (useMongo) {
            dbCache = data;
            syncToMongo(data);
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error("Database write failure:", err);
        return false;
    }
}

function handleRefundIfCancelled(order, dbData) {
    if (order.status === 'Cancelled' && !order.refunded) {
        const paymentMethod = order.customer.payment;
        if (paymentMethod === 'wallet' || paymentMethod === 'split' || paymentMethod === 'upi') {
            const amountToRefund = order.grandTotal || (order.subtotal + order.deliveryFee - order.discount);
            if (amountToRefund > 0) {
                const customerUser = dbData.users.find(u => u.id === order.customer.userId);
                if (customerUser) {
                    customerUser.walletBalance = parseFloat(((customerUser.walletBalance || 0.00) + amountToRefund).toFixed(2));
                    order.refunded = true;
                    order.refundAmount = amountToRefund;
                    console.log(`[REFUND] Refunded ₹${amountToRefund.toFixed(2)} to User ${customerUser.email} (Wallet) for cancelled Order #${order.id}`);
                }
            }
        }
    }
}

// --- Image Decoders & Local File Storage helper ---
function saveBase64Image(req, base64Str, prefix) {
    if (!base64Str || !base64Str.startsWith('data:image')) {
        return base64Str; // Return as-is if already a web URL or empty
    }
    
    try {
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64Str;
        
        const ext = matches[1].split('/')[1] || 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `${prefix}-${Date.now()}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        
        fs.writeFileSync(filePath, buffer);
        
        // Return full local URL
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        return `${serverUrl}/uploads/${filename}`;
    } catch (err) {
        console.error("Error decoding custom uploaded image:", err);
        return base64Str;
    }
}

// --- Server-Sent Events (SSE) Sync Stream ---
let sseClients = [];

app.get('/api/sync', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);
    
    req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
    });
});

function broadcastSync(event, data) {
    sseClients.forEach(c => {
        c.res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
    });
    if (global.io) {
        global.io.emit(event, data);
        if (event === 'orders_updated') {
            global.io.to(`order_${data}`).emit('order_status_updated', data);
        }
    }
}

// --- API ENDPOINTS ---

// --- Auth Middlewares ---
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token formatting error' });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Failed to authenticate token' });
        }
        req.user = decoded;
        next();
    });
}

function verifyStoreOwner(req, res, next) {
    const storeId = req.params.id;
    const dbData = readDb();
    const store = dbData.stores.find(s => s.id === storeId);
    if (!store) {
        return res.status(404).json({ error: 'Store not found' });
    }
    if (req.user.role !== 'merchant' || store.ownerEmail !== req.user.email) {
        return res.status(403).json({ error: 'Forbidden: You do not own this store' });
    }
    req.store = store;
    next();
}

function verifyOrderStoreOwner(req, res, next) {
    const orderId = req.params.id;
    const dbData = readDb();
    const order = dbData.orders.find(o => o.id === orderId);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    const store = dbData.stores.find(s => s.id === order.storeId);
    if (!store || req.user.role !== 'merchant' || store.ownerEmail !== req.user.email) {
        return res.status(403).json({ error: 'Forbidden: You do not own the store for this order' });
    }
    req.order = order;
    next();
}

function verifyOrderStatusUpdater(req, res, next) {
    const orderId = req.params.id;
    const dbData = readDb();
    const order = dbData.orders.find(o => o.id === orderId);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    
    const isCustomer = req.user.role === 'customer' && order.customer && order.customer.userId === req.user.id;
    
    if (isCustomer) {
        // Customers can only cancel pending orders OR orders within the 60-second grace cancellation window
        if (req.body.status !== 'Cancelled') {
            return res.status(403).json({ error: 'Forbidden: Customers can only transition order to Cancelled status' });
        }
        
        const elapsed = Date.now() - new Date(order.timestamp).getTime();
        const isGraceActive = elapsed <= 60000; // 60 seconds grace window
        
        if (order.status !== 'Pending' && !isGraceActive) {
            return res.status(400).json({ error: 'Order cannot be cancelled because it has already been accepted by the merchant and the grace window has expired' });
        }
        req.order = order;
        return next();
    }
    
    // Merchant owner checks
    const store = dbData.stores.find(s => s.id === order.storeId);
    if (!store || req.user.role !== 'merchant' || store.ownerEmail !== req.user.email) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to update this order' });
    }
    
    req.order = order;
    next();
}

// --- AUTH ROUTES ---

// POST: Register a user (customer or merchant)
app.post('/api/auth/register', (req, res) => {
    const dbData = readDb();
    const { email, password, role, name, phone, address, storeName, referralCode } = req.body;
    
    if (!email || !password || !role || !name) {
        return res.status(400).json({ error: 'Email, password, role, and name are required.' });
    }
    
    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
        return res.status(400).json({ error: 'Invalid email address format.' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    
    if (role !== 'customer' && role !== 'merchant') {
        return res.status(400).json({ error: 'Role must be either customer or merchant.' });
    }
    
    if (dbData.users.some(u => u.email.toLowerCase() === emailLower)) {
        return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    let referredBy = null;
    let walletBalance = 0.00;
    if (referralCode && role === 'customer') {
        const referrer = dbData.users.find(u => u.referralCode && u.referralCode.toUpperCase() === referralCode.trim().toUpperCase());
        if (referrer) {
            referredBy = referrer.id;
            walletBalance = 100.00;
            console.log(`[REFERRAL SIGNUP] User ${emailLower} referred by ${referrer.email}. Pre-crediting ₹100.`);
        } else {
            return res.status(400).json({ error: 'Invalid referral code' });
        }
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = 'user-' + Date.now();
    
    const newUser = {
        id: userId,
        email: emailLower,
        password: hashedPassword,
        role: role,
        name: sanitizeInput(name),
        phone: sanitizeInput(phone || ''),
        address: sanitizeInput(address || ''),
        walletBalance: walletBalance,
        referredBy: referredBy,
        referralClaimed: false,
        referralCode: 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    };
    
    if (role === 'merchant') {
        const storeId = 'store-' + Date.now();
        const newStore = {
            id: storeId,
            name: sanitizeInput(storeName || `${name}'s Luxe Shop`),
            category: 'General Grocery',
            rating: 5.0,
            reviewsCount: 0,
            image: '',
            address: sanitizeInput(address || ''),
            phone: sanitizeInput(phone || ''),
            deliveryRadius: 5.0,
            minOrderValue: 0,
            lat: 12.9250,
            lng: 77.6220,
            ownerEmail: emailLower,
            products: [],
            subscription: {
                plan: "Premium Trial",
                status: "Active",
                expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
            },
            upiVpa: `${emailLower.split('@')[0]}@okaxis`,
            upiName: sanitizeInput(storeName || `${name}'s Luxe Shop`),
            deliveryStaff: [],
            status: 'Pending Approval'
        };
        dbData.stores.push(newStore);
        newUser.storeId = storeId;
    }
    
    dbData.users.push(newUser);
    writeDb(dbData);
    
    const tokenPayload = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        storeId: newUser.storeId || null
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
        token,
        user: tokenPayload
    });
});

// POST: Login user
app.post('/api/auth/login', (req, res) => {
    const dbData = readDb();
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const emailLower = email.toLowerCase().trim();
    const user = dbData.users.find(u => u.email.toLowerCase() === emailLower);
    if (!user) {
        console.log(`[AUTH FAIL] User with email ${emailLower} not found.`);
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status === 'Suspended') {
        console.log(`[AUTH FAIL] Suspended user ${emailLower} tried to log in.`);
        return res.status(403).json({ error: 'Your account has been suspended by the platform administrator.' });
    }
    
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
        console.log(`[AUTH FAIL] Incorrect password for user ${emailLower}.`);
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.log(`[AUTH SUCCESS] User ${emailLower} logged in.`);
    
    if (user.role === 'merchant' && !user.storeId) {
        const store = dbData.stores.find(s => s.ownerEmail === emailLower);
        if (store) {
            user.storeId = store.id;
            writeDb(dbData);
        }
    }
    
    const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        storeId: user.storeId || null
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
        token,
        user: tokenPayload
    });
});

// GET: Current logged in user info
app.get('/api/auth/me', verifyToken, (req, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    let storeId = user.storeId || null;
    if (user.role === 'merchant' && !storeId) {
        const store = dbData.stores.find(s => s.ownerEmail === user.email);
        if (store) {
            storeId = store.id;
            user.storeId = storeId;
            writeDb(dbData);
        }
    }
    
    res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        phone: user.phone || '',
        address: user.address || '',
        storeId: storeId,
        referralCode: user.referralCode || '',
        walletBalance: user.walletBalance || 0.00
    });
});

// PUT: Update current user profile details
app.put('/api/auth/me', verifyToken, (req, res) => {
    const dbData = readDb();
    const idx = dbData.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    
    const { name, phone, address } = req.body;
    dbData.users[idx].name = name || dbData.users[idx].name;
    dbData.users[idx].phone = phone || dbData.users[idx].phone;
    dbData.users[idx].address = address || dbData.users[idx].address;
    
    writeDb(dbData);
    res.json({
        id: dbData.users[idx].id,
        email: dbData.users[idx].email,
        role: dbData.users[idx].role,
        name: dbData.users[idx].name,
        phone: dbData.users[idx].phone || '',
        address: dbData.users[idx].address || '',
        storeId: dbData.users[idx].storeId || null
    });
});

// PUT: Change logged-in user password
app.put('/api/auth/change-password', verifyToken, (req, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old password and new password are required' });
    }
    
    const valid = bcrypt.compareSync(oldPassword, user.password);
    if (!valid) {
        return res.status(400).json({ error: 'Incorrect current password' });
    }
    
    user.password = bcrypt.hashSync(newPassword, 10);
    writeDb(dbData);
    res.json({ success: true, message: 'Password updated successfully' });
});

// GET: Fetch authenticated user's wallet balance
app.get('/api/wallet/balance', verifyToken, (req, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ walletBalance: user.walletBalance || 0.00 });
});

// POST: Add mock funds to authenticated user's wallet
app.post('/api/wallet/add-funds', verifyToken, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
    
    const { amount } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ error: 'Add amount must be a positive number.' });
    }
    
    dbData.users[userIdx].walletBalance = parseFloat(((dbData.users[userIdx].walletBalance || 0.00) + amt).toFixed(2));
    writeDb(dbData);
    
    res.json({ walletBalance: dbData.users[userIdx].walletBalance });
});

// GET: Fetch authenticated user's cart from database
app.get('/api/cart', verifyToken, (req, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ cart: user.cart || [] });
});

// POST: Sync/Replace authenticated user's cart in database
app.post('/api/cart', verifyToken, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
    
    const { cart } = req.body;
    if (!Array.isArray(cart)) {
        return res.status(400).json({ error: 'Cart must be an array.' });
    }
    
    dbData.users[userIdx].cart = cart;
    writeDb(dbData);
    res.json({ success: true, cart: dbData.users[userIdx].cart });
});

// POST: Forgot password (requests OTP reset code)

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const dbData = readDb();
    const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
        return res.status(404).json({ error: 'No user account found with this email' });
    }
    
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiry = Date.now() + 5 * 60 * 1000;
    
    passwordRecoveryStore[email.toLowerCase().trim()] = { otp, expiry };
    console.log(`[PASSWORD RECOVERY OTP] Generated code ${otp} for email ${email}`);
    
    res.json({ success: true, message: 'Simulated password reset OTP code dispatched.', otp });
});

// POST: Reset password (verifies OTP and writes new password)
app.post('/api/auth/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }
    
    const emailKey = email.toLowerCase().trim();
    const record = passwordRecoveryStore[emailKey];
    
    if (!record || record.otp !== otp.trim() || Date.now() > record.expiry) {
        return res.status(400).json({ error: 'Invalid or expired recovery OTP code' });
    }
    
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.email.toLowerCase() === emailKey);
    if (userIdx === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    dbData.users[userIdx].password = bcrypt.hashSync(newPassword, 10);
    writeDb(dbData);
    
    delete passwordRecoveryStore[emailKey];
    res.json({ success: true, message: 'Password has been reset successfully' });
});

function getStoreWithDynamicStatus(store) {
    if (!store) return store;
    const storeCopy = { ...store };
    if (storeCopy.status === 'Pending Approval' || storeCopy.status === 'Suspended') {
        return storeCopy;
    }
    if (!storeCopy.operatingHours) {
        return storeCopy;
    }
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const schedule = storeCopy.operatingHours[currentDay];
    
    if (!schedule || schedule.isClosed) {
        storeCopy.status = 'Closed';
        return storeCopy;
    }
    
    const [openH, openM] = schedule.open.split(':').map(Number);
    const [closeH, closeM] = schedule.close.split(':').map(Number);
    
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    
    const openTimeMinutes = openH * 60 + openM;
    const closeTimeMinutes = closeH * 60 + closeM;
    const currentTimeMinutes = currentH * 60 + currentM;
    
    if (currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes) {
        if (storeCopy.status !== 'Closed') {
            storeCopy.status = 'Open';
        }
    } else {
        storeCopy.status = 'Closed';
    }
    return storeCopy;
}

// GET: All stores
app.get('/api/stores', (req, res) => {
    const db = readDb();
    const activeStores = db.stores.filter(s => s.status !== 'Pending Approval' && s.status !== 'Suspended');
    const dynamicStores = activeStores.map(s => getStoreWithDynamicStatus(s));
    res.json(dynamicStores);
});

// GET: Single store by ID
app.get('/api/stores/:id', (req, res) => {
    const db = readDb();
    const store = db.stores.find(s => s.id === req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(getStoreWithDynamicStatus(store));
});

// --- SEARCH, RECOMMENDATIONS & CATEGORIES ENDPOINTS (Phase 14) ---

// Helper to recursively resolve nested subcategory IDs
function getSubcategoryIds(categories, parentId) {
    let ids = [parentId];
    const children = categories.filter(c => c.parentId === parentId);
    for (const child of children) {
        ids = ids.concat(getSubcategoryIds(categories, child.id));
    }
    return ids;
}

// Helper for Frequently Bought Together
function getFrequentlyBoughtTogether(db, cartProductIds, limit = 4) {
    const relevantOrders = db.orders.filter(o => 
        o.items && o.items.some(item => cartProductIds.includes(item.id))
    );
    
    const counts = {};
    relevantOrders.forEach(o => {
        o.items.forEach(item => {
            if (!cartProductIds.includes(item.id)) {
                counts[item.id] = (counts[item.id] || 0) + item.quantity;
            }
        });
    });
    
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const recommendations = [];
    
    for (const pid of sortedIds) {
        if (recommendations.length >= limit) break;
        for (const store of db.stores) {
            if (store.status === 'Pending Approval' || store.status === 'Suspended') continue;
            const prod = store.products.find(p => p.id === pid);
            if (prod) {
                recommendations.push({
                    ...prod,
                    storeId: store.id,
                    storeName: store.name
                });
                break;
            }
        }
    }
    
    if (recommendations.length < limit) {
        const popularGlobal = getPopularProducts(db, limit - recommendations.length, recommendations.map(r => r.id).concat(cartProductIds));
        recommendations.push(...popularGlobal);
    }
    
    return recommendations.slice(0, limit);
}

// Helper for Popular Products near location
function getPopularProducts(db, limit, excludeIds) {
    const counts = {};
    db.orders.forEach(o => {
        if (o.items) {
            o.items.forEach(item => {
                counts[item.id] = (counts[item.id] || 0) + item.quantity;
            });
        }
    });
    
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const recommendations = [];
    
    for (const pid of sortedIds) {
        if (excludeIds.includes(pid)) continue;
        if (recommendations.length >= limit) break;
        for (const store of db.stores) {
            if (store.status === 'Pending Approval' || store.status === 'Suspended') continue;
            const prod = store.products.find(p => p.id === pid);
            if (prod) {
                recommendations.push({
                    ...prod,
                    storeId: store.id,
                    storeName: store.name
                });
                break;
            }
        }
    }
    
    if (recommendations.length < limit) {
        for (const store of db.stores) {
            if (store.status === 'Pending Approval' || store.status === 'Suspended') continue;
            for (const prod of store.products) {
                if (excludeIds.includes(prod.id) || recommendations.some(r => r.id === prod.id)) continue;
                if (recommendations.length >= limit) break;
                recommendations.push({
                    ...prod,
                    storeId: store.id,
                    storeName: store.name
                });
            }
            if (recommendations.length >= limit) break;
        }
    }
    return recommendations.slice(0, limit);
}

function getPopularProductsNear(db, lat, lng, limit = 5) {
    const nearStores = db.stores.filter(store => {
        if (store.status === 'Pending Approval' || store.status === 'Suspended') return false;
        const distance = calculateDistance(lat, lng, store.lat || 12.9250, store.lng || 77.6220);
        return distance <= (store.deliveryRadius || 5.0);
    });
    
    const nearStoreIds = nearStores.map(s => s.id);
    const counts = {};
    
    db.orders.forEach(o => {
        if (o.items) {
            o.items.forEach(item => {
                if (nearStoreIds.includes(item.storeId)) {
                    counts[item.id] = (counts[item.id] || 0) + item.quantity;
                }
            });
        }
    });
    
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const recommendations = [];
    
    for (const pid of sortedIds) {
        if (recommendations.length >= limit) break;
        for (const store of nearStores) {
            const prod = store.products.find(p => p.id === pid);
            if (prod) {
                recommendations.push({
                    ...prod,
                    storeId: store.id,
                    storeName: store.name
                });
                break;
            }
        }
    }
    
    if (recommendations.length < limit) {
        for (const store of nearStores) {
            for (const prod of store.products) {
                if (recommendations.some(r => r.id === prod.id)) continue;
                if (recommendations.length >= limit) break;
                recommendations.push({
                    ...prod,
                    storeId: store.id,
                    storeName: store.name
                });
            }
            if (recommendations.length >= limit) break;
        }
    }
    
    return recommendations.slice(0, limit);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// GET: Fuzzy Search Autocomplete
app.get('/api/search', (req, res) => {
    const db = readDb();
    const query = req.query.q || '';
    if (!query) {
        return res.json({ stores: [], products: [], categories: [] });
    }
    
    const activeStores = db.stores.filter(s => s.status !== 'Pending Approval' && s.status !== 'Suspended');
    
    // Search Stores
    const storeFuse = new Fuse(activeStores, {
        keys: ['name', 'category'],
        threshold: 0.4
    });
    const storeResults = storeFuse.search(query).map(r => r.item);
    
    // Search Products (flatten all active products with store context)
    const allProducts = [];
    activeStores.forEach(store => {
        if (store.products) {
            store.products.forEach(prod => {
                allProducts.push({
                    ...prod,
                    storeId: store.id,
                    storeName: store.name,
                    storePhone: store.phone
                });
            });
        }
    });
    
    const productFuse = new Fuse(allProducts, {
        keys: ['name', 'category', 'desc'],
        threshold: 0.4
    });
    const productResults = productFuse.search(query).map(r => r.item);
    
    // Search Categories
    const categoriesSet = new Set();
    activeStores.forEach(s => {
        if (s.category) categoriesSet.add(s.category);
        if (s.products) {
            s.products.forEach(p => {
                if (p.category) categoriesSet.add(p.category);
            });
        }
    });
    
    const categoriesArray = Array.from(categoriesSet).map(name => ({ name }));
    const categoryFuse = new Fuse(categoriesArray, {
        keys: ['name'],
        threshold: 0.4
    });
    const categoryResults = categoryFuse.search(query).map(r => r.item.name);
    
    res.json({
        stores: storeResults,
        products: productResults,
        categories: categoryResults
    });
});

// GET: Frequently Bought Together
app.get('/api/recommendations/frequently-bought-together', (req, res) => {
    const db = readDb();
    const productIds = (req.query.productIds || '').split(',').filter(Boolean);
    const limit = parseInt(req.query.limit) || 4;
    const recommendations = getFrequentlyBoughtTogether(db, productIds, limit);
    res.json(recommendations);
});

// GET: Popular Near You
app.get('/api/recommendations/popular-near-you', (req, res) => {
    const db = readDb();
    const lat = parseFloat(req.query.lat) || 12.9716;
    const lng = parseFloat(req.query.lng) || 77.6408;
    const limit = parseInt(req.query.limit) || 5;
    const recommendations = getPopularProductsNear(db, lat, lng, limit);
    res.json(recommendations);
});

// GET: Categories hierarchy list
app.get('/api/categories', (req, res) => {
    const db = readDb();
    res.json(db.categories || defaultCategories);
});

// GET: Products by category recursively (supporting child subcategories)
app.get('/api/categories/:id/products', (req, res) => {
    const db = readDb();
    const categories = db.categories || defaultCategories;
    const catId = req.params.id;
    const allCatIds = getSubcategoryIds(categories, catId);
    
    const products = [];
    db.stores.forEach(store => {
        if (store.status === 'Pending Approval' || store.status === 'Suspended') return;
        if (store.products) {
            store.products.forEach(p => {
                if (allCatIds.includes(p.category)) {
                    products.push({
                        ...p,
                        storeId: store.id,
                        storeName: store.name
                    });
                }
            });
        }
    });
    res.json(products);
});

// POST: Register a new store
app.post('/api/stores', verifyToken, (req, res) => {
    if (req.user.role !== 'merchant') {
        return res.status(403).json({ error: 'Only merchants can register stores' });
    }
    const dbData = readDb();
    
    // Check if this merchant already owns a store
    if (dbData.stores.some(s => s.ownerEmail === req.user.email)) {
        return res.status(400).json({ error: 'You already own a store' });
    }
    
    const storeData = req.body;
    const bannerUrl = saveBase64Image(req, storeData.image, 'store-banner');
    
    const storeId = 'store-' + Date.now();
    const newStore = {
        id: storeId,
        name: storeData.name,
        category: storeData.category || 'General Grocery',
        rating: 5.0,
        reviewsCount: 0,
        image: bannerUrl,
        address: storeData.address,
        phone: storeData.phone,
        deliveryRadius: parseFloat(storeData.deliveryRadius) || 5.0,
        minOrderValue: parseFloat(storeData.minOrderValue) || 0,
        lat: storeData.lat || 12.9250,
        lng: storeData.lng || 77.6220,
        ownerEmail: req.user.email,
        products: [],
        subscription: {
            plan: "Premium Trial",
            status: "Active",
            expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days free trial
        },
        upiVpa: storeData.upiVpa || `${req.user.email.split('@')[0]}@okaxis`,
        upiName: storeData.upiName || storeData.name,
        deliveryStaff: [],
        status: 'Pending Approval'
    };
    
    // Update the merchant user storeId in db
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx !== -1) {
        dbData.users[userIdx].storeId = storeId;
    }
    
    dbData.stores.push(newStore);
    writeDb(dbData);
    
    broadcastSync('store_onboarded', newStore.id);
    res.status(201).json(newStore);
});

// PUT: Update store settings config
app.put('/api/stores/:id', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.stores.findIndex(s => s.id === req.params.id);
    
    const settings = req.body;
    
    // Update banner image if uploaded
    if (settings.image) {
        settings.image = saveBase64Image(req, settings.image, 'store-banner');
    }
    
    dbData.stores[idx] = {
        ...dbData.stores[idx],
        name: settings.name || dbData.stores[idx].name,
        deliveryRadius: parseFloat(settings.deliveryRadius) || dbData.stores[idx].deliveryRadius,
        minOrderValue: parseFloat(settings.minOrderValue) || dbData.stores[idx].minOrderValue,
        phone: settings.phone || dbData.stores[idx].phone,
        address: settings.address || dbData.stores[idx].address,
        image: settings.image || dbData.stores[idx].image,
        status: settings.status || dbData.stores[idx].status || 'Open',
        upiVpa: settings.upiVpa || dbData.stores[idx].upiVpa || '',
        upiName: settings.upiName || dbData.stores[idx].upiName || '',
        operatingHours: settings.operatingHours || dbData.stores[idx].operatingHours
    };
    
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(dbData.stores[idx]);
});

// PUT: Update store weekly operating hours
app.put('/api/stores/:id/operating-hours', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.stores.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Store not found.' });
    
    const { operatingHours } = req.body;
    if (!operatingHours || typeof operatingHours !== 'object') {
        return res.status(400).json({ error: 'Invalid operating hours structure.' });
    }
    
    dbData.stores[idx].operatingHours = operatingHours;
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(dbData.stores[idx]);
});

// POST: Renew/Upgrade store platform subscription
app.post('/api/stores/:id/subscription/renew', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.stores.findIndex(s => s.id === req.params.id);
    
    const { plan } = req.body;
    if (!plan || (plan !== 'Premium Monthly' && plan !== 'Premium Annual')) {
        return res.status(400).json({ error: 'Valid subscription plan (Premium Monthly or Premium Annual) is required' });
    }
    
    const store = dbData.stores[idx];
    const now = new Date();
    
    // Check if the current subscription is still active and in the future
    let currentExpiry = now;
    if (store.subscription && store.subscription.expiresAt) {
        const exp = new Date(store.subscription.expiresAt);
        if (exp > now) {
            currentExpiry = exp;
        }
    }
    
    // Calculate new expiration date
    let newExpiry;
    if (plan === 'Premium Monthly') {
        newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
        newExpiry = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
    
    store.subscription = {
        plan: plan,
        status: 'Active',
        expiresAt: newExpiry.toISOString()
    };
    
    // Log transaction in double-entry ledger
    const config = dbData.config || {
        subscriptionMonthlyFee: 499,
        subscriptionYearlyFee: 4999
    };
    const fee = plan === 'Premium Monthly' ? config.subscriptionMonthlyFee : config.subscriptionYearlyFee;
    const ledgerEntry = {
        id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
        storeId: store.id,
        type: 'subscription',
        debit: 0.00,
        credit: parseFloat(fee),
        description: `Subscription renewal: ${plan} for store "${store.name}"`,
        timestamp: new Date().toISOString()
    };
    if (!dbData.ledger) dbData.ledger = [];
    dbData.ledger.push(ledgerEntry);
    
    // If the store was previously Suspended, restore it to Open status
    if (store.status === 'Suspended') {
        store.status = 'Open';
    }
    
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(store);
});

// GET: Fetch registered delivery staff for the store owner
app.get('/api/stores/:id/delivery-staff', verifyToken, verifyStoreOwner, (req, res) => {
    res.json(req.store.deliveryStaff || []);
});

// POST: Add a new staff member to the registry
app.post('/api/stores/:id/delivery-staff', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    const { name, phone } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required' });
    }
    
    const store = dbData.stores[storeIdx];
    if (!store.deliveryStaff) {
        store.deliveryStaff = [];
    }
    
    const newStaff = {
        id: 'staff-' + Date.now(),
        name,
        phone,
        status: 'Available'
    };
    
    store.deliveryStaff.push(newStaff);
    writeDb(dbData);
    
    broadcastSync('store_updated', req.params.id);
    res.status(201).json(newStaff);
});

// PUT: Update delivery staff details / status
app.put('/api/stores/:id/delivery-staff/:staffId', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    const store = dbData.stores[storeIdx];
    
    if (!store.deliveryStaff) {
        return res.status(404).json({ error: 'Delivery staff member not found' });
    }
    
    const staffIdx = store.deliveryStaff.findIndex(s => s.id === req.params.staffId);
    if (staffIdx === -1) {
        return res.status(404).json({ error: 'Delivery staff member not found' });
    }
    
    const { name, phone, status } = req.body;
    store.deliveryStaff[staffIdx] = {
        ...store.deliveryStaff[staffIdx],
        name: name !== undefined ? name : store.deliveryStaff[staffIdx].name,
        phone: phone !== undefined ? phone : store.deliveryStaff[staffIdx].phone,
        status: status !== undefined ? status : store.deliveryStaff[staffIdx].status
    };
    
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(store.deliveryStaff[staffIdx]);
});

// DELETE: Remove a staff member from registry
app.delete('/api/stores/:id/delivery-staff/:staffId', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    const store = dbData.stores[storeIdx];
    
    if (!store.deliveryStaff) {
        return res.status(404).json({ error: 'Delivery staff member not found' });
    }
    
    const staffExists = store.deliveryStaff.some(s => s.id === req.params.staffId);
    if (!staffExists) {
        return res.status(404).json({ error: 'Delivery staff member not found' });
    }
    
    store.deliveryStaff = store.deliveryStaff.filter(s => s.id !== req.params.staffId);
    writeDb(dbData);
    
    broadcastSync('store_updated', req.params.id);
    res.json({ success: true });
});

// POST: Add new catalog product
app.post('/api/stores/:id/products', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    
    const prodData = req.body;
    if (!prodData.name || !prodData.category) {
        return res.status(400).json({ error: 'Product name and category are required.' });
    }
    
    const priceVal = parseFloat(prodData.price);
    const stockVal = parseInt(prodData.stock);
    if (isNaN(priceVal) || priceVal < 0) {
        return res.status(400).json({ error: 'Product price must be a non-negative number.' });
    }
    if (isNaN(stockVal) || stockVal < 0) {
        return res.status(400).json({ error: 'Product stock must be a non-negative integer.' });
    }

    let originalPriceVal = null;
    if (prodData.originalPrice !== undefined && prodData.originalPrice !== null && prodData.originalPrice !== '') {
        originalPriceVal = parseFloat(prodData.originalPrice);
        if (isNaN(originalPriceVal) || originalPriceVal < 0) {
            return res.status(400).json({ error: 'Product original price must be a non-negative number.' });
        }
    }
    
    if (prodData.variants && Array.isArray(prodData.variants)) {
        for (const v of prodData.variants) {
            if (!v.name || typeof v.price !== 'number' || v.price < 0 || typeof v.stock !== 'number' || v.stock < 0) {
                return res.status(400).json({ error: 'All variants must have a valid name, and non-negative price and stock.' });
            }
            if (v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice !== '') {
                const ov = parseFloat(v.originalPrice);
                if (isNaN(ov) || ov < 0) {
                    return res.status(400).json({ error: 'Variant original price must be a non-negative number.' });
                }
            }
        }
    }
    
    const prodUrl = saveBase64Image(req, prodData.image, 'product');
    
    const sanitizedVariants = prodData.variants && Array.isArray(prodData.variants)
        ? prodData.variants.map(v => ({
            id: v.id || 'var-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: sanitizeInput(v.name),
            price: parseFloat(v.price),
            originalPrice: v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice !== '' ? parseFloat(v.originalPrice) : null,
            stock: parseInt(v.stock)
          }))
        : null;

    const newProduct = {
        id: 'prod-' + Date.now(),
        name: sanitizeInput(prodData.name),
        category: sanitizeInput(prodData.category),
        price: priceVal,
        originalPrice: originalPriceVal,
        unit: sanitizeInput(prodData.unit || '1 Unit'),
        stock: stockVal,
        desc: sanitizeInput(prodData.desc || ''),
        rating: 5.0,
        image: prodUrl || '',
        variants: sanitizedVariants,
        dietaryType: sanitizeInput(prodData.dietaryType || 'Veg')
    };
    
    dbData.stores[storeIdx].products.push(newProduct);
    writeDb(dbData);
    
    broadcastSync('catalog_changed', req.params.id);
    res.status(201).json(newProduct);
});

// PUT: Update catalog product listing
app.put('/api/stores/:id/products/:productId', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    const prodIdx = dbData.stores[storeIdx].products.findIndex(p => p.id === req.params.productId);
    if (prodIdx === -1) return res.status(404).json({ error: 'Product not found' });
    
    const updated = req.body;
    if (updated.name === '') return res.status(400).json({ error: 'Product name cannot be empty.' });
    if (updated.category === '') return res.status(400).json({ error: 'Product category cannot be empty.' });
    
    if (updated.price !== undefined) {
        const priceVal = parseFloat(updated.price);
        if (isNaN(priceVal) || priceVal < 0) {
            return res.status(400).json({ error: 'Product price must be a non-negative number.' });
        }
    }
    if (updated.originalPrice !== undefined) {
        if (updated.originalPrice !== null && updated.originalPrice !== '') {
            const opVal = parseFloat(updated.originalPrice);
            if (isNaN(opVal) || opVal < 0) {
                return res.status(400).json({ error: 'Product original price must be a non-negative number.' });
            }
        }
    }
    if (updated.stock !== undefined) {
        const stockVal = parseInt(updated.stock);
        if (isNaN(stockVal) || stockVal < 0) {
            return res.status(400).json({ error: 'Product stock must be a non-negative integer.' });
        }
    }
    if (updated.variants !== undefined && Array.isArray(updated.variants)) {
        for (const v of updated.variants) {
            if (!v.name || typeof v.price !== 'number' || v.price < 0 || typeof v.stock !== 'number' || v.stock < 0) {
                return res.status(400).json({ error: 'All variants must have a valid name, and non-negative price and stock.' });
            }
            if (v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice !== '') {
                const ov = parseFloat(v.originalPrice);
                if (isNaN(ov) || ov < 0) {
                    return res.status(400).json({ error: 'Variant original price must be a non-negative number.' });
                }
            }
        }
    }

    if (updated.image) {
        updated.image = saveBase64Image(req, updated.image, 'product');
    }
    
    const sanitizedVariants = updated.variants && Array.isArray(updated.variants)
        ? updated.variants.map(v => ({
            id: v.id || 'var-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: sanitizeInput(v.name),
            price: parseFloat(v.price),
            originalPrice: v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice !== '' ? parseFloat(v.originalPrice) : null,
            stock: parseInt(v.stock)
          }))
        : updated.variants === null ? null : dbData.stores[storeIdx].products[prodIdx].variants;

    dbData.stores[storeIdx].products[prodIdx] = {
        ...dbData.stores[storeIdx].products[prodIdx],
        name: updated.name ? sanitizeInput(updated.name) : dbData.stores[storeIdx].products[prodIdx].name,
        category: updated.category ? sanitizeInput(updated.category) : dbData.stores[storeIdx].products[prodIdx].category,
        price: updated.price !== undefined ? parseFloat(updated.price) : dbData.stores[storeIdx].products[prodIdx].price,
        originalPrice: updated.originalPrice !== undefined ? (updated.originalPrice === null || updated.originalPrice === '' ? null : parseFloat(updated.originalPrice)) : dbData.stores[storeIdx].products[prodIdx].originalPrice,
        unit: updated.unit !== undefined ? sanitizeInput(updated.unit) : dbData.stores[storeIdx].products[prodIdx].unit,
        stock: updated.stock !== undefined ? parseInt(updated.stock) : dbData.stores[storeIdx].products[prodIdx].stock,
        desc: updated.desc !== undefined ? sanitizeInput(updated.desc) : dbData.stores[storeIdx].products[prodIdx].desc,
        image: updated.image || dbData.stores[storeIdx].products[prodIdx].image,
        variants: sanitizedVariants,
        dietaryType: updated.dietaryType !== undefined ? sanitizeInput(updated.dietaryType) : dbData.stores[storeIdx].products[prodIdx].dietaryType
    };
    
    writeDb(dbData);
    broadcastSync('catalog_changed', req.params.id);
    res.json(dbData.stores[storeIdx].products[prodIdx]);
});

// DELETE: Remove product from catalog
app.delete('/api/stores/:id/products/:productId', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    
    dbData.stores[storeIdx].products = dbData.stores[storeIdx].products.filter(p => p.id !== req.params.productId);
    writeDb(dbData);
    
    broadcastSync('catalog_changed', req.params.id);
    res.json({ success: true });
});

// POST: Add a store review & rating
app.post('/api/stores/:id/reviews', verifyToken, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    if (storeIdx === -1) {
        return res.status(404).json({ error: 'Store not found' });
    }
    
    const { rating, comment } = req.body;
    if (rating === undefined || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const store = dbData.stores[storeIdx];
    if (!store.reviews) {
        store.reviews = [];
    }
    
    const newReview = {
        id: 'rev-' + Date.now(),
        userId: req.user.id,
        userName: req.user.name,
        rating: parseFloat(rating),
        comment: comment || '',
        timestamp: new Date().toISOString()
    };
    
    store.reviews.push(newReview);
    
    // Recalculate average rating
    const totalRating = store.reviews.reduce((sum, r) => sum + r.rating, 0);
    store.rating = totalRating / store.reviews.length;
    store.reviewsCount = store.reviews.length;
    
    writeDb(dbData);
    broadcastSync('store_updated', store.id);
    res.status(201).json(newReview);
});

// GET: Fetch all orders (restricted by user role / owner status)
app.get('/api/orders', verifyToken, (req, res) => {
    const db = readDb();
    if (req.user.role === 'merchant') {
        const store = db.stores.find(s => s.ownerEmail === req.user.email);
        if (!store) return res.json([]);
        const storeOrders = db.orders.filter(o => o.storeId === store.id);
        res.json(storeOrders);
    } else {
        const customerOrders = db.orders.filter(o => o.customer && o.customer.userId === req.user.id);
        res.json(customerOrders);
    }
});

// POST: Place a new order
app.post('/api/orders', verifyToken, (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Only customers can place orders' });
    }
    const dbData = readDb();
    const orderData = req.body;
    
    // Fallback for items missing storeId: use root storeId if provided
    if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach(item => {
            if (!item.storeId && orderData.storeId) {
                item.storeId = orderData.storeId;
            }
        });
    }
    
    // Validate order items
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item.' });
    }
    
    // Dynamically resolve all unique stores from items
    const storeIdsInItems = [...new Set(orderData.items.map(item => item.storeId))];
    const storesMap = {};
    for (const sid of storeIdsInItems) {
        if (!sid) return res.status(400).json({ error: 'Every item must have a valid storeId.' });
        const store = dbData.stores.find(s => s.id === sid);
        if (!store) return res.status(404).json({ error: `Store ${sid} not found.` });
        if (store.status === 'Pending Approval') {
            return res.status(400).json({ error: `The store "${store.name}" is pending approval and cannot accept orders yet.` });
        }
        if (store.status === 'Suspended' || (store.subscription && store.subscription.status === 'Suspended')) {
            return res.status(400).json({ error: `The store "${store.name}" has been temporarily suspended by the platform.` });
        }
        const evaluatedStore = getStoreWithDynamicStatus(store);
        if (evaluatedStore.status === 'Closed') {
            return res.status(400).json({ error: `The store "${store.name}" is currently closed and cannot accept orders.` });
        }
        storesMap[sid] = store;
    }
    
    for (const item of orderData.items) {
        if (!item.id || !item.name || typeof item.price !== 'number' || item.price < 0 || typeof item.quantity !== 'number' || item.quantity <= 0 || !item.storeId) {
            return res.status(400).json({ error: 'Invalid item details in order items list.' });
        }
        
        const store = storesMap[item.storeId];
        if (!store) {
            return res.status(400).json({ error: 'Invalid store for item.' });
        }
        
        const dbProduct = store.products.find(p => p.id === item.id || p.id === item.productId);
        if (!dbProduct) {
            return res.status(404).json({ error: `Product "${item.name}" (${item.id}) not found in store "${store.name}".` });
        }
        
        let expectedPrice = dbProduct.price;
        if (item.variantId) {
            const variant = dbProduct.variants ? dbProduct.variants.find(v => v.id === item.variantId) : null;
            if (!variant) {
                return res.status(400).json({ error: `Variant ${item.variantId} not found for product "${dbProduct.name}".` });
            }
            expectedPrice = variant.price;
        }
        
        if (Math.abs(item.price - expectedPrice) > 0.01) {
            return res.status(400).json({ error: `Price mismatch for item "${item.name}". Expected: ₹${expectedPrice.toFixed(2)}, Received: ₹${item.price.toFixed(2)}.` });
        }
    }
    
    // Validate customer and payment details
    const customer = orderData.customer;
    if (!customer || !customer.name || !customer.phone || !customer.address || !customer.payment) {
        return res.status(400).json({ error: 'Complete customer details (name, phone, address, payment method) are required.' });
    }
    if (customer.payment !== 'cod' && customer.payment !== 'upi' && customer.payment !== 'wallet' && customer.payment !== 'split' && customer.payment !== 'stripe') {
        return res.status(400).json({ error: 'Payment method must be cod, upi, wallet, split, or stripe.' });
    }
    
    if (typeof orderData.deliveryFee === 'number' && orderData.deliveryFee < 0) {
        return res.status(400).json({ error: 'Delivery fee cannot be negative.' });
    }
    if (typeof orderData.discount === 'number' && orderData.discount < 0) {
        return res.status(400).json({ error: 'Discount cannot be negative.' });
    }

    // Calculate totals
    const totalSubtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Compute delivery fee per store
    const config = dbData.config || {
        subscriptionTrialDays: 15,
        subscriptionMonthlyFee: 499,
        subscriptionYearlyFee: 4999,
        baseDeliveryFee: 20.00,
        baseDeliveryRadius: 2.0,
        perKmDeliveryFee: 10.00,
        freeDeliveryThreshold: 300.00
    };
    const deliveryFeePerStore = {};
    Object.keys(storesMap).forEach(sid => {
        const store = storesMap[sid];
        const storeItems = orderData.items.filter(item => item.storeId === sid);
        let fee = 0;
        if (totalSubtotal < config.freeDeliveryThreshold) {
            const dist = storeItems[0].storeDistance || 1.0;
            fee = dist <= config.baseDeliveryRadius ? config.baseDeliveryFee : config.baseDeliveryFee + Math.ceil(dist - config.baseDeliveryRadius) * config.perKmDeliveryFee;
        }
        deliveryFeePerStore[sid] = fee;
    });
    
    let totalDeliveryFee = 0;
    Object.values(deliveryFeePerStore).forEach(f => { totalDeliveryFee += f; });
    const totalDiscount = parseFloat(orderData.discount) || 0;
    let appliedVoucher = null;
    if (orderData.voucherCode) {
        appliedVoucher = (dbData.vouchers || []).find(v => v.code.toUpperCase() === orderData.voucherCode.trim().toUpperCase());
    }
    const totalTip = parseFloat(customer.tip) || 0;
    const grandTotal = totalSubtotal + totalDeliveryFee + totalTip - totalDiscount;

    // Process payment
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
    const user = dbData.users[userIdx];
    
    let walletAmountPaid = 0;
    let splitAmountPaid = 0;
    let splitPaymentMethod = null;
    
    if (customer.payment === 'wallet') {
        if ((user.walletBalance || 0) < grandTotal) {
            return res.status(400).json({ error: `Insufficient wallet balance. Grand total is ₹${grandTotal.toFixed(2)} but your balance is ₹${(user.walletBalance || 0).toFixed(2)}.` });
        }
        dbData.users[userIdx].walletBalance = parseFloat(((user.walletBalance || 0) - grandTotal).toFixed(2));
        walletAmountPaid = grandTotal;
    } else if (customer.payment === 'split') {
        const wb = user.walletBalance || 0;
        if (wb <= 0) {
            return res.status(400).json({ error: 'Cannot perform split payment with zero wallet balance.' });
        }
        if (wb >= grandTotal) {
            dbData.users[userIdx].walletBalance = parseFloat((wb - grandTotal).toFixed(2));
            walletAmountPaid = grandTotal;
            customer.payment = 'wallet'; // Convert to full wallet order
        } else {
            dbData.users[userIdx].walletBalance = 0.00;
            walletAmountPaid = wb;
            splitAmountPaid = parseFloat((grandTotal - wb).toFixed(2));
            splitPaymentMethod = customer.splitPaymentMethod || 'upi';
        }
    }

    // Create MasterOrder & SubOrders
    const isMultiStore = Object.keys(storesMap).length > 1;

    if (isMultiStore) {
        const masterOrderId = 'master-' + Math.floor(100000 + Math.random() * 900000);
        const childOrders = [];
        const subOrderIds = [];
        
        for (const sid of Object.keys(storesMap)) {
            const store = storesMap[sid];
            const storeItems = orderData.items.filter(item => item.storeId === sid);
            const subtotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const deliveryFee = deliveryFeePerStore[sid];
            
            // Pro-rate discount, tip
            let storeDiscount = 0;
            if (appliedVoucher && appliedVoucher.storeId) {
                if (sid === appliedVoucher.storeId) {
                    storeDiscount = totalDiscount;
                }
            } else {
                storeDiscount = totalSubtotal > 0 ? parseFloat(((subtotal / totalSubtotal) * totalDiscount).toFixed(2)) : 0;
            }
            const storeTip = totalSubtotal > 0 ? parseFloat(((subtotal / totalSubtotal) * totalTip).toFixed(2)) : 0;
            const subGrandTotal = parseFloat((subtotal + deliveryFee + storeTip - storeDiscount).toFixed(2));
            
            // Pro-rate payment details
            const storeWalletPaid = grandTotal > 0 ? parseFloat(((subGrandTotal / grandTotal) * walletAmountPaid).toFixed(2)) : 0;
            const storeSplitPaid = grandTotal > 0 ? parseFloat(((subGrandTotal / grandTotal) * splitAmountPaid).toFixed(2)) : 0;
            
            const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
            const childOrderId = 'order-' + Math.floor(100000 + Math.random() * 900000);
            
            const childOrder = {
                id: childOrderId,
                masterOrderId: masterOrderId,
                storeId: store.id,
                storeName: store.name,
                storePhone: store.phone,
                storeAddress: store.address,
                items: storeItems.map(item => ({
                    id: item.id,
                    name: sanitizeInput(item.name),
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity),
                    emoji: item.emoji || 'fa-solid fa-box',
                    unit: sanitizeInput(item.unit || '1 Unit'),
                    variantId: item.variantId || null,
                    variantName: item.variantName || null
                })),
                subtotal: subtotal,
                deliveryFee: deliveryFee,
                discount: storeDiscount,
                grandTotal: subGrandTotal,
                voucherCode: sanitizeInput(orderData.voucherCode || ''),
                deliveryInstructions: sanitizeInput(orderData.deliveryInstructions || ''),
                customer: {
                    name: sanitizeInput(customer.name),
                    phone: sanitizeInput(customer.phone),
                    address: sanitizeInput(customer.address),
                    payment: customer.payment,
                    transactionId: sanitizeInput(customer.transactionId || ''),
                    userId: req.user.id,
                    email: req.user.email,
                    walletAmountPaid: storeWalletPaid,
                    splitAmountPaid: storeSplitPaid,
                    splitPaymentMethod: splitPaymentMethod
                },
                status: 'Pending',
                deliveryOtp: deliveryOtp,
                timestamp: new Date().toISOString(),
                statusTimeline: [
                    { status: 'Pending', time: new Date().toISOString(), desc: 'Waiting for store approval' }
                ],
                substitutionProposal: null,
                chatMessages: []
            };
            
            childOrders.push(childOrder);
            subOrderIds.push(childOrderId);
        }
        
        // Deduct stock levels on server
        orderData.items.forEach(cartItem => {
            const store = storesMap[cartItem.storeId];
            if (store) {
                const product = store.products.find(p => p.id === cartItem.id || p.id === cartItem.productId);
                if (product) {
                    if (cartItem.variantId && product.variants && product.variants.length > 0) {
                        const variant = product.variants.find(v => v.id === cartItem.variantId);
                        if (variant) {
                            variant.stock = Math.max(0, variant.stock - cartItem.quantity);
                        }
                    } else {
                        product.stock = Math.max(0, product.stock - cartItem.quantity);
                    }
                }
            }
        });
        
        dbData.orders.push(...childOrders);
        writeDb(dbData);
        
        // Schedule auto-cancellation timeouts for child orders
        childOrders.forEach(co => {
            addJob('order_timeout', { orderId: co.id }, 30 * 60 * 1000).catch(err => {
                console.error(`[Queue] Failed to add timeout job for ${co.id}:`, err.message);
            });
        });
        
        const masterOrder = {
            id: masterOrderId,
            isMaster: true,
            subOrders: childOrders,
            subOrderIds: subOrderIds,
            grandTotal: grandTotal,
            deliveryInstructions: sanitizeInput(orderData.deliveryInstructions || ''),
            customer: customer,
            timestamp: new Date().toISOString()
        };
        
        broadcastSync('order_placed', masterOrder);
        res.status(201).json(masterOrder);
    } else {
        // Single Store Checkout (Standard Order Structure)
        const sid = Object.keys(storesMap)[0];
        const store = storesMap[sid];
        const deliveryFee = deliveryFeePerStore[sid];
        const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const orderId = 'order-' + Math.floor(100000 + Math.random() * 900000);
        
        const singleOrder = {
            id: orderId,
            storeId: store.id,
            storeName: store.name,
            storePhone: store.phone,
            storeAddress: store.address,
            items: orderData.items.map(item => ({
                id: item.id,
                name: sanitizeInput(item.name),
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                emoji: item.emoji || 'fa-solid fa-box',
                unit: sanitizeInput(item.unit || '1 Unit'),
                variantId: item.variantId || null,
                variantName: item.variantName || null
            })),
            subtotal: totalSubtotal,
            deliveryFee: deliveryFee,
            discount: totalDiscount,
            grandTotal: grandTotal,
            voucherCode: sanitizeInput(orderData.voucherCode || ''),
            deliveryInstructions: sanitizeInput(orderData.deliveryInstructions || ''),
            customer: {
                name: sanitizeInput(customer.name),
                phone: sanitizeInput(customer.phone),
                address: sanitizeInput(customer.address),
                payment: customer.payment,
                transactionId: sanitizeInput(customer.transactionId || ''),
                userId: req.user.id,
                email: req.user.email,
                walletAmountPaid: walletAmountPaid,
                splitAmountPaid: splitAmountPaid,
                splitPaymentMethod: splitPaymentMethod
            },
            status: 'Pending',
            deliveryOtp: deliveryOtp,
            timestamp: new Date().toISOString(),
            statusTimeline: [
                { status: 'Pending', time: new Date().toISOString(), desc: 'Waiting for store approval' }
            ],
            substitutionProposal: null,
            chatMessages: []
        };
        
        // Deduct stock levels on server
        orderData.items.forEach(cartItem => {
            const product = store.products.find(p => p.id === cartItem.id || p.id === cartItem.productId);
            if (product) {
                if (cartItem.variantId && product.variants && product.variants.length > 0) {
                    const variant = product.variants.find(v => v.id === cartItem.variantId);
                    if (variant) {
                        variant.stock = Math.max(0, variant.stock - cartItem.quantity);
                    }
                } else {
                    product.stock = Math.max(0, product.stock - cartItem.quantity);
                }
            }
        });
        
        dbData.orders.push(singleOrder);
        writeDb(dbData);
        
        // Schedule auto-cancellation timeout for single order
        addJob('order_timeout', { orderId: singleOrder.id }, 30 * 60 * 1000).catch(err => {
            console.error(`[Queue] Failed to add timeout job for ${singleOrder.id}:`, err.message);
        });
        
        broadcastSync('order_placed', singleOrder);
        res.status(201).json(singleOrder);
    }
});

// Helper: Process Referral reward on successful delivery
function processReferralRewardIfApplicable(order, dbData) {
    if (order.status === 'Delivered' && order.customer && order.customer.userId) {
        const customerUser = dbData.users.find(u => u.id === order.customer.userId);
        if (customerUser && customerUser.referredBy && !customerUser.referralClaimed) {
            const referrerUser = dbData.users.find(u => u.id === customerUser.referredBy);
            if (referrerUser) {
                referrerUser.walletBalance = parseFloat(((referrerUser.walletBalance || 0) + 50).toFixed(2));
                customerUser.referralClaimed = true;
                
                // Add ledger entry
                const ledgerId = 'ledger-' + Math.floor(100000 + Math.random() * 900000);
                dbData.ledger.push({
                    id: ledgerId,
                    orderId: order.id,
                    type: 'referral_reward',
                    debit: 50.00,
                    credit: 0,
                    description: `Referral reward of ₹50 credited to referrer ${referrerUser.email} for first order of referred customer ${customerUser.email}`,
                    timestamp: new Date().toISOString()
                });
                console.log(`[REFERRAL REWARD] Credited ₹50 to referrer ${referrerUser.email} for customer ${customerUser.email}'s first order.`);
            }
        }
    }
}

// Helper: Simulated messaging dispatch for status updates
function sendMockNotification(order, oldStatus, newStatus) {
    let mockMessage = "";
    if (newStatus === 'Preparing') {
        mockMessage = `Email sent to merchant: You have a new order #${order.id} to prepare.`;
        console.log(`\n┌───────────────────────────────────────────────┐\n│  [EMAIL] MOCK EMAIL DISPATCHED               │\n├───────────────────────────────────────────────┤\n│ To: merchant@luxe.com (Store: ${order.storeName}) \n│ Subject: New Order #${order.id} Received     \n│ Body: Please prepare the order.               \n└───────────────────────────────────────────────┘\n`);
    } else if (newStatus === 'Out for Delivery') {
        const staff = order.deliveryStaff || { name: 'Delivery Partner', phone: '+91 99999 88888' };
        mockMessage = `SMS sent to customer at ${order.customer.phone}: Your LuxeGrocer order #${order.id} is out for delivery with rider ${staff.name} (${staff.phone}). Track: http://localhost:8001/?track=${order.id}`;
        console.log(`\n┌───────────────────────────────────────────────┐\n│  [SMS] MOCK SMS DISPATCHED                     │\n├───────────────────────────────────────────────┤\n│ To: ${order.customer.phone} (${order.customer.name})     \n│ Subject: Order #${order.id} Dispatched       \n│ Body: Out for delivery with rider ${staff.name} (${staff.phone}).\n└───────────────────────────────────────────────┘\n`);
    } else if (newStatus === 'Delivered') {
        mockMessage = `SMS sent to customer: Your LuxeGrocer order #${order.id} has been delivered successfully. Thank you for shopping with us!`;
        console.log(`\n┌───────────────────────────────────────────────┐\n│  [SMS] MOCK SMS DISPATCHED                     │\n├───────────────────────────────────────────────┤\n│ To: ${order.customer.phone} (${order.customer.name})     \n│ Subject: Order #${order.id} Delivered        \n│ Body: Order delivered successfully.           \n└───────────────────────────────────────────────┘\n`);
    } else if (newStatus === 'Cancelled') {
        mockMessage = `SMS sent to customer: Your LuxeGrocer order #${order.id} was cancelled. Refund of payment has been initiated.`;
        console.log(`\n┌───────────────────────────────────────────────┐\n│  [SMS] MOCK SMS DISPATCHED                     │\n├───────────────────────────────────────────────┤\n│ To: ${order.customer.phone} (${order.customer.name})     \n│ Subject: Order #${order.id} Cancelled        \n│ Body: Your order has been cancelled and refunded.\n└───────────────────────────────────────────────┘\n`);
    }
    
    if (mockMessage) {
        broadcastSync('sys_notification', {
            orderId: order.id,
            message: mockMessage,
            timestamp: new Date().toISOString()
        });
    }
}

// PUT: Advance/Update order status manually
app.put('/api/orders/:id/status', verifyToken, verifyOrderStatusUpdater, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    
    const { status, description, prepTimeMinutes, deliveryStaff, reason, cancelledBy } = req.body;
    const oldStatus = dbData.orders[idx].status;
    dbData.orders[idx].status = status;
    
    if (status === 'Cancelled') {
        dbData.orders[idx].cancelledBy = cancelledBy || req.user.role;
        dbData.orders[idx].cancellationReason = reason || 'No reason specified';
    }
    
    if (status === 'Preparing') {
        dbData.orders[idx].prepTimeMinutes = parseInt(prepTimeMinutes) || 15;
        dbData.orders[idx].acceptedAt = new Date().toISOString();
    }
    
    if (status === 'Out for Delivery') {
        if (!deliveryStaff || !deliveryStaff.name || !deliveryStaff.phone) {
            return res.status(400).json({ error: 'Delivery staff details (name and phone) are required when dispatching the order.' });
        }
        dbData.orders[idx].deliveryStaff = {
            name: deliveryStaff.name,
            phone: deliveryStaff.phone
        };
    }
    
    dbData.orders[idx].statusTimeline.push({
        status,
        time: new Date().toISOString(),
        desc: description || (status === 'Cancelled' ? `Order cancelled by ${cancelledBy || req.user.role}. Reason: ${reason || 'No reason specified'}` : 'Order status updated')
    });
    
    processReferralRewardIfApplicable(dbData.orders[idx], dbData);
    handleRefundIfCancelled(dbData.orders[idx], dbData);
    
    writeDb(dbData);
    broadcastSync('orders_updated', req.params.id);
    res.json(dbData.orders[idx]);
    sendMockNotification(dbData.orders[idx], oldStatus, status);
});

// POST: Verify doorstep OTP and mark delivered
app.post('/api/orders/:id/verify-otp', verifyToken, verifyOrderStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    
    const { otp } = req.body;
    const order = dbData.orders[idx];
    
    if (order.deliveryOtp !== otp.trim()) {
        return res.status(400).json({ error: 'Invalid OTP. Please check with customer.' });
    }
    
    const oldStatus = order.status;
    dbData.orders[idx].status = 'Delivered';
    dbData.orders[idx].statusTimeline.push({
        status: 'Delivered',
        time: new Date().toISOString(),
        desc: 'Direct doorstep delivery successfully completed and verified.'
    });
    
    processReferralRewardIfApplicable(dbData.orders[idx], dbData);
    
    writeDb(dbData);
    broadcastSync('orders_updated', req.params.id);
    res.json({ success: true, order: dbData.orders[idx] });
    sendMockNotification(dbData.orders[idx], oldStatus, 'Delivered');
});

// POST: Propose a substitution for an out-of-stock item
app.post('/api/orders/:id/substitution-proposal', verifyToken, verifyOrderStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    const order = dbData.orders[idx];
    
    if (order.status !== 'Pending' && order.status !== 'Preparing') {
        return res.status(400).json({ error: 'Substitutions can only be proposed for active orders in Pending or Preparing state.' });
    }
    
    const { originalItemId, suggestedProduct } = req.body;
    if (!originalItemId || !suggestedProduct || !suggestedProduct.id || !suggestedProduct.name || !suggestedProduct.price) {
        return res.status(400).json({ error: 'Original item ID and complete suggested product details (id, name, price) are required.' });
    }
    
    const originalItem = order.items.find(item => item.id === originalItemId);
    if (!originalItem) {
        return res.status(400).json({ error: 'Original item not found in order items.' });
    }
    
    // Temporarily restock the original item's quantity in inventory
    const store = dbData.stores.find(s => s.id === order.storeId);
    if (store) {
        const product = store.products.find(p => p.id === originalItem.id);
        if (product) {
            if (originalItem.variantId && product.variants && product.variants.length > 0) {
                const variant = product.variants.find(v => v.id === originalItem.variantId);
                if (variant) {
                    variant.stock += originalItem.quantity;
                }
            } else {
                product.stock += originalItem.quantity;
            }
        }
    }
    
    order.substitutionProposal = {
        originalItemId,
        suggestedProduct: {
            id: suggestedProduct.id,
            name: suggestedProduct.name,
            price: parseFloat(suggestedProduct.price),
            emoji: suggestedProduct.emoji || 'fa-solid fa-box',
            unit: suggestedProduct.unit || '1 Unit',
            variantId: suggestedProduct.variantId || null,
            variantName: suggestedProduct.variantName || null
        },
        status: 'Pending'
    };
    
    writeDb(dbData);
    broadcastSync('orders_updated', order.id);
    res.json(order);
});

// POST: Customer responds (Accepts / Declines) the substitution proposal
app.post('/api/orders/:id/substitution-response', verifyToken, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    const order = dbData.orders[idx];
    
    const prevGrandTotal = order.grandTotal || (order.subtotal + order.deliveryFee + (order.customer.tip || 0) - order.discount);
    
    if (req.user.role !== 'customer' || order.customer.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: Only the customer who placed the order can respond to substitutions.' });
    }
    
    const proposal = order.substitutionProposal;
    if (!proposal || proposal.status !== 'Pending') {
        return res.status(400).json({ error: 'No active pending substitution proposal found for this order.' });
    }
    
    const { action } = req.body;
    if (action !== 'Accept' && action !== 'Decline') {
        return res.status(400).json({ error: 'Action must be Accept or Decline.' });
    }
    
    const originalItemIdx = order.items.findIndex(item => item.id === proposal.originalItemId);
    if (originalItemIdx === -1) {
        return res.status(400).json({ error: 'Original item not found in order items.' });
    }
    const originalItem = order.items[originalItemIdx];
    const store = dbData.stores.find(s => s.id === order.storeId);
    
    if (action === 'Accept') {
        const suggested = proposal.suggestedProduct;
        const newQty = originalItem.quantity;
        
        // Deduct stock of the suggested product
        if (store) {
            const product = store.products.find(p => p.id === suggested.id);
            if (product) {
                if (suggested.variantId && product.variants && product.variants.length > 0) {
                    const variant = product.variants.find(v => v.id === suggested.variantId);
                    if (variant) {
                        if (variant.stock < newQty) {
                            return res.status(400).json({ error: `Not enough stock of ${suggested.name} variant available.` });
                        }
                        variant.stock = Math.max(0, variant.stock - newQty);
                    }
                } else {
                    if (product.stock < newQty) {
                        return res.status(400).json({ error: `Not enough stock of ${suggested.name} available.` });
                    }
                    product.stock = Math.max(0, product.stock - newQty);
                }
            }
        }
        
        // Swap item in order
        order.items[originalItemIdx] = {
            id: suggested.id,
            name: suggested.name,
            price: suggested.price,
            quantity: newQty,
            emoji: suggested.emoji,
            unit: suggested.unit,
            variantId: suggested.variantId,
            variantName: suggested.variantName
        };
    } else {
        // Decline: Remove item entirely. Original item stock is already restored during proposal posting.
        order.items.splice(originalItemIdx, 1);
    }
    
    // Recalculate order totals
    order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const storeDistance = order.customer.storeDistance || 1.0;
    if (order.subtotal >= 300 || order.subtotal === 0) {
        order.deliveryFee = 0.00;
    } else {
        order.deliveryFee = storeDistance <= 2 ? 20.00 : 20.00 + Math.ceil(storeDistance - 2) * 10.00;
    }
    
    if (order.voucherCode) {
        const voucher = (dbData.vouchers || []).find(v => v.code.toUpperCase() === order.voucherCode.toUpperCase());
        if (voucher) {
            if (order.subtotal >= voucher.minOrderValue) {
                if (voucher.discountType === 'fixed') {
                    order.discount = Math.min(voucher.value, order.subtotal);
                } else if (voucher.discountType === 'free-delivery') {
                    order.discount = order.deliveryFee;
                    order.deliveryFee = 0.00;
                }
            } else {
                order.discount = 0;
                order.voucherRevoked = true;
            }
        }
    }
    
    const tip = order.customer.tip || 0;
    order.grandTotal = order.subtotal + order.deliveryFee + tip - order.discount;
    
    // Refund or charge difference
    const diff = prevGrandTotal - order.grandTotal;
    let refundMsg = "";
    if (diff > 0) {
        const customerUser = dbData.users.find(u => u.id === order.customer.userId);
        if (customerUser) {
            customerUser.walletBalance = parseFloat(((customerUser.walletBalance || 0.00) + diff).toFixed(2));
            refundMsg = ` Refund of ₹${diff.toFixed(2)} credited to your wallet.`;
        }
    } else if (diff < 0) {
        const extraCost = -diff;
        const customerUser = dbData.users.find(u => u.id === order.customer.userId);
        if (customerUser) {
            if (customerUser.walletBalance >= extraCost) {
                customerUser.walletBalance = parseFloat((customerUser.walletBalance - extraCost).toFixed(2));
                order.substitutionExtraPaid = extraCost;
                order.substitutionPaymentMethod = 'wallet';
                refundMsg = ` Additional cost of ₹${extraCost.toFixed(2)} deducted from your wallet.`;
            } else {
                order.substitutionExtraPaid = extraCost;
                order.substitutionPaymentMethod = 'due_on_delivery';
                refundMsg = ` Additional cost of ₹${extraCost.toFixed(2)} to be settled on delivery.`;
            }
        }
    }
    
    order.statusTimeline.push({
        status: order.status,
        time: new Date().toISOString(),
        desc: action === 'Accept' 
            ? `Substitution accepted: Swapped '${originalItem.name}' for '${proposal.suggestedProduct.name}'. Order total updated to ₹${order.grandTotal.toFixed(2)}.${refundMsg}`
            : `Substitution declined: Removed '${originalItem.name}' from order. Order total updated to ₹${order.grandTotal.toFixed(2)}.${refundMsg}`
    });
    
    order.substitutionProposal = null;
    
    writeDb(dbData);
    broadcastSync('orders_updated', order.id);
    res.json(order);
});

// POST: Send a chat message for an order
app.post('/api/orders/:id/chat', verifyToken, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    const order = dbData.orders[idx];
    
    const isCustomer = req.user.role === 'customer' && order.customer.userId === req.user.id;
    const store = dbData.stores.find(s => s.id === order.storeId);
    const isMerchant = req.user.role === 'merchant' && store && store.ownerEmail === req.user.email;
    
    if (!isCustomer && !isMerchant) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to send messages for this order.' });
    }
    
    const { text } = req.body;
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Message text cannot be empty.' });
    }
    
    if (!order.chatMessages) {
        order.chatMessages = [];
    }
    
    const message = {
        sender: req.user.role,
        senderName: req.user.name,
        text: sanitizeInput(text.trim()),
        timestamp: new Date().toISOString()
    };
    
    order.chatMessages.push(message);
    writeDb(dbData);
    broadcastSync('orders_updated', order.id);
    res.status(201).json(message);
});

// --- Saved Addresses routes ---
app.get('/api/users/addresses', verifyToken, (req, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.addresses || []);
});

app.post('/api/users/addresses', verifyToken, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
    
    const { tag, address, lat, lng } = req.body;
    if (!tag || !address) {
        return res.status(400).json({ error: 'Tag and address are required' });
    }
    
    if (!dbData.users[userIdx].addresses) {
        dbData.users[userIdx].addresses = [];
    }
    
    const newAddress = {
        id: 'addr-' + Date.now(),
        tag,
        address,
        lat: parseFloat(lat) || 12.9250,
        lng: parseFloat(lng) || 77.6220
    };
    
    dbData.users[userIdx].addresses.push(newAddress);
    writeDb(dbData);
    res.status(201).json(newAddress);
});

app.delete('/api/users/addresses/:id', verifyToken, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found' });
    
    if (!dbData.users[userIdx].addresses) {
        dbData.users[userIdx].addresses = [];
    }
    
    dbData.users[userIdx].addresses = dbData.users[userIdx].addresses.filter(a => a.id !== req.params.id);
    writeDb(dbData);
    res.json({ success: true });
});

// --- Vouchers routes ---
app.get('/api/vouchers', (req, res) => {
    const dbData = readDb();
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.role === 'merchant') {
                const storeVouchers = (dbData.vouchers || []).filter(v => v.storeId === decoded.storeId);
                return res.json(storeVouchers);
            }
        } catch(e) {}
    }
    res.json(dbData.vouchers || []);
});

app.post('/api/vouchers', verifyToken, (req, res) => {
    const { code, discountType, value, minOrderValue, desc, storeId } = req.body;
    if (!code || !discountType || value === undefined || minOrderValue === undefined || !desc) {
        return res.status(400).json({ error: 'All coupon fields are required.' });
    }
    const dbData = readDb();
    
    // Check if code already exists
    if (dbData.vouchers.some(v => v.code.toUpperCase() === code.trim().toUpperCase())) {
        return res.status(400).json({ error: 'Coupon code already exists.' });
    }
    
    // Authorization check
    let targetStoreId = null;
    if (req.user.role === 'merchant') {
        if (!req.user.storeId) {
            return res.status(403).json({ error: 'Merchant has no assigned store.' });
        }
        targetStoreId = req.user.storeId;
    } else if (req.user.role === 'admin') {
        targetStoreId = storeId || null;
    } else {
        return res.status(403).json({ error: 'Unauthorized to create coupons.' });
    }
    
    const newVoucher = {
        code: code.trim().toUpperCase(),
        discountType,
        value: parseFloat(value),
        minOrderValue: parseFloat(minOrderValue),
        desc: sanitizeInput(desc),
        storeId: targetStoreId
    };
    
    dbData.vouchers.push(newVoucher);
    writeDb(dbData);
    res.status(201).json(newVoucher);
});

app.delete('/api/vouchers/:code', verifyToken, (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const dbData = readDb();
    const idx = dbData.vouchers.findIndex(v => v.code.toUpperCase() === code);
    if (idx === -1) {
        return res.status(404).json({ error: 'Coupon not found.' });
    }
    
    const voucher = dbData.vouchers[idx];
    if (req.user.role === 'merchant') {
        if (voucher.storeId !== req.user.storeId) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this coupon.' });
        }
    } else if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to delete coupons.' });
    }
    
    dbData.vouchers.splice(idx, 1);
    writeDb(dbData);
    res.json({ success: true, message: 'Coupon deleted successfully.' });
});

app.post('/api/vouchers/validate', verifyToken, (req, res) => {
    const { code, subtotal, storeSubtotals } = req.body;
    if (!code || subtotal === undefined) {
        return res.status(400).json({ error: 'Code and subtotal are required' });
    }
    
    const dbData = readDb();
    const voucher = (dbData.vouchers || []).find(v => v.code.toUpperCase() === code.trim().toUpperCase());
    
    if (!voucher) {
        return res.status(404).json({ error: 'Invalid voucher code' });
    }
    
    if (voucher.storeId) {
        if (!storeSubtotals || typeof storeSubtotals !== 'object') {
            return res.status(400).json({ error: 'This coupon code is only valid for items from a specific merchant store.' });
        }
        const storeSub = storeSubtotals[voucher.storeId];
        if (storeSub === undefined) {
            return res.status(400).json({ error: 'This coupon code is only valid for items from a specific merchant store.' });
        }
        if (storeSub < voucher.minOrderValue) {
            return res.status(400).json({ error: `Minimum purchase of ₹${voucher.minOrderValue} from the qualifying store is required to apply this coupon.` });
        }
    } else {
        if (subtotal < voucher.minOrderValue) {
            return res.status(400).json({ error: `Minimum order value to apply this voucher is ₹${voucher.minOrderValue}` });
        }
    }
    
    res.json({
        success: true,
        voucher: {
            code: voucher.code,
            discountType: voucher.discountType,
            value: voucher.value,
            desc: voucher.desc,
            storeId: voucher.storeId || null
        }
    });
});

// --- Banners routes ---
app.get('/api/banners', (req, res) => {
    const dbData = readDb();
    const activeBanners = (dbData.banners || []).filter(b => b.active);
    res.json(activeBanners);
});

app.post('/api/banners', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Only admins can manage promotional banners.' });
    }
    const { text, imageUrl, linkUrl, active } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Banner text is required.' });
    }
    const dbData = readDb();
    if (!dbData.banners) dbData.banners = [];
    
    const newBanner = {
        id: 'banner-' + Date.now(),
        text: sanitizeInput(text),
        imageUrl: sanitizeInput(imageUrl || ''),
        linkUrl: sanitizeInput(linkUrl || ''),
        active: active !== undefined ? !!active : true
    };
    dbData.banners.push(newBanner);
    writeDb(dbData);
    res.status(201).json(newBanner);
});

app.delete('/api/banners/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: Only admins can manage promotional banners.' });
    }
    const dbData = readDb();
    if (!dbData.banners) dbData.banners = [];
    const idx = dbData.banners.findIndex(b => b.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Banner not found.' });
    }
    dbData.banners.splice(idx, 1);
    writeDb(dbData);
    res.json({ success: true, message: 'Banner deleted successfully.' });
});

// --- Background Expiry & Stock Refund Daemon ---
setInterval(() => {
    const dbData = readDb();
    let changed = false;
    const now = new Date();

    dbData.orders.forEach(order => {
        // Only process active orders
        if (order.status !== 'Delivered' && order.status !== 'Cancelled') {
            
            // Rule 1: Exceeded assigned preparation/delivery time + 30 minutes grace window
            const placedTime = new Date(order.timestamp);
            const prepTime = order.prepTimeMinutes !== undefined ? order.prepTimeMinutes : 15;
            const startTime = order.acceptedAt ? new Date(order.acceptedAt) : placedTime;
            const deadlineTime = new Date(startTime.getTime() + (prepTime + 30) * 60 * 1000);
            
            if (now > deadlineTime) {
                console.log(`[AUTO-CANCEL] Order #${order.id} delivery deadline exceeded. Auto-cancelling...`);
                order.status = 'Cancelled';
                order.statusTimeline.push({
                    status: 'Cancelled',
                    time: now.toISOString(),
                    desc: `Order automatically cancelled as delivery exceeded assigned time (${prepTime} mins) + 30 mins grace window. Refund of ₹${(order.subtotal + order.deliveryFee - order.discount).toFixed(2)} processed.`
                });
                
                handleRefundIfCancelled(order, dbData);
                
                // Restock inventory levels
                order.items.forEach(cartItem => {
                    const store = dbData.stores.find(s => s.id === order.storeId);
                    if (store) {
                        const product = store.products.find(p => p.id === cartItem.id);
                        if (product) {
                            if (cartItem.variantId && product.variants && product.variants.length > 0) {
                                const variant = product.variants.find(v => v.id === cartItem.variantId);
                                if (variant) {
                                    variant.stock += cartItem.quantity;
                                    console.log(`  Restocked variant ${variant.name} of ${product.name} by ${cartItem.quantity} units.`);
                                }
                            } else {
                                product.stock += cartItem.quantity;
                                console.log(`  Restocked product ${product.name} by ${cartItem.quantity} units.`);
                            }
                        }
                    }
                });
                
                changed = true;
                broadcastSync('orders_updated', order.id);
                sendMockNotification(order, 'Preparing', 'Cancelled');
            }
            
            // Rule 2: Pending timeout - remained in Pending status for > 30 minutes without acceptance
            if (order.status === 'Pending') {
                const placedTime = new Date(order.timestamp);
                const pendingDeadline = new Date(placedTime.getTime() + 30 * 60 * 1000);
                
                if (now > pendingDeadline) {
                    console.log(`[AUTO-CANCEL] Order #${order.id} remained Pending too long. Auto-cancelling...`);
                    order.status = 'Cancelled';
                    order.statusTimeline.push({
                        status: 'Cancelled',
                        time: now.toISOString(),
                        desc: `Order automatically cancelled as store did not accept within 30 minutes. Refund processed.`
                    });
                    
                    handleRefundIfCancelled(order, dbData);
                    
                    // Restock inventory levels
                    order.items.forEach(cartItem => {
                        const store = dbData.stores.find(s => s.id === order.storeId);
                        if (store) {
                            const product = store.products.find(p => p.id === cartItem.id);
                            if (product) {
                                if (cartItem.variantId && product.variants && product.variants.length > 0) {
                                    const variant = product.variants.find(v => v.id === cartItem.variantId);
                                    if (variant) {
                                        variant.stock += cartItem.quantity;
                                        console.log(`  Restocked variant ${variant.name} of ${product.name} by ${cartItem.quantity} units.`);
                                    }
                                } else {
                                    product.stock += cartItem.quantity;
                                    console.log(`  Restocked product ${product.name} by ${cartItem.quantity} units.`);
                                }
                            }
                        }
                    });
                    
                    changed = true;
                    broadcastSync('orders_updated', order.id);
                    sendMockNotification(order, 'Pending', 'Cancelled');
                }
            }
        }
    });

    if (changed) {
        writeDb(dbData);
    }
}, 10000);

// --- Platform Administration Endpoints (Phase 13) ---
function verifyAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Platform Administrator privileges required.' });
    }
    next();
}

// GET: All stores for admin audits
app.get('/api/admin/stores', verifyToken, verifyAdmin, (req, res) => {
    const db = readDb();
    res.json(db.stores);
});

// POST: Approve a pending store
app.post('/api/admin/stores/:id/approve', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const idx = dbData.stores.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Store not found' });
    
    const prevStatus = dbData.stores[idx].status;
    dbData.stores[idx].status = 'Open';
    
    if (prevStatus === 'Suspended' && dbData.stores[idx].subscription) {
        dbData.stores[idx].subscription.status = 'Active';
    }
    
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(dbData.stores[idx]);
});

// POST: Suspend a store storefront
app.post('/api/admin/stores/:id/suspend', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const idx = dbData.stores.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Store not found' });
    
    dbData.stores[idx].status = 'Suspended';
    if (dbData.stores[idx].subscription) {
        dbData.stores[idx].subscription.status = 'Suspended';
    }
    
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(dbData.stores[idx]);
});

// GET: All digital payments needing clearing settlements
app.get('/api/admin/settlements', verifyToken, verifyAdmin, (req, res) => {
    const db = readDb();
    const orders = db.orders.filter(o => 
        o.customer.payment === 'upi' || 
        (o.customer.payment === 'split' && o.customer.splitPaymentMethod === 'upi')
    );
    res.json(orders);
});

// POST: Settle payout and verify transaction references
app.post('/api/admin/settlements/:id/verify', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    
    const order = dbData.orders[idx];
    if (order.payoutSettled) {
        return res.status(400).json({ error: 'This transaction payout has already been verified and settled.' });
    }
    
    dbData.orders[idx].payoutSettled = true;
    const payoutAmount = order.grandTotal;
    
    // Log credit and debit lines in double-entry ledger
    const ledgerEntryCredit = {
        id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
        orderId: order.id,
        type: 'order_payment',
        debit: 0.00,
        credit: parseFloat(payoutAmount),
        description: `Customer payment received (UTR: ${order.customer.transactionId || 'N/A'}) for Order #${order.id}`,
        timestamp: new Date().toISOString()
    };
    
    const ledgerEntryDebit = {
        id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
        orderId: order.id,
        type: 'order_payout',
        debit: parseFloat(payoutAmount),
        credit: 0.00,
        description: `Payout transfer to store "${order.storeName}" for Order #${order.id}`,
        timestamp: new Date().toISOString()
    };
    
    if (!dbData.ledger) dbData.ledger = [];
    dbData.ledger.push(ledgerEntryCredit, ledgerEntryDebit);
    
    writeDb(dbData);
    broadcastSync('orders_updated', order.id);
    res.json({ success: true, payoutAmount, order: dbData.orders[idx] });
});

// GET: platform ledger transactions journal
app.get('/api/admin/ledger', verifyToken, verifyAdmin, (req, res) => {
    const db = readDb();
    res.json(db.ledger || []);
});

// GET: global configurations settings
app.get('/api/admin/config', verifyToken, verifyAdmin, (req, res) => {
    const db = readDb();
    res.json(db.config || {});
});

// POST: Save configurations updates
app.post('/api/admin/config', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const settings = req.body;
    
    dbData.config = {
        subscriptionTrialDays: parseInt(settings.subscriptionTrialDays) || 15,
        subscriptionMonthlyFee: parseFloat(settings.subscriptionMonthlyFee) || 499,
        subscriptionYearlyFee: parseFloat(settings.subscriptionYearlyFee) || 4999,
        baseDeliveryFee: parseFloat(settings.baseDeliveryFee) || 20,
        baseDeliveryRadius: parseFloat(settings.baseDeliveryRadius) || 2,
        perKmDeliveryFee: parseFloat(settings.perKmDeliveryFee) || 10,
        freeDeliveryThreshold: parseFloat(settings.freeDeliveryThreshold) || 300
    };
    
    writeDb(dbData);
    res.json(dbData.config);
});

// --- GAP API EXTENSIONS ---

// POST: Broadcast SSE system notification
app.post('/api/admin/broadcast', verifyToken, verifyAdmin, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required' });
    
    broadcastSync('sys_notification', { type: 'broadcast', message });
    res.json({ success: true, message });
});

// Category Management CRUD
app.post('/api/admin/categories', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    if (!dbData.categories) dbData.categories = JSON.parse(JSON.stringify(defaultCategories));
    
    const { id, name, parentId, image } = req.body;
    if (!id || !name) {
        return res.status(400).json({ error: 'Category ID and Name are required.' });
    }
    
    const exists = dbData.categories.some(c => c.id === id);
    if (exists) {
        return res.status(400).json({ error: `Category with ID "${id}" already exists.` });
    }
    
    const newCat = { id, name, parentId: parentId || null, image: image || '' };
    dbData.categories.push(newCat);
    writeDb(dbData);
    res.status(201).json(newCat);
});

app.put('/api/admin/categories/:id', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    if (!dbData.categories) dbData.categories = JSON.parse(JSON.stringify(defaultCategories));
    
    const catIdx = dbData.categories.findIndex(c => c.id === req.params.id);
    if (catIdx === -1) return res.status(404).json({ error: 'Category not found.' });
    
    const { name, parentId, image } = req.body;
    if (name === '') return res.status(400).json({ error: 'Category Name cannot be empty.' });
    
    dbData.categories[catIdx] = {
        ...dbData.categories[catIdx],
        name: name || dbData.categories[catIdx].name,
        parentId: parentId !== undefined ? parentId : dbData.categories[catIdx].parentId,
        image: image !== undefined ? image : dbData.categories[catIdx].image
    };
    
    writeDb(dbData);
    res.json(dbData.categories[catIdx]);
});

app.delete('/api/admin/categories/:id', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    if (!dbData.categories) dbData.categories = JSON.parse(JSON.stringify(defaultCategories));
    
    const catId = req.params.id;
    const catIdx = dbData.categories.findIndex(c => c.id === catId);
    if (catIdx === -1) return res.status(404).json({ error: 'Category not found.' });
    
    const subIds = getSubcategoryIds(dbData.categories, catId);
    
    dbData.categories = dbData.categories.filter(c => !subIds.includes(c.id));
    
    dbData.stores.forEach(s => {
        if (s.products) {
            s.products.forEach(p => {
                if (subIds.includes(p.category)) {
                    p.category = 'uncategorized';
                }
            });
        }
    });
    
    writeDb(dbData);
    res.json({ success: true, deletedIds: subIds });
});

// Customer Account Suspension Management
app.get('/api/admin/users', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const sanitized = dbData.users.map(u => {
        const { password, ...rest } = u;
        return { ...rest, status: u.status || 'Active' };
    });
    res.json(sanitized);
});

app.post('/api/admin/users/:id/suspend', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.params.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found.' });
    
    if (dbData.users[userIdx].role === 'admin') {
        return res.status(400).json({ error: 'Platform administrators cannot be suspended.' });
    }
    
    dbData.users[userIdx].status = 'Suspended';
    writeDb(dbData);
    res.json({ success: true, userStatus: 'Suspended' });
});

app.post('/api/admin/users/:id/reactivate', verifyToken, verifyAdmin, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.params.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found.' });
    
    dbData.users[userIdx].status = 'Active';
    writeDb(dbData);
    res.json({ success: true, userStatus: 'Active' });
});

// Post-Delivery Rider Tipping
app.post('/api/orders/:id/tip', verifyToken, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found.' });
    
    const order = dbData.orders[idx];
    if (order.status !== 'Delivered') {
        return res.status(400).json({ error: 'Tipping is only allowed after successful doorstep delivery.' });
    }
    
    const { amount } = req.body;
    const tipVal = parseFloat(amount);
    if (isNaN(tipVal) || tipVal <= 0) {
        return res.status(400).json({ error: 'Valid tip amount is required.' });
    }
    
    const customerUser = dbData.users.find(u => u.id === req.user.id);
    if (!customerUser) return res.status(404).json({ error: 'User not found.' });
    
    if ((customerUser.walletBalance || 0) < tipVal) {
        return res.status(400).json({ error: 'Insufficient wallet balance to tip rider.' });
    }
    
    customerUser.walletBalance = parseFloat((customerUser.walletBalance - tipVal).toFixed(2));
    order.riderTip = parseFloat(((order.riderTip || 0) + tipVal).toFixed(2));
    order.grandTotal = parseFloat((order.grandTotal + tipVal).toFixed(2));
    
    const ledgerEntry = {
        id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
        orderId: order.id,
        type: 'rider_tip',
        debit: tipVal,
        credit: 0.00,
        description: `Rider tipping support allocated from customer wallet for Order #${order.id}`,
        timestamp: new Date().toISOString()
    };
    if (!dbData.ledger) dbData.ledger = [];
    dbData.ledger.push(ledgerEntry);
    
    writeDb(dbData);
    broadcastSync('orders_updated', order.id);
    res.json({ success: true, riderTip: order.riderTip, walletBalance: customerUser.walletBalance });
});

// Address Management - Make Default
app.post('/api/users/addresses/:id/make-default', verifyToken, (req, res) => {
    const dbData = readDb();
    const userIdx = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found.' });
    
    const user = dbData.users[userIdx];
    if (!user.addresses) user.addresses = [];
    
    const addrExists = user.addresses.some(a => a.id === req.params.id);
    if (!addrExists) return res.status(404).json({ error: 'Address not found in saved list.' });
    
    user.addresses.forEach(a => {
        a.isDefault = (a.id === req.params.id);
    });
    
    writeDb(dbData);
    res.json({ success: true, addresses: user.addresses });
});

// Bulk replace products (CSV Catalog upload endpoint)
app.post('/api/stores/:id/products/bulk', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.stores.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Store not found.' });
    
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: 'Invalid products array.' });
    }
    
    for (const p of products) {
        if (!p.name || !p.category) {
            return res.status(400).json({ error: 'Product name and category are required.' });
        }
        if (typeof p.price !== 'number' || p.price < 0) {
            return res.status(400).json({ error: `Invalid price for product "${p.name}".` });
        }
        if (p.originalPrice !== undefined && p.originalPrice !== null && p.originalPrice !== '') {
            const op = parseFloat(p.originalPrice);
            if (isNaN(op) || op < 0) {
                return res.status(400).json({ error: `Invalid originalPrice for product "${p.name}".` });
            }
        }
        if (p.variants && Array.isArray(p.variants)) {
            for (const v of p.variants) {
                if (!v.name || typeof v.price !== 'number' || v.price < 0 || typeof v.stock !== 'number' || v.stock < 0) {
                    return res.status(400).json({ error: `All variants must have a valid name, price, and stock in product "${p.name}".` });
                }
                if (v.originalPrice !== undefined && v.originalPrice !== null && v.originalPrice !== '') {
                    const ov = parseFloat(v.originalPrice);
                    if (isNaN(ov) || ov < 0) {
                        return res.status(400).json({ error: `Invalid originalPrice for variant "${v.name}" in product "${p.name}".` });
                    }
                }
            }
        }
    }
    
    dbData.stores[idx].products = products;
    writeDb(dbData);
    broadcastSync('catalog_changed', req.params.id);
    res.json({ success: true, count: products.length, products });
});

// --- SOCKETS, QUEUES & PAYMENTS IMPLEMENTATION (Phase 15) ---

const http = require('http');
const socketIo = require('socket.io');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

let useRealQueue = false;
let orderQueue = null;
let queueWorker = null;
const mockJobs = [];

function setupQueues(redisUrl) {
    try {
        const redisOptions = {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: () => null
        };
        const connection = new Redis(redisUrl || 'redis://127.0.0.1:6379', redisOptions);
        
        connection.on('error', (err) => {
            console.warn("[Queue] Redis connection failed, falling back to In-Memory Queue.");
            useRealQueue = false;
            initMockQueue();
        });

        connection.on('connect', () => {
            console.log("[Queue] Connected to Redis. Using BullMQ.");
            useRealQueue = true;
            initBullMQ(connection);
        });
    } catch (e) {
        console.warn("[Queue] Redis connection error, falling back to In-Memory Queue:", e.message);
        useRealQueue = false;
        initMockQueue();
    }
}

function initBullMQ(connection) {
    orderQueue = new Queue('order-jobs', { connection });
    
    queueWorker = new Worker('order-jobs', async (job) => {
        console.log(`[Queue Worker] Processing job: ${job.name} (ID: ${job.id})`);
        await processJob(job.name, job.data);
    }, { connection });
    
    queueWorker.on('failed', (job, err) => {
        console.error(`[Queue Worker] Job ${job.id} failed:`, err);
    });
}

function initMockQueue() {
    if (global.mockQueueInterval) clearInterval(global.mockQueueInterval);
    global.mockQueueInterval = setInterval(() => {
        const now = Date.now();
        for (let i = mockJobs.length - 1; i >= 0; i--) {
            const job = mockJobs[i];
            if (now >= job.runAt) {
                console.log(`[Mock Queue] Processing job: ${job.name} (ID: ${job.id})`);
                processJob(job.name, job.data).catch(err => {
                    console.error(`[Mock Queue] Job ${job.id} failed:`, err);
                });
                mockJobs.splice(i, 1);
            }
        }
    }, 1000);
}

async function addJob(name, data, delayMs) {
    if (useRealQueue && orderQueue) {
        await orderQueue.add(name, data, { delay: delayMs });
        console.log(`[Queue] Added job ${name} to BullMQ with delay ${delayMs}ms`);
    } else {
        const jobId = 'mock-job-' + Math.floor(100000 + Math.random() * 900000);
        mockJobs.push({
            id: jobId,
            name,
            data,
            runAt: Date.now() + delayMs
        });
        console.log(`[Mock Queue] Added job ${name} to In-Memory Queue with delay ${delayMs}ms (ID: ${jobId})`);
    }
}

async function processJob(name, data) {
    const dbData = readDb();
    
    if (name === 'order_timeout') {
        const { orderId } = data;
        const idx = dbData.orders.findIndex(o => o.id === orderId);
        if (idx !== -1 && dbData.orders[idx].status === 'Pending') {
            console.log(`[Queue Worker] Order ${orderId} timed out. Cancelling automatically.`);
            dbData.orders[idx].status = 'Cancelled';
            dbData.orders[idx].statusTimeline.push({
                status: 'Cancelled',
                time: new Date().toISOString(),
                desc: 'Order automatically cancelled: store did not accept within the 30 minute timeout limit.'
            });
            writeDb(dbData);
            broadcastSync('orders_updated', orderId);
        }
    } else if (name === 'send_notification') {
        const { orderId, type, message } = data;
        console.log(`[Queue Worker] [Notification Send] to Order ${orderId}: [${type}] ${message}`);
    }
}

// POST: Create Stripe mock checkout session
app.post('/api/payments/stripe/checkout', verifyToken, (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
    }
    
    const db = readDb();
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    
    const sessionId = 'cs_test_' + Math.random().toString(36).substr(2, 9);
    const mockCheckoutUrl = `http://localhost:${PORT}/api/payments/stripe/sandbox-pay?session_id=${sessionId}&order_id=${orderId}`;
    
    res.json({
        sessionId,
        url: mockCheckoutUrl
    });
});

// GET: Mock Stripe Payment Sandbox Page
app.get('/api/payments/stripe/sandbox-pay', (req, res) => {
    const { session_id, order_id } = req.query;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Stripe Sandbox Payment</title>
        <style>
            body { font-family: sans-serif; background: #0c1017; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #30363d; padding: 40px; border-radius: 12px; width: 400px; text-align: center; }
            h2 { color: #635bff; margin-bottom: 20px; }
            p { color: #8b949e; margin-bottom: 30px; }
            .btn { background: #635bff; border: none; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; font-size: 16px; }
            .btn:hover { background: #7a73ff; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Stripe Checkout Sandbox</h2>
            <p>Order ID: <strong>${order_id}</strong></p>
            <p>Session ID: <strong>${session_id}</strong></p>
            <form action="/api/payments/stripe/trigger-webhook" method="POST">
                <input type="hidden" name="orderId" value="${order_id}">
                <input type="hidden" name="sessionId" value="${session_id}">
                <button type="submit" class="btn">Pay Now (Simulate Stripe Success)</button>
            </form>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// POST: Helper endpoint to trigger webhook from mock page
app.post('/api/payments/stripe/trigger-webhook', express.urlencoded({ extended: true }), (req, res) => {
    const { orderId, sessionId } = req.body;
    
    const stripeWebhookPayload = {
        id: 'evt_test_' + Math.random().toString(36).substr(2, 9),
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
            object: {
                id: 'pi_test_' + Math.random().toString(36).substr(2, 9),
                amount: 26000,
                currency: 'inr',
                metadata: {
                    orderId: orderId,
                    sessionId: sessionId
                }
            }
        }
    };
    
    const dbData = readDb();
    const orderIdx = dbData.orders.findIndex(o => o.id === orderId);
    if (orderIdx !== -1) {
        dbData.orders[orderIdx].payoutSettled = true;
        dbData.orders[orderIdx].customer.paymentStatus = 'Paid';
        dbData.orders[orderIdx].customer.transactionId = stripeWebhookPayload.data.object.id;
        
        const amt = dbData.orders[orderIdx].grandTotal;
        const ledgerEntryCredit = {
            id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
            orderId: orderId,
            type: 'stripe_payment',
            debit: 0.00,
            credit: parseFloat(amt),
            description: `Stripe Sandbox payment completed (PI: ${stripeWebhookPayload.data.object.id}) for Order #${orderId}`,
            timestamp: new Date().toISOString()
        };
        const ledgerEntryDebit = {
            id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
            orderId: orderId,
            type: 'stripe_payout',
            debit: parseFloat(amt),
            credit: 0.00,
            description: `Payout reservation transfer to store "${dbData.orders[orderIdx].storeName}" for Order #${orderId}`,
            timestamp: new Date().toISOString()
        };
        if (!dbData.ledger) dbData.ledger = [];
        dbData.ledger.push(ledgerEntryCredit, ledgerEntryDebit);
        
        writeDb(dbData);
        broadcastSync('orders_updated', orderId);
    }
    
    res.send(`
    <html>
    <head>
        <title>Payment Successful</title>
        <style>
            body { font-family: sans-serif; background: #0c1017; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #30363d; padding: 40px; border-radius: 12px; width: 400px; text-align: center; }
            h2 { color: #2ea44f; margin-bottom: 20px; }
            p { color: #8b949e; margin-bottom: 30px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Payment Successful!</h2>
            <p>Stripe payment processed. You can close this tab now.</p>
        </div>
    </body>
    </html>
    `);
});

// POST: Actual Stripe Webhook Endpoint
app.post('/api/payments/stripe/webhook', express.json(), (req, res) => {
    const event = req.body;
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        
        const dbData = readDb();
        const orderIdx = dbData.orders.findIndex(o => o.id === orderId);
        if (orderIdx !== -1) {
            dbData.orders[orderIdx].payoutSettled = true;
            dbData.orders[orderIdx].customer.paymentStatus = 'Paid';
            dbData.orders[orderIdx].customer.transactionId = paymentIntent.id;
            
            const amt = dbData.orders[orderIdx].grandTotal;
            const ledgerEntryCredit = {
                id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
                orderId: orderId,
                type: 'stripe_payment',
                debit: 0.00,
                credit: parseFloat(amt),
                description: `Stripe Webhook payment received (PI: ${paymentIntent.id}) for Order #${orderId}`,
                timestamp: new Date().toISOString()
            };
            const ledgerEntryDebit = {
                id: 'ledger-' + Math.floor(100000 + Math.random() * 900000),
                orderId: orderId,
                type: 'stripe_payout',
                debit: parseFloat(amt),
                credit: 0.00,
                description: `Payout reservation to store "${dbData.orders[orderIdx].storeName}" for Order #${orderId}`,
                timestamp: new Date().toISOString()
            };
            if (!dbData.ledger) dbData.ledger = [];
            dbData.ledger.push(ledgerEntryCredit, ledgerEntryDebit);
            
            writeDb(dbData);
            broadcastSync('orders_updated', orderId);
        }
    }
    res.json({ received: true });
});

// Server Initialization
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

global.io = io;
const activeSockets = new Map();

io.on('connection', (socket) => {
    console.log(`[Socket] New client connection: ${socket.id}`);
    
    socket.on('register', (userId) => {
        activeSockets.set(userId, socket.id);
        console.log(`[Socket] Registered user ${userId} on socket ${socket.id}`);
    });
    
    socket.on('join_order', (orderId) => {
        socket.join(`order_${orderId}`);
        console.log(`[Socket] Joined order room: order_${orderId}`);
    });
    
    socket.on('send_message', (data) => {
        const { orderId, senderRole, senderName, text } = data;
        const dbData = readDb();
        const orderIdx = dbData.orders.findIndex(o => o.id === orderId);
        if (orderIdx !== -1) {
            const message = {
                sender: senderRole || 'customer',
                senderName: senderName || 'Anonymous',
                text: sanitizeInput(text || ''),
                timestamp: new Date().toISOString()
            };
            if (!dbData.orders[orderIdx].chatMessages) {
                dbData.orders[orderIdx].chatMessages = [];
            }
            dbData.orders[orderIdx].chatMessages.push(message);
            writeDb(dbData);
            
            io.to(`order_${orderId}`).emit('new_message', message);
            sseClients.forEach(c => {
                c.res.write(`data: ${JSON.stringify({ event: 'orders_updated', data: orderId })}\n\n`);
            });
        }
    });

    socket.on('disconnect', () => {
        for (const [userId, sockId] of activeSockets.entries()) {
            if (sockId === socket.id) {
                activeSockets.delete(userId);
                console.log(`[Socket] Disconnected user ${userId}`);
                break;
            }
        }
    });
});

// Test route to schedule a custom timeout job
app.post('/api/test/queue-job', (req, res) => {
    const { orderId, delayMs } = req.body;
    addJob('order_timeout', { orderId }, delayMs || 1000)
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

setupQueues(process.env.REDIS_URL);

server.listen(PORT, () => {
    console.log(`LuxeGrocer API Backend active on http://localhost:${PORT} (HTTP + WebSockets)`);
});
