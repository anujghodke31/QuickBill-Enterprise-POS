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
(node:9542) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**npm run dev:**
```
> quickbill-pos@2.0.0 dev
> concurrently "npm run dev:server" "npm run dev:client"
...
[1]   VITE v7.3.1  ready in 364 ms
...
[0] error: ENOENT: no such file or directory, stat '/app/client/dist/index.html'
```
Note: fails to serve the frontend via the backend on port 3000 because `client/dist/index.html` does not exist.

**docker build:**
```
#5 [2/5] WORKDIR /usr/src/app
#5 ERROR: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1917783858", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
```
Note: The docker build fails when setting `WORKDIR`. This is often an issue with how docker interacts with overlayfs.

## 2. Dependency Advisories

**Root `npm audit --omit=dev`:**
- `qs` (moderate)
- `uuid` (moderate)
- Total: 6 vulnerabilities (4 moderate, 2 critical)

**Client `npm audit --omit=dev`:**
- Total: 16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical)

## 3. Dual Frontend Status
The `client/` directory exists and is a Vite/React application. `server/index.js` already explicitly maps static file serving to `client/dist`.
**Recommendation:** We should definitively use `client/` as the canonical frontend. The legacy vanilla SPA files (`index.html`, `app.js`, `style.css`, `replace_colors.js`) at the root should be completely removed. The `README.md` must be updated to remove references to the vanilla JS, document building/running the Vite application, and clarify where env vars go.

## 4. Customer Model Status
The `Customer` model exists in `server/models/Customer.js`.
The routes for the customer model exist in `server/routes/customerRoutes.js`, and these routes are explicitly wired in `server/index.js` (`app.use('/api/customers', protect, apiLimiter, customerRoutes);`).
**Recommendation:** Keep the feature as-is, but verify it meets all validation requirements and add tests for it.

## 5. Currency Math
The following files define `Number` fields for money and will need to be refactored to use integer minor units (paise).

**`server/models/Customer.js`:**
- Line 23: `totalSpent` (Number)

**`server/models/Invoice.js`:**
- Line 18: `price` (Number)
- Line 20: `subTotal` (Number)
- Line 22: `total` (Number)
- Line 27: `taxAmount` (Number)
- Line 31: `discountAmount` (Number)
- Line 40: `cashGiven` (Number)
- Line 41: `changeReturned` (Number)

**`server/models/Product.js`:**
- Line 26: `price` (Number)
- Line 31: `costPrice` (Number)
- Line 36: `discount` (Number)

**`server/models/Return.js`:**
- Line 20: `refundAmount` (Number)
- Line 48: `restockingFee` (Number)

**`server/models/Order.js`:**
- Line 18: `price` (Number)
- Line 22: `totalAmount` (Number)

## 6. Input Validation
Currently, routes receive `req.body` but do not seem to use `express-validator` to strictly validate inputs before controller logic execution.

Files needing validation for `POST`/`PUT` routes:
- `server/routes/authRoutes.js`
- `server/routes/customerRoutes.js`
- `server/routes/employeeRoutes.js`
- `server/routes/invoiceRoutes.js`
- `server/routes/orderRoutes.js`
- `server/routes/productRoutes.js`
- `server/routes/returnRoutes.js`
- `server/routes/supplierRoutes.js`

Additionally, `ObjectId` validation is missing for `/:id` parameters across these routers.

## 7. Proposed PRs
1. **P0 - Fix MongoDB Seeder**: Make `server/seed.js` idempotent using bulkWrite upsert logic on `barcode` instead of `deleteMany` & `insertMany`.
2. **P0 - Fix Environment setup & Reconcile Dual Frontend**: Add `.nvmrc` pinning Node 20, update package.json engines. Remove vanilla SPA files (`index.html`, `app.js`, `style.css`, `replace_colors.js`), update `README.md` to reflect `client/` as the canonical frontend. Make the node start script build `client/` or configure `concurrently` to serve Vite.
3. **P0 - Fix Docker build**: Fix docker build overlay error. Implement multi-stage build running non-root.
4. **P0/P1 - Route Validation & Error Handling**: Add `express-validator` to all public POST/PUT routes. Add MongoDB ObjectId guards on all `/:id` routes.
5. **P1 - Auth Security**: Update `bcrypt` rounds to >= 12, set up JWT TTL rules, strict Helmet CSP, rate limits.
6. **P1 - Integer Minor Units**: Convert all money-related fields from JS floating-point arithmetic to integer minor units (paise). Add transactions and stock atomic decrements for checkout.

## 8. Ambiguities
- The Docker build fails with a docker daemon overlay error. I suspect it's environmental or related to caching, but I will review the `Dockerfile` to ensure there are no glaring syntax issues. Is there a specific base image I should use?
- For local dev mode, the express server looks for `client/dist/index.html`. Since we use Vite, should the express server proxy to the vite server for `/` or do we expect developers to run the build in `client/` before running the server locally?
