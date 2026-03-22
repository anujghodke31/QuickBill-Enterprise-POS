const xss = require('xss');

/**
 * Deeply recursively sanitizes all string properties on an object using 'xss' library
 * to prevent Stored & Reflected Cross-Site Scripting (XSS).
 */
const cleanNode = (node) => {
    if (typeof node === 'string') {
        return xss(node);
    }
    
    if (Array.isArray(node)) {
        return node.map(cleanNode);
    }
    
    if (node !== null && typeof node === 'object') {
        Object.keys(node).forEach((key) => {
            node[key] = cleanNode(node[key]);
        });
    }
    
    return node;
};

const xssClean = (req, res, next) => {
    if (req.body) req.body = cleanNode(req.body);
    if (req.query) req.query = cleanNode(req.query);
    if (req.params) req.params = cleanNode(req.params);
    next();
};

module.exports = { xssClean };
