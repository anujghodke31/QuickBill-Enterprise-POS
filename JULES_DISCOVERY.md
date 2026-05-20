# Discovery Report: QuickBill POS

## 1. P0 Command Errors
- **`npm install`**: Ran successfully but showed 6 vulnerabilities (3 moderate, 3 high) in the root and 10 vulnerabilities (4 moderate, 5 high, 1 critical) in the `client/` folder.
- **`npm run dev`**: Failed to start the backend with `Error: Cannot find module 'bcryptjs'` in `server/models/User.js`. The package `bcrypt` is in `package.json`, but the code requires `bcryptjs`.
- **`node server/seed.js`**: Failed with `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017` because MongoDB was not running. Additionally, the script uses `Product.deleteMany({})` and `Product.insertMany()` instead of idempotent upserts with `barcode`/`sku`, which violates the P0 requirement for idempotency.
- **`docker build -t quickbill-pos .`**: Failed with an error `failed to solve: mount source: "overlay"... err: invalid argument` during the `WORKDIR /usr/src/app` step.

## 2. Dependency Advisories (`npm audit --omit=dev`)
**Root:**
- `ip-address` (moderate) - XSS in Address6 HTML-emitting methods
- `path-to-regexp` (high) - Regular Expression Denial of Service via multiple route parameters

**Client (`client/`):**
- `@protobufjs/utf8` (moderate) - Overlong UTF-8 decoding
- `protobufjs` (critical) - Multiple arbitrary code execution, denial of service, and prototype pollution vulnerabilities.

## 3. Frontend Reconcilation Recommendation
- **Status:** Both frontends exist. The repository root contains `index.html`, `app.js`, and `style.css` (a Vanilla JS SPA). Meanwhile, the `client/` folder contains a full Vite + React application. Interestingly, `server/index.js` is currently configured to serve `../client/dist` in production, ignoring the root `index.html`.
- **Recommendation:** I recommend making the **Vite + React app (`client/`)** the canonical frontend, as it aligns with the backend's static file serving logic and offers better scalability. The root `index.html`, `app.js`, and `style.css` should be deleted to prevent confusion. If the Vanilla app must be kept, `client/` should be deleted and `server/index.js` updated to serve the root folder.

## 4. `Customer` Model Routes Status
- **Status:** The routes **are fully wired**. `server/routes/customerRoutes.js` exists, has full CRUD operations (`GET`, `POST`, `PUT`, `DELETE`), and is imported/mounted in `server/index.js` at `/api/customers`.
- **Recommendation:** Keep the customer feature and leave the README claim intact, as the feature is completely implemented.

## 5. Currency Float Usage
Currency is dangerously handled using floating-point `Number` types in the following files:
- `server/models/Invoice.js` (lines 18, 20, 22, 27, 31, 40, 41)
- `server/models/Product.js` (lines 26, 31, 36)
- `server/models/Return.js` (lines 15, 20, 48)
- `server/models/Order.js` (line 18)
- `server/models/Customer.js` (lines 19, 23)
- `server/controllers/invoiceController.js` (lines 14, 16, 96, 101)
- `server/controllers/returnController.js` (lines 30, 153, 158)
- `server/controllers/orderController.js` (lines 134, 141)
- `server/controllers/productController.js` (various price filter/assignment lines)
- `server/utils/receiptGenerator.js` (line 40)
- `server/seed.js` and `server/seed-dummyjson.js`

## 6. API Routes Without Input Validation
None of the API routes use `express-validator` or robust input validation. All of the following route files pass raw `req.body` data directly to controllers:
- `server/routes/authRoutes.js`
- `server/routes/productRoutes.js`
- `server/routes/customerRoutes.js`
- `server/routes/supplierRoutes.js`
- `server/routes/returnRoutes.js`
- `server/routes/invoiceRoutes.js`
- `server/routes/employeeRoutes.js`
- `server/routes/orderRoutes.js`

## 7. Proposed Ordered List of PRs
1. **P0: Fix environment and build issues** (Fix `bcryptjs` bug, fix Dockerfile `WORKDIR` issue, update `seed.js` to use idempotent upserts, add `.nvmrc` for Node engines).
2. **P0: Reconcile Dual Frontend** (Delete the root vanilla JS files if `client/` is canonical, or vice-versa, and update `README.md` and `server/index.js` accordingly).
3. **P1: Integer Math for Currency** (Refactor Mongoose models and controllers to store/calculate currency in paise instead of floats).
4. **P1: Security Hardening & Auth** (Add `express-validator` to all routes, fix `npm audit` advisories, harden JWT/bcrypt, add Helmet strict CSP, configure explicit CORS).
5. **P1: Concurrency Safe Checkout** (Add idempotency keys and transactional `$gte` stock decrementing in `invoiceController.js`).
6. **P3: Backend Quality** (Add structured logging, standardized error middleware, `/health` endpoint, and pagination).
7. **P2: Frontend Quality** (A11y fixes, keyboard shortcuts, Web Audio lazy-init, responsive POS fixes).
8. **P4: DX & Repo Hygiene** (Setup Husky, lint-staged, GitHub Actions CI, `.env.example`, and `CONTRIBUTING.md`).

## 8. Ambiguities for Clarification (For Anuj)
- **Frontend Choice:** Which frontend should be canonical? The Vite React app or the Vanilla SPA? (I've assumed Vite, but please confirm).
- **MongoDB Transactions:** To fix the concurrency checkout issues, we need to wrap the invoice and stock updates in a transaction. This requires a MongoDB Replica Set. Should I update the Docker setup/README to assume/require a Replica Set for local development?
- **Currency Migration:** When moving to integer minor units (paise), should I write a migration script for existing data, or is it acceptable to assume a clean database for this update?