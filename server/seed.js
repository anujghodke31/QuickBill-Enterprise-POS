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
  {
    name: 'Ashirvaad Atta 5kg',
    barcode: '8901063010017',
    price: 275,
    stock: 80,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'India Gate Basmati Rice 5kg',
    barcode: '8901425111103',
    price: 485,
    stock: 60,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Toor Dal 1kg',
    barcode: '8901058831016',
    price: 145,
    stock: 100,
    category: 'Groceries',
    lowStockThreshold: 20,
  },
  {
    name: 'Moong Dal 1kg',
    barcode: '8901058831023',
    price: 130,
    stock: 90,
    category: 'Groceries',
    lowStockThreshold: 20,
  },
  {
    name: 'Chana Dal 1kg',
    barcode: '8901058831030',
    price: 95,
    stock: 85,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'Rajma 1kg',
    barcode: '8901058831047',
    price: 165,
    stock: 55,
    category: 'Groceries',
    lowStockThreshold: 10,
  },

  // ─── Cooking Oil & Ghee ───
  {
    name: 'Fortune Sunflower Oil 1L',
    barcode: '8901058002331',
    price: 155,
    stock: 70,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'Saffola Gold Oil 1L',
    barcode: '8904004400262',
    price: 195,
    stock: 50,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Amul Ghee 500ml',
    barcode: '8901262150040',
    price: 315,
    stock: 40,
    category: 'Groceries',
    lowStockThreshold: 8,
  },
  {
    name: 'Fortune Mustard Oil 1L',
    barcode: '8901058003178',
    price: 180,
    stock: 45,
    category: 'Groceries',
    lowStockThreshold: 10,
  },

  // ─── Spices & Masala ───
  {
    name: 'MDH Garam Masala 100g',
    barcode: '8902519003017',
    price: 78,
    stock: 120,
    category: 'Groceries',
    lowStockThreshold: 25,
  },
  {
    name: 'Everest Turmeric Powder 200g',
    barcode: '8901552007016',
    price: 56,
    stock: 100,
    category: 'Groceries',
    lowStockThreshold: 20,
  },
  {
    name: 'Catch Red Chilli Powder 200g',
    barcode: '8901205005017',
    price: 65,
    stock: 90,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'MDH Chole Masala 100g',
    barcode: '8902519004014',
    price: 55,
    stock: 75,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'Tata Salt 1kg',
    barcode: '8901725181116',
    price: 28,
    stock: 200,
    category: 'Groceries',
    lowStockThreshold: 30,
  },

  // ─── Sugar & Tea ───
  {
    name: 'Tata Sugar 1kg',
    barcode: '8901725999900',
    price: 48,
    stock: 150,
    category: 'Groceries',
    lowStockThreshold: 25,
  },
  {
    name: 'Tata Tea Gold 500g',
    barcode: '8901179040040',
    price: 280,
    stock: 65,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Red Label Tea 500g',
    barcode: '8901030645013',
    price: 255,
    stock: 70,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Nescafe Classic Coffee 100g',
    barcode: '7613036080016',
    price: 310,
    stock: 45,
    category: 'Groceries',
    lowStockThreshold: 8,
  },
  {
    name: 'Bru Instant Coffee 100g',
    barcode: '8901030521010',
    price: 235,
    stock: 50,
    category: 'Groceries',
    lowStockThreshold: 10,
  },

  // ─── Dairy & Beverages ───
  {
    name: 'Amul Taaza Milk 1L',
    barcode: '8901262011013',
    price: 60,
    stock: 120,
    category: 'Groceries',
    lowStockThreshold: 30,
  },
  {
    name: 'Amul Butter 500g',
    barcode: '8901262011075',
    price: 275,
    stock: 35,
    category: 'Groceries',
    lowStockThreshold: 8,
  },
  {
    name: 'Amul Cheese Slice 200g',
    barcode: '8901262150118',
    price: 120,
    stock: 40,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Nestle Dahi 400g',
    barcode: '7613036700016',
    price: 45,
    stock: 80,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'Tropicana Orange Juice 1L',
    barcode: '8901491100116',
    price: 110,
    stock: 55,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Real Mango Juice 1L',
    barcode: '8901491102013',
    price: 99,
    stock: 60,
    category: 'Groceries',
    lowStockThreshold: 10,
  },

  // ─── Snacks & Biscuits ───
  {
    name: 'Parle-G Biscuits 800g',
    barcode: '8901725133718',
    price: 80,
    stock: 100,
    category: 'Groceries',
    lowStockThreshold: 20,
  },
  {
    name: 'Britannia Good Day Cashew 600g',
    barcode: '8901063157019',
    price: 155,
    stock: 60,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Oreo Original 300g',
    barcode: '7622210100016',
    price: 70,
    stock: 75,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'Lays Classic Salted 70g',
    barcode: '8901491100048',
    price: 20,
    stock: 200,
    category: 'Groceries',
    lowStockThreshold: 40,
  },
  {
    name: 'Kurkure Masala Munch 90g',
    barcode: '8901491100055',
    price: 20,
    stock: 180,
    category: 'Groceries',
    lowStockThreshold: 30,
  },
  {
    name: 'Haldirams Aloo Bhujia 400g',
    barcode: '8904004401016',
    price: 120,
    stock: 50,
    category: 'Groceries',
    lowStockThreshold: 10,
  },
  {
    name: 'Maggi 2-Min Noodles 12 Pack',
    barcode: '8901058858013',
    price: 168,
    stock: 90,
    category: 'Groceries',
    lowStockThreshold: 15,
  },
  {
    name: 'Cadbury Dairy Milk Silk 150g',
    barcode: '8901233020016',
    price: 175,
    stock: 70,
    category: 'Groceries',
    lowStockThreshold: 10,
  },

  // ─── Personal Care ───
  {
    name: 'Dove Soap 100g (3+1)',
    barcode: '8901030598005',
    price: 245,
    stock: 50,
    category: 'Personal Care',
    lowStockThreshold: 10,
  },
  {
    name: 'Dettol Handwash 200ml',
    barcode: '8901396370017',
    price: 85,
    stock: 60,
    category: 'Personal Care',
    lowStockThreshold: 12,
  },
  {
    name: 'Colgate MaxFresh Toothpaste 150g',
    barcode: '8901314500014',
    price: 98,
    stock: 80,
    category: 'Personal Care',
    lowStockThreshold: 15,
  },
  {
    name: 'Head & Shoulders Shampoo 340ml',
    barcode: '4902430600019',
    price: 335,
    stock: 35,
    category: 'Personal Care',
    lowStockThreshold: 8,
  },
  {
    name: 'Pantene Shampoo 340ml',
    barcode: '4902430600026',
    price: 315,
    stock: 40,
    category: 'Personal Care',
    lowStockThreshold: 8,
  },
  {
    name: 'Nivea Body Lotion 400ml',
    barcode: '4005808691014',
    price: 345,
    stock: 30,
    category: 'Personal Care',
    lowStockThreshold: 6,
  },
  {
    name: 'Vaseline Petroleum Jelly 200ml',
    barcode: '8901030555015',
    price: 165,
    stock: 45,
    category: 'Personal Care',
    lowStockThreshold: 10,
  },
  {
    name: 'Gillette Guard Razor (Pack of 6)',
    barcode: '7702018601017',
    price: 195,
    stock: 55,
    category: 'Personal Care',
    lowStockThreshold: 10,
  },
  {
    name: 'Whisper Ultra Clean XL 30 Pads',
    barcode: '4902430101011',
    price: 310,
    stock: 40,
    category: 'Personal Care',
    lowStockThreshold: 8,
  },
  {
    name: 'Himalaya Face Wash 150ml',
    barcode: '8901138503017',
    price: 195,
    stock: 55,
    category: 'Personal Care',
    lowStockThreshold: 10,
  },

  // ─── Household & Cleaning ───
  {
    name: 'Surf Excel Matic 2kg',
    barcode: '8901030607011',
    price: 395,
    stock: 40,
    category: 'Household',
    lowStockThreshold: 8,
  },
  {
    name: 'Vim Dishwash Bar 500g',
    barcode: '8901030310010',
    price: 42,
    stock: 100,
    category: 'Household',
    lowStockThreshold: 20,
  },
  {
    name: 'Harpic Toilet Cleaner 1L',
    barcode: '8901396374015',
    price: 155,
    stock: 50,
    category: 'Household',
    lowStockThreshold: 10,
  },
  {
    name: 'Lizol Floor Cleaner 975ml',
    barcode: '8901396375012',
    price: 190,
    stock: 45,
    category: 'Household',
    lowStockThreshold: 8,
  },
  {
    name: 'Colin Glass Cleaner 500ml',
    barcode: '8901396376019',
    price: 120,
    stock: 40,
    category: 'Household',
    lowStockThreshold: 8,
  },
  {
    name: 'Scotch-Brite Scrub Pad (3 Pack)',
    barcode: '8901314320017',
    price: 55,
    stock: 80,
    category: 'Household',
    lowStockThreshold: 15,
  },
  {
    name: 'Goodknight Liquid Refill 45ml',
    barcode: '8901023001017',
    price: 78,
    stock: 60,
    category: 'Household',
    lowStockThreshold: 12,
  },
  {
    name: 'Garbage Bags (30 pcs)',
    barcode: '8904107100019',
    price: 99,
    stock: 70,
    category: 'Household',
    lowStockThreshold: 10,
  },

  // ─── Baby Care ───
  {
    name: 'Pampers Diapers M (66 pcs)',
    barcode: '4902430776011',
    price: 999,
    stock: 25,
    category: 'Baby Care',
    lowStockThreshold: 5,
  },
  {
    name: 'Johnson Baby Soap 150g',
    barcode: '8901012115014',
    price: 85,
    stock: 45,
    category: 'Baby Care',
    lowStockThreshold: 10,
  },
  {
    name: 'Cerelac Wheat 300g',
    barcode: '7613036200016',
    price: 240,
    stock: 35,
    category: 'Baby Care',
    lowStockThreshold: 6,
  },

  // ─── Dry Fruits ───
  {
    name: 'Cashew Nuts (W320) 250g',
    barcode: '8904107200016',
    price: 295,
    stock: 30,
    category: 'Groceries',
    lowStockThreshold: 6,
  },
  {
    name: 'Almonds (American) 250g',
    barcode: '8904107200023',
    price: 275,
    stock: 35,
    category: 'Groceries',
    lowStockThreshold: 6,
  },
  {
    name: 'Kishmish (Raisins) 250g',
    barcode: '8904107200030',
    price: 145,
    stock: 40,
    category: 'Groceries',
    lowStockThreshold: 8,
  },
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
    dmartProducts.forEach((p) => {
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
