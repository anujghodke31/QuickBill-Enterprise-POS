# Jules Discovery

## 1. P0 Errors (Baseline Output)

**`npm install` at root:**
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).

added 240 packages, and audited 241 packages in 7s

34 packages are looking for funding
  run `npm fund` for details

6 vulnerabilities (4 moderate, 2 critical)
```
*(Note: If `bcryptjs` fails on some environments, it may be due to missing python/build-tools for native compiling. The dependency `bcryptjs` is pure JS but `bcrypt` would require it).*

**`npm install` in client/:**
```
added 247 packages, and audited 248 packages in 16s

36 packages are looking for funding
  run `npm fund` for details

16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical)
```

**`node server/seed.js`:**
```
(node:9542) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```
*(Also, currently `seed.js` uses `Product.deleteMany({})` and `Product.insertMany(...)`, so it destroys and recreates records rather than upserting idempotently).*

**`npm run dev`:**
```
[1]   VITE v7.3.1  ready in 337 ms
[1]   ➜  Local:   http://localhost:5173/
[0] info: [object Object] {"service":"quickbill-api","timestamp":"..."}
[0] Server running on port 3000
```
*(Starts up, but serves `client/dist` statically from `server/index.js` while concurrently running the Vite dev server, causing dual-frontend confusion).*

**`docker build -t quickbill-pos .`:**
```
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/...", err: invalid argument
```
*(Docker fails likely due to an environment overlay issue, but the `Dockerfile` itself also runs as root and doesn't use a multi-stage build. A `.dockerignore` is also missing).*


## 2. Dependency Advisories (`npm audit --omit=dev`)

**Root:**
- `qs` (moderate)
- `uuid` (moderate)

**Client (`client/`):**
- 16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical). Includes multiple React/Vite ecosystem alerts.


## 3. Canonical Frontend Recommendation

The `client/` directory exists and is a Vite React application. However, **as established in project memory ("The canonical frontend has been designated as the legacy vanilla HTML/JS SPA, rather than the Vite application located in 'client/'")**, the canonical frontend is the vanilla SPA (`index.html`, `app.js`, `style.css`).

**Recommendation:**
We should completely remove the `client/` directory and remove all references to `client/` and Vite from `package.json`, `README.md`, and `server/index.js`. The backend should only serve the vanilla static files at the root.


## 4. Customer Model Status

The `Customer` model exists in `server/models/Customer.js`.
The routes for it exist in `server/routes/customerRoutes.js` (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`).
These routes are explicitly wired in `server/index.js`: `app.use('/api/customers', protect, apiLimiter, customerRoutes);`.

**Recommendation:**
Since the feature is fully wired, we should **add the routes to the `README.md` API Endpoints section** rather than removing the feature claim. We will also add input validation to it.


## 5. Currency with Floating-Point (Number)

The following schema fields use `Number` for money and must be refactored to use integer minor units (paise) to prevent `0.1 + 0.2` precision errors:

- **`server/models/Customer.js`**: `totalSpent`
- **`server/models/Invoice.js`**: `price`, `subTotal`, `discount`, `tax`, `totalAmount`, `paymentDetails.cashGiven`, `paymentDetails.changeReturned`
- **`server/models/Product.js`**: `price`, `compareAtPrice`
- **`server/models/Return.js`**: `refundAmount`, `restockingFee`
- **`server/models/Order.js`**: `price`, `totalAmount`


## 6. Routes Lacking Input Validation

Almost all POST/PUT routes currently use `req.body` directly without `express-validator`. Additionally, `/:id` parameters lack `mongoose.Types.ObjectId.isValid()` guards, which leads to 5xx Cast Errors in controllers (`findById`).

Files needing `express-validator` and `ObjectId` guards:
- `server/routes/authRoutes.js` (missing `express-validator` for register, login, google)
- `server/routes/customerRoutes.js` (missing `express-validator` for POST/PUT, missing ObjectId guard for `/:id`)
- `server/routes/employeeRoutes.js` (missing ObjectId guard for `/:id`)
- `server/routes/invoiceRoutes.js` (missing `express-validator` for POST cart items)
- `server/routes/orderRoutes.js` (missing `express-validator` for POST, missing ObjectId guard)
- `server/routes/productRoutes.js` (missing `express-validator` for POST/PUT, missing ObjectId guard for `/:id`)
- `server/routes/returnRoutes.js` (missing `express-validator` for POST, missing ObjectId guard)
- `server/routes/supplierRoutes.js` (missing `express-validator` for POST/PUT, missing ObjectId guard)


## 7. Proposed Ordered PRs

1. **P0: Dependencies & Environment Setup**
   - Pin Node to `^18.0.0 || ^20.0.0` in `package.json` engines and add `.nvmrc` with `20`.
2. **P0: Reconcile Dual Frontend**
   - Delete `client/`, remove from `package.json` scripts, update `server/index.js` to serve vanilla SPA, update `README.md`.
3. **P0: Fix Docker Build End-to-End**
   - Add `.dockerignore`, rewrite `Dockerfile` to multi-stage, non-root user.
4. **P0: Idempotent Seeder & Clean Boot**
   - Refactor `server/seed.js` to use `updateOne` with `upsert: true`. Improve `server/config/db.js` error handling.
5. **P0: API Hardening & Documentation**
   - Add `GET/POST/PUT/DELETE /api/customers` to README.
   - Add `validateObjectId` middleware to all `/:id` routes to fix 5xx Cast errors.
6. **P1: Auth & Security Hardening**
   - Upgrade bcrypt to $\ge 12$ rounds, strictly validate Google ID token `aud/iss/exp`, configure strict CORS, add Helmet CSP, rate limiting.
7. **P1: Integer Minor Units & Inventory Consistency**
   - Refactor currency fields to integer (paise).
   - Make checkout decrement stock atomically (`$gte: qty`) with a transaction and idempotency keys.
8. **P2/P3: Frontend & Backend Quality**
   - Refactor `app.js` into ES modules.
   - Add Pino/Winston logging, standardized error middleware, `/health` endpoint, and graceful shutdown.


## 8. Ambiguities for Anuj (Maintainer)

- **Database Transactions:** MongoDB transactions require a replica set. Since many developers run standalone Mongo locally, should we enforce replica sets as a strict requirement in the README for the new atomic checkout PR, or provide a fallback?
- **Vite Deletion:** Just confirming we are completely wiping the `client/` directory and dropping all Vite/React support to stick with the vanilla HTML/JS SPA, as established in the current plan.
- **Dependency Upgrades:** Should I address the `npm audit` vulnerabilities immediately as part of the first PR, or leave them for a dedicated "Dependency Audit" PR later?
