const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    barcode: {
        type: String,
        unique: true,
        sparse: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    compareAtPrice: {
        type: Number,
        default: null,
        min: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    category: {
        type: String,
        default: 'General'
    },
    brand: {
        type: String,
        trim: true,
        default: ''
    },
    images: {
        type: [String],
        default: []
    },
    tags: {
        type: [String],
        default: []
    },
    ratings: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0, min: 0 }
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },
    manufacturingDate: {
        type: Date,
        default: null
    },
    expiryDate: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

productSchema.add({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('Product', productSchema);
