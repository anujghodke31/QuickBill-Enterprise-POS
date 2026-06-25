# Jules Discovery

## 1. P0 Errors

**npm install at root:**
```
11 vulnerabilities (8 moderate, 3 high)
```

**npm install in client/:**
```
10 vulnerabilities (4 moderate, 5 high, 1 critical)
```

**node server/seed.js:**
```
(node:5060) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017

And also missing user field on Product models.
```

**npm run dev:**
```
Error: Cannot find module 'bcryptjs'
Require stack:
- /app/server/models/User.js
- /app/server/middleware/authMiddleware.js
- /app/server/routes/productRoutes.js
- /app/server/index.js
```
*Note:* The codebase fails when using `bcrypt` vs `bcryptjs`. Also fails on EADDRINUSE if the server runs in background. Requires `npm install` and correct MongoDB instance port configs.

**docker build:**
```
ERROR: failed to build: failed to solve: node:18-alpine: failed to resolve source metadata for docker.io/library/node:18-alpine: failed to copy: httpReadSeeker: failed open: unexpected status from GET request to https://registry-1.docker.io/v2/library/node/manifests/sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e: 429 Too Many Requests
```
Also `docker build -t quickbill-pos .` fails when run with DOCKER_BUILDKIT due to overlayfs cachemount errors in the provided environment.

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `ip-address` (moderate)
- `path-to-regexp` (high)
- `qs` (moderate)
- `uuid` (moderate)

**Client `npm audit --omit=dev`:**
- `@protobufjs/utf8` (moderate)
- `protobufjs` (critical)

## 3. Dual Frontend Status
The `client/` directory exists and is a Vite/React application.
**Recommendation:** We will treat the `client/` React app as canonical, and fully remove `index.html`, `app.js`, `style.css` and `replace_colors.js` at the root, along with updating references in `README.md`.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`. The routes exist in `server/routes/customerRoutes.js` and `server/controllers/customerController.js` and they are actively mounted in `server/index.js`.
**Recommendation:** Keep the feature and just ensure inputs are validated correctly.

## 5. Currency Math
The following files define `Number` fields for money and compute floating point operations that need to be refactored to use integer minor units (paise).

- `server/models/Customer.js`: line 17 (`totalSpent`)
- `server/models/Invoice.js`: line 12 (`price`), line 14 (`subTotal`), line 15 (`discount`), line 20 (`tax`), line 24 (`totalAmount`), line 30 (`cashGiven`), line 31 (`changeReturned`)
- `server/models/Product.js`: line 17 (`price`), line 22 (`compareAtPrice`)
- `server/models/Return.js`: line 17 (`price`), line 31 (`refundAmount`)
- `server/models/Order.js`: line 14 (`price`), line 17 (`totalAmount`)
- `server/controllers/invoiceController.js`: lines 96, 108, 109, 133
- `server/controllers/productController.js`: search filters use `Number` for min/max prices (line 25, 26).

## 6. Input Validation
Currently, routes receive `req.body` but do not seem to use `express-validator` to strictly validate inputs before controller logic execution.
Files extracting `req.body` without validation middleware routing:
- `server/controllers/employeeController.js` lines 23, 53
- `server/controllers/returnController.js` line 93
- `server/controllers/orderController.js` lines 7, 95
- `server/controllers/authController.js` lines 55, 95, 151, 230, 253, 272
- `server/controllers/invoiceController.js` line 54
- `server/controllers/productController.js` lines 110, 146
- `server/controllers/supplierController.js` lines 18, 45
- `server/controllers/customerController.js` lines 18, 49

ObjectId validation is also missing for `req.params.id` across:
- `server/controllers/employeeController.js` lines 56, 60, 106, 111
- `server/controllers/orderController.js` lines 76, 92
- `server/controllers/invoiceController.js` line 211
- `server/controllers/productController.js` lines 74, 149
- `server/controllers/supplierController.js` lines 48, 76
- `server/controllers/customerController.js` lines 41, 65

## 7. Proposed PRs
1. **P0 - Boot & Build Fixes**: Fix seeder idempotent upserts and connection issues. Delete legacy vanilla JS UI files and update README. Update Docker build to use `.dockerignore` and Node 20.
2. **P1 - Input Validations**: Implement `express-validator` across all POST/PUT routes and `isMongoId` on `/:id` routes. Add helmet CSP. Add `/health` route.
3. **P1 - Security & Money Math**: Convert all money fields/math to paise integers (minor units) with inventory checkout transactions and idempotency keys. Change bcrypt rounds to 12. Fix JWT TTLs.

## 8. Ambiguities
- The Docker build fails with a cache mount error locally; I will assume we should create a standard `.dockerignore` and update to `node:20-alpine` without the broken cache layer.
- I assume we should remove `index.html`, `app.js` and `style.css` in the first PR.
