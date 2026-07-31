# Jules Discovery

## 1. P0 Errors

**npm install at root:**
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).

added 240 packages, and audited 241 packages in 7s

34 packages are looking for funding
  run `npm fund` for details

6 vulnerabilities (4 moderate, 2 critical)
```

**npm install in client/:**
```
added 247 packages, and audited 248 packages in 16s

36 packages are looking for funding
  run `npm fund` for details

16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical)
```

**node server/seed.js:**
```
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**docker build:**
```
ERROR: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1663625115", fstype: overlay, flags: 0, data: "...", err: invalid argument
```
This is a failure with the overlay storage driver during `docker build`, which seems tied to the builder cache.

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `uuid` (moderate)
- `gaxios` (moderate)

**Client `npm audit --omit=dev`:**
- 2 low, 5 moderate, 8 high, 1 critical vulnerability.

## 3. Dual Frontend Status
The `client/` directory exists as a Vite/React application. The legacy vanilla frontend exists in the root directory. I recommend making the legacy vanilla HTML/JS SPA the canonical frontend by moving it to `public/` and deleting `client/`, as per instructions to avoid framework overhead.

## 4. Customer Model Status
The `Customer` model has wired routes (`server/routes/customerRoutes.js`) that are registered in `server/index.js` (`/api/customers`). I recommend keeping these routes but securing them properly with input validation.

## 5. Currency Math (Floating-point)
- `server/models/Customer.js`: line 23 (`totalSpent`)
- `server/models/Invoice.js`: line 18 (`price`), line 20 (`subTotal`), line 22 (`total`), line 27 (`taxAmount`), line 31 (`discountAmount`), line 40 (`cashGiven`), line 41 (`changeReturned`), line 22 (`totalAmount`)
- `server/models/Product.js`: line 26 (`price`), line 31 (`costPrice`), line 36 (`discount`)
- `server/models/Return.js`: line 20 (`refundAmount`), line 48 (`restockingFee`)
- `server/models/Order.js`: line 18 (`price`), line 22 (`totalAmount`)
*All these fields should be refactored to integer minor units (paise).*

## 6. Input Validation
API routes in `server/routes/*.js` lack input validation before hitting controllers.
- `server/routes/authRoutes.js` (Lines 11-16)
- `server/routes/productRoutes.js` (Line 10)
- `server/routes/invoiceRoutes.js` (Line 9)
- `server/routes/customerRoutes.js` (Line 5)
- `server/routes/employeeRoutes.js` (Line 5)
- `server/routes/supplierRoutes.js` (Line 9)
- `server/routes/returnRoutes.js` (Line 9)
- `server/routes/orderRoutes.js` (Line 13)
*Missing express-validator checks everywhere. Need to examine `app.js` and Postman payload schemas exactly.*

## 7. Proposed Follow-Up PRs
1. **P0: Fix Environments**: Pin Node engines, update dependencies, setup `.nvmrc`. Fix docker build and idempotent seed script.
2. **P0: Reconcile Frontend**: Delete `client/`, serve vanilla HTML/JS from `public/`, document in README.
3. **P0: Add Express Validation**: Accurately map fields required by `app.js` to `express-validator` across all routes.
4. **P1: Auth & Security Hardening**: Setup JWT TTL, bcrypt $\ge 12$, helmet, and rate limits.
5. **P1: Integer Minor Units**: Refactor models to use integer minor units and add transaction wrapper for inventory decrement.

## 8. Ambiguities
- What should we use to process transactions given `return` uses `restockingFee`? Are there other unmentioned monetary values?
- Does Anuj have a preferred structured logging package (Winston vs Pino)? (I'll go with Winston as it's already in `package.json`).
