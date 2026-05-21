# JULES_DISCOVERY

## 1. Errors Found
### `npm run dev` Error
```
[0] node:internal/modules/cjs/loader:1386
[0]   throw err;
[0]   ^
[0]
[0] Error: Cannot find module 'bcryptjs'
[0] Require stack:
[0] - /app/server/models/User.js
[0] - /app/server/middleware/authMiddleware.js
[0] - /app/server/routes/productRoutes.js
[0] - /app/server/index.js
[0]     at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
[0]     at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
[0]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
[0]     at Function._load (node:internal/modules/cjs/loader:1192:37)
[0]     at TracingChannel.traceSync (node:diagnostics_channel:328:14)
[0]     at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
[0]     at Module.require (node:internal/modules/cjs/loader:1463:12)
[0]     at require (node:internal/modules/helpers:147:16)
[0]     at Object.<anonymous> (/app/server/models/User.js:53:16)
[0]     at Module._compile (node:internal/modules/cjs/loader:1705:14) {
[0]   code: 'MODULE_NOT_FOUND',
[0]   requireStack: [
[0]     '/app/server/models/User.js',
[0]     '/app/server/middleware/authMiddleware.js',
[0]     '/app/server/routes/productRoutes.js',
[0]     '/app/server/index.js'
[0]   ]
[0] }
[0]
[0] Node.js v22.22.1
[0] [nodemon] app crashed - waiting for file changes before starting...
```

### `npm install` Warnings
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
```

### `node server/seed.js` Error
```
(node:9251) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

## 2. Dependency Advisories from `npm audit`
### Root `package.json`:
* `ip-address` <= 10.1.0 (moderate): XSS in Address6 HTML-emitting methods
* `path-to-regexp` < 0.1.13 (high): ReDoS via multiple route parameters
* `uuid` < 11.1.1 (moderate): Missing buffer bounds check

### `client/package.json`:
* `@protobufjs/utf8` <= 1.1.0 (moderate): Overlong UTF-8 decoding
* `protobufjs` <= 7.5.7 (critical): Multiple vulnerabilities including RCE, prototype pollution, DoS

## 3. Dual Frontend Status
* The `client/` directory exists and appears to be a React/Vite app. It has its own `package.json` and a `vite.config.js`.
* At the repo root, there is an `index.html`, `style.css`, and `app.js` which represent a vanilla HTML/JS SPA.
* **Recommendation:** Given the presence of the `client/` Vite app which is likely meant to be the future, but the root `index.html` is the current working version based on `README.md`, I recommend we keep the vanilla frontend for now as the canonical one until the Vite app is feature-complete. The client can remain, but its env vars in `README.md` should probably be moved to a `client/README.md` to avoid confusion.

## 4. Customer Routes Status
* `server/models/Customer.js` exists.
* `server/routes/customerRoutes.js` exists.
* `server/controllers/customerController.js` exists.
* They are actually mounted in `server/index.js:98` (`app.use('/api/customers', protect, apiLimiter, customerRoutes);`).

## 5. Currency Math with Floating-Point `number`
* `server/models/Invoice.js`: line 17 (`quantity`), 18 (`price`), 20 (`subTotal`), 22 (`taxAmount`), 27 (`discount`), 31 (`total`), 40 (`cashGiven`), 41 (`changeReturned`).
* `server/models/Product.js`: line 26 (`price`), 31 (`costPrice`), 36 (`taxRate`).
* `server/models/Return.js`: line 15 (`refundAmount`), 20 (`restockingFee`).
* `server/models/Order.js`: line 18 (`price`), 22 (`totalAmount`).

## 6. Unvalidated API Routes
* `server/controllers/employeeController.js`: lines 23, 53
* `server/controllers/returnController.js`: line 93
* `server/controllers/orderController.js`: lines 7, 95
* `server/controllers/authController.js`: lines 55, 95, 151, 230, 253, 272
* `server/controllers/invoiceController.js`: line 54
* `server/controllers/productController.js`: lines 110, 146
* `server/controllers/supplierController.js`: lines 18, 45
* `server/controllers/customerController.js`: lines 18, 49

## 7. Proposed Follow-up PRs
1. **Fix `npm run dev` crash:** Fix missing `bcryptjs` dependency. Pin node engines.
2. **Audit & fix dependencies:** Address npm audit vulnerabilities in both root and `client/`.
3. **Fix Containerization & Seeder:** Fix Docker build and make seeder idempotent.
4. **Fix Float Currency & Validation:** Change float math to integers and add `express-validator` to API routes.
5. **Reconcile Frontend:** Update `README.md` to clarify the vanilla vs. Vite frontend state.

## 8. Clarifications needed from Anuj
* Should we completely delete the `client/` directory if we are treating the vanilla SPA as canonical, or should we keep it as a WIP?
* For the float-to-integer currency migration, should we create a migration script for existing data in the DB?
