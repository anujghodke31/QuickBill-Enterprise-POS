/**
 * Hierarchical category structure — like Amazon/Flipkart.
 * Each top-level key is a "department" shown in the main nav/tabs.
 * The array values are the specific subcategories stored on each product.
 */
export const CATEGORY_TREE = {
    'Groceries & Food': [
        'Fruits & Vegetables',
        'Dairy & Eggs',
        'Snacks & Beverages',
        'Staples & Oils',
        'Bakery & Sweets',
    ],
    'Fashion': [
        "Men's Clothing",
        "Women's Clothing",
        "Men's Footwear",
        "Women's Footwear",
        'Kids Fashion',
        'Accessories',
    ],
    'Electronics': [
        'Mobiles & Tablets',
        'Laptops & Computers',
        'Audio & Headphones',
        'TV & Home Theatre',
        'Cameras & Accessories',
        'Wearables',
    ],
    'Home & Kitchen': [
        'Cookware & Appliances',
        'Furniture & Decor',
        'Bedding & Bath',
        'Cleaning Supplies',
        'Storage & Organization',
    ],
    'Personal Care': [
        'Skin Care',
        'Hair Care',
        'Bath & Body',
        'Oral Care',
        'Fragrances',
        'Men\'s Grooming',
    ],
    'Baby & Kids': [
        'Baby Care',
        'Baby Food',
        'Toys & Games',
        'Kids Education',
        'Diapers & Wipes',
    ],
    'Sports & Fitness': [
        'Exercise & Fitness',
        'Outdoor & Adventure',
        'Sports Accessories',
        'Cycling',
    ],
    'Health & Wellness': [
        'Vitamins & Supplements',
        'Medical Supplies',
        'Ayurvedic & Herbal',
        'First Aid',
    ],
}

/** Flat sorted list of ALL subcategories (used for DB filtering) */
export const ALL_SUBCATEGORIES = Object.values(CATEGORY_TREE).flat()

/** Parent department names */
export const DEPARTMENTS = Object.keys(CATEGORY_TREE)

/**
 * Given a subcategory, return the parent department name.
 * Returns the subcategory itself if no parent is found.
 */
export function getDepartment(subcategory) {
    for (const [dept, subs] of Object.entries(CATEGORY_TREE)) {
        if (subs.includes(subcategory)) return dept
    }
    return subcategory
}
