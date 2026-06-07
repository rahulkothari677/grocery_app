// migrate.js - Database Migration script to port db.json to MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const MONGO_URI = 'mongodb://localhost:27017/luxegrocer';

async function migrate() {
    console.log("=== LuxeGrocer Database Migration Tool ===");
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`Error: db.json file not found at ${DB_PATH}. Run the backend server first to generate it.`);
        process.exit(1);
    }
    
    console.log(`Reading source file data from: ${DB_PATH}`);
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    
    console.log(`Connecting to target MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully to MongoDB.");
    
    // Define temporary schemas to perform raw operations
    const UserModel = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const StoreModel = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
    const OrderModel = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const VoucherModel = mongoose.model('Voucher', new mongoose.Schema({}, { strict: false }));
    
    // 1. Migrate Users
    console.log(`\nMigrating users (${data.users ? data.users.length : 0} records)...`);
    await UserModel.deleteMany({});
    if (data.users && data.users.length > 0) {
        await UserModel.insertMany(data.users);
        console.log(`Successfully migrated ${data.users.length} users.`);
    }
    
    // 2. Migrate Stores
    console.log(`\nMigrating stores (${data.stores ? data.stores.length : 0} records)...`);
    await StoreModel.deleteMany({});
    if (data.stores && data.stores.length > 0) {
        await StoreModel.insertMany(data.stores);
        console.log(`Successfully migrated ${data.stores.length} stores.`);
    }
    
    // 3. Migrate Orders
    console.log(`\nMigrating orders (${data.orders ? data.orders.length : 0} records)...`);
    await OrderModel.deleteMany({});
    if (data.orders && data.orders.length > 0) {
        await OrderModel.insertMany(data.orders);
        console.log(`Successfully migrated ${data.orders.length} orders.`);
    }
    
    // 4. Migrate Vouchers
    console.log(`\nMigrating vouchers (${data.vouchers ? data.vouchers.length : 0} records)...`);
    await VoucherModel.deleteMany({});
    if (data.vouchers && data.vouchers.length > 0) {
        await VoucherModel.insertMany(data.vouchers);
        console.log(`Successfully migrated ${data.vouchers.length} vouchers.`);
    }
    
    console.log("\nDATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
