// server.js - LuxeGrocer Node.js/Express Backend Server
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'luxegrocer-super-secret-jwt-key-2026';

// Enable CORS and raw body/json parsing
app.use(cors());
app.use(express.json({ limit: '20mb' })); // Higher limit for Base64 image payloads

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

// Serve static images from the uploads folder
app.use('/uploads', express.static(UPLOADS_DIR));

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
        products: [
            { id: 'p1-1', name: 'Premium Full Cream Milk', category: 'dairy', price: 68.00, originalPrice: 75.00, badgeText: 'Bestseller', unit: '1 Liter', stock: 50, desc: 'Fresh farm-sourced pasteurized whole milk, rich in cream.', rating: 4.8, image: 'assets/prod_milk.png' },
            { id: 'p1-2', name: 'Organic Greek Yogurt', category: 'dairy', price: 120.00, originalPrice: 140.00, badgeText: 'Popular', unit: '400g', stock: 25, desc: 'Thick, creamy yogurt made from organic dairy culture.', rating: 4.9, image: 'assets/prod_yogurt.png' },
            { id: 'p1-3', name: 'Artisanal Butter (Salted)', category: 'dairy', price: 240.00, originalPrice: 260.00, badgeText: '', unit: '250g', stock: 15, desc: 'Slow-churned, rich salted table butter with high fat content.', rating: 4.7, image: 'assets/prod_butter.png' },
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
        products: [
            { id: 'p3-1', name: 'Sourdough Country Loaf', category: 'bakery', price: 160.00, originalPrice: 190.00, badgeText: 'Artisan', unit: '450g', stock: 10, desc: 'Wild yeast fermented sourdough bread with a crispy crust and chewy center.', rating: 4.9, image: 'assets/prod_sourdough.png' },
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

// --- Database Read/Write Helpers ---
function readDb() {
    try {
        let dbData;
        if (!fs.existsSync(DB_PATH)) {
            dbData = { stores: SEED_STORES, orders: [], users: [] };
            seedDefaultUsers(dbData);
            fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
            return dbData;
        }
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        dbData = JSON.parse(raw);
        
        let changed = false;
        if (!dbData.users) {
            dbData.users = [];
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
        if (changed) {
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
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error("Database write failure:", err);
        return false;
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

// --- AUTH ROUTES ---

// POST: Register a user (customer or merchant)
app.post('/api/auth/register', (req, res) => {
    const dbData = readDb();
    const { email, password, role, name, phone, address, storeName } = req.body;
    
    if (!email || !password || !role || !name) {
        return res.status(400).json({ error: 'Email, password, role, and name are required' });
    }
    
    const emailLower = email.toLowerCase().trim();
    if (dbData.users.some(u => u.email.toLowerCase() === emailLower)) {
        return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = 'user-' + Date.now();
    
    const newUser = {
        id: userId,
        email: emailLower,
        password: hashedPassword,
        role: role,
        name: name,
        phone: phone || '',
        address: address || ''
    };
    
    if (role === 'merchant') {
        const storeId = 'store-' + Date.now();
        const newStore = {
            id: storeId,
            name: storeName || `${name}'s Luxe Shop`,
            category: 'General Grocery',
            rating: 5.0,
            reviewsCount: 0,
            image: '',
            address: address || '',
            phone: phone || '',
            deliveryRadius: 5.0,
            minOrderValue: 0,
            lat: 12.9250,
            lng: 77.6220,
            ownerEmail: emailLower,
            products: []
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
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    
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
        storeId: storeId
    });
});

// GET: All stores
app.get('/api/stores', (req, res) => {
    const db = readDb();
    res.json(db.stores);
});

// GET: Single store by ID
app.get('/api/stores/:id', (req, res) => {
    const db = readDb();
    const store = db.stores.find(s => s.id === req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
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
        products: []
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
        image: settings.image || dbData.stores[idx].image
    };
    
    writeDb(dbData);
    broadcastSync('store_updated', req.params.id);
    res.json(dbData.stores[idx]);
});

// POST: Add new catalog product
app.post('/api/stores/:id/products', verifyToken, verifyStoreOwner, (req, res) => {
    const dbData = readDb();
    const storeIdx = dbData.stores.findIndex(s => s.id === req.params.id);
    
    const prodData = req.body;
    const prodUrl = saveBase64Image(req, prodData.image, 'product');
    
    const newProduct = {
        id: 'prod-' + Date.now(),
        name: prodData.name,
        category: prodData.category,
        price: parseFloat(prodData.price),
        unit: prodData.unit || '1 Unit',
        stock: parseInt(prodData.stock) || 0,
        desc: prodData.desc || '',
        rating: 5.0,
        image: prodUrl || ''
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
    if (updated.image) {
        updated.image = saveBase64Image(req, updated.image, 'product');
    }
    
    dbData.stores[storeIdx].products[prodIdx] = {
        ...dbData.stores[storeIdx].products[prodIdx],
        name: updated.name || dbData.stores[storeIdx].products[prodIdx].name,
        category: updated.category || dbData.stores[storeIdx].products[prodIdx].category,
        price: parseFloat(updated.price) || dbData.stores[storeIdx].products[prodIdx].price,
        unit: updated.unit || dbData.stores[storeIdx].products[prodIdx].unit,
        stock: parseInt(updated.stock) !== undefined ? parseInt(updated.stock) : dbData.stores[storeIdx].products[prodIdx].stock,
        desc: updated.desc || dbData.stores[storeIdx].products[prodIdx].desc,
        image: updated.image || dbData.stores[storeIdx].products[prodIdx].image
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
    
    const store = dbData.stores.find(s => s.id === orderData.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const newOrder = {
        id: 'order-' + Math.floor(100000 + Math.random() * 900000),
        storeId: store.id,
        storeName: store.name,
        storePhone: store.phone,
        storeAddress: store.address,
        items: orderData.items,
        subtotal: orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        deliveryFee: parseFloat(orderData.deliveryFee) || 0,
        customer: {
            ...orderData.customer,
            userId: req.user.id,
            email: req.user.email
        },
        status: 'Pending',
        deliveryOtp: deliveryOtp,
        timestamp: new Date().toISOString(),
        statusTimeline: [
            { status: 'Pending', time: new Date().toISOString(), desc: 'Waiting for store approval' }
        ]
    };
    
    // Deduct stock levels on server
    orderData.items.forEach(cartItem => {
        const pIdx = store.products.findIndex(p => p.id === cartItem.id);
        if (pIdx !== -1) {
            store.products[pIdx].stock = Math.max(0, store.products[pIdx].stock - cartItem.quantity);
        }
    });
    
    dbData.orders.push(newOrder);
    writeDb(dbData);
    
    broadcastSync('order_placed', newOrder);
    res.status(201).json(newOrder);
});

// PUT: Advance/Update order status manually
app.put('/api/orders/:id/status', verifyToken, verifyOrderStoreOwner, (req, res) => {
    const dbData = readDb();
    const idx = dbData.orders.findIndex(o => o.id === req.params.id);
    
    const { status, description } = req.body;
    dbData.orders[idx].status = status;
    dbData.orders[idx].statusTimeline.push({
        status,
        time: new Date().toISOString(),
        desc: description || 'Order status updated'
    });
    
    writeDb(dbData);
    broadcastSync('orders_updated', req.params.id);
    res.json(dbData.orders[idx]);
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
    
    dbData.orders[idx].status = 'Delivered';
    dbData.orders[idx].statusTimeline.push({
        status: 'Delivered',
        time: new Date().toISOString(),
        desc: 'Direct doorstep delivery successfully completed and verified.'
    });
    
    writeDb(dbData);
    broadcastSync('orders_updated', req.params.id);
    res.json({ success: true, order: dbData.orders[idx] });
});

// Start Express Listener
app.listen(PORT, () => {
    console.log(`LuxeGrocer API Backend active on http://localhost:${PORT}`);
});
