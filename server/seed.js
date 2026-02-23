/**
 * QuickBill — D-Mart Product Seed Script
 * Run: node server/seed.js
 * Populates the database with realistic D-Mart style products.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cash-register';

const dmartProducts = [
    // ─── Atta, Rice & Dal ───
    { name: 'Ashirvaad Atta 5kg', barcode: '8901063010017', price: 275, stock: 80, category: 'Groceries', lowStockThreshold: 15, brand: 'Ashirvaad', description: 'Premium whole wheat atta, freshly ground for soft rotis', tags: ['atta', 'wheat', 'staples'], isPublished: true },
    { name: 'India Gate Basmati Rice 5kg', barcode: '8901425111103', price: 485, compareAtPrice: 550, stock: 60, category: 'Groceries', lowStockThreshold: 10, brand: 'India Gate', description: 'Long grain aged basmati rice with rich aroma', tags: ['rice', 'basmati', 'staples'], isPublished: true },
    { name: 'Toor Dal 1kg', barcode: '8901058831016', price: 145, stock: 100, category: 'Groceries', lowStockThreshold: 20, brand: 'D-Mart', description: 'Premium quality toor dal, perfect for everyday cooking', tags: ['dal', 'pulses', 'staples'], isPublished: true },
    { name: 'Moong Dal 1kg', barcode: '8901058831023', price: 130, stock: 90, category: 'Groceries', lowStockThreshold: 20, brand: 'D-Mart', description: 'Clean sorted moong dal for healthy meals', tags: ['dal', 'pulses'], isPublished: true },
    { name: 'Chana Dal 1kg', barcode: '8901058831030', price: 95, stock: 85, category: 'Groceries', lowStockThreshold: 15, brand: 'D-Mart', description: 'Fresh chana dal for curries and snacks', tags: ['dal', 'pulses'], isPublished: true },
    { name: 'Rajma 1kg', barcode: '8901058831047', price: 165, stock: 55, category: 'Groceries', lowStockThreshold: 10, brand: 'D-Mart', description: 'Kashmiri rajma, soaks quickly and cooks soft', tags: ['rajma', 'beans', 'pulses'], isPublished: true },

    // ─── Cooking Oil & Ghee ───
    { name: 'Fortune Sunflower Oil 1L', barcode: '8901058002331', price: 155, stock: 70, category: 'Groceries', lowStockThreshold: 15, brand: 'Fortune', description: 'Light and healthy sunflower cooking oil', tags: ['oil', 'cooking'], isPublished: true },
    { name: 'Saffola Gold Oil 1L', barcode: '8904004400262', price: 195, compareAtPrice: 225, stock: 50, category: 'Groceries', lowStockThreshold: 10, brand: 'Saffola', description: 'Heart-healthy blended cooking oil', tags: ['oil', 'healthy'], isPublished: true },
    { name: 'Amul Ghee 500ml', barcode: '8901262150040', price: 315, stock: 40, category: 'Groceries', lowStockThreshold: 8, brand: 'Amul', description: 'Pure cow ghee with rich taste', tags: ['ghee', 'dairy'], isPublished: true },
    { name: 'Fortune Mustard Oil 1L', barcode: '8901058003178', price: 180, stock: 45, category: 'Groceries', lowStockThreshold: 10, brand: 'Fortune', description: 'Pure kachi ghani mustard oil', tags: ['oil', 'mustard'], isPublished: true },

    // ─── Spices & Masala ───
    { name: 'MDH Garam Masala 100g', barcode: '8902519003017', price: 78, stock: 120, category: 'Groceries', lowStockThreshold: 25, brand: 'MDH', description: 'Authentic blend of aromatic spices', tags: ['spices', 'masala'], isPublished: true },
    { name: 'Everest Turmeric Powder 200g', barcode: '8901552007016', price: 56, stock: 100, category: 'Groceries', lowStockThreshold: 20, brand: 'Everest', description: 'Pure turmeric powder with vibrant color', tags: ['spices', 'turmeric'], isPublished: true },
    { name: 'Catch Red Chilli Powder 200g', barcode: '8901205005017', price: 65, stock: 90, category: 'Groceries', lowStockThreshold: 15, brand: 'Catch', description: 'Fiery red chilli powder for bold flavors', tags: ['spices', 'chilli'], isPublished: true },
    { name: 'MDH Chole Masala 100g', barcode: '8902519004014', price: 55, stock: 75, category: 'Groceries', lowStockThreshold: 15, brand: 'MDH', description: 'Ready-mix masala for perfect chole', tags: ['spices', 'masala'], isPublished: true },
    { name: 'Tata Salt 1kg', barcode: '8901725181116', price: 28, stock: 200, category: 'Groceries', lowStockThreshold: 30, brand: 'Tata', description: 'India\'s trusted iodized salt', tags: ['salt', 'staples'], isPublished: true },

    // ─── Sugar & Tea ───
    { name: 'Tata Sugar 1kg', barcode: '8901725999900', price: 48, stock: 150, category: 'Groceries', lowStockThreshold: 25, brand: 'Tata', description: 'Refined white sugar', tags: ['sugar', 'staples'], isPublished: true },
    { name: 'Tata Tea Gold 500g', barcode: '8901179040040', price: 280, stock: 65, category: 'Groceries', lowStockThreshold: 10, brand: 'Tata', description: 'Premium tea with 15% long leaves', tags: ['tea', 'beverages'], isPublished: true },
    { name: 'Red Label Tea 500g', barcode: '8901030645013', price: 255, compareAtPrice: 290, stock: 70, category: 'Groceries', lowStockThreshold: 10, brand: 'Brooke Bond', description: 'Natural care tea with 5 Ayurvedic ingredients', tags: ['tea', 'beverages'], isPublished: true },
    { name: 'Nescafe Classic Coffee 100g', barcode: '7613036080016', price: 310, stock: 45, category: 'Groceries', lowStockThreshold: 8, brand: 'Nescafe', description: 'Instant coffee for a perfect start to your day', tags: ['coffee', 'beverages'], isPublished: true },
    { name: 'Bru Instant Coffee 100g', barcode: '8901030521010', price: 235, stock: 50, category: 'Groceries', lowStockThreshold: 10, brand: 'Bru', description: 'Smooth instant coffee blend', tags: ['coffee', 'beverages'], isPublished: true },

    // ─── Dairy & Beverages ───
    { name: 'Amul Taaza Milk 1L', barcode: '8901262011013', price: 60, stock: 120, category: 'Groceries', lowStockThreshold: 30, brand: 'Amul', description: 'Pasteurized toned milk', tags: ['milk', 'dairy'], isPublished: true },
    { name: 'Amul Butter 500g', barcode: '8901262011075', price: 275, stock: 35, category: 'Groceries', lowStockThreshold: 8, brand: 'Amul', description: 'Creamy pasteurized butter', tags: ['butter', 'dairy'], isPublished: true },
    { name: 'Amul Cheese Slice 200g', barcode: '8901262150118', price: 120, stock: 40, category: 'Groceries', lowStockThreshold: 10, brand: 'Amul', description: 'Processed cheese slices, perfect for sandwiches', tags: ['cheese', 'dairy'], isPublished: true },
    { name: 'Nestle Dahi 400g', barcode: '7613036700016', price: 45, stock: 80, category: 'Groceries', lowStockThreshold: 15, brand: 'Nestle', description: 'Fresh thick set dahi', tags: ['curd', 'dairy'], isPublished: true },
    { name: 'Tropicana Orange Juice 1L', barcode: '8901491100116', price: 110, stock: 55, category: 'Groceries', lowStockThreshold: 10, brand: 'Tropicana', description: '100% pure orange juice with no added sugar', tags: ['juice', 'beverages'], isPublished: true },
    { name: 'Real Mango Juice 1L', barcode: '8901491102013', price: 99, stock: 60, category: 'Groceries', lowStockThreshold: 10, brand: 'Real', description: 'Rich mango juice made from Alphonso mangoes', tags: ['juice', 'beverages', 'mango'], isPublished: true },

    // ─── Snacks & Biscuits ───
    { name: 'Parle-G Biscuits 800g', barcode: '8901725133718', price: 80, stock: 100, category: 'Groceries', lowStockThreshold: 20, brand: 'Parle', description: 'India\'s favourite glucose biscuits, family pack', tags: ['biscuits', 'snacks'], isPublished: true },
    { name: 'Britannia Good Day Cashew 600g', barcode: '8901063157019', price: 155, compareAtPrice: 180, stock: 60, category: 'Groceries', lowStockThreshold: 10, brand: 'Britannia', description: 'Crunchy cashew cookies', tags: ['biscuits', 'cookies', 'snacks'], isPublished: true },
    { name: 'Oreo Original 300g', barcode: '7622210100016', price: 70, stock: 75, category: 'Groceries', lowStockThreshold: 15, brand: 'Cadbury', description: 'Chocolate sandwich cookies with vanilla cream', tags: ['biscuits', 'cookies', 'chocolate'], isPublished: true },
    { name: 'Lays Classic Salted 70g', barcode: '8901491100048', price: 20, stock: 200, category: 'Groceries', lowStockThreshold: 40, brand: 'Lays', description: 'Crispy potato chips, classic salted flavor', tags: ['chips', 'snacks'], isPublished: true },
    { name: 'Kurkure Masala Munch 90g', barcode: '8901491100055', price: 20, stock: 180, category: 'Groceries', lowStockThreshold: 30, brand: 'Kurkure', description: 'Crunchy masala-flavored snack', tags: ['snacks', 'namkeen'], isPublished: true },
    { name: 'Haldirams Aloo Bhujia 400g', barcode: '8904004401016', price: 120, stock: 50, category: 'Groceries', lowStockThreshold: 10, brand: 'Haldirams', description: 'Classic aloo bhujia namkeen', tags: ['namkeen', 'snacks'], isPublished: true },
    { name: 'Maggi 2-Min Noodles 12 Pack', barcode: '8901058858013', price: 168, stock: 90, category: 'Groceries', lowStockThreshold: 15, brand: 'Maggi', description: 'Family pack instant noodles with masala flavor', tags: ['noodles', 'instant', 'snacks'], isPublished: true },
    { name: 'Cadbury Dairy Milk Silk 150g', barcode: '8901233020016', price: 175, stock: 70, category: 'Groceries', lowStockThreshold: 10, brand: 'Cadbury', description: 'Smooth and silky milk chocolate', tags: ['chocolate', 'sweets'], isPublished: true },

    // ─── Personal Care ───
    { name: 'Dove Soap 100g (3+1)', barcode: '8901030598005', price: 245, stock: 50, category: 'Personal Care', lowStockThreshold: 10, brand: 'Dove', description: 'Moisturizing beauty bar for soft skin', tags: ['soap', 'bath'], isPublished: true },
    { name: 'Dettol Handwash 200ml', barcode: '8901396370017', price: 85, stock: 60, category: 'Personal Care', lowStockThreshold: 12, brand: 'Dettol', description: 'Antibacterial liquid handwash', tags: ['handwash', 'hygiene'], isPublished: true },
    { name: 'Colgate MaxFresh Toothpaste 150g', barcode: '8901314500014', price: 98, stock: 80, category: 'Personal Care', lowStockThreshold: 15, brand: 'Colgate', description: 'Cooling crystal toothpaste for fresh breath', tags: ['toothpaste', 'oral care'], isPublished: true },
    { name: 'Head & Shoulders Shampoo 340ml', barcode: '4902430600019', price: 335, compareAtPrice: 380, stock: 35, category: 'Personal Care', lowStockThreshold: 8, brand: 'Head & Shoulders', description: 'Anti-dandruff shampoo for smooth hair', tags: ['shampoo', 'hair care'], isPublished: true },
    { name: 'Pantene Shampoo 340ml', barcode: '4902430600026', price: 315, stock: 40, category: 'Personal Care', lowStockThreshold: 8, brand: 'Pantene', description: 'Hair fall control shampoo with Pro-V formula', tags: ['shampoo', 'hair care'], isPublished: true },
    { name: 'Nivea Body Lotion 400ml', barcode: '4005808691014', price: 345, stock: 30, category: 'Personal Care', lowStockThreshold: 6, brand: 'Nivea', description: 'Deep moisture body lotion for 48hr hydration', tags: ['lotion', 'skin care'], isPublished: true },
    { name: 'Vaseline Petroleum Jelly 200ml', barcode: '8901030555015', price: 165, stock: 45, category: 'Personal Care', lowStockThreshold: 10, brand: 'Vaseline', description: 'Pure petroleum jelly for skin protection', tags: ['skin care'], isPublished: true },
    { name: 'Gillette Guard Razor (Pack of 6)', barcode: '7702018601017', price: 195, stock: 55, category: 'Personal Care', lowStockThreshold: 10, brand: 'Gillette', description: 'Ultra-thin comb guard for a safe shave', tags: ['razor', 'grooming'], isPublished: true },
    { name: 'Whisper Ultra Clean XL 30 Pads', barcode: '4902430101011', price: 310, stock: 40, category: 'Personal Care', lowStockThreshold: 8, brand: 'Whisper', description: 'Ultra clean sanitary pads with wings', tags: ['hygiene'], isPublished: true },
    { name: 'Himalaya Face Wash 150ml', barcode: '8901138503017', price: 195, stock: 55, category: 'Personal Care', lowStockThreshold: 10, brand: 'Himalaya', description: 'Neem face wash for pimple prevention', tags: ['face wash', 'skin care'], isPublished: true },

    // ─── Household & Cleaning ───
    { name: 'Surf Excel Matic 2kg', barcode: '8901030607011', price: 395, stock: 40, category: 'Household', lowStockThreshold: 8, brand: 'Surf Excel', description: 'Top load washing machine detergent', tags: ['detergent', 'laundry'], isPublished: true },
    { name: 'Vim Dishwash Bar 500g', barcode: '8901030310010', price: 42, stock: 100, category: 'Household', lowStockThreshold: 20, brand: 'Vim', description: 'Tough grease removal dishwash bar', tags: ['dishwash', 'cleaning'], isPublished: true },
    { name: 'Harpic Toilet Cleaner 1L', barcode: '8901396374015', price: 155, stock: 50, category: 'Household', lowStockThreshold: 10, brand: 'Harpic', description: '10x better cleaning and disinfection', tags: ['toilet cleaner', 'cleaning'], isPublished: true },
    { name: 'Lizol Floor Cleaner 975ml', barcode: '8901396375012', price: 190, stock: 45, category: 'Household', lowStockThreshold: 8, brand: 'Lizol', description: 'Surface disinfectant floor cleaner', tags: ['floor cleaner', 'cleaning'], isPublished: true },
    { name: 'Colin Glass Cleaner 500ml', barcode: '8901396376019', price: 120, stock: 40, category: 'Household', lowStockThreshold: 8, brand: 'Colin', description: 'Streak-free glass and surface cleaner', tags: ['glass cleaner', 'cleaning'], isPublished: true },
    { name: 'Scotch-Brite Scrub Pad (3 Pack)', barcode: '8901314320017', price: 55, stock: 80, category: 'Household', lowStockThreshold: 15, brand: 'Scotch-Brite', description: 'Durable scrub pads for tough stains', tags: ['scrub', 'cleaning'], isPublished: true },
    { name: 'Goodknight Liquid Refill 45ml', barcode: '8901023001017', price: 78, stock: 60, category: 'Household', lowStockThreshold: 12, brand: 'Goodknight', description: 'Mosquito repellent liquid refill', tags: ['repellent', 'household'], isPublished: true },
    { name: 'Garbage Bags (30 pcs)', barcode: '8904107100019', price: 99, stock: 70, category: 'Household', lowStockThreshold: 10, brand: 'D-Mart', description: 'Medium size garbage bags for daily use', tags: ['garbage bags', 'household'], isPublished: true },

    // ─── Baby Care ───
    { name: 'Pampers Diapers M (66 pcs)', barcode: '4902430776011', price: 999, compareAtPrice: 1199, stock: 25, category: 'Baby Care', lowStockThreshold: 5, brand: 'Pampers', description: 'All-round protection baby diapers, size medium', tags: ['diapers', 'baby'], isPublished: true },
    { name: 'Johnson Baby Soap 150g', barcode: '8901012115014', price: 85, stock: 45, category: 'Baby Care', lowStockThreshold: 10, brand: 'Johnson\'s', description: 'Gentle baby soap with milk proteins', tags: ['soap', 'baby'], isPublished: true },
    { name: 'Cerelac Wheat 300g', barcode: '7613036200016', price: 240, stock: 35, category: 'Baby Care', lowStockThreshold: 6, brand: 'Nestle', description: 'Stage 1 baby cereal with wheat', tags: ['cereal', 'baby food'], isPublished: true },

    // ─── Dry Fruits ───
    { name: 'Cashew Nuts (W320) 250g', barcode: '8904107200016', price: 295, stock: 30, category: 'Groceries', lowStockThreshold: 6, brand: 'D-Mart', description: 'Premium W320 grade cashew nuts', tags: ['dry fruits', 'cashew'], isPublished: true },
    { name: 'Almonds (American) 250g', barcode: '8904107200023', price: 275, stock: 35, category: 'Groceries', lowStockThreshold: 6, brand: 'D-Mart', description: 'California almonds, lightly salted', tags: ['dry fruits', 'almonds'], isPublished: true },
    { name: 'Kishmish (Raisins) 250g', barcode: '8904107200030', price: 145, stock: 40, category: 'Groceries', lowStockThreshold: 8, brand: 'D-Mart', description: 'Golden seedless raisins', tags: ['dry fruits', 'raisins'], isPublished: true },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected');

        // Clear existing products
        await Product.deleteMany({});
        console.log('🗑️  Cleared existing products');

        // Insert D-Mart products
        const result = await Product.insertMany(dmartProducts);
        console.log(`🛒 Inserted ${result.length} D-Mart products`);

        console.log('\n📦 Products by category:');
        const categories = {};
        dmartProducts.forEach(p => {
            categories[p.category] = (categories[p.category] || 0) + 1;
        });
        Object.entries(categories).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count} items`);
        });

        console.log('\n✨ Seed complete! Restart the app to see the products.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
}

seed();
