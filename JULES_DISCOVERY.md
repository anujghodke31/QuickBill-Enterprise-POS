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
**Recommendation:** The problem description mentions "Treat reconciling this dual-frontend situation as a P0 task." and that the main repo is mid-migration to the Vite client. Since `client/` is already partially wired up in `server/index.js` to serve the static built files in production (`app.use(express.static(clientDist));`), I recommend keeping the Vite application in `client/` as the canonical frontend going forward. We will need to make sure the vanilla JS frontend is fully removed and all references to it are updated, or if both are required for some reason, they are completely segregated. Based on typical migrations, replacing the vanilla one is the goal. For now, since the README only details the vanilla one, we will delete the vanilla one (`index.html`, `app.js`, `style.css`) and make `client/` the main one. I will verify this with the user.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`. The routes exist in `server/routes/customerRoutes.js` and `server/controllers/customerController.js` and they are already mounted in `server/index.js`. Thus, the routes are wired.

## 5. Currency Math
The following files define `Number` fields for money and will need to be refactored to use integer minor units (paise), instead of JS floating point arithmetic.

`server/models/Customer.js`:
- `totalSpent` (Number) - Line 23

`server/models/Invoice.js`:
- `price` (Number) - Line 18
- `subTotal` (Number) - Line 20
- `taxAmount` (Number) - Line 27
- `discountAmount` (Number) - Line 31
- `total` (Number) - Line 22
- `cashGiven` (Number) - Line 40
- `changeReturned` (Number) - Line 41

`server/models/Product.js`:
- `price` (Number) - Line 26
- `costPrice` (Number) - Line 31
- `discount` (Number) - Line 36

`server/models/Return.js`:
- `refundAmount` (Number) - Line 20
- `restockingFee` (Number) - Line 48

`server/models/Order.js`:
- `price` (Number) - Line 18
- `totalAmount` (Number) - Line 22

Note: Code in `server/controllers/invoiceController.js` likely does floating-point math when saving an invoice. We need to refactor it to do calculations in minor units.

## 6. Input Validation
Currently, routes receive `req.body` but do not seem to use `express-validator` to strictly validate inputs before controller logic execution. We need to add `express-validator` checks to `server/routes/*.js`.
Files needing validation:
- `server/controllers/employeeController.js` - `req.body` is extracted at lines 23, 53.
- `server/controllers/returnController.js` - `req.body` is extracted at line 93.
- `server/controllers/orderController.js` - `req.body` is extracted at lines 7, 95.
- `server/controllers/authController.js` - `req.body` is extracted at lines 55, 95, 151, 230, 253, 272.
- `server/controllers/invoiceController.js` - `req.body` is extracted at line 54.
- `server/controllers/productController.js` - `req.body` is extracted at lines 110, 146.
- `server/controllers/supplierController.js` - `req.body` is extracted at lines 18, 45.
- `server/controllers/customerController.js` - `req.body` is extracted at lines 18, 49.

ObjectId validation is also missing for `req.params.id` across various controllers. (e.g. `server/controllers/employeeController.js` line 60, `server/controllers/orderController.js` line 76, `server/controllers/customerController.js` line 41).

## 7. Proposed PRs
1. **P0 - Fix Server Boot**: Update `server/models/User.js` to require `bcrypt` instead of `bcryptjs` (which is missing, but `bcrypt` is in package.json). Fix seeder `connect ECONNREFUSED` issue (and make it idempotent). Pin Node engines in package.json.
2. **P0 - Docker and Client**: Fix docker build 429 error by changing the base image or using a different registry mirror if possible. Decide on the frontend and delete the old vanilla files.
3. **P0/P1 - Route Error Handling & Validation**: Add `express-validator` to all public POST/PUT routes. Add MongoDB ObjectId guards on all `/:id` routes.
4. **P1 - Security & Auth**: Fix bcrypt rounds, JWT TTL, rate limiting, helmet CSP, etc.
5. **P1 - Money Math**: Convert all money-related fields to integer minor units (paise).

## 8. Ambiguities
- For the dual frontend situation, should we completely delete `index.html`, `app.js`, and `style.css` at the root and focus solely on `client/`?
- The Docker build fails with a 429 Too Many Requests from Docker Hub. Should I just change the base image from `node:18-alpine` to something like `public.ecr.aws/docker/library/node:18-alpine` to bypass the Docker Hub rate limit?
