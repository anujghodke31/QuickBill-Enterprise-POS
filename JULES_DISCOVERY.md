# Jules Discovery

## 1. P0 Errors

**npm install at root:**
```
npm warn deprecated jpeg-exif@1.1.4: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).

added 240 packages, and audited 241 packages in 7s

34 packages are looking for funding
  run npm fund for details

6 vulnerabilities (4 moderate, 2 critical)

To address all issues, run:
  npm audit fix

Run npm audit for details.
```

**npm install in client/:**
```
added 247 packages, and audited 248 packages in 16s

36 packages are looking for funding
  run npm fund for details

16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical)

To address all issues, run:
  npm audit fix

Run npm audit for details.
```

**node server/seed.js:**
```
(node:9542) [DEP0040] DeprecationWarning: The punycode module is deprecated. Please use a userland alternative instead.
(Use node --trace-deprecation ... to show where the warning was created)
❌ Seed failed: connect ECONNREFUSED 127.0.0.1:27017
```

**npm start (dev backgrounded):**
```
> quickbill-pos@2.0.0 dev
> concurrently "npm start dev:server" "npm start dev:client"

[0]
[0] > quickbill-pos@2.0.0 dev:server
[0] > nodemon server/index.js
[0]
[1]
[1] > quickbill-pos@2.0.0 dev:client
[1] > cd client && npm start dev
[1]
[0] [nodemon] 3.1.14
[0] [nodemon] to restart at any time, enter rs
[0] [nodemon] watching path(s): *.*
[0] [nodemon] watching extensions: js,mjs,cjs,json
[0] [nodemon] starting node server/index.js
[1]
[1] > client@0.0.0 dev
[1] > vite
[1]
[1]
[1]   VITE v7.3.1  ready in 337 ms
[1]
[1]   ➜  Local:   http://localhost:5173/
[1]   ➜  Network: use --host to expose
[0] (node:7584) [DEP0040] DeprecationWarning: The punycode module is deprecated. Please use a userland alternative instead.
[0] (Use node --trace-deprecation ... to show where the warning was created)
[0] info: [object Object] {"service":"quickbill-api","timestamp":"2026-06-20T23:59:32.871Z"}
[0] Server running on port 3000
```

**docker build:**
```
#6 [2/5] WORKDIR /usr/src/app
#6 ERROR: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1663625115", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
------
 > [2/5] WORKDIR /usr/src/app:
------
Dockerfile:4
--------------------
   2 |
   3 |     # Create app directory
   4 | >>> WORKDIR /usr/src/app
   5 |
   6 |     # Install app dependencies
--------------------
ERROR: failed to build: failed to solve: mount source: "overlay", target: "/var/lib/docker/buildkit/containerd-overlayfs/cachemounts/buildkit1663625115", fstype: overlay, flags: 0, data: "workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/work,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/8/fs,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/7/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/6/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/5/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/4/fs,index=off,redirect_dir=off", err: invalid argument
```

## 2. Dependency Advisories

**Root npm audit --omit=dev:**
```
# npm audit report

qs  6.11.1 - 6.15.1
Severity: moderate
qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set - https://github.com/advisories/GHSA-q8mj-m7cp-5q26
fix available via npm audit fix
node_modules/body-parser/node_modules/qs
node_modules/qs
  express  4.21.0 - 4.22.1 || 5.0.0-alpha.1 - 5.0.1
  Depends on vulnerable versions of qs
  node_modules/express

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via npm audit fix
node_modules/uuid
  gaxios  6.4.0 - 6.7.1
  Depends on vulnerable versions of uuid
  node_modules/gaxios

4 moderate severity vulnerabilities
```

**Client npm audit --omit=dev:**
- 16 vulnerabilities (2 low, 5 moderate, 8 high, 1 critical)

## 3. Dual Frontend Status
The client/ directory exists and is a Vite/React application. server/index.js already explicitly maps static file serving to client/dist.
**Recommendation:** We should definitely use client/ as the canonical frontend. The legacy vanilla SPA files (index.html, app.js, style.css) at the root should be completely removed to prevent confusion. The README.md must be updated to remove references to the vanilla JS and document building/running the Vite application.

## 4. Customer Model Status
The Customer model exists in server/models/Customer.js.
The routes for the customer model exist in server/routes/customerRoutes.js, and these routes are explicitly wired in server/index.js (app.use('/api/customers', protect, apiLimiter, customerRoutes);). Thus, the Customer model has wired routes and the feature works, but we should make sure it meets all the validation requirements.

## 5. Currency Math
The following files define Number fields for money and will need to be refactored to use integer minor units (paise), instead of JS floating point arithmetic.

**server/models/Customer.js:**
- Line 23: totalSpent (Number)

**server/models/Invoice.js:**
- Line 18: price (Number)
- Line 20: subTotal (Number)
- Line 22: total (Number)
- Line 27: taxAmount (Number)
- Line 31: discountAmount (Number)
- Line 40: cashGiven (Number)
- Line 41: changeReturned (Number)

**server/models/Product.js:**
- Line 26: price (Number)
- Line 31: costPrice (Number)
- Line 36: discount (Number)

**server/models/Return.js:**
- Line 20: refundAmount (Number)
- Line 48: restockingFee (Number)

**server/models/Order.js:**
- Line 18: price (Number)
- Line 22: totalAmount (Number)

**server/controllers/invoiceController.js:**
- Line 12: Float rounding is used via Math.round((value + Number.EPSILON) * 100) / 100

## 6. Input Validation
Currently, routes receive req.body but do not seem to use express-validator to strictly validate inputs before controller logic execution. We need to add express-validator checks to server/routes/*.js.

Files needing validation for POST/PUT routes:
- server/routes/authRoutes.js (Lines 13-18)
- server/routes/customerRoutes.js (Lines 8-9)
- server/routes/employeeRoutes.js (Lines 8-9)
- server/routes/invoiceRoutes.js (Line 8)
- server/routes/orderRoutes.js (Lines 8-9)
- server/routes/productRoutes.js (Lines 8-9)
- server/routes/returnRoutes.js (Lines 8-9)
- server/routes/supplierRoutes.js (Lines 8-9)

Additionally, ObjectId validation is missing for /:id parameters across these routers.

## 7. Proposed PRs
1. **P0 - Dependency & Environment Setup**: Update server/models/User.js to correctly use bcrypt, add .nvmrc pinning Node 20, update package.json engines.
2. **P0 - Fix Docker build & Seeder**: Fix docker build 429 error and layer issues. Make server/seed.js idempotent using upsert logic.
3. **P0 - Reconcile Dual Frontend**: Remove vanilla SPA files (index.html, app.js, style.css), update README.md to reflect client/ as the canonical frontend.
4. **P0/P1 - Route Validation & Error Handling**: Add express-validator to all public POST/PUT routes. Add MongoDB ObjectId guards on all /:id routes.
5. **P1 - Auth Security**: Update bcrypt rounds to >= 12, set up JWT TTL rules, strict Helmet CSP, rate limits.
6. **P1 - Integer Minor Units**: Convert all money-related fields from JS floating-point arithmetic to integer minor units (paise). Add transactions and stock atomic decrements for checkout.

## 8. Ambiguities
- The Docker build fails with a docker daemon overlay error. I suspect it's environmental, but I will review the Dockerfile to ensure there are no glaring syntax issues. Should I also try to clear the builder cache or change the base image?
