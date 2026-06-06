// store.js - LuxeGrocer State Management and API Database Client

const CATEGORIES = [
    { id: 'dairy', name: 'Dairy & Fresh Milk', icon: '🥛', image: 'assets/category_dairy.png' },
    { id: 'fruits', name: 'Fresh Fruits', icon: '🍎', image: 'assets/category_fruits.png' },
    { id: 'veggies', name: 'Organic Vegetables', icon: '🥦', image: 'assets/category_veggies.png' },
    { id: 'bakery', name: 'Bakery & Bread', icon: '🍞', image: 'assets/category_bakery.png' },
    { id: 'beverages', name: 'Beverages & Juices', icon: '🥤', image: 'assets/category_beverages.png' },
    { id: 'pantry', name: 'Pantry Staples', icon: '🥫', image: 'assets/category_pantry.png' }
];

const USER_LOCATION = {
    lat: 12.9250,
    lng: 77.6220,
    address: '4th Block, Koramangala, Bengaluru, Karnataka 560034'
};

class LuxeStore {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
        this.tokenKey = 'luxegrocer_customer_auth_token';
        this.token = localStorage.getItem(this.tokenKey) || null;
        this.currentUser = null;
        this.initDatabase();
    }

    initDatabase() {
        if (!localStorage.getItem('luxegrocer_user_location')) {
            localStorage.setItem('luxegrocer_user_location', JSON.stringify(USER_LOCATION));
        }
    }

    // --- Authentication Methods ---
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async register(registerData) {
        try {
            const res = await fetch(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, error: data.error || 'Registration failed' };
            }
            this.token = data.token;
            localStorage.setItem(this.tokenKey, data.token);
            this.currentUser = data.user;
            return { success: true, user: data.user };
        } catch (err) {
            console.error("API error during register:", err);
            return { success: false, error: 'Network connection failed' };
        }
    }

    async login(email, password) {
        try {
            const res = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, error: data.error || 'Login failed' };
            }
            this.token = data.token;
            localStorage.setItem(this.tokenKey, data.token);
            this.currentUser = data.user;
            return { success: true, user: data.user };
        } catch (err) {
            console.error("API error during login:", err);
            return { success: false, error: 'Network connection failed' };
        }
    }

    async loadCurrentUser() {
        if (!this.token) return null;
        try {
            const res = await fetch(`${this.baseUrl}/auth/me`, {
                headers: this.getHeaders()
            });
            if (res.ok) {
                this.currentUser = await res.json();
                return this.currentUser;
            } else {
                this.logout();
                return null;
            }
        } catch (err) {
            console.error("API error loading current user:", err);
            return null;
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem(this.tokenKey);
    }

    // --- User Location Methods (Kept local to browser session) ---
    getUserLocation() {
        try {
            const loc = localStorage.getItem('luxegrocer_user_location');
            if (loc) return JSON.parse(loc);
        } catch (e) {
            console.error("Error reading user location from localStorage:", e);
        }
        return USER_LOCATION;
    }

    setUserLocation(lat, lng, address) {
        const location = { lat: parseFloat(lat), lng: parseFloat(lng), address };
        localStorage.setItem('luxegrocer_user_location', JSON.stringify(location));
        return location;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; 
        return parseFloat(d.toFixed(1));
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    getDeliveryFee(distance, subtotal) {
        if (subtotal >= 300) return 0.00; // Free delivery threshold
        let fee = 20.00; // base fee for first 2 km
        if (distance > 2) {
            fee += Math.ceil(distance - 2) * 10.00; // +10 per additional km
        }
        return fee;
    }

    // --- Store Methods (API Backend) ---
    async getStores() {
        try {
            const res = await fetch(`${this.baseUrl}/stores`);
            const stores = await res.json();
            const userLoc = this.getUserLocation();
            
            return stores.map(store => {
                const distance = this.calculateDistance(userLoc.lat, userLoc.lng, store.lat, store.lng);
                return {
                    ...store,
                    distance,
                    inRange: distance <= store.deliveryRadius
                };
            });
        } catch (err) {
            console.error("API error fetching stores:", err);
            return [];
        }
    }

    async getStoreById(id) {
        try {
            const res = await fetch(`${this.baseUrl}/stores/${id}`);
            if (!res.ok) return null;
            const store = await res.json();
            
            const userLoc = this.getUserLocation();
            const distance = this.calculateDistance(userLoc.lat, userLoc.lng, store.lat, store.lng);
            return {
                ...store,
                distance,
                inRange: distance <= store.deliveryRadius
            };
        } catch (err) {
            console.error("API error fetching store:", err);
            return null;
        }
    }

    // Onboard a store
    async registerStore(storeData) {
        try {
            const userLoc = this.getUserLocation();
            const payload = {
                ...storeData,
                lat: userLoc.lat,
                lng: userLoc.lng
            };
            
            const res = await fetch(`${this.baseUrl}/stores`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (err) {
            console.error("API error registering store:", err);
            return null;
        }
    }

    // Update settings config
    async updateStoreConfig(storeId, configData) {
        try {
            const res = await fetch(`${this.baseUrl}/stores/${storeId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(configData)
            });
            return await res.json();
        } catch (err) {
            console.error("API error saving store settings:", err);
            return null;
        }
    }

    // --- Product Management (API Backend) ---
    async addProduct(storeId, productData) {
        try {
            const res = await fetch(`${this.baseUrl}/stores/${storeId}/products`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(productData)
            });
            return await res.json();
        } catch (err) {
            console.error("API error adding product:", err);
            return null;
        }
    }

    async updateProduct(storeId, productId, updatedData) {
        try {
            const res = await fetch(`${this.baseUrl}/stores/${storeId}/products/${productId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updatedData)
            });
            return res.ok;
        } catch (err) {
            console.error("API error updating product:", err);
            return false;
        }
    }

    async deleteProduct(storeId, productId) {
        try {
            const res = await fetch(`${this.baseUrl}/stores/${storeId}/products/${productId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return res.ok;
        } catch (err) {
            console.error("API error deleting product:", err);
            return false;
        }
    }

    // --- Global Comparative Search ---
    async searchProductsGlobally(query) {
        if (!query || query.trim() === '') return [];
        const q = query.toLowerCase().trim();
        
        const stores = await this.getStores();
        let matches = [];
        
        stores.forEach(store => {
            store.products.forEach(product => {
                if (product.name.toLowerCase().includes(q) || 
                    product.category.toLowerCase().includes(q) ||
                    (product.desc && product.desc.toLowerCase().includes(q))) {
                    matches.push({
                        product,
                        store: {
                            id: store.id,
                            name: store.name,
                            image: store.image,
                            rating: store.rating,
                            distance: store.distance,
                            address: store.address,
                            deliveryRadius: store.deliveryRadius,
                            minOrderValue: store.minOrderValue
                        }
                    });
                }
            });
        });
        
        return matches.sort((a, b) => a.store.distance - b.store.distance || b.product.rating - a.product.rating);
    }

    // --- Orders API Helpers ---
    async getOrders() {
        try {
            const res = await fetch(`${this.baseUrl}/orders`, {
                headers: this.getHeaders()
            });
            return await res.json();
        } catch (err) {
            console.error("API error fetching orders:", err);
            return [];
        }
    }

    async getOrderById(orderId) {
        const orders = await this.getOrders();
        return orders.find(o => o.id === orderId);
    }

    async createOrder(storeId, cartItems, customerDetails, discount = 0, voucherCode = '') {
        try {
            const store = await this.getStoreById(storeId);
            if (!store) return null;
            
            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const deliveryFee = this.getDeliveryFee(store.distance, subtotal);

            const payload = {
                storeId,
                items: cartItems,
                deliveryFee,
                discount,
                voucherCode,
                customer: customerDetails
            };
            
            const res = await fetch(`${this.baseUrl}/orders`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (err) {
            console.error("API error placing order:", err);
            return null;
        }
    }

    async updateOrderStatus(orderId, newStatus, description = '') {
        try {
            const res = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ status: newStatus, description })
            });
            return res.ok;
        } catch (err) {
            console.error("API error advancing status:", err);
            return false;
        }
    }

    async verifyDeliveryOtp(orderId, enteredOtp) {
        try {
            const res = await fetch(`${this.baseUrl}/orders/${orderId}/verify-otp`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ otp: enteredOtp })
            });
            
            const data = await res.json();
            if (res.ok) {
                return { success: true, msg: 'Delivery verified successfully!' };
            } else {
                return { success: false, msg: data.error || 'Verification failed.' };
            }
        } catch (err) {
            console.error("API error verifying OTP:", err);
            return { success: false, msg: 'Server connection error.' };
        }
    }

    async getSavedAddresses() {
        try {
            const res = await fetch(`${this.baseUrl}/users/addresses`, {
                headers: this.getHeaders()
            });
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error("API error fetching saved addresses:", err);
            return [];
        }
    }

    async addSavedAddress(addressData) {
        try {
            const res = await fetch(`${this.baseUrl}/users/addresses`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(addressData)
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error("API error adding address:", err);
            return null;
        }
    }

    async deleteSavedAddress(addressId) {
        try {
            const res = await fetch(`${this.baseUrl}/users/addresses/${addressId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return res.ok;
        } catch (err) {
            console.error("API error deleting address:", err);
            return false;
        }
    }

    async getVouchers() {
        try {
            const res = await fetch(`${this.baseUrl}/vouchers`);
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error("API error fetching vouchers:", err);
            return [];
        }
    }

    async validateVoucher(code, subtotal) {
        try {
            const res = await fetch(`${this.baseUrl}/vouchers/validate`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ code, subtotal })
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, error: data.error || 'Validation failed' };
            }
            return { success: true, voucher: data.voucher };
        } catch (err) {
            console.error("API error validating voucher:", err);
            return { success: false, error: 'Connection failed' };
        }
    }

    getDefaultStatusDesc(status) {
        switch(status) {
            case 'Pending': return 'Waiting for store acceptance.';
            case 'Preparing': return 'Store has accepted and is packaging your items.';
            case 'Out for Delivery': return 'Delivery agent has picked up your package and is on the way.';
            case 'Delivered': return 'Package delivered successfully. Thank you!';
            default: return 'Order status updated.';
        }
    }
}

// Export for window access
window.db = new LuxeStore();
window.CATEGORIES = CATEGORIES;
