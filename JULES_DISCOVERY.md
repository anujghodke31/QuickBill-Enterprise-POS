# Jules Discovery Report

## 1. P0 Errors Encountered

**A. `npm install` Root Errors**
```
added 240 packages, and audited 241 packages in 9s
11 vulnerabilities (8 moderate, 3 high)
```
Failed to resolve `bcryptjs` module when running dev server:
```
Error: Cannot find module 'bcryptjs'
Require stack:
- /app/server/models/User.js
```

**B. `client` Directory Errors**
```
added 247 packages, and audited 248 packages in 13s
10 vulnerabilities (4 moderate, 5 high, 1 critical)
```
Building client generates warnings: `(!) Some chunks are larger than 500 kB after minification.`

**C. Database Seed Failure**
```
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**D. Docker Build Failure**
```
429 Too Many Requests
toomanyrequests: You have reached your unauthenticated pull rate limit.
```

## 2. Dependency Advisories (`npm audit`)

**Root `npm audit --omit=dev`:**
- `ip-address` (Moderate) - XSS in HTML-emitting methods
- `path-to-regexp` (High) - DoS via multiple route parameters
- `qs` (Moderate) - DoS crash on null/undefined entries
- `uuid` (Moderate) - Missing buffer bounds check

**Client `npm audit --omit=dev`:**
- `@protobufjs/utf8` (Moderate) - Overlong UTF-8 decoding
- `protobufjs` (Critical) - Arbitrary code execution / Prototype injection / DoS

## 3. Frontend Reconciliation Recommendation
- The `client/` directory exists and is a Vite/React application encompassing all pages (`POS`, `Dashboard`, `Inventory`, `Login`, etc.). It also has a complete build step and integration into the main server (serving static files from `client/dist`).
- The `index.html`, `app.js`, and `style.css` in the root are vanilla JS implementations.
- **Recommendation:** Keep the `client/` as the canonical frontend as it is a modern React/Vite implementation that is fully built out and served by the Express backend. We should delete `index.html`, `app.js`, and `style.css` from the root, update documentation, and resolve all `.env` related variables.

## 4. `Customer` Model Routes Status
- The `server/routes/customerRoutes.js` exists and is wired in `server/index.js` under `/api/customers`.
- It connects to `customerController.js` providing full CRUD operations.
- **Recommendation:** No changes needed to the README feature claim, but ensure it is fully working.

## 5. Floating-Point Currency Usages
- `server/models/Product.js`: Lines 26, 31, 36
- `server/models/Invoice.js`: Lines 18, 20, 22, 27, 31, 40, 41
- `server/models/Return.js`: Lines 15, 20, 48
- `server/models/Order.js`: Line 18
- `server/controllers/invoiceController.js`: Line 12 (`roundCurrency`), Line 29 (`calculateChange`), Line 115 (`parsedCash`)
- `server/controllers/returnController.js`: Line 7 (`roundCurrency`), Line 30 (`price`)
- `server/utils/receiptGenerator.js`: Line 3 (`formatCurrency`), Line 40 (`lineAmount`), Line 50 (`invoice.discount`)

## 6. API Route Validation Absences
- `server/routes/authRoutes.js`: Lines 14, 15, 16, 18, 19 (No `express-validator` on `POST` endpoints)
- `server/routes/productRoutes.js`: Lines 10, 14 (No `express-validator` on `POST /` and `PUT /:id`. No ObjectId validation on `/:id`)
- `server/routes/invoiceRoutes.js`: Line 9 (No `express-validator` on `POST /`. No ObjectId validation on `/:id/receipt`)
- `server/routes/customerRoutes.js`: Lines 4, 5 (No validation on POST/PUT endpoints)

## 7. Proposed Order of Follow-Up PRs
1. **P0: Fix Environment & Dependencies**
   - Fix `package.json` missing dependencies (e.g., `bcryptjs`), resolve audit vulnerabilities via upgrades, and fix `seed.js` to ensure idempotency.
   - Update Dockerfile for multi-stage build and rate limit fixes if needed.
2. **P0/P2: Frontend Reconciliation**
   - Delete `index.html`, `style.css`, `app.js` from root. Document Vite client in README. Clean up Firebase env vars if not used.
3. **P1: Security Hardening & Input Validation**
   - Add `express-validator`, ObjectId checks, and enhance authentication (bcrypt rounds, JWT TTL).
4. **P1: Currency Math Migration**
   - Migrate all Mongoose schemas and controller math to integer minor units (paise) for safe money handling.
5. **P1: Inventory Transactions & Idempotency**
   - Update `POST /api/invoices` to use atomic stock decrements and idempotency keys.

## 8. Clarifications needed from Anuj
- Should Firebase Auth actually be utilized in the Vite client or should it rely strictly on the `server/auth` local API with JWTs? (I will assume local auth based on the backend setup).
- Can we confirm the removal of the vanilla HTML/JS implementation in favor of the Vite application?
