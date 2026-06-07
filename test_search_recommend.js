// test_search_recommend.js - Verify Fuzzy Search & Recommendations (Phase 14)
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log("=== LuxeGrocer Fuzzy Search & Recommendations Verification Test ===");

    // Step 1: Test fuzzy autocomplete search with typo-tolerant queries
    console.log("\n1. Testing fuzzy search autocomplete...");
    
    // Search with "daeri" (should match "dairy" category or stores)
    const searchRes1 = await fetch(`${BASE_URL}/search?q=daeri`);
    if (!searchRes1.ok) throw new Error(`Search failed: ${await searchRes1.text()}`);
    const results1 = await searchRes1.json();
    console.log(`Query 'daeri' results ->`);
    console.log(`  Matching stores count: ${results1.stores.length}`);
    console.log(`  Matching categories count: ${results1.categories.length}`);
    const hasDairyCat = results1.categories.some(c => c.toLowerCase().includes('dairy'));
    const hasDairyStore = results1.stores.some(s => s.name.toLowerCase().includes('dairy'));
    console.log(`  Matches category 'dairy'? ${hasDairyCat}`);
    console.log(`  Matches store 'dairy'? ${hasDairyStore}`);
    if (!hasDairyCat && !hasDairyStore) throw new Error("Expected to find dairy category or store match for typo query 'daeri'");

    // Search with "appls" (should match Gala Apples product)
    const searchRes2 = await fetch(`${BASE_URL}/search?q=appls`);
    if (!searchRes2.ok) throw new Error(`Search failed: ${await searchRes2.text()}`);
    const results2 = await searchRes2.json();
    console.log(`Query 'appls' results ->`);
    console.log(`  Matching products count: ${results2.products.length}`);
    const hasApples = results2.products.some(p => p.name.toLowerCase().includes('apple'));
    console.log(`  Matches product 'apples'? ${hasApples}`);
    if (!hasApples) throw new Error("Expected to find product apples for typo query 'appls'");

    // Step 2: Test Frequently Bought Together Recommendations
    console.log("\n2. Testing Frequently Bought Together...");
    // Let's query with "p1-2" (Greek Yogurt)
    const recRes1 = await fetch(`${BASE_URL}/recommendations/frequently-bought-together?productIds=p1-2&limit=3`);
    if (!recRes1.ok) throw new Error(`Recommendations failed: ${await recRes1.text()}`);
    const recs1 = await recRes1.json();
    console.log(`Frequently Bought Together with Greek Yogurt ->`);
    console.log(`  Returned recommendations count: ${recs1.length}`);
    recs1.forEach((r, idx) => console.log(`  [${idx + 1}] ID: ${r.id}, Name: ${r.name}, Store: ${r.storeName}`));
    if (recs1.length === 0) throw new Error("Expected to receive at least one checkout recommendation.");

    // Step 3: Test Popular Near You Recommendations
    console.log("\n3. Testing Popular Near You Banners...");
    // Query with Indiranagar coordinates (near store 3)
    const recRes2 = await fetch(`${BASE_URL}/recommendations/popular-near-you?lat=12.9716&lng=77.6408&limit=4`);
    if (!recRes2.ok) throw new Error(`Recommendations failed: ${await recRes2.text()}`);
    const recs2 = await recRes2.json();
    console.log(`Popular products near Indiranagar ->`);
    console.log(`  Returned recommendations count: ${recs2.length}`);
    recs2.forEach((r, idx) => console.log(`  [${idx + 1}] ID: ${r.id}, Name: ${r.name}, Store: ${r.storeName}`));
    if (recs2.length === 0) throw new Error("Expected to receive popular near you recommendations.");

    // Step 4: Test Multi-Level Categories Hierarchies
    console.log("\n4. Testing Multi-Level Category Hierarchies...");
    // Fetch categories tree
    const catsRes = await fetch(`${BASE_URL}/categories`);
    if (!catsRes.ok) throw new Error(`Categories fetch failed: ${await catsRes.text()}`);
    const categories = await catsRes.json();
    console.log(`Total categories in tree: ${categories.length}`);
    const milkCat = categories.find(c => c.id === 'milk');
    const dairyCat = categories.find(c => c.id === 'dairy');
    console.log(`  Milk parent: ${milkCat ? milkCat.parentId : 'none'}`);
    console.log(`  Dairy parent: ${dairyCat ? dairyCat.parentId : 'none'}`);
    if (milkCat.parentId !== 'dairy') throw new Error("Expected milk to be a child category of dairy.");

    // Query products under parent category 'dairy' (should recursively return 'milk', 'cheese', 'paneer' etc.)
    const catProdRes = await fetch(`${BASE_URL}/categories/dairy/products`);
    if (!catProdRes.ok) throw new Error(`Category products fetch failed: ${await catProdRes.text()}`);
    const catProducts = await catProdRes.json();
    console.log(`Total products under parent category 'dairy': ${catProducts.length}`);
    catProducts.forEach((p, idx) => console.log(`  [${idx + 1}] ID: ${p.id}, Name: ${p.name}, Category: ${p.category}`));
    
    // Check if products list contains both milk (cat: dairy or milk) and yogurt/paneer (cat: dairy/cheese/paneer)
    const hasMilkProduct = catProducts.some(p => p.id === 'p1-1'); // Premium Full Cream Milk
    const hasYogurtProduct = catProducts.some(p => p.id === 'p1-2'); // Organic Greek Yogurt
    console.log(`  Contains milk product? ${hasMilkProduct}`);
    console.log(`  Contains yogurt product? ${hasYogurtProduct}`);
    if (!hasMilkProduct || !hasYogurtProduct) {
        throw new Error("Expected recursive category product fetch to return all subcategory items.");
    }

    console.log("\nALL PHASE 14 FUZZY SEARCH & RECOMMENDATIONS TESTS PASSED!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
});
