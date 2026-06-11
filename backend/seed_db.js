const fs = require('fs');
const path = 'C:/Users/rahul4/.gemini/antigravity/scratch/luxegrocer-marketplace/backend/db.json';

const HASHED_PASSWORD = '$2b$10$.WqV6juIPC91cogZVKE11.xX0hhF884iO5JgteVa9y/77wNDZ1DRe'; // hashes "admin123"

const defaultOperatingHours = {
  monday: { open: '09:00', close: '22:00', isClosed: false },
  tuesday: { open: '09:00', close: '22:00', isClosed: false },
  wednesday: { open: '09:00', close: '22:00', isClosed: false },
  thursday: { open: '09:00', close: '22:00', isClosed: false },
  friday: { open: '09:00', close: '22:00', isClosed: false },
  saturday: { open: '09:00', close: '22:00', isClosed: false },
  sunday: { open: '09:00', close: '22:00', isClosed: false }
};

const defaultSubscription = {
  plan: 'Premium Monthly',
  status: 'Active',
  expiresAt: '2026-07-30T12:00:00.000Z'
};

const defaultStaff = (storeId) => [
  { id: `staff-${storeId}-1`, name: 'Ramesh Kumar', phone: '+91 99887 76655', status: 'Available' },
  { id: `staff-${storeId}-2`, name: 'Suresh Dev', phone: '+91 98765 43210', status: 'Available' }
];

