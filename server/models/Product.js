const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            unique: true,
            index: true
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
            default: 'General',
            index: true
        },

        brand: {
            type: String,
            trim: true,
            default: '',
            index: true
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
            average: {
                type: Number,
                default: 0,
                min: 0,
                max: 5
            },
            count: {
                type: Number,
                default: 0,
                min: 0
            }
        },

        isPublished: {
            type: Boolean,
            default: false,
            index: true
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
        }
    },
    {
        timestamps: true   // 🔥 Auto adds createdAt & updatedAt
    }
);



// =============================
// 🔥 MIDDLEWARE
// =============================

// Auto-generate slug
productSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

// Ensure compareAtPrice > price
productSchema.pre('save', function (next) {
    if (this.compareAtPrice && this.compareAtPrice <= this.price) {
        this.compareAtPrice = null;
    }
    next();
});


// =============================
// 🔥 INDEXES
// =============================

// Full-text search
productSchema.index({
    name: 'text',
    description: 'text',
    brand: 'text',
    tags: 'text'
});

// Stock index (for low stock alert queries)
productSchema.index({ stock: 1, lowStockThreshold: 1 });

module.exports = mongoose.model('Product', productSchema);