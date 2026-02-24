/**
 * QuickBill — E-Commerce Massive Product Seed Script
 * Run: node server/seed.js
 * Populates the database with 175+ realistic products across 7 categories.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cash-register';

// Generate random barcode
const generateBarcode = () => Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

// Generate random rating
const generateRating = () => ({
    average: Number((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5 to 5.0
    count: Math.floor(Math.random() * 500) + 10
});

// Helper to create product object
const createProduct = (name, category, brand, basePrice, tags, imgKeyword) => {
    const price = Math.round(basePrice * (0.9 + Math.random() * 0.2)); // +/- 10% variation
    const hasDiscount = Math.random() > 0.5;
    const compareAtPrice = hasDiscount ? Math.round(price * (1.1 + Math.random() * 0.3)) : null;
    const stock = Math.floor(Math.random() * 100) + 20;

    // Use a reliable placeholder service with keywords
    const query = (tags[0] || category.split(' ')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSeed = Math.floor(Math.random() * 10000);

    const images = [
        `https://loremflickr.com/600/600/${query}?random=${randomSeed}`,
        `https://loremflickr.com/600/600/${query}?random=${randomSeed + 1}`
    ];

    return {
        name,
        barcode: generateBarcode(),
        price,
        compareAtPrice,
        stock,
        category,
        lowStockThreshold: 10,
        brand,
        description: `Premium quality ${name.toLowerCase()} sourced for the best experience. Carefully packaged and trusted by thousands of customers. Features include long-lasting durability, exceptional build quality, and guaranteed satisfaction.`,
        tags,
        images,
        ratings: generateRating(),
        isPublished: true
    };
};

const productData = [
    // ─── Groceries (25) ───
    createProduct('Organic Ashirvaad Atta 5kg', 'Groceries', 'Ashirvaad', 280, ['staples', 'wheat'], '1506084868230-eb41b0b15621'),
    createProduct('India Gate Basmati Rice 5kg', 'Groceries', 'India Gate', 550, ['staples', 'rice'], '1586201375761-83865001e31c'),
    createProduct('Toor Dal Premium 1kg', 'Groceries', 'Tata Sampann', 160, ['staples', 'dal'], '1589156170131-72993b3f114c'),
    createProduct('Moong Dal Yellow 1kg', 'Groceries', 'Tata Sampann', 140, ['staples', 'dal'], '1626079730537-802526e850b1'),
    createProduct('Chana Dal 1kg', 'Groceries', 'D-Mart', 100, ['staples', 'dal'], '1585937421606-2d1bc0bbeac3'),
    createProduct('Kashmiri Rajma 1kg', 'Groceries', 'D-Mart', 180, ['staples', 'beans'], '1515942400420-ece9d19122bb'),
    createProduct('Fortune Sunflower Oil 1L', 'Groceries', 'Fortune', 160, ['oil', 'cooking'], '1474973318288-51ec46b6a0bb'),
    createProduct('Saffola Gold Oil 1L', 'Groceries', 'Saffola', 200, ['oil', 'cooking'], '1611314647900-349f2b1d7d2b'),
    createProduct('Amul Pure Cow Ghee 500ml', 'Groceries', 'Amul', 320, ['ghee', 'dairy'], '1604328698692-f2696b51eb24'),
    createProduct('MDH Garam Masala 100g', 'Groceries', 'MDH', 80, ['spices'], '1596040033229-a9821ebd058d'),
    createProduct('Everest Turmeric Powder 200g', 'Groceries', 'Everest', 60, ['spices'], '1611095960241-15cde2106e23'),
    createProduct('Catch Red Chilli Powder 200g', 'Groceries', 'Catch', 65, ['spices'], '1596040033229-a9821ebd058d'),
    createProduct('Tata Salt Iodized 1kg', 'Groceries', 'Tata', 28, ['staples', 'salt'], '1600867746560-61019d5e3fdb'),
    createProduct('Tata Sugar Pure 1kg', 'Groceries', 'Tata', 50, ['staples', 'sugar'], '1581452148753-37cb4229986b'),
    createProduct('Tata Tea Gold 500g', 'Groceries', 'Tata', 280, ['tea', 'beverages'], '1576092762791-25eafffad2d9'),
    createProduct('Nescafe Classic Coffee 100g', 'Groceries', 'Nescafe', 320, ['coffee', 'beverages'], '1556742049-0cfed4f6a45d'),
    createProduct('Bru Instant Coffee 100g', 'Groceries', 'Bru', 240, ['coffee', 'beverages'], '1556742049-0cfed4f6a45d'),
    createProduct('Amul Taaza Milk 1L', 'Groceries', 'Amul', 65, ['dairy', 'milk'], '1550583724-b2692b85b150'),
    createProduct('Amul Pasteurized Butter 500g', 'Groceries', 'Amul', 280, ['dairy', 'butter'], '1589301760014-1f8da26ba4f6'),
    createProduct('Nestle Fresh Dahi 400g', 'Groceries', 'Nestle', 45, ['dairy', 'curd'], '1568800041852-aa38eb20bd7d'),
    createProduct('Tropicana Orange Juice 1L', 'Groceries', 'Tropicana', 120, ['beverages', 'juice'], '1613478223719-2248fa64049e'),
    createProduct('Parle-G Gold Biscuits 800g', 'Groceries', 'Parle', 90, ['snacks', 'biscuits'], '1558961363-010dfbb21be9'),
    createProduct('Lays Classic Salted 70g', 'Groceries', 'Lays', 20, ['snacks', 'chips'], '1599490659213-e4b56c5be5ca'),
    createProduct('Maggi 2-Min Noodles 12 Pack', 'Groceries', 'Maggi', 170, ['snacks', 'noodles'], '1612927601601-6638404737ce'),
    createProduct('Cadbury Dairy Milk Silk 150g', 'Groceries', 'Cadbury', 180, ['snacks', 'chocolate'], '1540638349517-3afd0a424260'),

    // ─── Personal Care (25) ───
    createProduct('Dove Beauty Cream Soap (3+1)', 'Personal Care', 'Dove', 250, ['soap', 'bath'], '1600857544200-a4d34c01f6ce'),
    createProduct('Dettol Liquid Handwash 200ml', 'Personal Care', 'Dettol', 90, ['handwash', 'hygiene'], '1584308511674-8846c4f42018'),
    createProduct('Colgate MaxFresh Gel 150g', 'Personal Care', 'Colgate', 100, ['oral care', 'toothpaste'], '1533038590840-1c798eb4bbf7'),
    createProduct('Sensodyne Repair & Protect 100g', 'Personal Care', 'Sensodyne', 180, ['oral care', 'toothpaste'], '1533038590840-1c798eb4bbf7'),
    createProduct('Head & Shoulders Smooth 340ml', 'Personal Care', 'H&S', 340, ['shampoo', 'hair'], '1556228578-0d85b1a4d571'),
    createProduct('Pantene Hair Fall Control 340ml', 'Personal Care', 'Pantene', 320, ['shampoo', 'hair'], '1556228578-0d85b1a4d571'),
    createProduct('Loreal Paris Dream Lengths 340ml', 'Personal Care', 'Loreal', 380, ['shampoo', 'hair'], '1556228578-0d85b1a4d571'),
    createProduct('Nivea Nourishing Body Lotion 400ml', 'Personal Care', 'Nivea', 350, ['skincare', 'lotion'], '1611077544342-9f37c763fc6e'),
    createProduct('Vaseline Intensive Care 400ml', 'Personal Care', 'Vaseline', 320, ['skincare', 'lotion'], '1611077544342-9f37c763fc6e'),
    createProduct('Gillette Mach3 Razor', 'Personal Care', 'Gillette', 250, ['grooming', 'razor'], '1515562141208-8dc0a112dd13'),
    createProduct('Gillette Shaving Foam 200g', 'Personal Care', 'Gillette', 220, ['grooming', 'shaving'], '1515562141208-8dc0a112dd13'),
    createProduct('Whisper Ultra Clean XL 30 Pads', 'Personal Care', 'Whisper', 320, ['hygiene'], '1591146755498-84dc2c6ce0ac'),
    createProduct('Stayfree Advanced XL 28 Pads', 'Personal Care', 'Stayfree', 290, ['hygiene'], '1591146755498-84dc2c6ce0ac'),
    createProduct('Himalaya Purifying Neem Face Wash 150ml', 'Personal Care', 'Himalaya', 200, ['skincare', 'face'], '1556228578-0d85b1a4d571'),
    createProduct('Garnier Men Face Wash 100g', 'Personal Care', 'Garnier', 180, ['skincare', 'face'], '1556228578-0d85b1a4d571'),
    createProduct('Ponds Super Light Gel 100g', 'Personal Care', 'Ponds', 280, ['skincare', 'moisturizer'], '1611077544342-9f37c763fc6e'),
    createProduct('Lakme Sun Expert SPF 50 100g', 'Personal Care', 'Lakme', 450, ['skincare', 'sunscreen'], '1611077544342-9f37c763fc6e'),
    createProduct('Axe Signature Body Perfume 122ml', 'Personal Care', 'Axe', 250, ['fragrance', 'deodorant'], '1595159353974-9a5c8df59f9c'),
    createProduct('Engage Pocket Perfume for Men', 'Personal Care', 'Engage', 70, ['fragrance', 'perfume'], '1595159353974-9a5c8df59f9c'),
    createProduct('Fiama Di Wills Shower Gel 250ml', 'Personal Care', 'Fiama', 190, ['bath', 'shower gel'], '1600857544200-a4d34c01f6ce'),
    createProduct('Pears Pure & Gentle Soap 100g', 'Personal Care', 'Pears', 50, ['bath', 'soap'], '1600857544200-a4d34c01f6ce'),
    createProduct('Listerine Mouthwash 250ml', 'Personal Care', 'Listerine', 130, ['oral care'], '1584308511674-8846c4f42018'),
    createProduct('Kamasutra Deodorant Spark 150ml', 'Personal Care', 'Kamasutra', 220, ['fragrance', 'deodorant'], '1595159353974-9a5c8df59f9c'),
    createProduct('Olay Total Effects Day Cream 50g', 'Personal Care', 'Olay', 750, ['skincare', 'anti-aging'], '1611077544342-9f37c763fc6e'),
    createProduct('Biotique Bio Neem Purifying Face Wash', 'Personal Care', 'Biotique', 140, ['skincare', 'face'], '1556228578-0d85b1a4d571'),

    // ─── Household (25) ───
    createProduct('Surf Excel Matic Top Load 2kg', 'Household', 'Surf Excel', 400, ['laundry', 'detergent'], '1585933454721-f404eebcdb8c'),
    createProduct('Ariel Matic Front Load 2kg', 'Household', 'Ariel', 440, ['laundry', 'detergent'], '1585933454721-f404eebcdb8c'),
    createProduct('Tide Plus Double Power 2kg', 'Household', 'Tide', 230, ['laundry', 'detergent'], '1585933454721-f404eebcdb8c'),
    createProduct('Vim Dishwash Gel 750ml', 'Household', 'Vim', 160, ['cleaning', 'kitchen'], '1584824419619-3c72b8d002c9'),
    createProduct('Pril Dishwash Liquid 750ml', 'Household', 'Pril', 140, ['cleaning', 'kitchen'], '1584824419619-3c72b8d002c9'),
    createProduct('Harpic Power Plus 1L', 'Household', 'Harpic', 170, ['cleaning', 'bathroom'], '1584824419619-3c72b8d002c9'),
    createProduct('Lizol Disinfectant Floor Cleaner 1L', 'Household', 'Lizol', 190, ['cleaning', 'floor'], '1584824419619-3c72b8d002c9'),
    createProduct('Colin Glass Cleaner Spray 500ml', 'Household', 'Colin', 110, ['cleaning', 'glass'], '1584824419619-3c72b8d002c9'),
    createProduct('Comfort Fabric Conditioner 860ml', 'Household', 'Comfort', 220, ['laundry', 'conditioner'], '1585933454721-f404eebcdb8c'),
    createProduct('Dettol Disinfectant Liquid 500ml', 'Household', 'Dettol', 180, ['cleaning', 'disinfectant'], '1584824419619-3c72b8d002c9'),
    createProduct('Goodknight Gold Flash Refill', 'Household', 'Goodknight', 85, ['repellent'], '1584824419619-3c72b8d002c9'),
    createProduct('All Out Liquid Refill Twin Pack', 'Household', 'All Out', 140, ['repellent'], '1584824419619-3c72b8d002c9'),
    createProduct('HIT Cockroach Killer Spray 400ml', 'Household', 'HIT', 210, ['repellent', 'insecticide'], '1584824419619-3c72b8d002c9'),
    createProduct('Scotch-Brite Sponge Wipes (3 Pack)', 'Household', 'Scotch-Brite', 150, ['cleaning', 'wipes'], '1584824419619-3c72b8d002c9'),
    createProduct('Gala Spin Mop with Bucket', 'Household', 'Gala', 1200, ['cleaning', 'mop'], '1584824419619-3c72b8d002c9'),
    createProduct('Odonil Room Freshener Block 50g', 'Household', 'Odonil', 45, ['freshener', 'air'], '1584824419619-3c72b8d002c9'),
    createProduct('Godrej Aer Pocket Bathroom Freshener', 'Household', 'Godrej', 55, ['freshener', 'bathroom'], '1584824419619-3c72b8d002c9'),
    createProduct('Garbage Bags Medium (30 pcs)', 'Household', 'D-Mart', 90, ['bags', 'waste'], '1584824419619-3c72b8d002c9'),
    createProduct('Aluminium Foil Roll 9m', 'Household', 'Freshwrapp', 80, ['kitchen', 'foil'], '1584824419619-3c72b8d002c9'),
    createProduct('Cling Film Food Wrap 30m', 'Household', 'Wrapaf', 110, ['kitchen', 'wrap'], '1584824419619-3c72b8d002c9'),
    createProduct('Cello Zip Lock Pouches (20 pcs)', 'Household', 'Cello', 140, ['kitchen', 'storage'], '1584824419619-3c72b8d002c9'),
    createProduct('Duracell AA Batteries (Pack of 4)', 'Household', 'Duracell', 160, ['electronics', 'battery'], '1584824419619-3c72b8d002c9'),
    createProduct('Eveready AAA Batteries (Pack of 4)', 'Household', 'Eveready', 80, ['electronics', 'battery'], '1584824419619-3c72b8d002c9'),
    createProduct('Glow & Lovely Advanced Multivitamin', 'Household', 'Glow & Lovely', 110, ['skincare', 'cream'], '1584824419619-3c72b8d002c9'),
    createProduct('Savlon Antiseptic Liquid 200ml', 'Household', 'Savlon', 90, ['first aid', 'disinfectant'], '1584824419619-3c72b8d002c9'),

    // ─── Baby Care (25) ───
    createProduct('Pampers Active Baby Taped Diapers (M) 62s', 'Baby Care', 'Pampers', 950, ['diapers', 'baby'], '1519689680058-324335c77eba'),
    createProduct('MamyPoko Pants Standard (L) 44s', 'Baby Care', 'MamyPoko', 650, ['diapers', 'baby'], '1519689680058-324335c77eba'),
    createProduct('Huggies Wonder Pants (L) 50s', 'Baby Care', 'Huggies', 780, ['diapers', 'baby'], '1519689680058-324335c77eba'),
    createProduct('Johnson\'s Baby Powder 400g', 'Baby Care', 'Johnson\'s', 240, ['skincare', 'powder'], '1628189873130-9b578c7c9808'),
    createProduct('Himalaya Baby Powder 400g', 'Baby Care', 'Himalaya', 190, ['skincare', 'powder'], '1628189873130-9b578c7c9808'),
    createProduct('Johnson\'s Baby Oil 200ml', 'Baby Care', 'Johnson\'s', 180, ['skincare', 'oil'], '1556228720-192a6c8eafac'),
    createProduct('Dabur Lal Tail Baby Massage Oil 200ml', 'Baby Care', 'Dabur', 220, ['skincare', 'oil'], '1556228720-192a6c8eafac'),
    createProduct('Sebamed Baby Wash Extra Soft 200ml', 'Baby Care', 'Sebamed', 450, ['bath', 'wash'], '1556228578-0d85b1a4d571'),
    createProduct('Cetaphil Baby Daily Lotion 400ml', 'Baby Care', 'Cetaphil', 680, ['skincare', 'lotion'], '1611077544342-9f37c763fc6e'),
    createProduct('Johnson\'s Baby Soap 75g (Pack of 4)', 'Baby Care', 'Johnson\'s', 160, ['bath', 'soap'], '1600857544200-a4d34c01f6ce'),
    createProduct('Himalaya Gentle Baby Soap 75g (Pack of 4)', 'Baby Care', 'Himalaya', 140, ['bath', 'soap'], '1600857544200-a4d34c01f6ce'),
    createProduct('Mamaearth Moisturizing Daily Lotion 400ml', 'Baby Care', 'Mamaearth', 380, ['skincare', 'lotion'], '1611077544342-9f37c763fc6e'),
    createProduct('Nestle Cerelac Wheat Apple 300g', 'Baby Care', 'Nestle', 260, ['food', 'cereal'], '1620608518884-386b72d250bf'),
    createProduct('Nestle Nan Pro 1 Infant Formula 400g', 'Baby Care', 'Nestle', 680, ['food', 'milk'], '1620608518884-386b72d250bf'),
    createProduct('Dexolac Stage 2 Follow-up Formula 400g', 'Baby Care', 'Dexolac', 380, ['food', 'milk'], '1620608518884-386b72d250bf'),
    createProduct('LuvLap Baby Wet Wipes 72pcs (Pack of 3)', 'Baby Care', 'LuvLap', 240, ['hygiene', 'wipes'], '1584308511674-8846c4f42018'),
    createProduct('Mee Mee Gentle Baby Wipes 72pcs', 'Baby Care', 'Mee Mee', 90, ['hygiene', 'wipes'], '1584308511674-8846c4f42018'),
    createProduct('Pigeon Baby Liquid Cleanser 500ml', 'Baby Care', 'Pigeon', 350, ['cleaning', 'cleanser'], '1584824419619-3c72b8d002c9'),
    createProduct('Chicco Baby Moments No-Tears Shampoo 200ml', 'Baby Care', 'Chicco', 220, ['hair', 'shampoo'], '1556228578-0d85b1a4d571'),
    createProduct('Mamaearth Gentle Cleansing Shampoo 200ml', 'Baby Care', 'Mamaearth', 200, ['hair', 'shampoo'], '1556228578-0d85b1a4d571'),
    createProduct('LuvLap Anti-Colic Feeding Bottle 250ml', 'Baby Care', 'LuvLap', 180, ['feeding', 'bottle'], '1625927506249-f027fc6910da'),
    createProduct('Philips Avent Natural Feeding Bottle 260ml', 'Baby Care', 'Philips', 450, ['feeding', 'bottle'], '1625927506249-f027fc6910da'),
    createProduct('Mee Mee Protective Baby Mosquito Net', 'Baby Care', 'Mee Mee', 350, ['nursery', 'net'], '1519689680058-324335c77eba'),
    createProduct('LuvLap Baby Nail Clipper Set', 'Baby Care', 'LuvLap', 120, ['grooming', 'clipper'], '1519689680058-324335c77eba'),
    createProduct('Chicco Soft Silicone Soother', 'Baby Care', 'Chicco', 160, ['soother', 'pacifier'], '1519689680058-324335c77eba'),

    // ─── Electronics (25) ───
    createProduct('Apple AirPods Pro (2nd Gen)', 'Electronics', 'Apple', 24900, ['audio', 'earbuds'], '1606220838315-0aa4ddb8e4dd'),
    createProduct('Sony WH-1000XM4 Noise Cancelling Headphones', 'Electronics', 'Sony', 26990, ['audio', 'headphones'], '1618366712010-f4ae9c647dcb'),
    createProduct('Samsung Galaxy Buds 2 Pro', 'Electronics', 'Samsung', 17000, ['audio', 'earbuds'], '1605464371845-a1a16bc5a5cf'),
    createProduct('JBL Flip 6 Portable Bluetooth Speaker', 'Electronics', 'JBL', 11999, ['audio', 'speaker'], '1608043152269-703ea3ed1882'),
    createProduct('boAt Stone 1200 Bluetooth Speaker', 'Electronics', 'boAt', 3999, ['audio', 'speaker'], '1608043152269-703ea3ed1882'),
    createProduct('Amazon Echo Dot (5th Gen)', 'Electronics', 'Amazon', 4999, ['smart home', 'speaker'], '1540340062-81e5b5635f11'),
    createProduct('Fire TV Stick with Alexa Voice Remote', 'Electronics', 'Amazon', 3999, ['streaming', 'tv'], '1540340062-81e5b5635f11'),
    createProduct('Apple AirTag', 'Electronics', 'Apple', 3190, ['tracker', 'smart'], '1627398513518-e374528148e6'),
    createProduct('Mi Power Bank 3i 20000mAh', 'Electronics', 'Xiaomi', 2199, ['power bank', 'charging'], '1607519106093-df8192a5bafc'),
    createProduct('Samsung 25W Fast Wall Charger', 'Electronics', 'Samsung', 1299, ['charger', 'mobile'], '1607519106093-df8192a5bafc'),
    createProduct('Anker PowerLine III USB-C to USB-C Cable', 'Electronics', 'Anker', 999, ['cable', 'charging'], '1607519106093-df8192a5bafc'),
    createProduct('Logitech MX Master 3S Wireless Mouse', 'Electronics', 'Logitech', 9999, ['peripherals', 'mouse'], '1527864550417-7fd11bf4db86'),
    createProduct('Keychron K2 Mechanical Keyboard', 'Electronics', 'Keychron', 8500, ['peripherals', 'keyboard'], '1595225476474-875215312384'),
    createProduct('Razer DeathAdder V2 Gaming Mouse', 'Electronics', 'Razer', 3500, ['gaming', 'mouse'], '1527864550417-7fd11bf4db86'),
    createProduct('HyperX Cloud II Gaming Headset', 'Electronics', 'HyperX', 7500, ['gaming', 'audio'], '1618366712010-f4ae9c647dcb'),
    createProduct('Samsung 1TB T7 Portable SSD', 'Electronics', 'Samsung', 9500, ['storage', 'ssd'], '1607519106093-df8192a5bafc'),
    createProduct('SanDisk 128GB Ultra microSDXC Card', 'Electronics', 'SanDisk', 1100, ['storage', 'sd card'], '1607519106093-df8192a5bafc'),
    createProduct('Seagate Expansion 2TB External HDD', 'Electronics', 'Seagate', 5500, ['storage', 'hdd'], '1607519106093-df8192a5bafc'),
    createProduct('Kindle Paperwhite (16 GB)', 'Electronics', 'Amazon', 13999, ['ereader', 'reading'], '1512820790803-83c7347a4658'),
    createProduct('Apple Watch Series 9 (GPS, 41mm)', 'Electronics', 'Apple', 41900, ['wearables', 'smartwatch'], '1617043743527-380d3ce39cd4'),
    createProduct('Samsung Galaxy Watch 6 (Bluetooth, 40mm)', 'Electronics', 'Samsung', 29999, ['wearables', 'smartwatch'], '1617043743527-380d3ce39cd4'),
    createProduct('Noise ColorFit Pro 4 Smartwatch', 'Electronics', 'Noise', 2499, ['wearables', 'smartwatch'], '1617043743527-380d3ce39cd4'),
    createProduct('Garmin Forerunner 255 GPS Running Smartwatch', 'Electronics', 'Garmin', 37990, ['wearables', 'fitness'], '1617043743527-380d3ce39cd4'),
    createProduct('GoPro HERO12 Black Action Camera', 'Electronics', 'GoPro', 45000, ['camera', 'action'], '1516035069371-29a1b244cc32'),
    createProduct('DJI Osmo Mobile 6 Gimbal Stabilizer', 'Electronics', 'DJI', 13990, ['photography', 'gimbal'], '1516035069371-29a1b244cc32'),

    // ─── Fashion (25) ───
    createProduct('Levi\'s Men\'s 511 Slim Fit Jeans', 'Fashion', 'Levi\'s', 2500, ['clothing', 'mens', 'jeans'], '1542272201-b1e56750ce44'),
    createProduct('U.S. Polo Assn. Men\'s Solid Polo Neck T-Shirt', 'Fashion', 'USPA', 1200, ['clothing', 'mens', 'tshirt'], '1521572163474-6864f9cf17ab'),
    createProduct('Puma Men\'s Dazzler Sneakers', 'Fashion', 'Puma', 2200, ['footwear', 'mens', 'sneakers'], '1542291026-7eec264c27ff'),
    createProduct('Allen Solly Men\'s Regular Fit Shirt', 'Fashion', 'Allen Solly', 1600, ['clothing', 'mens', 'shirt'], '1596755095514-ce0ee8330761'),
    createProduct('Biba Women Printed Straight Kurta', 'Fashion', 'Biba', 1400, ['clothing', 'womens', 'kurta'], '1515886657613-9f3515b0c78f'),
    createProduct('Vero Moda Women\'s Skinny Fit Jeans', 'Fashion', 'Vero Moda', 2100, ['clothing', 'womens', 'jeans'], '1542272201-b1e56750ce44'),
    createProduct('H&M Women\'s Oversized Cotton T-Shirt', 'Fashion', 'H&M', 800, ['clothing', 'womens', 'tshirt'], '1521572163474-6864f9cf17ab'),
    createProduct('Adidas Women\'s Cloudfoam Pure Running Shoes', 'Fashion', 'Adidas', 3500, ['footwear', 'womens', 'running'], '1542291026-7eec264c27ff'),
    createProduct('Zaveri Pearls Kundan Choker Necklace Set', 'Fashion', 'Zaveri Pearls', 850, ['accessories', 'jewellery'], '1599643478524-ce3611ad1d3e'),
    createProduct('Fastrack Instinct Analog Men\'s Watch', 'Fashion', 'Fastrack', 1800, ['accessories', 'watch', 'mens'], '1524805022473-8cb298728a1c'),
    createProduct('Titan Raga Viva Analog Women\'s Watch', 'Fashion', 'Titan', 3200, ['accessories', 'watch', 'womens'], '1524805022473-8cb298728a1c'),
    createProduct('Caprese Women\'s Handbag (Pink)', 'Fashion', 'Caprese', 2400, ['accessories', 'bags', 'womens'], '1584916201218-f4242ceb4809'),
    createProduct('Lavie Women\'s Tote Bag (Black)', 'Fashion', 'Lavie', 1900, ['accessories', 'bags', 'womens'], '1584916201218-f4242ceb4809'),
    createProduct('Wildcraft 45L Trekking Backpack', 'Fashion', 'Wildcraft', 2600, ['accessories', 'bags', 'travel'], '1553062407912-28e46bc120ba'),
    createProduct('Nike Everyday Cushion Crew Socks (3 Pair)', 'Fashion', 'Nike', 600, ['accessories', 'socks'], '1585386959920-ca9780a80e07'),
    createProduct('Jockey Men\'s Cotton Innerwear Briefs', 'Fashion', 'Jockey', 450, ['clothing', 'mens', 'innerwear'], '1585386959920-ca9780a80e07'),
    createProduct('Enamor Women\'s Everyday T-Shirt Bra', 'Fashion', 'Enamor', 750, ['clothing', 'womens', 'innerwear'], '1585386959920-ca9780a80e07'),
    createProduct('Ray-Ban Aviator Classic Sunglasses', 'Fashion', 'Ray-Ban', 6500, ['accessories', 'eyewear'], '1511499767150-a48a237f0083'),
    createProduct('Fastrack UV Protected Square Sunglasses', 'Fashion', 'Fastrack', 900, ['accessories', 'eyewear'], '1511499767150-a48a237f0083'),
    createProduct('Peter England Men\'s Formal Trousers', 'Fashion', 'Peter England', 1600, ['clothing', 'mens', 'formal'], '1596755095514-ce0ee8330761'),
    createProduct('Van Heusen Men\'s Slim Fit Formal Shirt', 'Fashion', 'Van Heusen', 1800, ['clothing', 'mens', 'formal'], '1596755095514-ce0ee8330761'),
    createProduct('W for Woman Solid Palazzos', 'Fashion', 'W for Woman', 1200, ['clothing', 'womens', 'bottoms'], '1515886657613-9f3515b0c78f'),
    createProduct('Crocs Unisex Adult Classic Clogs', 'Fashion', 'Crocs', 2800, ['footwear', 'unisex', 'clogs'], '1542291026-7eec264c27ff'),
    createProduct('Woodland Men\'s Genuine Leather Wallet', 'Fashion', 'Woodland', 1500, ['accessories', 'wallet', 'mens'], '1628157588553-5eeea00af15c'),
    createProduct('HideSign Women\'s Leather Wallet', 'Fashion', 'Hidesign', 2200, ['accessories', 'wallet', 'womens'], '1628157588553-5eeea00af15c'),

    // ─── Home & Kitchen (25) ───
    createProduct('Prestige Pigeon Induction Base Pressure Cooker (3L)', 'Home & Kitchen', 'Prestige', 1200, ['cookware', 'pressure cooker'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Hawkins Contura Hard Anodised Aluminium Pressure Cooker (2L)', 'Home & Kitchen', 'Hawkins', 1150, ['cookware', 'pressure cooker'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Cello Opus Fine Edge Knives Set (3 pcs)', 'Home & Kitchen', 'Cello', 250, ['cutlery', 'knives'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Milton Thermosteel Flip Lid Flask 1L', 'Home & Kitchen', 'Milton', 850, ['drinkware', 'flask'], '1602143407151-7111542de6e8'),
    createProduct('Borosil Glass Lunch Box Set', 'Home & Kitchen', 'Borosil', 950, ['storage', 'lunch box'], '1602143407151-7111542de6e8'),
    createProduct('Tupperware Aquasafe Bottle Set (4 x 1L)', 'Home & Kitchen', 'Tupperware', 850, ['storage', 'bottles'], '1602143407151-7111542de6e8'),
    createProduct('Pigeon by Stovekraft Amaze Plus Electric Kettle 1.5L', 'Home & Kitchen', 'Pigeon', 650, ['appliances', 'kettle'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Philips HL7756/00 Mixer Grinder 750W', 'Home & Kitchen', 'Philips', 3800, ['appliances', 'mixer'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Bajaj Majesty DX 11 1000W Dry Iron', 'Home & Kitchen', 'Bajaj', 600, ['appliances', 'iron'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Wonderchef Nutri-Blend, 22000 RPM Mixer Grinder', 'Home & Kitchen', 'Wonderchef', 2700, ['appliances', 'mixer'], '1588195538328-c5b3bf1be9bc'),
    createProduct('Bombay Dyeing 100% Cotton Double Bedsheet', 'Home & Kitchen', 'Bombay Dyeing', 1200, ['bedding', 'bedsheet'], '1522771739844-6a9f6d5f14af'),
    createProduct('Spaces Atrium 100% Cotton Single Blanket', 'Home & Kitchen', 'Spaces', 2500, ['bedding', 'blanket'], '1522771739844-6a9f6d5f14af'),
    createProduct('Swayam Cotton Blend Window Curtain Set of 2', 'Home & Kitchen', 'Swayam', 900, ['furnishing', 'curtains'], '1522771739844-6a9f6d5f14af'),
    createProduct('Wakefit Orthopedic Memory Foam Mattress', 'Home & Kitchen', 'Wakefit', 12000, ['furniture', 'mattress'], '1522771739844-6a9f6d5f14af'),
    createProduct('Nayasa Floral Plastic Laundry Basket', 'Home & Kitchen', 'Nayasa', 450, ['storage', 'laundry'], '1584824419619-3c72b8d002c9'),
    createProduct('Cello Checkers Pet Plastic Container Set (18 pcs)', 'Home & Kitchen', 'Cello', 800, ['storage', 'containers'], '1602143407151-7111542de6e8'),
    createProduct('Signoraware Executive Lunch Box Mini', 'Home & Kitchen', 'Signoraware', 350, ['storage', 'lunch box'], '1602143407151-7111542de6e8'),
    createProduct('Joyo Plastic Bathroom Set (Bucket, Mug, Stool)', 'Home & Kitchen', 'Joyo', 600, ['bathroom', 'plasticware'], '1584824419619-3c72b8d002c9'),
    createProduct('Status Striped Microfiber Bath Mat', 'Home & Kitchen', 'Status', 300, ['bathroom', 'mat'], '1522771739844-6a9f6d5f14af'),
    createProduct('Solimo 100% Cotton Bath Towel (Blue/Green)', 'Home & Kitchen', 'Solimo', 500, ['bathroom', 'towel'], '1522771739844-6a9f6d5f14af'),
    createProduct('Godrej Aer Matic Room Freshener Dispenser', 'Home & Kitchen', 'Godrej', 550, ['freshener', 'air'], '1584824419619-3c72b8d002c9'),
    createProduct('Asian Paints Viroprotect Anti-Viral Room Spray', 'Home & Kitchen', 'Asian Paints', 250, ['cleaning', 'spray'], '1584824419619-3c72b8d002c9'),
    createProduct('Eveready Rechargeable Study Lamp', 'Home & Kitchen', 'Eveready', 950, ['lighting', 'lamp'], '1513506003901-1e6a22fa6fc4'),
    createProduct('Wipro 9W B22 LED Smart Bulb (WiFi Enabled)', 'Home & Kitchen', 'Wipro', 600, ['lighting', 'smart bulb'], '1513506003901-1e6a22fa6fc4'),
    createProduct('Story@Home Solid Wooden Wall Shelf Set of 3', 'Home & Kitchen', 'Story@Home', 850, ['furniture', 'shelf'], '1522771739844-6a9f6d5f14af'),
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

        // Insert new expanded catalog
        const result = await Product.insertMany(productData);
        console.log(`🛒 Inserted ${result.length} products`);

        console.log('\n📦 Products by category:');
        const categories = {};
        productData.forEach(p => {
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