const newStores = [
  {
    id: 'store-1',
    name: 'GreenValley Dairy & Organic Farm',
    category: 'dairy',
    rating: 4.8,
    reviewsCount: 124,
    image: 'assets/store_dairy.png',
    address: '123 Green Avenue, Koramangala 3rd Block, Bangalore',
    phone: '+91 99999 88888',
    deliveryRadius: 6.0,
    minOrderValue: 100,
    lat: 12.9250,
    lng: 77.6220,
    ownerEmail: 'dairy@luxe.com',
    upiVpa: 'dairy@okaxis',
    upiName: 'GreenValley Dairy Store',
    operatingHours: defaultOperatingHours,
    subscription: defaultSubscription,
    deliveryStaff: defaultStaff('store-1'),
    status: 'Open',
    products: [
      {
        id: 'p1-1',
        name: 'Premium Full Cream Milk',
        category: 'dairy',
        price: 68,
        originalPrice: 75,
        badgeText: 'Bestseller',
        unit: '1 Liter',
        stock: 50,
        desc: 'Fresh farm-sourced pasteurized whole milk, rich in cream.',
        rating: 4.8,
        image: 'assets/prod_milk.png',
        variants: [
          { id: 'p1-1-v1', name: '500ml', price: 36, stock: 30, originalPrice: 40 },
          { id: 'p1-1-v2', name: '1 Liter', price: 68, stock: 50, originalPrice: 75 }
        ],
        dietaryType: 'Veg'
      },
      {
        id: 'p1-2',
        name: 'Organic Greek Yogurt',
        category: 'dairy',
        price: 120,
        originalPrice: 140,
        badgeText: 'Popular',
        unit: '400g',
        stock: 25,
        desc: 'Thick, creamy yogurt made from organic dairy culture.',
        rating: 4.9,
        image: 'assets/prod_yogurt.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p1-3',
        name: 'Artisanal Butter (Salted)',
        category: 'dairy',
        price: 240,
        originalPrice: 260,
        badgeText: '',
        unit: '250g',
        stock: 15,
        desc: 'Slow-churned, rich salted table butter with high fat content.',
        rating: 4.7,
        image: 'assets/prod_butter.png',
        variants: [
          { id: 'p1-3-v1', name: '100g', price: 110, stock: 20, originalPrice: 120 },
          { id: 'p1-3-v2', name: '250g', price: 240, stock: 15, originalPrice: 260 }
        ],
        dietaryType: 'Veg'
      },
      {
        id: 'p1-4',
        name: 'Fresh Paneer (Cottage Cheese)',
        category: 'dairy',
        price: 110,
        originalPrice: 130,
        badgeText: 'Fresh Pick',
        unit: '200g',
        stock: 20,
        desc: 'Soft and fresh cottage cheese blocks, handmade daily.',
        rating: 4.8,
        image: 'assets/prod_paneer.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p1-5',
        name: 'Fresh Organic Spinach',
        category: 'veggies',
        price: 30,
        originalPrice: 35,
        badgeText: 'Organic',
        unit: '250g',
        stock: 30,
        desc: 'Crispy green spinach leaves, washed and ready to cook.',
        rating: 4.6,
        image: 'assets/prod_spinach.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p1-6',
        name: 'Ripe Cherry Tomatoes',
        category: 'veggies',
        price: 40,
        originalPrice: 48,
        badgeText: 'Fresh Pick',
        unit: '250g',
        stock: 25,
        desc: 'Sweet and juicy organic cherry tomatoes, locally grown.',
        rating: 4.7,
        image: 'assets/prod_tomatoes.png',
        dietaryType: 'Veg'
      }
    ]
  },
  {
    id: 'store-2',
    name: 'SunRipe Orchard & Fruits',
    category: 'fruits',
    rating: 4.9,
    reviewsCount: 98,
    image: 'assets/store_organic.png',
    address: '45 Orchard Lane, Koramangala 4th Block, Bangalore',
    phone: '+91 99999 77777',
    deliveryRadius: 5.5,
    minOrderValue: 150,
    lat: 12.9300,
    lng: 77.6180,
    ownerEmail: 'organic@luxe.com',
    upiVpa: 'fruits@okaxis',
    upiName: 'SunRipe Orchard Store',
    operatingHours: defaultOperatingHours,
    subscription: defaultSubscription,
    deliveryStaff: defaultStaff('store-2'),
    status: 'Open',
    products: [
      {
        id: 'p2-1',
        name: 'Organic Royal Gala Apples',
        category: 'fruits',
        price: 180,
        originalPrice: 200,
        badgeText: 'Bestseller',
        unit: '1 kg',
        stock: 35,
        desc: 'Crisp, sweet, and directly imported from organic orchards.',
        rating: 4.8,
        image: 'assets/prod_apples.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p2-2',
        name: 'Sweet Alphonso Mangoes',
        category: 'fruits',
        price: 450,
        originalPrice: 500,
        badgeText: 'Popular',
        unit: '1 Dozen',
        stock: 15,
        desc: 'Handpicked premium export-quality sweet mangoes.',
        rating: 4.9,
        image: 'assets/prod_mangoes.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p2-3',
        name: 'Fresh Yellow Bananas',
        category: 'fruits',
        price: 60,
        originalPrice: 70,
        badgeText: '',
        unit: '1 Dozen',
        stock: 40,
        desc: 'Sweet, energy-rich yellow bananas, sourced daily.',
        rating: 4.7,
        image: 'assets/prod_bananas.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p2-4',
        name: 'Fresh Orange Juice',
        category: 'beverages',
        price: 120,
        originalPrice: 130,
        badgeText: 'Cold Pressed',
        unit: '1 Liter',
        stock: 20,
        desc: '100% natural, cold-pressed orange juice with zero added sugar.',
        rating: 4.8,
        image: 'assets/prod_juice.png',
        dietaryType: 'Veg'
      }
    ]
  },
  {
    id: 'store-3',
    name: 'Golden Crust Bakery & Cafe',
    category: 'bakery',
    rating: 4.7,
    reviewsCount: 152,
    image: 'assets/store_bakery.png',
    address: '89 Baker Street, Koramangala 1st Block, Bangalore',
    phone: '+91 99999 66666',
    deliveryRadius: 5.0,
    minOrderValue: 120,
    lat: 12.9210,
    lng: 77.6250,
    ownerEmail: 'artisan@luxe.com',
    upiVpa: 'bakery@okaxis',
    upiName: 'Golden Crust Bakery',
    operatingHours: defaultOperatingHours,
    subscription: defaultSubscription,
    deliveryStaff: defaultStaff('store-3'),
    status: 'Open',
    products: [
      {
        id: 'p3-1',
        name: 'Fresh Sourdough Loaf',
        category: 'bakery',
        price: 160,
        originalPrice: 180,
        badgeText: 'Baked Fresh',
        unit: '500g',
        stock: 25,
        desc: 'Traditional slow-fermented crusty sourdough bread loaf.',
        rating: 4.9,
        image: 'assets/prod_sourdough.png',
        variants: [
          { id: 'p3-1-v1', name: 'Half Loaf', price: 90, stock: 15, originalPrice: 100 },
          { id: 'p3-1-v2', name: 'Whole Loaf', price: 160, stock: 25, originalPrice: 180 }
        ],
        dietaryType: 'Veg'
      },
      {
        id: 'p3-2',
        name: 'Butter Croissants',
        category: 'bakery',
        price: 140,
        originalPrice: 150,
        badgeText: 'Popular',
        unit: '4 Pack',
        stock: 15,
        desc: 'Flaky, golden-brown French butter croissants, baked daily.',
        rating: 4.8,
        image: 'assets/prod_croissants.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p3-3',
        name: 'Chocolate Chip Cookies',
        category: 'bakery',
        price: 120,
        originalPrice: 130,
        badgeText: '',
        unit: '6 Pack',
        stock: 30,
        desc: 'Soft and chewy cookies loaded with dark chocolate chips.',
        rating: 4.7,
        image: 'assets/prod_cookies.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p3-4',
        name: 'Cold Brew Coffee',
        category: 'beverages',
        price: 150,
        originalPrice: 160,
        badgeText: 'House Blend',
        unit: '500ml',
        stock: 20,
        desc: 'Smooth, 18-hour slow steeped specialty cold brew coffee.',
        rating: 4.8,
        image: 'assets/prod_juice.png', // Sourced from beverages juice image
        dietaryType: 'Veg'
      }
    ]
  },
  {
    id: 'store-4',
    name: 'The Wellness Pantry',
    category: 'pantry',
    rating: 4.6,
    reviewsCount: 88,
    image: 'assets/store_pantry.png',
    address: '21 Wellness Road, Koramangala 5th Block, Bangalore',
    phone: '+91 99999 55555',
    deliveryRadius: 6.5,
    minOrderValue: 200,
    lat: 12.9280,
    lng: 77.6300,
    ownerEmail: 'pantry@luxe.com',
    upiVpa: 'pantry@okaxis',
    upiName: 'Wellness Pantry Store',
    operatingHours: defaultOperatingHours,
    subscription: defaultSubscription,
    deliveryStaff: defaultStaff('store-4'),
    status: 'Open',
    products: [
      {
        id: 'p4-1',
        name: 'Premium Basmati Rice',
        category: 'pantry',
        price: 450,
        originalPrice: 500,
        badgeText: 'Premium',
        unit: '5 kg',
        stock: 40,
        desc: 'Extra-long grain, aromatic premium basmati shipping direct.',
        rating: 4.8,
        image: 'assets/prod_rice.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p4-2',
        name: 'Organic Whole Wheat Atta',
        category: 'pantry',
        price: 280,
        originalPrice: 300,
        badgeText: 'Organic',
        unit: '5 kg',
        stock: 50,
        desc: 'Stone-ground 100% organic whole wheat flour for soft rotis.',
        rating: 4.7,
        image: 'assets/prod_atta.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p4-3',
        name: 'Artisanal Table Butter',
        category: 'dairy',
        price: 120,
        originalPrice: 130,
        badgeText: '',
        unit: '200g',
        stock: 25,
        desc: 'Traditional high fat salted butter block, locally churned.',
        rating: 4.6,
        image: 'assets/prod_butter.png',
        dietaryType: 'Veg'
      }
    ]
  },
  {
    id: 'store-5',
    name: 'Daily Essentials Express',
    category: 'pantry',
    rating: 4.5,
    reviewsCount: 112,
    image: 'assets/store_general.png',
    address: '67 Daily Circle, Koramangala 2nd Block, Bangalore',
    phone: '+91 99999 44444',
    deliveryRadius: 5.5,
    minOrderValue: 80,
    lat: 12.9320,
    lng: 77.6200,
    ownerEmail: 'general@luxe.com',
    upiVpa: 'general@okaxis',
    upiName: 'Daily Essentials Store',
    operatingHours: defaultOperatingHours,
    subscription: defaultSubscription,
    deliveryStaff: defaultStaff('store-5'),
    status: 'Open',
    products: [
      {
        id: 'p5-1',
        name: 'Premium Basmati Rice',
        category: 'pantry',
        price: 420,
        originalPrice: 480,
        badgeText: 'Discounted',
        unit: '5 kg',
        stock: 30,
        desc: 'Long grain aromatic basmati rice for daily use.',
        rating: 4.6,
        image: 'assets/prod_rice.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p5-2',
        name: 'Organic Whole Wheat Atta',
        category: 'pantry',
        price: 270,
        originalPrice: 290,
        badgeText: '',
        unit: '5 kg',
        stock: 35,
        desc: 'Stone ground organic flour, premium quality.',
        rating: 4.5,
        image: 'assets/prod_atta.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p5-3',
        name: 'Organic Royal Gala Apples',
        category: 'fruits',
        price: 170,
        originalPrice: 190,
        badgeText: 'Fresh Pick',
        unit: '1 kg',
        stock: 20,
        desc: 'Sweet and crunchy imported Gala apples.',
        rating: 4.7,
        image: 'assets/prod_apples.png',
        dietaryType: 'Veg'
      },
      {
        id: 'p5-4',
        name: 'Ripe Cherry Tomatoes',
        category: 'veggies',
        price: 38,
        originalPrice: 42,
        badgeText: '',
        unit: '250g',
        stock: 20,
        desc: 'Fresh farm cherry tomatoes, packed with juice.',
        rating: 4.6,
        image: 'assets/prod_tomatoes.png',
        dietaryType: 'Veg'
      }
    ]
  }
];

