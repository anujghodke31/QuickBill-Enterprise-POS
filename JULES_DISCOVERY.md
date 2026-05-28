# JULES_DISCOVERY.md

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
(node:5060) [DEP0040] DeprecationWarning: The \`punycode\` module is deprecated. Please use a userland alternative instead.
(Use \`node --trace-deprecation ...\` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
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

**docker build:**
```
ERROR: failed to build: failed to solve: node:18-alpine: failed to resolve source metadata for docker.io/library/node:18-alpine: failed to copy: httpReadSeeker: failed open: unexpected status from GET request to https://registry-1.docker.io/v2/library/node/manifests/sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e: 429 Too Many Requests
```

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
**Recommendation:** The problem description mentions "Treat reconciling this dual-frontend situation as a P0 task." and that the main repo is mid-migration to the Vite client. Since `client/` is already partially wired up in `server/index.js` to serve the static built files in production (`app.use(express.static(clientDist));`), I recommend keeping the Vite application in `client/` as the canonical frontend going forward. We will need to make sure the vanilla JS frontend is fully removed and all references to it are updated, or if both are required for some reason, they are completely segregated. Based on typical migrations, replacing the vanilla one is the goal. For now, since the README only details the vanilla one, we will delete the vanilla one (`index.html`, `app.js`, `style.css`) and make `client/` the main one.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`. The routes exist in `server/routes/customerRoutes.js` and `server/controllers/customerController.js` and they are already mounted in `server/index.js`.
**Recommendation:** The feature is implemented. The README mentions it, but it should be explicitly listed in the API Endpoints section. We will add the `/api/customers` routes to the README.

## 5. Currency Math (Floating-point vs Integer)
The following files define `Number` fields for money and will need to be refactored to use integer minor units (paise), instead of JS floating point arithmetic.

`server/models/Customer.js`:
- `totalSpent` (Line 23)

`server/models/Invoice.js`:
- `price` (Line 18)
- `subTotal` (Line 20)
- `total` (Line 22)
- `taxAmount` (Line 27)
- `discountAmount` (Line 31)
- `cashGiven` (Line 40)
- `changeReturned` (Line 41)

`server/models/Product.js`:
- `price` (Line 26)
- `costPrice` (Line 31)
- `discount` (Line 36)

`server/models/Return.js`:
- `refundAmount` (Line 20)
- `restockingFee` (Line 48)

`server/models/Order.js`:
- `price` (Line 18)
- `totalAmount` (Line 22)

## 6. Input Validation
Currently, routes receive `req.body` but do not seem to use `express-validator` to strictly validate inputs before controller logic execution. We need to add `express-validator` checks to `server/routes/*.js`.

Files extracting data from `req.body` without comprehensive route-level validation:
- `server/controllers/employeeController.js` (Lines 23, 53)
- `server/controllers/returnController.js` (Line 93)
- `server/controllers/orderController.js` (Lines 7, 95)
- `server/controllers/authController.js` (Lines 55, 95, 151, 230, 253, 272)
- `server/controllers/invoiceController.js` (Line 54)
- `server/controllers/productController.js` (Lines 110, 146)
- `server/controllers/supplierController.js` (Lines 18, 45)
- `server/controllers/customerController.js` (Lines 18, 49)

ObjectId validation is also missing for `req.params.id` across various controllers (e.g. `server/controllers/employeeController.js` line 60, `server/controllers/orderController.js` line 76, `server/controllers/customerController.js` line 41).

## 7. Proposed Follow-up PRs
- **P0 - Fix Server Boot:** Update `server/models/User.js` to require `bcrypt` instead of `bcryptjs` (which is missing). Fix seeder `connect ECONNREFUSED` issue and make it idempotent. Pin Node engines in `package.json`.
- **P0 - Reconcile Dual Frontend & Docker:** Make `client/` the canonical frontend, remove vanilla files (`index.html`, `app.js`, `style.css`), update `README.md`. Fix docker build 429 error by changing the base image registry or base.
- **P0/P1 - Route Error Handling & Validation:** Add `express-validator` to all public POST/PUT routes. Add MongoDB ObjectId guards on all `/:id` routes. Standardize error handling responses.
- **P1 - Security & Auth:** Implement bcrypt ≥ 12 rounds, JWT TTL/cookie changes, strict CSP, global rate limiting, and secure token validation.
- **P1 - Money Math Refactor:** Convert all money-related fields to integer minor units (paise) across schemas and controllers.
- **P1 - Concurrency & Idempotency:** Update checkout flow to use atomic stock decrements and idempotency keys to prevent double-charging.

## 8. Ambiguities
- For the dual frontend situation, I am planning to completely delete `index.html`, `app.js`, and `style.css` at the root and focus solely on `client/`. Is this acceptable, or should both co-exist for now (e.g. vanilla on `/`, Vite on `/app`)?
- The Docker build fails with a 429 Too Many Requests from Docker Hub. Should I just change the base image from `node:18-alpine` to an alternative public registry (like `public.ecr.aws/docker/library/node:18-alpine`) to bypass the Docker Hub rate limit?
