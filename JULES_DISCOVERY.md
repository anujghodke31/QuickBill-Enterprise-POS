# Jules Discovery

## 1. P0 Errors

**npm install at root:**
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported.
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.

added 240 packages, and audited 241 packages in 7s

34 packages are looking for funding
  run `npm fund` for details

10 vulnerabilities (1 low, 6 moderate, 1 high, 2 critical)
```

**npm install in client/:**
```
added 247 packages, and audited 248 packages in 16s

36 packages are looking for funding
  run `npm fund` for details

17 vulnerabilities (2 low, 2 moderate, 11 high, 2 critical)
```

**node server/seed.js:**
```
(node:9542) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**npm run dev:**
```
> quickbill-pos@2.0.0 dev
> concurrently "npm run dev:server" "npm run dev:client"

[0]
[0] > quickbill-pos@2.0.0 dev:server
[0] > nodemon server/index.js
[1]
[1] > quickbill-pos@2.0.0 dev:client
[1] > cd client && npm run dev
[0] [nodemon] 3.1.14
[0] [nodemon] starting `node server/index.js`
[1] sh: 1: vite: not found
[1] npm run dev:client exited with code 127
[0] (node:7584) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
[0] info: [object Object] {"service":"quickbill-api","timestamp":"2026-06-20T23:59:32.871Z"}
[0] Server running on port 3000
```
Note: `client` fails to start because Vite is missing (if `npm install` hasn't been run in `client/`).

**docker build:**
```
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit3908803349", fstype: overlay, flags: 0, data: "workdir=...,index=off,redirect_dir=off", err: invalid argument
```
*(There is also no `.dockerignore` file, causing huge contexts.)*

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `body-parser` (moderate)
- `brace-expansion` (high)
- `mongoose` (moderate)
- `morgan` (moderate)
- `qs` (moderate)
- `shell-quote` (critical)
- `uuid` (moderate)

**Client `npm audit --omit=dev`:**
- 17 vulnerabilities (2 low, 2 moderate, 11 high, 2 critical).

## 3. Dual Frontend Status
The `client/` directory exists and contains a Vite/React application. However, based on the project's memories and guidelines: "The canonical frontend has been designated as the legacy vanilla HTML/JS SPA, rather than the Vite application located in 'client/'."
**Recommendation:** The canonical frontend should be the vanilla HTML/JS SPA (`index.html`, `app.js`, `style.css`). The `client/` directory should be removed. The `README.md` must be updated to remove references to `client/.env` and `VITE_FIREBASE_*` to prevent contributor confusion. The `server/index.js` which currently statically serves `client/dist` must be updated to serve the legacy root frontend.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`.
The routes for the customer model exist in `server/routes/customerRoutes.js`, and these routes are explicitly wired in `server/index.js` (`app.use('/api/customers', protect, apiLimiter, customerRoutes);`).
**Recommendation:** The feature works and is wired. We should add request validation in future PRs and retain the claim in the README.

## 5. Currency Math
The following files define floating-point `Number` fields for money and need to be refactored to use integer minor units (paise).

- **`server/models/Customer.js`**: Line 23 (`totalSpent`)
- **`server/models/Invoice.js`**: Line 18 (`price`), Line 20 (`subTotal`), Line 22 (`totalAmount`), Line 27 (`tax`), Line 31 (`discount`), Line 40 (`cashGiven`), Line 41 (`changeReturned`)
- **`server/models/Product.js`**: Line 26 (`price`), Line 31 (`compareAtPrice`)
- **`server/models/Return.js`**: Line 20 (`refundAmount`), Line 48 (`restockingFee`)
- **`server/models/Order.js`**: Line 18 (`price`), Line 22 (`totalAmount`)

## 6. Input Validation
Currently, routes receive `req.body` but do not use `express-validator` to strictly validate inputs before controller execution.

Files needing validation for `POST`/`PUT` routes and `ObjectId` guards on `/:id` routes:
- `server/routes/authRoutes.js`: `/register` (Line 13), `/login` (Line 14), `/google` (Line 15), `/verify-email` (Line 16), `/forgot-password` (Line 17), `/reset-password` (Line 18)
- `server/routes/customerRoutes.js`: `/` POST (Line 5), `/:id` PUT/DELETE (Line 6)
- `server/routes/employeeRoutes.js`: `/` POST (Line 5), `/:id` PUT/DELETE (Line 6)
- `server/routes/invoiceRoutes.js`: `/` POST (Line 10)
- `server/routes/orderRoutes.js`: `/` POST (Line 16), `/:id/status` PUT (Line 21)
- `server/routes/productRoutes.js`: `/` POST (Line 11), `/:id` PUT (Line 16)
- `server/routes/returnRoutes.js`: `/` POST (Line 9)
- `server/routes/supplierRoutes.js`: `/` POST (Line 10), `/:id` PUT/DELETE (Line 11)

## 7. Proposed PRs
1. **P0 - Reconcile Dual Frontend**: Remove `client/` directory, update `server/index.js` to serve root static files (`index.html`, `style.css`, `app.js`), update `package.json` to remove concurrent client execution, update `README.md` to remove `client/` specific ENV references.
2. **P0 - Fix Docker build & Seeder**: Create `.dockerignore`. Modify `Dockerfile` to use multi-stage builds and a non-root user. Make `server/seed.js` idempotent using `upsert` logic instead of `insertMany` with clearing.
3. **P0/P1 - Dependency Setup & Auth Hardening**: Fix npm audit issues by bumping vulnerable dependencies. Update `bcrypt` rounds to 12. Add Helmet CSP config matching no inline scripts.
4. **P1 - Input Validation & Error Handling**: Add `express-validator` to all public `POST`/`PUT` routes, and MongoDB ObjectId guards on all `/:id` routes.
5. **P1 - Integer Minor Units & DB Transacitons**: Convert all money-related fields from JS floating-point arithmetic to integer minor units (paise). Add transactions and atomic stock decrements for checkout in `invoiceController.js`.

## 8. Ambiguities
- Given we are retaining the Vanilla SPA, should we add any bundler (e.g., esbuild, webpack) for `app.js`, or continue treating it as raw scripts in the root directory while refactoring it into ES Modules?
