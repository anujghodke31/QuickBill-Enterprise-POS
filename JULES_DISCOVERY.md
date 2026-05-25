# Jules Discovery Report

## 1. P0 Errors Encountered

*   **`npm install`**: Ran with `11 vulnerabilities (8 moderate, 3 high)`.
*   **`npm audit --omit=dev` at root**: Reports 8 vulnerabilities (7 moderate, 1 high) in `ip-address`, `path-to-regexp`, `qs`, and `uuid`.
*   **`cd client && npm audit --omit=dev`**: Reports 2 vulnerabilities (1 moderate, 1 critical) in `protobufjs` and `@protobufjs/utf8`.
*   **`npm run dev`**: Server throws exceptions because of missing `mongodb-memory-server` or `MONGO_URI`.
*   **`node server/seed.js`**: Fails with `Seed failed: connect ECONNREFUSED 127.0.0.1:27017` when MongoDB is not running. When MongoDB is running, it fails with `Seed failed: Product validation failed: user: Path 'user' is required.` because the `Product` schema requires a `user` ObjectId, but the seed data does not provide one. Also, `seed.js` is not idempotent (it clears all products before inserting, which deletes user-added products).
*   **Docker Build**: Fails with `ERROR: mount source: "overlay"...` due to a bad Dockerfile layer caching or missing `.dockerignore`.

## 2. Dependency Advisories

**Root `package.json` (`npm audit --omit=dev`)**:
*   `path-to-regexp` (<0.1.13) - High - ReDoS
*   `qs` (6.11.1 - 6.15.1) - Moderate - DoS
*   `ip-address` (<=10.1.0) - Moderate - XSS
*   `uuid` (<11.1.1) - Moderate - Bounds check

**Client `package.json` (`cd client && npm audit --omit=dev`)**:
*   `protobufjs` (<=7.5.7) - Critical - RCE, DoS, Prototype Pollution
*   `@protobufjs/utf8` (<=1.1.0) - Moderate - Overlong UTF-8 decoding

## 3. Canonical Frontend Recommendation

The `client/` directory exists and is a Vite/React application. It contains modern components, routing, and a build setup. It successfully builds (`npm run build` runs Vite and puts the output in `client/dist`). The backend `server/index.js` already has code to serve `client/dist`.

**Recommendation**: The `client/` Vite app should be the canonical frontend. The vanilla `index.html`, `app.js`, and `style.css` at the root are legacy and should be deprecated/removed to eliminate the dual-frontend confusion.

## 4. Customer Routes Status

The `Customer` model has fully wired routes in `server/routes/customerRoutes.js` and a controller in `server/controllers/customerController.js`. It is connected to the Express app in `server/index.js` via `app.use('/api/customers', ...)`.

**Recommendation**: The README correctly claims customer management is a feature. Do not remove it.

## 5. Floating-Point Currency Math

Currency and quantities are handled as floats (using `Number()`) in multiple critical paths:
*   `server/controllers/returnController.js`: Lines 15, 30, 33, 115, 153, 158.
*   `server/controllers/invoiceController.js`: Lines 70, 96, 101, 115.
*   `server/controllers/productController.js`: Lines 34, 35, 52, 54, 60, 61.
*   `server/utils/receiptGenerator.js`: Lines 3, 40, 50.
*   `server/seed.js`: Line 19.

## 6. Missing Validation

None of the API routes currently use `express-validator`. We need to add strict validation to all public POST/PUT endpoints.

## 7. Proposed Order of PRs

1.  **Fix npm audits and Docker**: Update dependencies in root and `client/` to fix all audit advisories. Add `.dockerignore` and fix the `Dockerfile` build.
2.  **Fix seed script and idempotency**: Update `server/seed.js` to create a dummy user to satisfy the `user` reference, and use `bulkWrite` with `upsert` based on `barcode` instead of `deleteMany`.
3.  **Establish canonical frontend**: Remove `index.html`, `style.css`, and `app.js` at the root. Update `README.md` to reflect that the `client/` Vite app is the only frontend.
4.  **Currency math refactor**: Convert all schemas and controllers to use integer minor units (paise) for money fields (`price`, `subTotal`, `tax`, `discount`, `total`).
5.  **Input validation & Security**: Add `express-validator` to all routes. Add helmet strict CSP, rate limiting, and ObjectId guards.
6.  **Concurrency-safe checkout**: Refactor `invoiceController` to use `findOneAndUpdate` for atomic stock decrement and support `idempotencyKey`.

## 8. Ambiguities requiring clarification

*   Can we safely delete `index.html`, `style.css`, and `app.js` at the root entirely, or do they contain specific logic/styles that need to be migrated into the React app first?