try {
  const dbData = JSON.parse(fs.readFileSync(path, 'utf8'));

  // Replace stores list
  dbData.stores = newStores;

  // Filter users list to keep clean defaults and add new ones
  const allowedUserEmails = ['dairy@luxe.com', 'organic@luxe.com', 'artisan@luxe.com', 'admin@luxe.com', 'rahul@luxe.com'];
  let cleanedUsers = dbData.users.filter(u => allowedUserEmails.includes(u.email));

  // Add user pantry if not present
  if (!cleanedUsers.some(u => u.email === 'pantry@luxe.com')) {
    cleanedUsers.push({
      id: 'user-pantry',
      email: 'pantry@luxe.com',
      password: HASHED_PASSWORD,
      role: 'merchant',
      name: 'Pantry Wellness Manager',
      storeId: 'store-4',
      walletBalance: 0,
      referralCode: 'REF-PANTRY-112',
      status: 'Active'
    });
  }

  // Add user general if not present
  if (!cleanedUsers.some(u => u.email === 'general@luxe.com')) {
    cleanedUsers.push({
      id: 'user-general',
      email: 'general@luxe.com',
      password: HASHED_PASSWORD,
      role: 'merchant',
      name: 'General Express Manager',
      storeId: 'store-5',
      walletBalance: 0,
      referralCode: 'REF-GENERAL-334',
      status: 'Active'
    });
  }

  dbData.users = cleanedUsers;

  // Clear orders and ledger transaction logs to keep the system clean and fresh!
  dbData.orders = [];
  dbData.ledger = [];

  fs.writeFileSync(path, JSON.stringify(dbData, null, 2), 'utf8');
  console.log("Database seeded successfully with 5 unique, emoji-free stores!");
} catch (err) {
  console.error("Error seeding database:", err);
}
