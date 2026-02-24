const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cash-register';

// Convert DummyJSON product to our schema
const mapProduct = (p) => {
    // DummyJSON prices are in USD, roughly convert to INR
    const priceInr = Math.round(p.price * 80);

    // Calculate original compareAtPrice based on discount percentage
    let compareAtPrice = null;
    if (p.discountPercentage > 0) {
        compareAtPrice = Math.round(priceInr / (1 - (p.discountPercentage / 100)));
    }

    return {
        name: p.title,
        barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
        sku: p.sku || `SKU-${Math.floor(Math.random() * 10000)}`,
        price: priceInr,
        compareAtPrice,
        stock: p.stock || Math.floor(Math.random() * 100) + 20,
        category: p.category.charAt(0).toUpperCase() + p.category.slice(1).replace('-', ' '),
        lowStockThreshold: 10,
        brand: p.brand || 'Generic',
        description: p.description,
        tags: p.tags || [p.category],
        images: p.images && p.images.length > 0 ? p.images : [p.thumbnail],
        ratings: {
            average: p.rating || 0,
            count: Math.floor(Math.random() * 500) + 10
        },
        isPublished: true
    };
};

async function seed() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected');

        console.log('⏳ Fetching real products with exact matching images from DummyJSON...');

        // Fetch 194 limits
        const response = await fetch('https://dummyjson.com/products?limit=194');
        const data = await response.json();
        const products = data.products;

        console.log(`📦 Fetched ${products.length} products. Proceeding to map and save...`);

        // Clear existing products
        await Product.deleteMany({});
        console.log('🗑️  Cleared existing products');

        const mappedProducts = products.map(mapProduct);

        // Insert new expanded catalog
        const result = await Product.insertMany(mappedProducts);
        console.log(`🛒 Successfully Inserted ${result.length} products with REAL matching images!`);

        console.log('\n📦 Products by category:');
        const categories = {};
        mappedProducts.forEach(p => {
            categories[p.category] = (categories[p.category] || 0) + 1;
        });

        // Sort and display
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                console.log(`   ${cat}: ${count} items`);
            });

        console.log('\n✨ Seed complete! Restart the app to see the beautiful catalog.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
}

seed();
